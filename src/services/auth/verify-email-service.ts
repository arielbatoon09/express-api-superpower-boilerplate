import { injectable, inject } from 'tsyringe';
import { UserRepository } from '@/repositories/user-repository';
import { TokenRepository } from '@/repositories/token-repository';
import { logger } from '@/lib/logger';

@injectable()
export class VerifyEmailService {
  constructor(
    @inject(UserRepository) private readonly userRepository: UserRepository,
    @inject(TokenRepository) private readonly tokenRepository: TokenRepository
  ) {}

  public async execute(data: { token: string }) {
    const { token } = data;
    try {
      const record = await this.getAndVerifyActiveToken(token);
      const user = await this.getAssociatedUser(record.userId, record.id);

      if (user.emailVerifiedAt) {
        return {
          code: 200,
          status: 'success',
          message: 'Email already verified',
        };
      }

      await this.completeEmailVerification(user.id, record.id);

      return {
        code: 200,
        status: 'success',
        message: 'Verified Email Successfully!',
      };
    } catch (error: any) {
      // Intercept and return structured business logic exceptions directly
      const isBusinessException = 'code' in error && 'status' in error;
      if (isBusinessException) {
        return error;
      }

      // Log untracked database/network system failures securely
      logger.error(`VerifyEmailService failure: ${error.message}`, { error });
      return { code: 500, status: 'error', message: 'Unable to verify account' };
    }
  }

  // Retrieve active token and validate expiry
  private async getAndVerifyActiveToken(token: string) {
    const record = await this.tokenRepository.findActiveEmailVerificationToken(token);
    if (!record) {
      throw { code: 404, status: 'error', message: 'Verification token not found' };
    }

    if (record.expiresAt.getTime() < Date.now()) {
      await this.tokenRepository.revokeToken(record.id);
      throw { code: 410, status: 'error', message: 'Verification token expired' };
    }

    return record;
  }

  // Retrieve user associated with token
  private async getAssociatedUser(userId: string, tokenId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      await this.tokenRepository.revokeToken(tokenId);
      throw { code: 404, status: 'error', message: 'User not found for this token' };
    }
    return user;
  }

  // Perform the verification transaction
  private async completeEmailVerification(userId: string, tokenId: string): Promise<void> {
    await this.userRepository.markEmailVerified(userId);
    await this.tokenRepository.consumeToken(tokenId);
  }
}