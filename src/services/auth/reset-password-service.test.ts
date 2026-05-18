import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResetPasswordService } from '@/services/auth/reset-password-service';

vi.mock('@/utils/password', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed-new-password'),
}));

describe('ResetPasswordService Unit Tests', () => {
  let mockUserRepository: any;
  let mockTokenRepository: any;
  let service: ResetPasswordService;

  beforeEach(() => {
    mockUserRepository = {
      updatePassword: vi.fn(),
    };

    mockTokenRepository = {
      findActivePasswordResetToken: vi.fn(),
      consumeToken: vi.fn(),
      revokeToken: vi.fn(),
    };

    service = new ResetPasswordService(mockUserRepository, mockTokenRepository);
  });

  it('should reject requests with error 404 if active token is not found', async () => {
    mockTokenRepository.findActivePasswordResetToken.mockResolvedValue(null);

    const response = await service.execute({ token: 'invalid-token', password: 'Password123!' });

    expect(response).toEqual({
      code: 404,
      status: 'error',
      message: 'Reset token not found or already used',
    });
    expect(mockUserRepository.updatePassword).not.toHaveBeenCalled();
    expect(mockTokenRepository.consumeToken).not.toHaveBeenCalled();
  });

  it('should reject requests with error 410 and revoke token if token is expired', async () => {
    mockTokenRepository.findActivePasswordResetToken.mockResolvedValue({
      id: 'token-uuid',
      userId: 'user-uuid',
      expiresAt: new Date(Date.now() - 5000), // expired 5s ago
    });

    const response = await service.execute({ token: 'expired-token', password: 'Password123!' });

    expect(response).toEqual({
      code: 410,
      status: 'error',
      message: 'Reset token expired',
    });
    expect(mockTokenRepository.revokeToken).toHaveBeenCalledWith('token-uuid');
    expect(mockUserRepository.updatePassword).not.toHaveBeenCalled();
  });

  it('should successfully update user password and consume token if token is valid', async () => {
    mockTokenRepository.findActivePasswordResetToken.mockResolvedValue({
      id: 'token-uuid',
      userId: 'user-uuid',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // valid
    });

    const response = await service.execute({ token: 'valid-token', password: 'Password123!' });

    expect(response).toEqual({
      code: 200,
      status: 'success',
      message: 'Password reset successfully',
    });

    expect(mockUserRepository.updatePassword).toHaveBeenCalledWith('user-uuid', 'hashed-new-password');
    expect(mockTokenRepository.consumeToken).toHaveBeenCalledWith('token-uuid');
  });

  it('should return error 500 if database fails', async () => {
    mockTokenRepository.findActivePasswordResetToken.mockRejectedValue(new Error('Prisma error'));

    const response = await service.execute({ token: 'valid-token', password: 'Password123!' });

    expect(response).toEqual({
      code: 500,
      status: 'error',
      message: 'Unable to reset password',
    });
  });
});
