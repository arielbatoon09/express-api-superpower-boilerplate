import http from 'http';
import app from '@/app';
import { envConfig } from '@/config/env';
import { SocketService } from '@/services/socket/socket.service';
import chalk from 'chalk';

const startServer = () => {
  try {
    // 1. Create standard HTTP server around Express App
    const server = http.createServer(app);

    // 2. Initialize and attach Socket Service singleton
    SocketService.getInstance().init(server);

    // 3. Listen on port using HTTP Server (instead of express app directly)
    server.listen(envConfig.PORT, () => {
      const mode = envConfig.STAGE === 'prod' ? 'production' : 'development';

      console.log('');
      console.log(`  ${chalk.bold.cyan('▲')} ${chalk.bold(envConfig.APP_NAME)}`);
      console.log(`  ${chalk.gray('- Local:')}        ${chalk.cyan(envConfig.BACKEND_URL)}`);
      console.log(`  ${chalk.gray('- Environment:')}  ${mode}`);
      console.log(`  ${chalk.gray('- Port:')}         ${envConfig.PORT}`);
      console.log('');
      console.log(`  ${chalk.green('✓')} Ready in ${chalk.bold(mode)} mode.`);
      console.log('');
    });
  } catch (error) {
    console.error(chalk.red('❌ CRITICAL: Could not start the engine:'), error);
    process.exit(1);
  }
};

startServer();