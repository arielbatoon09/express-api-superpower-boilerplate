import { injectable, inject } from 'tsyringe';
import { UserRepository } from '@/repositories/user-repository';
import { TokenRepository } from '@/repositories/token-repository';
import { verifyRefreshToken, signAccessToken, signRefreshToken, TokenExpiry } from '@/lib/jwt';
import { BadRequestException, UnauthorizedException, NotFoundException } from '@/exceptions';

@injectable()
export class RefreshTokenService {
  constructor(
    @inject(UserRepository) private readonly userRepository: UserRepository,
    @inject(TokenRepository) private readonly tokenRepository: TokenRepository
  ) {}

  public async execute(data: { refreshToken?: string }) {
    const { refreshToken } = data;

    const payload = this.verifyIncomingToken(refreshToken);
    const activeToken = await this.getActiveToken(refreshToken!);
    await this.ensureTokenNotExpired(activeToken);
    const user = await this.getUser(payload.sub);
    const tokens = await this.rotateSessionTokens(user, activeToken.id);

    return {
      message: 'Tokens refreshed successfully',
      data: { tokens },
    };
  }

  // Verify Incoming Token
  private verifyIncomingToken(refreshToken?: string) {
    if (!refreshToken) {
      throw new BadRequestException('Refresh token is required');
    }

    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    return payload;
  }

  // Get Active Token from DB
  private async getActiveToken(token: string) {
    const activeToken = await this.tokenRepository.findActiveRefreshToken(token);
    if (!activeToken) {
      throw new UnauthorizedException('Refresh token has been revoked or consumed');
    }
    return activeToken;
  }

  // Ensure Token is Not Expired
  private async ensureTokenNotExpired(activeToken: { id: string; expiresAt: Date }) {
    const isExpired = activeToken.expiresAt.getTime() < Date.now();
    if (isExpired) {
      await this.tokenRepository.revokeToken(activeToken.id);
      throw new UnauthorizedException('Refresh token has expired');
    }
  }

  // Get User Profile
  private async getUser(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  // Rotate Session Tokens (Consume old, persist new)
  private async rotateSessionTokens(user: { id: string; role: string }, oldTokenId: string) {
    await this.tokenRepository.consumeToken(oldTokenId);

    const accessToken = signAccessToken(user.id, user.role, TokenExpiry.ACCESS_TOKEN_EXPIRES);
    const refreshToken = signRefreshToken(user.id, user.role, TokenExpiry.REFRESH_TOKEN_EXPIRES);

    await this.tokenRepository.createRefreshToken({
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    // Automatically sweep expired, consumed, and revoked tokens for this user
    await this.tokenRepository.cleanupInvalidTokensByUser(user.id);

    return {
      accessToken,
      refreshToken,
      expiresIn: TokenExpiry.ACCESS_TOKEN_EXPIRES,
      refreshExpiresIn: TokenExpiry.REFRESH_TOKEN_EXPIRES,
    };
  }
}
