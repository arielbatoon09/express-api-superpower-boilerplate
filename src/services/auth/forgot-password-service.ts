import crypto from 'crypto';
import { injectable, inject } from 'tsyringe';
import { UserRepository } from '@/repositories/user-repository';
import { TokenRepository } from '@/repositories/token-repository';
import { QueueService } from '@/services/redis/queue-service';
import { renderMailTemplate } from '@/utils/mail-template';
import { envConfig } from '@/config/env';
import { BadRequestException } from '@/exceptions';

@injectable()
export class ForgotPasswordService {
  constructor(
    @inject(UserRepository) private readonly userRepository: UserRepository,
    @inject(TokenRepository) private readonly tokenRepository: TokenRepository,
    @inject(QueueService) private readonly queueService: QueueService
  ) {}

  public async execute(data: { email: string }) {
    const { email } = data;

    const user = await this.userRepository.findByEmail(email);

    // Not found user still show success to avoid email harvesting
    if (!user) {
      return {
        message: 'If that email is registered, we have sent a reset password link.',
      };
    }

    await this.ensureNoActiveToken(user.id);

    // Clean up any stale reset tokens first
    await this.tokenRepository.cleanupInvalidTokensByUser(user.id);

    // Generate secure 15-minute token
    await this.generateAndSendResetEmail(user.id, user.name, user.email);

    return {
      message: 'If that email is registered, we have sent a reset password link.',
    };
  }

  // Ensure No Active Token
  private async ensureNoActiveToken(userId: string) {
    const previousToken = await this.tokenRepository.findLatestPasswordResetTokenByUser(userId);
    if (previousToken) {
      const isStillValid = previousToken.expiresAt.getTime() > Date.now();
      if (isStillValid) {
        throw new BadRequestException('Current password reset link is still valid');
      }
    }
  }

  // Generate And Send Reset Email
  private async generateAndSendResetEmail(userId: string, name: string | null, email: string) {
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await this.tokenRepository.createPasswordResetToken({
      userId,
      token,
      expiresAt,
    });

    const resetPasswordURL = `${envConfig.BACKEND_URL}/api/auth/v1/reset-password?token=${encodeURIComponent(token)}`;

    const html = renderMailTemplate('reset-password.html', {
      name: name ?? 'there',
      resetPasswordURL,
      expiresAt: expiresAt.toUTCString(),
    });

    await this.queueService.addJob('mail-queue', 'send-reset-password-email', {
      to: email,
      subject: 'Reset your password',
      html,
    });
  }
}
