import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import hpp from 'hpp';
import { envConfig } from '@/config/env';
import { requestLogger, errorLogger } from '@/lib/logger';
import { sendError } from '@/utils/apiResponse';
import apiRouter from '@/routes';
import { swaggerUi, generateOpenApiDocument } from '@/lib/openapi';
import { doubleCsrfProtection } from '@/middlewares/csrf-middleware';

const app = express();

// --- Core Middleware ---
app.use(helmet()); // Secure HTTP headers
app.use(requestLogger);

app.use(
  cors({
    origin: envConfig.FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(hpp()); // HTTP Parameter Pollution protection
app.use(cookieParser());

// --- CSRF Protection ---
// Validates the CSRF token on all state-mutating requests (POST, PUT, DELETE, etc.)
app.use(doubleCsrfProtection);

// --- API Routing ---
app.use('/api', apiRouter);

// --- Interactive Swagger API Explorer ---
// Dynamically generate the schema document after apiRouter is imported
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(generateOpenApiDocument()));

// --- Redirect Root to API Docs ---
app.get('/', (req: Request, res: Response) => {
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
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  // Specifically catch CSRF validation errors from csrf-csrf
  if (err.code === 'EBADCSRFTOKEN') {
    return sendError({
      res,
      message: 'Invalid or missing CSRF token. Request blocked.',
      statusCode: 403,
    });
  }

  const statusCode = err.status || 500;

  sendError({
    res,
    message: err.message || 'Internal Server Error',
    statusCode,
    error: err,
  });
});

export default app;
