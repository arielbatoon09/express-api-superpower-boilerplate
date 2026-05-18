import { config } from 'dotenv';
import { z } from 'zod';
import { STAGES } from '@/constants/env';
import chalk from 'chalk';

config();

export function isTest() {
  return process.env.NODE_ENV === 'test';
}

const envSchema = z.object({
  APP_NAME: z.string().default('Express API Boilerplate'),
  PORT: z.coerce.number().default(8000),
  STAGE: z.nativeEnum(STAGES).default(STAGES.Dev),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.preprocess(
    val => (val === '' || val === undefined ? 'redis://127.0.0.1:6379' : val),
    z.string().url()
  ),
  BACKEND_URL: z.string().url().default('http://localhost:8000'),
  GEMINI_API_KEY: z.string().optional(),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().optional(),
});

const parseEnvironment = () => {
  try {
    return envSchema.parse({
      APP_NAME: process.env.APP_NAME,
      PORT: process.env.PORT,
      STAGE:
        process.env.STAGE || (process.env.NODE_ENV === 'production' ? STAGES.Prod : STAGES.Dev),
      DATABASE_URL: process.env.DATABASE_URL,
      REDIS_URL: process.env.REDIS_URL,
      BACKEND_URL: process.env.BACKEND_URL,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      JWT_SECRET: process.env.JWT_SECRET,
      FRONTEND_URL: process.env.FRONTEND_URL,
      SMTP_HOST: process.env.SMTP_HOST,
      SMTP_PORT: process.env.SMTP_PORT,
      SMTP_USER: process.env.SMTP_USER,
      SMTP_PASSWORD: process.env.SMTP_PASSWORD,
      SMTP_FROM: process.env.SMTP_FROM,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('\n' + chalk.bold.red('  ▲ Environment Variable Validation Failed'));
      console.error(chalk.gray('  --------------------------------------------------'));
      error.issues.forEach(err => {
        const path = err.path.join('.');
        console.error(`  - ${chalk.bold.red(path)}: ${err.message}`);
      });
      console.error(chalk.gray('  --------------------------------------------------\n'));
    } else {
      console.error(chalk.red('❌ Unknown configuration error:'), error);
    }
    process.exit(1);
  }
};

const parsedEnv = parseEnvironment();

// Resolve and set DATABASE_URL globally for Prisma
process.env.DATABASE_URL = parsedEnv.DATABASE_URL;

export const envConfig = {
  ...parsedEnv,
};

export type EnvConfig = typeof envConfig;
