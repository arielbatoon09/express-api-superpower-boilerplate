import { injectable, inject } from 'tsyringe';
import { UserRepository } from '@/repositories/user-repository';
import { TokenRepository } from '@/repositories/token-repository';
import { hashPassword } from '@/utils/password';
import { logger } from '@/lib/logger';

@injectable()
export class ResetPasswordService {
  constructor(
    @inject(UserRepository) private readonly userRepository: UserRepository,
    @inject(TokenRepository) private readonly tokenRepository: TokenRepository
  ) {}

  public async execute(data: { token: string; password: string }) {
    const { token, password } = data;
    try {
      const activeToken = await this.getActiveResetToken(token);
      await this.ensureTokenNotExpired(activeToken);
      await this.updateUserPassword(activeToken.userId, password);
      await this.consumeResetToken(activeToken.id);

      return {
        code: 200,
        status: 'success',
        message: 'Password reset successfully',
      };
    } catch (error: any) {
      const isBusinessException = 'code' in error && 'status' in error;
      if (isBusinessException) {
        return error;
      }

      logger.error(`ResetPasswordService failure: ${error.message}`, { error });
      return { code: 500, status: 'error', message: 'Unable to reset password' };
    }
  }

  // Get Active Reset Token
  private async getActiveResetToken(token: string) {
    const activeToken = await this.tokenRepository.findActivePasswordResetToken(token);
    if (!activeToken) {
      throw { code: 404, status: 'error', message: 'Reset token not found or already used' };
    }
    return activeToken;
  }

  // Ensure Token Not Expired
  private async ensureTokenNotExpired(activeToken: { id: string; expiresAt: Date }) {
    const isExpired = activeToken.expiresAt.getTime() < Date.now();
    if (isExpired) {
      await this.tokenRepository.revokeToken(activeToken.id);
      throw { code: 410, status: 'error', message: 'Reset token expired' };
    }
  }

  // Update User Password
  private async updateUserPassword(userId: string, passwordHash: string) {
    const hashedPassword = await hashPassword(passwordHash);
    await this.userRepository.updatePassword(userId, hashedPassword);
  }

  // Consume Reset Token
  private async consumeResetToken(tokenId: string) {
    await this.tokenRepository.consumeToken(tokenId);
  }
}
