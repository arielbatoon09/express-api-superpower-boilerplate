import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResendEmailVerificationService } from '@/services/auth/resend-email-verification';

describe('ResendEmailVerificationService Unit Tests', () => {
  let mockUserRepository: any;
  let mockTokenRepository: any;
  let mockQueueService: any;
  let service: ResendEmailVerificationService;

  beforeEach(() => {
    mockUserRepository = {
      findByEmail: vi.fn(),
    };

    mockTokenRepository = {
      findLatestEmailVerificationTokenByUser: vi.fn(),
      cleanupInvalidTokensByUser: vi.fn(),
      createEmailVerificationToken: vi.fn(),
    };

    mockQueueService = {
      addJob: vi.fn(),
    };

    service = new ResendEmailVerificationService(mockUserRepository, mockTokenRepository, mockQueueService);
  });

  it('should return 404 error if user is not found', async () => {
    // Arrange
    mockUserRepository.findByEmail.mockResolvedValue(null);

    // Act
    const response = await service.execute({ email: 'nonexistent@example.com' });

    // Assert
    expect(response).toEqual({
      code: 404,
      status: 'error',
      message: 'User not found',
    });

    expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('nonexistent@example.com');
    expect(mockTokenRepository.findLatestEmailVerificationTokenByUser).not.toHaveBeenCalled();
  });

  it('should return 200 and say "Email already verified" if user has verified status', async () => {
    // Arrange
    const mockUser = {
      id: 'user-id-123',
      email: 'verified@example.com',
      emailVerifiedAt: new Date(),
    };
    mockUserRepository.findByEmail.mockResolvedValue(mockUser);

    // Act
    const response = await service.execute({ email: 'verified@example.com' });

    // Assert
    expect(response).toEqual({
      code: 200,
      status: 'success',
      message: 'Email already verified',
    });

    expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('verified@example.com');
    expect(mockTokenRepository.findLatestEmailVerificationTokenByUser).not.toHaveBeenCalled();
  });

  it('should return 400 error if there is a previous token that is still active and valid', async () => {
    // Arrange
    const mockUser = {
      id: 'user-id-123',
      email: 'user@example.com',
      emailVerifiedAt: null,
    };
    const mockActiveToken = {
      id: 'token-id-abc',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60), // Valid for 1 more hour
    };

    mockUserRepository.findByEmail.mockResolvedValue(mockUser);
    mockTokenRepository.findLatestEmailVerificationTokenByUser.mockResolvedValue(mockActiveToken);

    // Act
    const response = await service.execute({ email: 'user@example.com' });

    // Assert
    expect(response).toEqual({
      code: 400,
      status: 'error',
      message: 'Current verification link is still valid',
    });

    expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('user@example.com');
    expect(mockTokenRepository.findLatestEmailVerificationTokenByUser).toHaveBeenCalledWith('user-id-123');
    expect(mockTokenRepository.cleanupInvalidTokensByUser).not.toHaveBeenCalled();
    expect(mockTokenRepository.createEmailVerificationToken).not.toHaveBeenCalled();
  });

  it('should successfully clean up invalid tokens, generate new token, and enqueue verification email if previous token is expired', async () => {
    // Arrange
    const mockUser = {
      id: 'user-id-123',
      name: 'John Doe',
      email: 'user@example.com',
      emailVerifiedAt: null,
    };
    const mockExpiredToken = {
      id: 'token-id-abc',
      expiresAt: new Date(Date.now() - 1000 * 60), // Expired 1 minute ago
    };

    mockUserRepository.findByEmail.mockResolvedValue(mockUser);
    mockTokenRepository.findLatestEmailVerificationTokenByUser.mockResolvedValue(mockExpiredToken);
    mockTokenRepository.cleanupInvalidTokensByUser.mockResolvedValue({ count: 1 });
    mockTokenRepository.createEmailVerificationToken.mockResolvedValue({ id: 'token-new-id' });
    mockQueueService.addJob.mockResolvedValue(true);

    // Act
    const response = await service.execute({ email: 'user@example.com' });

    // Assert
    expect(response).toEqual({
      code: 200,
      status: 'success',
      message: 'Verification email resent successfully',
    });

    expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('user@example.com');
    expect(mockTokenRepository.findLatestEmailVerificationTokenByUser).toHaveBeenCalledWith('user-id-123');
    expect(mockTokenRepository.cleanupInvalidTokensByUser).toHaveBeenCalledWith('user-id-123');
    expect(mockTokenRepository.createEmailVerificationToken).toHaveBeenCalledWith({
      userId: 'user-id-123',
      token: expect.any(String),
      expiresAt: expect.any(Date),
    });
    expect(mockQueueService.addJob).toHaveBeenCalledWith(
      'mail-queue',
      'send-verification-email',
      expect.objectContaining({
        to: 'user@example.com',
        subject: 'Verify your email address',
        html: expect.stringContaining('Verify your email'),
      })
    );
  });

  it('should successfully execute if there is no previous token at all', async () => {
    // Arrange
    const mockUser = {
      id: 'user-id-123',
      name: 'John Doe',
      email: 'user@example.com',
      emailVerifiedAt: null,
    };

    mockUserRepository.findByEmail.mockResolvedValue(mockUser);
    mockTokenRepository.findLatestEmailVerificationTokenByUser.mockResolvedValue(null); // No token ever generated before
    mockTokenRepository.cleanupInvalidTokensByUser.mockResolvedValue({ count: 0 });
    mockTokenRepository.createEmailVerificationToken.mockResolvedValue({ id: 'token-new-id' });
    mockQueueService.addJob.mockResolvedValue(true);

    // Act
    const response = await service.execute({ email: 'user@example.com' });

    // Assert
    expect(response).toEqual({
      code: 200,
      status: 'success',
      message: 'Verification email resent successfully',
    });

    expect(mockTokenRepository.findLatestEmailVerificationTokenByUser).toHaveBeenCalledWith('user-id-123');
    expect(mockTokenRepository.cleanupInvalidTokensByUser).toHaveBeenCalledWith('user-id-123');
    expect(mockTokenRepository.createEmailVerificationToken).toHaveBeenCalled();
  });

  it('should handle unexpected internal errors safely by logging and returning a 500 response', async () => {
    // Arrange
    mockUserRepository.findByEmail.mockRejectedValue(new Error('PostgreSQL connection timeout'));

    // Act
    const response = await service.execute({ email: 'user@example.com' });

    // Assert
    expect(response).toEqual({
      code: 500,
      status: 'error',
      message: 'Unable to resend verification email',
    });
  });
});
