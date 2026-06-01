import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import hpp from 'hpp';
import { envConfig } from '@/config/env';
import { requestLogger, errorLogger, logger } from '@/lib/logger';
import { sendError } from '@/utils/apiResponse';
import apiRouter from '@/routes';
import { swaggerUi, generateOpenApiDocument } from '@/lib/openapi';
import { doubleCsrfProtection } from '@/middlewares/csrf-middleware';
import { HttpException } from '@/exceptions';
import { RateLimitMiddleware } from '@/middlewares';

const app = express();

// Enable reverse proxy trust to get accurate client IP address
app.set('trust proxy', true);

// --- Core Middleware ---
app.use(helmet());
app.use(requestLogger);
app.use(cors({ origin: envConfig.FRONTEND_URL, credentials: true }));

// --- Global Rate Limiting ---
app.use(RateLimitMiddleware.create());

// --- Parse incoming requests ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(hpp());
app.use(cookieParser());

// --- CSRF Protection ---
app.use(doubleCsrfProtection);


// --- API Routing ---
app.use('/api', apiRouter);

// --- Interactive Swagger API Explorer ---
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(generateOpenApiDocument()));

// --- Redirect Root to API Docs ---
app.get('/', (_req: Request, res: Response) => {
  res.redirect('/api/docs');
});

// --- 404 Handler ---
app.use((req: Request, res: Response) => {
  sendError({
    res,
    message: `Cannot ${req.method} ${req.originalUrl}`,
    statusCode: 404,
  });
});

// --- Error Logger ---
app.use(errorLogger);

// --- Global Error Handler ---
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  // Catch CSRF validation errors from csrf-csrf
  if ('code' in err && (err as any).code === 'EBADCSRFTOKEN') {
    return sendError({
      res,
      message: 'Invalid or missing CSRF token. Request blocked.',
      statusCode: 403,
    });
  }

  // Known application exceptions (proper class hierarchy)
  if (err instanceof HttpException) {
    return sendError({
      res,
      message: err.message,
      statusCode: err.statusCode,
      errors: err.errors,
    });
  }

  // Unexpected system errors
  logger.error('Unhandled error:', err);
  sendError({
    res,
    message: 'Internal Server Error',
    statusCode: 500,
    error: err,
  });
});

export default app;
