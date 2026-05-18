import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import expressWinston from 'express-winston';
import { envConfig } from '@/config/env';
import { STAGES } from '@/constants/env';
import chalk from 'chalk';

const { combine, timestamp, json, colorize, printf, errors, uncolorize } = winston.format;

// Dev console printing helper with colorized timestamp (subtle gray)
const devFormat = printf(({ level, message, timestamp, stack }) => {
  return `${chalk.gray(timestamp)} [${level}]: ${stack || message}`;
});

const transports: winston.transport[] = [
  // 1. Console logging
  new winston.transports.Console({
    level: envConfig.STAGE === STAGES.Prod ? 'info' : 'debug',
    format:
      envConfig.STAGE === STAGES.Prod
        ? combine(timestamp(), errors({ stack: true }), json())
        : combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), colorize(), errors({ stack: true }), devFormat),
  }),
];

// 2. Production & Development file rotation logging
if (envConfig.STAGE === STAGES.Prod || process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'development') {
  transports.push(
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      level: 'error',
      format: combine(uncolorize(), timestamp(), errors({ stack: true }), json()),
    }),
    new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      level: 'info',
      format: combine(uncolorize(), timestamp(), errors({ stack: true }), json()),
    })
  );
}

// Instantiate core Winston logger
export const logger = winston.createLogger({
  level: envConfig.STAGE === STAGES.Prod ? 'info' : 'debug',
  format: combine(timestamp(), errors({ stack: true }), json()),
  transports,
});

// Express request logging middleware
export const requestLogger = expressWinston.logger({
  winstonInstance: logger,
  meta: true,
  msg: 'HTTP {{req.method}} {{req.url}} {{res.statusCode}} {{res.responseTime}}ms',
  expressFormat: false,
  colorize: envConfig.STAGE !== STAGES.Prod,
  ignoreRoute: req => req.url === '/' || req.url === '/favicon.ico',
});

// Express error logging middleware
export const errorLogger = expressWinston.errorLogger({
  winstonInstance: logger,
});
