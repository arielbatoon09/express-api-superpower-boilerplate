import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VerifyEmailService } from '@/services/auth/verify-email-service';

describe('VerifyEmailService Unit Tests', () => {
  let mockUserRepository: any;
  let mockTokenRepository: any;
  let service: VerifyEmailService;

  beforeEach(() => {
    mockUserRepository = {
      findById: vi.fn(),
      markEmailVerified: vi.fn(),
    };

    mockTokenRepository = {
      findActiveEmailVerificationToken: vi.fn(),
      revokeToken: vi.fn(),
      consumeToken: vi.fn(),
    };

    // Instantiate with mock repositories via clean constructor injection
    service = new VerifyEmailService(mockUserRepository, mockTokenRepository);
  });

  it('should successfully verify email and consume token', async () => {
    // Arrange
    const token = 'token-uuid-abc';
    const mockTokenRecord = {
      id: 'token-id-123',
      userId: 'user-id-456',
      token,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60), // 1 hour in the future
    };
    const mockUser = {
      id: 'user-id-456',
      name: 'Test User',
      email: 'test@example.com',
      emailVerifiedAt: null, // Not verified yet
    };

    mockTokenRepository.findActiveEmailVerificationToken.mockResolvedValue(mockTokenRecord);
    mockUserRepository.findById.mockResolvedValue(mockUser);
    mockUserRepository.markEmailVerified.mockResolvedValue({ id: 'user-id-456', emailVerifiedAt: new Date() });
    mockTokenRepository.consumeToken.mockResolvedValue({ id: 'token-id-123', consumed: true });

    // Act
    const response = await service.execute({ token });

    // Assert
    expect(response).toEqual({
      code: 200,
      status: 'success',
      message: 'Verified Email Successfully!',
    });

    expect(mockTokenRepository.findActiveEmailVerificationToken).toHaveBeenCalledWith(token);
    expect(mockUserRepository.findById).toHaveBeenCalledWith('user-id-456');
    expect(mockUserRepository.markEmailVerified).toHaveBeenCalledWith('user-id-456');
    expect(mockTokenRepository.consumeToken).toHaveBeenCalledWith('token-id-123');
    expect(mockTokenRepository.revokeToken).not.toHaveBeenCalled();
  });

  it('should return 200 and say "Email already verified" if user has already verified their email', async () => {
    // Arrange
    const token = 'token-uuid-abc';
    const mockTokenRecord = {
      id: 'token-id-123',
      userId: 'user-id-456',
      token,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    };
    const mockUser = {
      id: 'user-id-456',
      name: 'Test User',
      email: 'test@example.com',
      emailVerifiedAt: new Date(Date.now() - 1000 * 60 * 60), // Already verified
    };

    mockTokenRepository.findActiveEmailVerificationToken.mockResolvedValue(mockTokenRecord);
    mockUserRepository.findById.mockResolvedValue(mockUser);

    // Act
    const response = await service.execute({ token });

    // Assert
    expect(response).toEqual({
      code: 200,
      status: 'success',
      message: 'Email already verified',
    });

    expect(mockTokenRepository.findActiveEmailVerificationToken).toHaveBeenCalledWith(token);
    expect(mockUserRepository.findById).toHaveBeenCalledWith('user-id-456');
    expect(mockUserRepository.markEmailVerified).not.toHaveBeenCalled();
    expect(mockTokenRepository.consumeToken).not.toHaveBeenCalled();
  });

  it('should return 404 error if active verification token cannot be found in database', async () => {
    // Arrange
    const token = 'non-existent-token';
    mockTokenRepository.findActiveEmailVerificationToken.mockResolvedValue(null);

    // Act
    const response = await service.execute({ token });

    // Assert
    expect(response).toEqual({
      code: 404,
      status: 'error',
      message: 'Verification token not found',
    });

    expect(mockTokenRepository.findActiveEmailVerificationToken).toHaveBeenCalledWith(token);
    expect(mockUserRepository.findById).not.toHaveBeenCalled();
    expect(mockTokenRepository.revokeToken).not.toHaveBeenCalled();
  });

  it('should revoke token and return 410 error if token is expired', async () => {
    // Arrange
    const token = 'expired-token';
    const mockTokenRecord = {
      id: 'token-id-123',
      userId: 'user-id-456',
      token,
      expiresAt: new Date(Date.now() - 1000 * 60), // Expired 1 minute ago
    };

    mockTokenRepository.findActiveEmailVerificationToken.mockResolvedValue(mockTokenRecord);

    // Act
    const response = await service.execute({ token });

    // Assert
    expect(response).toEqual({
      code: 410,
      status: 'error',
      message: 'Verification token expired',
    });

    expect(mockTokenRepository.findActiveEmailVerificationToken).toHaveBeenCalledWith(token);
    expect(mockTokenRepository.revokeToken).toHaveBeenCalledWith('token-id-123');
    expect(mockUserRepository.findById).not.toHaveBeenCalled();
  });

  it('should revoke token and return 404 error if associated user is not found in database', async () => {
    // Arrange
    const token = 'valid-token-no-user';
    const mockTokenRecord = {
      id: 'token-id-123',
      userId: 'missing-user-id',
      token,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    };

    mockTokenRepository.findActiveEmailVerificationToken.mockResolvedValue(mockTokenRecord);
    mockUserRepository.findById.mockResolvedValue(null); // User missing

    // Act
    const response = await service.execute({ token });

    // Assert
    expect(response).toEqual({
      code: 404,
      status: 'error',
      message: 'User not found for this token',
    });

    expect(mockTokenRepository.findActiveEmailVerificationToken).toHaveBeenCalledWith(token);
    expect(mockUserRepository.findById).toHaveBeenCalledWith('missing-user-id');
    expect(mockTokenRepository.revokeToken).toHaveBeenCalledWith('token-id-123');
    expect(mockUserRepository.markEmailVerified).not.toHaveBeenCalled();
  });

  it('should handle unexpected internal errors safely by logging and returning a 500 response', async () => {
    // Arrange
    const token = 'token-triggering-db-crash';
    mockTokenRepository.findActiveEmailVerificationToken.mockRejectedValue(new Error('PostgreSQL database crashed'));

    // Act
    const response = await service.execute({ token });

    // Assert
    expect(response).toEqual({
      code: 500,
      status: 'error',
      message: 'Unable to verify account',
    });
  });
});
