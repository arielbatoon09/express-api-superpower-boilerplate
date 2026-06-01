import { injectable, inject } from 'tsyringe';
import { UserRepository } from '@/repositories/user-repository';
import { TokenRepository } from '@/repositories/token-repository';
import { hashPassword } from '@/utils/password';
import { NotFoundException, GoneException } from '@/exceptions';

@injectable()
export class ResetPasswordService {
  constructor(
    @inject(UserRepository) private readonly userRepository: UserRepository,
    @inject(TokenRepository) private readonly tokenRepository: TokenRepository
  ) {}

  public async execute(data: { token: string; password: string }) {
    const { token, password } = data;

    const activeToken = await this.getActiveResetToken(token);
    await this.ensureTokenNotExpired(activeToken);
    await this.updateUserPassword(activeToken.userId, password);
    await this.consumeResetToken(activeToken.id);

    return {
      message: 'Password reset successfully',
    };
  }

  // Get Active Reset Token
  private async getActiveResetToken(token: string) {
    const activeToken = await this.tokenRepository.findActivePasswordResetToken(token);
    if (!activeToken) {
      throw new NotFoundException('Reset token not found or already used');
    }
    return activeToken;
  }

  // Ensure Token Not Expired
  private async ensureTokenNotExpired(activeToken: { id: string; expiresAt: Date }) {
    const isExpired = activeToken.expiresAt.getTime() < Date.now();
    if (isExpired) {
      await this.tokenRepository.revokeToken(activeToken.id);
      throw new GoneException('Reset token expired');
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
