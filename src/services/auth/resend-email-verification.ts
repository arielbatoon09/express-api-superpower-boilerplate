import crypto from 'crypto';
import { injectable, inject } from 'tsyringe';
import { UserRepository } from '@/repositories/user-repository';
import { TokenRepository } from '@/repositories/token-repository';
import { QueueService } from '@/services/redis/queue-service';
import { renderMailTemplate } from '@/utils/mail-template';
import { envConfig } from '@/config/env';
import { NotFoundException, BadRequestException } from '@/exceptions';

@injectable()
export class ResendEmailVerificationService {
  constructor(
    @inject(UserRepository) private readonly userRepository: UserRepository,
    @inject(TokenRepository) private readonly tokenRepository: TokenRepository,
    @inject(QueueService) private readonly queueService: QueueService
  ) {}

  public async execute(data: { email: string }) {
    const { email } = data;

    const user = await this.getUserByEmail(email);

    // Email already verified — return early with success (not an error)
    if (user.emailVerifiedAt) {
      return { message: 'Email already verified' };
    }

    await this.ensureNoActiveToken(user.id);

    // Keep token table thin by garbage collecting unneeded tokens
    await this.tokenRepository.cleanupInvalidTokensByUser(user.id);

    // Generate, persist, and enqueue verification email dispatch
    await this.generateAndSendVerificationEmail(user.id, user.name, user.email);

    return {
      message: 'Verification email resent successfully',
    };
  }

  // Get User By Email
  private async getUserByEmail(email: string) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  // Ensure No Active Token
  private async ensureNoActiveToken(userId: string) {
    const previousToken = await this.tokenRepository.findLatestEmailVerificationTokenByUser(userId);
    if (previousToken) {
      const isStillValid = previousToken.expiresAt.getTime() > Date.now();
      if (isStillValid) {
        throw new BadRequestException('Current verification link is still valid');
      }
    }
  }

  // Generate & Send Verification Email
  private async generateAndSendVerificationEmail(userId: string, name: string | null, email: string) {
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await this.tokenRepository.createEmailVerificationToken({
      userId,
      token,
      expiresAt,
    });

    const emailVerificationURL = `${envConfig.BACKEND_URL}/api/auth/v1/verify-email?token=${encodeURIComponent(token)}`;

    const html = renderMailTemplate('verify-email.html', {
      name: name ?? 'there',
      emailVerificationURL,
      expiresAt: expiresAt.toUTCString(),
    });

    await this.queueService.addJob('mail-queue', 'send-verification-email', {
      to: email,
      subject: 'Verify your email address',
      html,
    });
  }
}
