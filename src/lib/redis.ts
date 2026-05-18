import Redis from 'ioredis';
import { envConfig } from '@/config/env';
import { logger } from '@/lib/logger';

// Instantiate production-ready Redis connection client
const redis = new Redis(envConfig.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 10) {
      logger.error('Redis: Reconnection retries exhausted. Ceasing reconnect attempts.');
      return null; // Stop reconnecting after 10 attempts
    }
    const delay = Math.min(times * 150, 3000); // Exponential backoff: 150ms, 300ms, 450ms... up to 3s
    logger.warn(`Redis: Connection lost. Reconnect attempt #${times} in ${delay}ms...`);
    return delay;
  },
});

// Resilient Event Listeners to prevent process termination
redis.on('connect', () => {
  logger.info('Redis: TCP connection established.');
});

redis.on('ready', () => {
  logger.info('Redis: Client successfully initialized and ready to receive queries.');
});

redis.on('error', error => {
  logger.error('Redis: Client connection encountered an error:', error);
});

redis.on('close', () => {
  logger.warn('Redis: Connection closed.');
});

export { redis };
