import { injectable, inject } from 'tsyringe';
import { TokenRepository } from '@/repositories/token-repository';

@injectable()
export class LogoutService {
  constructor(@inject(TokenRepository) private readonly tokenRepository: TokenRepository) {}

  public async execute(data: { refreshToken?: string }) {
    const { refreshToken } = data;

    if (refreshToken) {
      const activeToken = await this.tokenRepository.findActiveRefreshToken(refreshToken);
      if (activeToken) {
        await this.tokenRepository.revokeToken(activeToken.id);
      }
    }

    return {
      message: 'Logged out successfully',
    };
  }
}
