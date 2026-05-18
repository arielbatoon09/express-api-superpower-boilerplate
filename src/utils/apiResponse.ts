import type { Response } from 'express';
import { logger } from '@/lib/logger';
import { envConfig } from '@/config/env';
import { STAGES } from '@/constants/env';
import chalk from 'chalk';

interface SuccessResponseOptions {
  res: Response;
  message: string;
  data?: any;
  statusCode?: number;
}

interface ErrorResponseOptions {
  res: Response;
  message: string;
  statusCode?: number;
  error?: any;
  errors?: any[];
}

/**
 * Sends a structured success API response and logs it automatically.
 */
export const sendSuccess = ({ res, message, data, statusCode = 200 }: SuccessResponseOptions) => {
  logger.info(`${chalk.green(`Success [${statusCode}]`)}: ${message}`, {
    statusCode,
    hasData: !!data,
  });

  return res.status(statusCode).json({
    status: 'success',
    message,
    ...(data !== undefined && { data }),
  });
};

/**
 * Sends a structured error API response, logs details / stack trace, and hides details in production.
 */
export const sendError = ({ res, message, statusCode = 500, error, errors }: ErrorResponseOptions) => {
  // Log full error details inside Winston daily logs
  logger.error(`${chalk.red(`Error [${statusCode}]`)}: ${message}`, {
    statusCode,
    error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
  });

  const isProduction = envConfig.STAGE === STAGES.Prod;

  return res.status(statusCode).json({
    status: 'error',
    message: isProduction && statusCode === 500 ? 'Internal Server Error' : message,
    ...(errors !== undefined && { errors }),
    ...(!isProduction &&
      error && {
        details: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      }),
  });
};
