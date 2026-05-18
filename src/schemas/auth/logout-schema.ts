import { z } from 'zod';
import '@/lib/openapi';

export const logoutSchema = z.object({
  body: z.object({
    refreshToken: z.string().optional().openapi({ example: 'eyJhbGciOiJIUzI1NiIsIn...' }),
  }),
});

export const LogoutSuccessResponseSchema = z.object({
  code: z.number().openapi({ example: 200 }),
  status: z.string().openapi({ example: 'success' }),
  message: z.string().openapi({ example: 'Logged out successfully' }),
});

export type LogoutInput = z.infer<typeof logoutSchema>['body'];
