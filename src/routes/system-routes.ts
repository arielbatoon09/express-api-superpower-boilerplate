import { z } from 'zod';
import { OpenApiRouter } from '@/lib/openapi-router';
import { generateCsrfToken } from '@/middlewares/csrf-middleware';
import { sendSuccess } from '@/utils/apiResponse';
import { envConfig } from '@/config/env';
import { RateLimitMiddleware } from '@/middlewares';

// System routes mounted under /api
const openApiRouter = new OpenApiRouter('/api');

const systemLimiter = RateLimitMiddleware.create({ max: 30, windowMs: 60000, keyPrefix: 'ratelimit:system' });

// Retrieve CSRF Token
openApiRouter.get({

  path: '/csrf-token',
  summary: 'Retrieve CSRF Token',
  description: 'Generates and returns a secure CSRF token for the frontend to include in the x-csrf-token header for state-mutating requests.',
  tags: ['System'],
  response: z.object({
    status: z.literal('success'),
    message: z.string(),
    data: z.object({
      csrfToken: z.string(),
    }),
  }),
  middlewares: [systemLimiter],
  handler: (req, res) => {
    const csrfToken = generateCsrfToken(req, res);
    sendSuccess({
      res,
      message: 'CSRF token generated successfully',
      data: { csrfToken },
    });
  },
});

// Health Check
openApiRouter.get({
  path: '/health',
  summary: 'Simple Health Check',
  description: 'Checks if the API instance is healthy and returns system stage and timestamp details.',
  tags: ['System'],
  response: z.object({
    status: z.literal('success'),
    message: z.string(),
    data: z.object({
      timestamp: z.string(),
      environment: z.string(),
    }),
  }),
  middlewares: [systemLimiter],
  handler: (req, res) => {
    sendSuccess({
      res,
      message: `${envConfig.APP_NAME} instance is healthy!`,
      data: {
        timestamp: new Date().toISOString(),
        environment: envConfig.STAGE === 'dev' ? 'Developments' : 'Production'
      },
    });
  },
});

export default openApiRouter.router;
