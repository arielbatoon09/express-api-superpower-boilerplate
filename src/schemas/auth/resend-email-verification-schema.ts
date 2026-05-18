import { z } from 'zod';
import '@/lib/openapi';

export const resendEmailVerificationSchema = z.object({
  body: z.object({
    email: z.email('Invalid email format').openapi({ example: 'johndoe@example.com' }),
  }),
});

export const ResendVerificationSuccessResponseSchema = z.object({
  code: z.number().openapi({ example: 200 }),
  status: z.string().openapi({ example: 'success' }),
  message: z.string().openapi({ example: 'Verification email resent successfully' }),
  data: z.object({}),
});

export type ResendEmailVerificationInput = z.infer<typeof resendEmailVerificationSchema>['body'];
