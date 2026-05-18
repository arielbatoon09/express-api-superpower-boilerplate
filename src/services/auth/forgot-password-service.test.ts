import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForgotPasswordService } from '@/services/auth/forgot-password-service';

vi.mock('@/utils/mail-template', () => ({
  renderMailTemplate: vi.fn().mockReturnValue('<h1>Reset Password</h1>'),
}));

describe('ForgotPasswordService Unit Tests', () => {
  let mockUserRepository: any;
  let mockTokenRepository: any;
  let mockQueueService: any;
  let service: ForgotPasswordService;

  beforeEach(() => {
    mockUserRepository = {
      findByEmail: vi.fn(),
    };

    mockTokenRepository = {
      findLatestPasswordResetTokenByUser: vi.fn(),
      cleanupInvalidTokensByUser: vi.fn(),
      createPasswordResetToken: vi.fn(),
    };

    mockQueueService = {
      addJob: vi.fn(),
    };

    service = new ForgotPasswordService(mockUserRepository, mockTokenRepository, mockQueueService);
  });

  it('should return secure generic success even if user does not exist', async () => {
    mockUserRepository.findByEmail.mockResolvedValue(null);

    const response = await service.execute({ email: 'nonexistent@example.com' });

    expect(response).toEqual({
      code: 200,
      status: 'success',
      message: 'If that email is registered, we have sent a reset password link.',
    });
    expect(mockTokenRepository.createPasswordResetToken).not.toHaveBeenCalled();
    expect(mockQueueService.addJob).not.toHaveBeenCalled();
  });

  it('should throw error 400 if user has an active reset token already', async () => {
    mockUserRepository.findByEmail.mockResolvedValue({ id: 'user-uuid', name: 'John', email: 'john@example.com' });
    mockTokenRepository.findLatestPasswordResetTokenByUser.mockResolvedValue({
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // valid for 10 more minutes
    });

    const response = await service.execute({ email: 'john@example.com' });

    expect(response).toEqual({
      code: 400,
      status: 'error',
      message: 'Current password reset link is still valid',
    });
    expect(mockTokenRepository.createPasswordResetToken).not.toHaveBeenCalled();
  });

  it('should successfully generate reset token, cleanup stale, and enqueue email', async () => {
    mockUserRepository.findByEmail.mockResolvedValue({ id: 'user-uuid', name: 'John', email: 'john@example.com' });
    mockTokenRepository.findLatestPasswordResetTokenByUser.mockResolvedValue(null);
    mockTokenRepository.cleanupInvalidTokensByUser.mockResolvedValue(null);
    mockTokenRepository.createPasswordResetToken.mockResolvedValue({ id: 'token-uuid' });
    mockQueueService.addJob.mockResolvedValue({ id: 'job-uuid' });

    const response = await service.execute({ email: 'john@example.com' });

    expect(response).toEqual({
      code: 200,
      status: 'success',
      message: 'If that email is registered, we have sent a reset password link.',
    });

    expect(mockTokenRepository.cleanupInvalidTokensByUser).toHaveBeenCalledWith('user-uuid');
    expect(mockTokenRepository.createPasswordResetToken).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-uuid',
        token: expect.any(String),
        expiresAt: expect.any(Date),
      })
    );
    expect(mockQueueService.addJob).toHaveBeenCalledWith(
      'mail-queue',
      'send-reset-password-email',
      expect.objectContaining({
        to: 'john@example.com',
        subject: 'Reset your password',
        html: '<h1>Reset Password</h1>',
      })
    );
  });

  it('should handle internal failure safely by returning 500', async () => {
    mockUserRepository.findByEmail.mockRejectedValue(new Error('DB crashed'));

    const response = await service.execute({ email: 'john@example.com' });

    expect(response).toEqual({
      code: 500,
      status: 'error',
      message: 'Unable to process forgot password request',
    });
  });
});
