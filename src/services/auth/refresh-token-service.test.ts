import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RefreshTokenService } from '@/services/auth/refresh-token-service';

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

  it('should return error 400 if refresh token is not provided', async () => {
    const response = await service.execute({ refreshToken: undefined });

    expect(response).toEqual({
      code: 400,
      status: 'error',
      message: 'Refresh token is required',
    });
  });

  it('should return error 401 if refresh token signature is invalid', async () => {
    const response = await service.execute({ refreshToken: 'invalid-token' });

    expect(response).toEqual({
      code: 401,
      status: 'error',
      message: 'Invalid or expired refresh token',
    });
  });

  it('should return error 401 if refresh token is revoked or consumed in db', async () => {
    mockTokenRepository.findActiveRefreshToken.mockResolvedValue(null);

    const response = await service.execute({ refreshToken: 'valid-token' });

    expect(response).toEqual({
      code: 401,
      status: 'error',
      message: 'Refresh token has been revoked or consumed',
    });
  });

  it('should return error 401 and revoke token if it is expired in database', async () => {
    mockTokenRepository.findActiveRefreshToken.mockResolvedValue({
      id: 'token-uuid',
      expiresAt: new Date(Date.now() - 5000), // expired
    });

    const response = await service.execute({ refreshToken: 'expired-token' });

    expect(response).toEqual({
      code: 401,
      status: 'error',
      message: 'Refresh token has expired',
    });
    expect(mockTokenRepository.revokeToken).toHaveBeenCalledWith('token-uuid');
  });

  it('should return error 404 if user no longer exists', async () => {
    mockTokenRepository.findActiveRefreshToken.mockResolvedValue({
      id: 'token-uuid',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // valid
    });
    mockUserRepository.findById.mockResolvedValue(null);

    const response = await service.execute({ refreshToken: 'valid-token' });

    expect(response).toEqual({
      code: 404,
      status: 'error',
      message: 'User not found',
    });
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
      code: 200,
      status: 'success',
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

  it('should return error 500 if database fails unexpectedly', async () => {
    mockTokenRepository.findActiveRefreshToken.mockRejectedValue(new Error('PostgreSQL server crashed'));

    const response = await service.execute({ refreshToken: 'valid-token' });

    expect(response).toEqual({
      code: 500,
      status: 'error',
      message: 'Unable to refresh token',
    });
  });
});
