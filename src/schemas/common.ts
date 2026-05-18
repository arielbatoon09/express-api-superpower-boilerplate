import { z } from 'zod';

export const StandardErrorResponseSchema = z.object({
  code: z.number().openapi({ example: 400 }),
  status: z.string().openapi({ example: 'error' }),
  message: z.string().openapi({ example: 'Invalid payload input data' }),
});

export const ServerErrorResponseSchema = z.object({
  code: z.number().openapi({ example: 500 }),
  status: z.string().openapi({ example: 'error' }),
  message: z.string().openapi({ example: 'Unexpected database or internal system error.' }),
});

export const ConflictErrorResponseSchema = z.object({
  code: z.number().openapi({ example: 409 }),
  status: z.string().openapi({ example: 'error' }),
  message: z.string().openapi({ example: 'Resource already exists.' }),
});
