import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { envConfig } from '@/config/env';
import { requestLogger, errorLogger } from '@/lib/logger';
import { sendSuccess, sendError } from '@/utils/apiResponse';
import apiRouter from '@/routes';
import { swaggerUi, generateOpenApiDocument } from '@/lib/openapi';

const app = express();

// --- Core Middleware ---
app.use(requestLogger);

app.use(
  cors({
    origin: envConfig.FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --- API Routing ---
app.use('/api', apiRouter);

// --- Interactive Swagger API Explorer ---
// We dynamically generate the schema document after apiRouter is imported
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(generateOpenApiDocument()));

// --- Simple Health Check ---
app.get('/', (req: Request, res: Response) => {
  sendSuccess({
    res,
    message: `${envConfig.APP_NAME} instance is healthy`,
    data: {
      timestamp: new Date().toISOString(),
      environment: envConfig.STAGE,
    },
  });
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
  const statusCode = err.status || 500;

  sendError({
    res,
    message: err.message || 'Internal Server Error',
    statusCode,
    error: err,
  });
});

export default app;
