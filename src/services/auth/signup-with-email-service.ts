import crypto from 'crypto';
import { injectable, inject } from 'tsyringe';
import { UserRepository } from '@/repositories/user-repository';
import { TokenRepository } from '@/repositories/token-repository';
import { QueueService } from '@/services/redis/queue-service';
import { hashPassword } from '@/utils/password';
import { renderMailTemplate } from '@/utils/mail-template';
import { envConfig } from '@/config/env';
import { logger } from '@/lib/logger';

@injectable()
export class SignupWithEmailService {
  constructor(
    @inject(UserRepository) private readonly userRepository: UserRepository,
    @inject(TokenRepository) private readonly tokenRepository: TokenRepository,
    @inject(QueueService) private readonly queueService: QueueService
  ) {}

  public async execute(data: { name?: string | null; email: string; password: string }) {
    try {
      await this.ensureEmailIsUnique(data.email);
      const createdUser = await this.registerUser(data.name, data.email, data.password);
      await this.setupEmailVerification(createdUser.id, createdUser.name, createdUser.email);

      return {
        code: 200,
        status: 'success',
        message: 'Created account successfully! Please verify your email.',
        data: { user: createdUser },
      };
    } catch (error: any) {
      // Intercept and return structured business logic exceptions directly
      const isBusinessException = 'code' in error && 'status' in error;
      if (isBusinessException) {
        return error;
      }

      // Log untracked database/network system failures securely
      logger.error(`SignupWithEmailService failure: ${error.message}`, { error });
      return { code: 500, status: 'error', message: 'Unable to create account' };
    }
  }

  // Email checker if unique
  private async ensureEmailIsUnique(email: string): Promise<void> {
    const existing = await this.userRepository.findByEmail(email);
    if (existing) {
      throw { code: 409, status: 'error', message: 'Email already registered' };
    }
  }

  // Hash password and insert user data
  private async registerUser(name: string | null | undefined, email: string, password: string) {
    const hashedPassword = await hashPassword(password);
    return this.userRepository.create({
      name,
      email,
      password: hashedPassword,
    });
  }

  // Setup email verification process and enqueue email sending
  private async setupEmailVerification(userId: string, name: string | null, email: string): Promise<void> {
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15-minute verification window

    // Persist verification token record
    await this.tokenRepository.createEmailVerificationToken({
      userId,
      token,
      expiresAt,
    });

    // Compile email HTML via file template
    // const emailVerificationURL = `${envConfig.FRONTEND_URL}/verify-email?token=${encodeURIComponent(token)}`;
    const emailVerificationURL = `${envConfig.BACKEND_URL}/api/auth/v1/verify-email?token=${encodeURIComponent(token)}`;
    const html = renderMailTemplate('verify-email.html', {
      name: name ?? 'there',
      emailVerificationURL,
      expiresAt: expiresAt.toUTCString(),
    });

    // Delegate sending to the background queue asynchronously
    await this.queueService.addJob('mail-queue', 'send-verification-email', {
      to: email,
      subject: 'Verify your email address',
      html,
    });
  }
}