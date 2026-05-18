import { redis } from '@/lib/redis';
import { logger } from '@/lib/logger';

export class RedisService {
  /**
   * Set a value in the cache with an optional expiration time in seconds
   */
  public static async set<T = any>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      const stringifiedValue = JSON.stringify(value);
      if (ttlSeconds) {
        await redis.set(key, stringifiedValue, 'EX', ttlSeconds);
      } else {
        await redis.set(key, stringifiedValue);
      }
    } catch (error) {
      logger.error(`RedisService: Failed to SET key [${key}]:`, error);
    }
  }

  /**
   * Retrieve a parsed value from the cache
   */
  public static async get<T = any>(key: string): Promise<T | null> {
    try {
      const cachedValue = await redis.get(key);
      if (!cachedValue) return null;
      return JSON.parse(cachedValue) as T;
    } catch (error) {
      logger.error(`RedisService: Failed to GET key [${key}]:`, error);
      return null;
    }
  }

  /**
   * Delete a key from the cache
   */
  public static async del(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      logger.error(`RedisService: Failed to DEL key [${key}]:`, error);
    }
  }

  /**
   * Check if a key exists in the cache
   */
  public static async exists(key: string): Promise<boolean> {
    try {
      const count = await redis.exists(key);
      return count === 1;
    } catch (error) {
      logger.error(`RedisService: Failed to check EXISTS for key [${key}]:`, error);
      return false;
    }
  }
}
