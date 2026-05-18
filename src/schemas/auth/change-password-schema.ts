import { z } from 'zod';
import '@/lib/openapi';

export const changePasswordSchema = z.object({
  body: z
    .object({
      currentPassword: z
        .string({ message: 'Current password is required' })
        .min(1, 'Current password is required')
        .openapi({ example: 'SecurePass123!' }),
      newPassword: z
        .string({ message: 'New password is required' })
        .min(8, 'New password must be at least 8 characters')
        .regex(/[A-Z]/, 'New password must contain at least one uppercase letter')
        .regex(/[0-9]/, 'New password must contain at least one number')
        .regex(/[^A-Za-z0-9]/, 'New password must contain at least one special character')
        .openapi({ example: 'SecureNewPass123!' }),
      confirmNewPassword: z.string({ message: 'Confirm new password is required' }).openapi({ example: 'SecureNewPass123!' }),
    })
    .refine(data => data.newPassword === data.confirmNewPassword, {
      message: 'New passwords do not match',
      path: ['confirmNewPassword'],
    }),
});

export const ChangePasswordSuccessResponseSchema = z.object({
  code: z.number().openapi({ example: 200 }),
  status: z.string().openapi({ example: 'success' }),
  message: z.string().openapi({ example: 'Password changed successfully' }),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>['body'];
