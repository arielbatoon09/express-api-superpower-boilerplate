import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LogoutService } from '@/services/auth/logout-service';

describe('LogoutService Unit Tests', () => {
  let mockTokenRepository: any;
  let service: LogoutService;

  beforeEach(() => {
    mockTokenRepository = {
      findActiveRefreshToken: vi.fn(),
      revokeToken: vi.fn(),
    };

    service = new LogoutService(mockTokenRepository);
  });

  it('should return successfully even if no refresh token is provided', async () => {
    const response = await service.execute({ refreshToken: undefined });

    expect(response).toEqual({
      message: 'Logged out successfully',
    });
    expect(mockTokenRepository.findActiveRefreshToken).not.toHaveBeenCalled();
    expect(mockTokenRepository.revokeToken).not.toHaveBeenCalled();
  });

  it('should return successfully and not revoke if refresh token is not found in db', async () => {
    mockTokenRepository.findActiveRefreshToken.mockResolvedValue(null);

    const response = await service.execute({ refreshToken: 'missing-token' });

    expect(response).toEqual({
      message: 'Logged out successfully',
    });
    expect(mockTokenRepository.findActiveRefreshToken).toHaveBeenCalledWith('missing-token');
    expect(mockTokenRepository.revokeToken).not.toHaveBeenCalled();
  });

  it('should successfully revoke token if active refresh token is found in db', async () => {
    mockTokenRepository.findActiveRefreshToken.mockResolvedValue({
      id: 'token-uuid',
      token: 'active-token',
    });

    const response = await service.execute({ refreshToken: 'active-token' });

    expect(response).toEqual({
      message: 'Logged out successfully',
    });
    expect(mockTokenRepository.findActiveRefreshToken).toHaveBeenCalledWith('active-token');
    expect(mockTokenRepository.revokeToken).toHaveBeenCalledWith('token-uuid');
  });

  it('should propagate unexpected internal errors as unhandled exceptions', async () => {
    mockTokenRepository.findActiveRefreshToken.mockRejectedValue(new Error('Prisma database failure'));

    await expect(service.execute({ refreshToken: 'active-token' })).rejects.toThrow('Prisma database failure');
  });
});
