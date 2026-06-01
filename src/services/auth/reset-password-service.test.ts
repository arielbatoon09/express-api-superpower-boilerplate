import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResetPasswordService } from '@/services/auth/reset-password-service';
import { NotFoundException, GoneException } from '@/exceptions';

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

  it('should throw NotFoundException if active token is not found', async () => {
    mockTokenRepository.findActivePasswordResetToken.mockResolvedValue(null);

    await expect(service.execute({ token: 'invalid-token', password: 'Password123!' })).rejects.toThrow(NotFoundException);
    await expect(service.execute({ token: 'invalid-token', password: 'Password123!' })).rejects.toThrow('Reset token not found or already used');

    expect(mockUserRepository.updatePassword).not.toHaveBeenCalled();
    expect(mockTokenRepository.consumeToken).not.toHaveBeenCalled();
  });

  it('should throw GoneException and revoke token if token is expired', async () => {
    mockTokenRepository.findActivePasswordResetToken.mockResolvedValue({
      id: 'token-uuid',
      userId: 'user-uuid',
      expiresAt: new Date(Date.now() - 5000), // expired 5s ago
    });

    await expect(service.execute({ token: 'expired-token', password: 'Password123!' })).rejects.toThrow(GoneException);
    await expect(service.execute({ token: 'expired-token', password: 'Password123!' })).rejects.toThrow('Reset token expired');

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
      message: 'Password reset successfully',
    });

    expect(mockUserRepository.updatePassword).toHaveBeenCalledWith('user-uuid', 'hashed-new-password');
    expect(mockTokenRepository.consumeToken).toHaveBeenCalledWith('token-uuid');
  });

  it('should propagate unexpected internal errors as unhandled exceptions', async () => {
    mockTokenRepository.findActivePasswordResetToken.mockRejectedValue(new Error('Prisma error'));

    await expect(service.execute({ token: 'valid-token', password: 'Password123!' })).rejects.toThrow('Prisma error');
  });
});
