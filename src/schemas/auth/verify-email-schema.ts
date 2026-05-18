import { z } from 'zod';
import '@/lib/openapi';

export const verifyEmailSchema = z.object({
  query: z.object({
    token: z.string().uuid('Invalid verification token format'),
  }),
});

export const VerifyEmailSuccessResponseSchema = z.object({
  code: z.number().openapi({ example: 200 }),
  status: z.string().openapi({ example: 'success' }),
  message: z.string().openapi({ example: 'Email verified successfully' }),
});

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>['query'];
