import { Worker, Job } from 'bullmq';
import { container } from '@/lib/container';
import { MailerService } from '@/services/mail/mailer';
import { envConfig } from '@/config/env';
import { logger } from '@/lib/logger';

/**
 * Initializes and starts the background BullMQ Worker for the 'mail-queue'.
 * Resolves dependencies dynamically from the central DI container.
 */
export function initMailWorker() {
  logger.info('Worker: Initializing Background Mail Worker...');

  // Safely resolve MailerService from the container
  const mailerService = container.resolve(MailerService);

  const worker = new Worker(
    'mail-queue',
    async (job: Job) => {
      logger.info(`Worker: Started processing job [${job.name}] with ID: ${job.id}`);

      if (job.name === 'send-verification-email') {
        const { to, subject, html } = job.data;

        // Execute mail sending using our production MailerService
        await mailerService.send({ to, subject, html });
      } else {
        logger.warn(`Worker: Unknown job type [${job.name}] ignored.`);
      }
    },
    {
      connection: {
        url: envConfig.REDIS_URL,
        maxRetriesPerRequest: null,
      },
      concurrency: 5, // Allow up to 5 concurrent SMTP connection sends
    }
  );

  // Attach execution lifecycle hooks for audit tracing
  worker.on('completed', job => {
    logger.info(`Worker: Job [${job.id}] completed successfully.`);
  });

  worker.on('failed', (job, error) => {
    logger.error(`Worker: Job [${job?.id}] failed: ${error.message}`, { error });
  });

  worker.on('error', error => {
    logger.error(`Worker: Core worker error encountered: ${error.message}`, { error });
  });

  // Support seamless zero-downtime graceful shutdown sequences
  process.on('SIGTERM', async () => {
    logger.info('Worker: SIGTERM signal received. Initiating graceful shutdown...');
    await worker.close();
    logger.info('Worker: Gracefully stopped.');
  });

  process.on('SIGINT', async () => {
    logger.info('Worker: SIGINT signal received. Initiating graceful shutdown...');
    await worker.close();
    logger.info('Worker: Gracefully stopped.');
  });
}
