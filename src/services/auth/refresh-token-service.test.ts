import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RefreshTokenService } from '@/services/auth/refresh-token-service';
import { BadRequestException, UnauthorizedException, NotFoundException } from '@/exceptions';

vi.mock('@/lib/jwt', () => ({
  verifyRefreshToken: vi.fn().mockImplementation(token => {
    if (token === 'valid-token') return { sub: 'user-uuid', role: 'USER', type: 'refresh' };
    if (token === 'expired-token') return { sub: 'user-uuid', role: 'USER', type: 'refresh' };
    return null;
  }),
  signAccessToken: vi.fn().mockReturnValue('new-access-token'),
  signRefreshToken: vi.fn().mockReturnValue('new-refresh-token'),
  TokenExpiry: {
    ACCESS_TOKEN_EXPIRES: '15m',
    REFRESH_TOKEN_EXPIRES: '7d',
  },
}));

describe('RefreshTokenService Unit Tests', () => {
  let mockUserRepository: any;
  let mockTokenRepository: any;
  let service: RefreshTokenService;

  beforeEach(() => {
    mockUserRepository = {
      findById: vi.fn(),
    };

    mockTokenRepository = {
      findActiveRefreshToken: vi.fn(),
      revokeToken: vi.fn(),
      consumeToken: vi.fn(),
      createRefreshToken: vi.fn(),
      cleanupInvalidTokensByUser: vi.fn(),
    };

    service = new RefreshTokenService(mockUserRepository, mockTokenRepository);
  });

  it('should throw BadRequestException if refresh token is not provided', async () => {
    await expect(service.execute({ refreshToken: undefined })).rejects.toThrow(BadRequestException);
    await expect(service.execute({ refreshToken: undefined })).rejects.toThrow('Refresh token is required');
  });

  it('should throw UnauthorizedException if refresh token signature is invalid', async () => {
    await expect(service.execute({ refreshToken: 'invalid-token' })).rejects.toThrow(UnauthorizedException);
    await expect(service.execute({ refreshToken: 'invalid-token' })).rejects.toThrow('Invalid or expired refresh token');
  });

  it('should throw UnauthorizedException if refresh token is revoked or consumed in db', async () => {
    mockTokenRepository.findActiveRefreshToken.mockResolvedValue(null);

    await expect(service.execute({ refreshToken: 'valid-token' })).rejects.toThrow(UnauthorizedException);
    await expect(service.execute({ refreshToken: 'valid-token' })).rejects.toThrow('Refresh token has been revoked or consumed');
  });

  it('should throw UnauthorizedException and revoke token if it is expired in database', async () => {
    mockTokenRepository.findActiveRefreshToken.mockResolvedValue({
      id: 'token-uuid',
      expiresAt: new Date(Date.now() - 5000), // expired
    });

    await expect(service.execute({ refreshToken: 'expired-token' })).rejects.toThrow(UnauthorizedException);
    await expect(service.execute({ refreshToken: 'expired-token' })).rejects.toThrow('Refresh token has expired');

    expect(mockTokenRepository.revokeToken).toHaveBeenCalledWith('token-uuid');
  });

  it('should throw NotFoundException if user no longer exists', async () => {
    mockTokenRepository.findActiveRefreshToken.mockResolvedValue({
      id: 'token-uuid',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // valid
    });
    mockUserRepository.findById.mockResolvedValue(null);

    await expect(service.execute({ refreshToken: 'valid-token' })).rejects.toThrow(NotFoundException);
    await expect(service.execute({ refreshToken: 'valid-token' })).rejects.toThrow('User not found');
  });

  it('should rotate tokens and return new pairs successfully', async () => {
    mockTokenRepository.findActiveRefreshToken.mockResolvedValue({
      id: 'token-uuid',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    mockUserRepository.findById.mockResolvedValue({
      id: 'user-uuid',
      role: 'USER',
    });

    const response = await service.execute({ refreshToken: 'valid-token' });

    expect(response).toEqual({
      message: 'Tokens refreshed successfully',
      data: {
        tokens: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
          expiresIn: '15m',
          refreshExpiresIn: '7d',
        },
      },
    });

    expect(mockTokenRepository.consumeToken).toHaveBeenCalledWith('token-uuid');
    expect(mockTokenRepository.createRefreshToken).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-uuid',
        token: 'new-refresh-token',
        expiresAt: expect.any(Date),
      })
    );
    expect(mockTokenRepository.cleanupInvalidTokensByUser).toHaveBeenCalledWith('user-uuid');
  });

  it('should propagate unexpected internal errors as unhandled exceptions', async () => {
    mockTokenRepository.findActiveRefreshToken.mockRejectedValue(new Error('PostgreSQL server crashed'));

    await expect(service.execute({ refreshToken: 'valid-token' })).rejects.toThrow('PostgreSQL server crashed');
  });
});
