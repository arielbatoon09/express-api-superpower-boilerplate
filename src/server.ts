import app from '@/app';
import { envConfig } from '@/config/env';

const startServer = () => {
  try {
    app.listen(envConfig.PORT, () => {
      console.log('--------------------------------------------------');
      console.log(`🚀 ${envConfig.APP_NAME} started successfully!`);
      console.log(`📡 URL: ${envConfig.BACKEND_URL}`);
      console.log(`🌍 MODE: ${envConfig.STAGE === 'prod' ? 'Production' : 'Development'}`);
      console.log('--------------------------------------------------');
    });
  } catch (error) {
    console.error('❌ CRITICAL: Could not start the engine:', error);
    process.exit(1);
  }
};

startServer();
