import { injectable, inject } from 'tsyringe';
import { UserRepository } from '@/repositories/user-repository';
import { TokenRepository } from '@/repositories/token-repository';
import { verifyPassword } from '@/utils/password';
import { signAccessToken, signRefreshToken, TokenExpiry } from '@/lib/jwt';
import { logger } from '@/lib/logger';

@injectable()
export class LoginWithEmailService {
  constructor(
    @inject(UserRepository) private readonly userRepository: UserRepository,
    @inject(TokenRepository) private readonly tokenRepository: TokenRepository
  ) {}

  public async execute(data: { email: string; password: string }) {
    const { email, password } = data;
    try {
      const user = await this.validateCredentials(email, password);
      this.ensureEmailIsVerified(user.emailVerifiedAt);
      const { accessToken, refreshToken } = await this.generateAndSaveTokens(user.id, user.role);

      return {
        code: 200,
        status: 'success',
        message: 'Login successful',
        data: {
          tokens: {
            accessToken,
            refreshToken,
            expiresIn: TokenExpiry.ACCESS_TOKEN_EXPIRES,
            refreshExpiresIn: TokenExpiry.REFRESH_TOKEN_EXPIRES,
          },
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            emailVerifiedAt: user.emailVerifiedAt,
            image: user.image,
          },
        },
      };
    } catch (error: any) {
      // Intercept and return structured business logic exceptions directly
      const isBusinessException = 'code' in error && 'status' in error;
      if (isBusinessException) {
        return error;
      }

      // Log untracked database/network system failures securely
      logger.error(`LoginWithEmailService failure: ${error.message}`, { error });
      return { code: 500, status: 'error', message: 'Unable to login account' };
    }
  }

  // Retrieve user and verify password credentials
  private async validateCredentials(email: string, password: string) {
    const user = await this.userRepository.findByEmail(email);
    if (!user || !user.password || !(await verifyPassword(password, user.password))) {
      throw { code: 400, status: 'error', message: 'Invalid Credentials' };
    }
    return user;
  }

  // Ensure user has completed the email verification step
  private ensureEmailIsVerified(emailVerifiedAt: Date | null): void {
    if (!emailVerifiedAt) {
      throw { code: 403, status: 'error', message: 'Please verify your email first' };
    }
  }

  // Generate session tokens and persist the refresh token record for tracking
  private async generateAndSaveTokens(userId: string, role: string) {
    const accessToken = signAccessToken(userId, role, TokenExpiry.ACCESS_TOKEN_EXPIRES);
    const refreshToken = signRefreshToken(userId, role, TokenExpiry.REFRESH_TOKEN_EXPIRES);

    await this.tokenRepository.createRefreshToken({
      userId,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    return { accessToken, refreshToken };
  }
}
