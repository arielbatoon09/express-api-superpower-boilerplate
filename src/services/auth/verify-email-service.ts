import { injectable, inject } from 'tsyringe';
import { UserRepository } from '@/repositories/user-repository';
import { TokenRepository } from '@/repositories/token-repository';
import { NotFoundException, GoneException } from '@/exceptions';

@injectable()
export class VerifyEmailService {
  constructor(
    @inject(UserRepository) private readonly userRepository: UserRepository,
    @inject(TokenRepository) private readonly tokenRepository: TokenRepository
  ) {}

  public async execute(data: { token: string }) {
    const { token } = data;

    const record = await this.getAndVerifyActiveToken(token);
    const user = await this.getAssociatedUser(record.userId, record.id);

    if (user.emailVerifiedAt) {
      return {
        message: 'Email already verified',
      };
    }

    await this.completeEmailVerification(user.id, record.id);

    return {
      message: 'Verified Email Successfully!',
    };
  }

  // Retrieve active token and validate expiry
  private async getAndVerifyActiveToken(token: string) {
    const record = await this.tokenRepository.findActiveEmailVerificationToken(token);
    if (!record) {
      throw new NotFoundException('Verification token not found');
    }

    if (record.expiresAt.getTime() < Date.now()) {
      await this.tokenRepository.revokeToken(record.id);
      throw new GoneException('Verification token expired');
    }

    return record;
  }

  // Retrieve user associated with token
  private async getAssociatedUser(userId: string, tokenId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      await this.tokenRepository.revokeToken(tokenId);
      throw new NotFoundException('User not found for this token');
    }
    return user;
  }

  // Perform the verification transaction
  private async completeEmailVerification(userId: string, tokenId: string): Promise<void> {
    await this.userRepository.markEmailVerified(userId);
    await this.tokenRepository.consumeToken(tokenId);
  }
}
