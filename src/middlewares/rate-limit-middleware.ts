import type { Request, Response, NextFunction } from 'express';
import { redis } from '@/lib/redis';
import { envConfig } from '@/config/env';
import { logger } from '@/lib/logger';
import { TooManyRequestsException } from '@/exceptions/too-many-requests.exception';
import { verifyAccessToken } from '@/lib/jwt';

export interface RateLimitOptions {
  windowMs?: number;
  max?: number;
  keyPrefix?: string;
  skip?: (req: Request) => boolean;
}

export class RateLimitMiddleware {
  public static create(options: RateLimitOptions = {}) {
    const windowMs = options.windowMs ?? envConfig.RATE_LIMIT_WINDOW_MS;
    const max = options.max ?? envConfig.RATE_LIMIT_MAX;
    const keyPrefix = options.keyPrefix ?? 'ratelimit';
    const skip = options.skip ?? (() => false);

    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      if (skip(req)) {
        return next();
      }

      // Resolve user or IP identifier
      const identifier = RateLimitMiddleware.resolveClientIdentifier(req);
      const key = `${keyPrefix}:${identifier}`;

      try {
        const now = Date.now();
        const clearBefore = now - windowMs;

        // Pipeline execution to keep operations atomic
        const multi = redis.multi();
        multi.zremrangebyscore(key, 0, clearBefore); // Clean older requests
        multi.zadd(key, now, `${now}-${Math.random()}`); // Add new hit
        multi.zcard(key); // Count active hits in current window
        multi.zrange(key, 0, 0); // Get oldest request in current window
        multi.pexpire(key, windowMs); // Auto-expire log key after window size

        const results = await multi.exec();
        if (!results) {
          throw new Error('Redis transaction returned empty result');
        }

        // Extract count from results array (results contains [err, val] pairs for each command)
        const count = results[2][1] as number;
        const oldestRange = results[3][1] as string[];

        // Calculate reset time and remaining hits
        const oldestTimestamp = oldestRange && oldestRange.length > 0
          ? parseInt(oldestRange[0].split('-')[0], 10)
          : now;
        const resetTimestamp = oldestTimestamp + windowMs;
        const resetSeconds = Math.ceil(resetTimestamp / 1000);
        const remaining = Math.max(0, max - count);

        // Apply rate limiting headers
        res.setHeader('X-RateLimit-Limit', max);
        res.setHeader('X-RateLimit-Remaining', remaining);
        res.setHeader('X-RateLimit-Reset', resetSeconds);

        if (count > max) {
          const retryAfter = Math.ceil((resetTimestamp - now) / 1000);
          res.setHeader('Retry-After', retryAfter);
          throw new TooManyRequestsException();
        }

        return next();
      } catch (error) {
        if (error instanceof TooManyRequestsException) {
          throw error;
        }
        // Fail-open strategy: log Redis failures but proceed with the request
        logger.error('RateLimitMiddleware: Redis transaction failed (fail-open enabled):', error);
        return next();
      }
    };
  }

  private static resolveClientIdentifier(req: Request): string {
    // 1. If AuthMiddleware has run first and attached req.user
    if ((req as any).user?.sub) {
      return `user:${(req as any).user.sub}`;
    }

    // 2. Fallback: Parse bearer token directly from header if it exists
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      const token = authHeader.substring(7).trim();
      try {
        const decoded = verifyAccessToken(token);
        if (decoded?.sub) {
          return `user:${decoded.sub}`;
        }
      } catch {
        // Continue to IP if token validation fails
      }
    }

    // 3. IP fallback (considers reverse proxy headers and Express config)
    const rawIp = req.ip ||
      (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      req.socket.remoteAddress ||
      'unknown';

    return `ip:${rawIp}`;
  }
}
