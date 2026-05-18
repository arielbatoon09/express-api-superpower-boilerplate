import { z } from 'zod';
import '@/lib/openapi';

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string({ message: 'Email is required' }).email('Invalid email format').openapi({ example: 'johndoe@example.com' }),
  }),
});

export const ForgotPasswordSuccessResponseSchema = z.object({
  code: z.number().openapi({ example: 200 }),
  status: z.string().openapi({ example: 'success' }),
  message: z.string().openapi({ example: 'If that email is registered, we have sent a reset password link.' }),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>['body'];
