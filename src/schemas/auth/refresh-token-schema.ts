import { z } from 'zod';
import '@/lib/openapi';

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().optional().openapi({ example: 'eyJhbGciOiJIUzI1NiIsIn...' }),
  }),
});

export const RefreshTokenSuccessResponseSchema = z.object({
  code: z.number().openapi({ example: 200 }),
  status: z.string().openapi({ example: 'success' }),
  message: z.string().openapi({ example: 'Tokens refreshed successfully' }),
  data: z.object({
    tokens: z.object({
      accessToken: z.string().openapi({ example: 'eyJhbGciOiJIUzI1NiIsIn...' }),
      refreshToken: z.string().optional().openapi({ example: 'eyJhbGciOiJIUzI1NiIsIn...' }),
      expiresIn: z.string().openapi({ example: '15m' }),
      refreshExpiresIn: z.string().optional().openapi({ example: '7d' }),
    }),
  }),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>['body'];
