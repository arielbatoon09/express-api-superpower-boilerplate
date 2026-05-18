import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SignupWithEmailService } from './signup-with-email';

// Mock password hashing asynchronously to keep unit tests fast and independent
vi.mock('@/utils/password', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed-password-123'),
}));

// Mock renderMailTemplate
vi.mock('@/utils/mail-template', () => ({
  renderMailTemplate: vi.fn().mockReturnValue('<h1>Verify Email</h1>'),
}));

describe('SignupWithEmailService Unit Tests', () => {
  let mockUserRepository: any;
  let mockTokenRepository: any;
  let mockQueueService: any;
  let service: SignupWithEmailService;

  beforeEach(() => {
    mockUserRepository = {
      findByEmail: vi.fn(),
      create: vi.fn(),
    };

    mockTokenRepository = {
      createEmailVerificationToken: vi.fn(),
    };

    mockQueueService = {
      addJob: vi.fn(),
    };

    // Instantiate with stubs via clean constructor injection (no complex DI wiring needed)
    service = new SignupWithEmailService(mockUserRepository, mockTokenRepository, mockQueueService);
  });

  it('should successfully register a user and enqueue verification email in background', async () => {
    // Arrange
    const signupData = { name: 'Test User', email: 'test@example.com', password: 'Password123!' };
    mockUserRepository.findByEmail.mockResolvedValue(null); // No existing email
    mockUserRepository.create.mockResolvedValue({
      id: 'user-uuid-123',
      name: 'Test User',
      email: 'test@example.com',
    });
    mockTokenRepository.createEmailVerificationToken.mockResolvedValue({ id: 'token-uuid-abc' });
    mockQueueService.addJob.mockResolvedValue({ id: 'job-uuid-xyz' });

    // Act
    const response = await service.execute(signupData);

    // Assert
    expect(response).toEqual({
      code: 200,
      status: 'success',
      message: 'Created account successfully! Please verify your email.',
      data: {
        user: {
          id: 'user-uuid-123',
          name: 'Test User',
          email: 'test@example.com',
        },
      },
    });

    // Check repository and queue calls
    expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
    expect(mockUserRepository.create).toHaveBeenCalledWith({
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashed-password-123',
    });
    expect(mockTokenRepository.createEmailVerificationToken).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-uuid-123',
        token: expect.any(String),
        expiresAt: expect.any(Date),
      })
    );
    expect(mockQueueService.addJob).toHaveBeenCalledWith(
      'mail-queue',
      'send-verification-email',
      expect.objectContaining({
        to: 'test@example.com',
        subject: 'Verify your email address',
        html: '<h1>Verify Email</h1>',
      })
    );
  });

  it('should reject signups if email is already taken with a 409 exception', async () => {
    // Arrange
    const signupData = {
      name: 'Duplicate User',
      email: 'taken@example.com',
      password: 'Password123!',
    };
    mockUserRepository.findByEmail.mockResolvedValue({ id: 'existing-user-id' }); // Email is taken

    // Act
    const response = await service.execute(signupData);

    // Assert
    expect(response).toEqual({
      code: 409,
      status: 'error',
      message: 'Email already registered',
    });

    // Assert that no records were created and no emails were enqueued
    expect(mockUserRepository.create).not.toHaveBeenCalled();
    expect(mockTokenRepository.createEmailVerificationToken).not.toHaveBeenCalled();
    expect(mockQueueService.addJob).not.toHaveBeenCalled();
  });

  it('should handle unexpected internal errors safely by logging and returning a 500 response', async () => {
    // Arrange
    const signupData = { name: 'Error User', email: 'error@example.com', password: 'Password123!' };
    mockUserRepository.findByEmail.mockRejectedValue(new Error('PostgreSQL connection timeout'));

    // Act
    const response = await service.execute(signupData);

    // Assert
    expect(response).toEqual({
      code: 500,
      status: 'error',
      message: 'Unable to create account',
    });
  });
});
