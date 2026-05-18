import http from 'http';
import app from '@/app';
import { envConfig } from '@/config/env';
import { SocketService } from '@/services/socket/socket.service';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import chalk from 'chalk';

const startServer = () => {
  try {
    // 1. Create standard HTTP server around Express App
    const server = http.createServer(app);

    // 2. Initialize and attach Socket Service singleton
    SocketService.getInstance().init(server);

    // 3. Connect to Database (Non-blocking startup check for serverful resilience)
    prisma.$connect().then(() => {
        logger.info('Database connected successfully.');
    }).catch((error) => {
        logger.error('CRITICAL: Database connection failed on startup:', error);
    });

    // 4. Listen on port using HTTP Server
    server.listen(envConfig.PORT, () => {
      const mode = envConfig.STAGE === 'prod' ? 'Production' : 'Development';

      console.log('');
      console.log(`  ${chalk.bold.cyan('▲')} ${chalk.bold(envConfig.APP_NAME)}`);
      console.log(`  ${chalk.gray('- URL:')}            ${chalk.cyan(envConfig.BACKEND_URL)}`);
      console.log(`  ${chalk.gray('- Environment:')}    ${mode}`);
      console.log(`  ${chalk.gray('- Port:')}           ${envConfig.PORT}`);
      console.log('');
      console.log(`  ${chalk.green('✓')} Ready in ${chalk.bold(mode)} mode.`);
      console.log('');
    });
  } catch (error) {
    console.error(chalk.red('CRITICAL: Could not start the engine:'), error);
    process.exit(1);
  }
};

startServer();