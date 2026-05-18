import { injectable } from 'tsyringe';
import nodemailer, { Transporter } from 'nodemailer';
import { envConfig } from '@/config/env';
import { logger } from '@/lib/logger';

export type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
};

@injectable()
export class MailerService {
  private transporter: Transporter | null = null;

  constructor() {
    logger.info('MailerService initialized');
  }

  /**
   * Lazily builds and retrieves the Nodemailer SMTP transporter.
   */
  private getTransporter(): Transporter {
    if (this.transporter) {
      return this.transporter;
    }

    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = envConfig;

    if (!SMTP_HOST) {
      throw new Error('SMTP_HOST must be configured in environment variables');
    }

    const isSecure = SMTP_PORT === 465;

    const transportConfig: any = {
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: isSecure,
    };

    if (SMTP_USER && SMTP_PASSWORD) {
      transportConfig.auth = {
        user: SMTP_USER,
        pass: SMTP_PASSWORD,
      };
    }

    this.transporter = nodemailer.createTransport(transportConfig);
    return this.transporter;
  }

  /**
   * Sends a standardized email wrapped in production logging and try-catch safety.
   */
  public async send({ to, subject, html }: SendEmailParams): Promise<void> {
    const fromName = envConfig.APP_NAME || 'Express Boilerplate';
    const fromEmail = envConfig.SMTP_FROM || 'no-reply@example.com';

    try {
      logger.info(`Attempting to send email to: ${to} | Subject: "${subject}"`);

      const info = await this.getTransporter().sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject,
        html,
      });

      logger.info(`Email successfully sent to: ${to}. MessageId: ${info.messageId}`);
    } catch (error: any) {
      logger.error(`Failed to send email to ${to}: ${error.message}`, { error });
      throw new Error(`Email delivery failed: ${error.message}`, { cause: error });
    }
  }
}
