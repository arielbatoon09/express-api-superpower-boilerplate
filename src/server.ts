import 'reflect-metadata';
import http from 'http';
import app from '@/app';
import { envConfig } from '@/config/env';
import { SocketService } from '@/services/socket/socket-service';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { logger } from '@/lib/logger';
import chalk from 'chalk';
import { initMailWorker } from '@/workers/mail-worker';
import { container } from '@/lib/container';
import { QueueService } from '@/services/redis/queue-service';

const startServer = () => {
  try {
    const server = http.createServer(app);
    SocketService.getInstance().init(server);

    // --- Database Connection ---
    prisma
      .$connect()
      .then(() => {
        logger.info('Database connected successfully.');
      })
      .catch(error => {
        logger.error('CRITICAL: Database connection failed on startup:', error);
      });

    // --- Redis Connection ---
    redis
      .ping()
      .then(() => {
        logger.info('Redis connected successfully.');
        initMailWorker();
      })
      .catch(error => {
        logger.error('CRITICAL: Redis connection failed on startup:', error);
      });

    // --- HTTP Server Start ---
    server.listen(envConfig.PORT, () => {
      const mode = envConfig.STAGE === 'prod' ? 'Production' : 'Development';

      console.log('');
      console.log(`  ${chalk.bold.cyan('▲')} ${chalk.bold(envConfig.APP_NAME)}`);
      console.log(`  ${chalk.gray('- URL:')}            ${chalk.cyan(envConfig.BACKEND_URL)}`);
      console.log(`  ${chalk.gray('- API Docs:')}       ${chalk.cyan(`${envConfig.BACKEND_URL}/api/docs`)}`);
      console.log(`  ${chalk.gray('- Environment:')}    ${mode}`);
      console.log(`  ${chalk.gray('- Port:')}           ${envConfig.PORT}`);
      console.log('');
      console.log(`  ${chalk.green('✓')} Ready in ${chalk.bold(mode)} mode.`);
      console.log('');
    });

    // --- Graceful Shutdown Handlers ---
    const handleShutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);

      // Stop accepting new HTTP connections
      server.close(() => {
        logger.info('HTTP server connection pool closed.');
      });

      try {
        // Disconnect from PostgreSQL database safely
        await prisma.$disconnect();
        logger.info('Prisma Database client disconnected.');

        // Disconnect standard Redis client safely
        await redis.quit();
        logger.info('Redis cache client disconnected.');

        // Resolve and close all BullMQ connections safely
        const queueService = container.resolve(QueueService);
        await queueService.closeAll();
        logger.info('All BullMQ connections closed.');

        logger.info('Graceful shutdown sequence completed. Exiting process safely.');
        process.exit(0);
      } catch (error) {
        logger.error('Error occurred during graceful shutdown sequence:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
  } catch (error) {
    console.error(chalk.red('CRITICAL: Could not start the engine:'), error);
    process.exit(1);
  }
};

startServer();
