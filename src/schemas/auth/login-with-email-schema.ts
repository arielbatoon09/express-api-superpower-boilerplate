import { z } from 'zod';
import '@/lib/openapi';

export const loginWithEmailSchema = z.object({
  body: z.object({
    email: z.email('Invalid email format').openapi({ example: 'johndoe@example.com' }),
    password: z.string().min(1, 'Password is required').openapi({ example: 'SecurePass123!' }),
  }),
});

export const LoginSuccessResponseSchema = z.object({
  code: z.number().openapi({ example: 200 }),
  status: z.string().openapi({ example: 'success' }),
  message: z.string().openapi({ example: 'Logged in successfully' }),
  data: z.object({
    user: z.object({
      id: z.string().uuid().openapi({ example: '1e9b28b6-9dfa-4573-b3c4-e692b15809bb' }),
      name: z.string().nullable().optional().openapi({ example: 'John Doe' }),
      email: z.string().email().openapi({ example: 'john@example.com' }),
      role: z.string().openapi({ example: 'USER' }),
      emailVerifiedAt: z.date().nullable().optional().openapi({ example: '2026-05-18T12:00:00.000Z' }),
      image: z.string().nullable().optional().openapi({ example: 'https://example.com/avatar.png' }),
    }),
    tokens: z.object({
      accessToken: z.string().openapi({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }),
      refreshToken: z.string().optional().openapi({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }),
      expiresIn: z.string().openapi({ example: '15m' }),
      refreshExpiresIn: z.string().optional().openapi({ example: '7d' }),
    }),
  }),
});

export type LoginWithEmailInput = z.infer<typeof loginWithEmailSchema>['body'];
