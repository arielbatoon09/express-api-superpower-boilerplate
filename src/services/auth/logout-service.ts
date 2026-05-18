import { injectable, inject } from 'tsyringe';
import { TokenRepository } from '@/repositories/token-repository';
import { logger } from '@/lib/logger';

@injectable()
export class LogoutService {
  constructor(@inject(TokenRepository) private readonly tokenRepository: TokenRepository) {}

  public async execute(data: { refreshToken?: string }) {
    const { refreshToken } = data;
    try {
      if (refreshToken) {
        const activeToken = await this.tokenRepository.findActiveRefreshToken(refreshToken);
        if (activeToken) {
          await this.tokenRepository.revokeToken(activeToken.id);
        }
      }

      return {
        code: 200,
        status: 'success',
        message: 'Logged out successfully',
      };
    } catch (error: any) {
      logger.error(`LogoutService failure: ${error.message}`, { error });
      return { code: 500, status: 'error', message: 'Unable to logout' };
    }
  }
}
