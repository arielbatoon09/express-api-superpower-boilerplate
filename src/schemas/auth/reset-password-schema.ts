import { z } from 'zod';
import '@/lib/openapi';

export const resetPasswordSchema = z.object({
  body: z
    .object({
      token: z.string({ message: 'Token is required' }).uuid('Invalid token format').openapi({ example: '1e9b28b6-9dfa-4573-b3c4-e692b15809bb' }),
      password: z
        .string({ message: 'Password is required' })
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number')
        .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
        .openapi({ example: 'SecureNewPass123!' }),
      confirmPassword: z.string({ message: 'Confirm password is required' }).openapi({ example: 'SecureNewPass123!' }),
    })
    .refine(data => data.password === data.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    }),
});

export const ResetPasswordSuccessResponseSchema = z.object({
  code: z.number().openapi({ example: 200 }),
  status: z.string().openapi({ example: 'success' }),
  message: z.string().openapi({ example: 'Password reset successfully' }),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>['body'];
