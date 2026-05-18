import { z } from 'zod';
import '@/lib/openapi';

export const signupWithEmailSchema = z.object({
  body: z.object({
    name: z.string({ message: 'Name is required' }).min(2, 'Name must be at least 2 characters').optional().openapi({ example: 'John Doe' }),
    email: z.string({ message: 'Email is required' }).email('Invalid email format').openapi({ example: 'john@example.com' }),
    password: z
      .string({ message: 'Password is required' })
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
      .openapi({ example: 'SecurePass123!' }),
  }),
});

// OpenAPI Response
export const SignupSuccessResponseSchema = z.object({
  code: z.number().openapi({ example: 200 }),
  status: z.string().openapi({ example: 'success' }),
  message: z.string().openapi({ example: 'Created account successfully! Please verify your email.' }),
  data: z.object({
    user: z.object({
      id: z.string().uuid().openapi({ example: '1e9b28b6-9dfa-4573-b3c4-e692b15809bb' }),
      name: z.string().optional().openapi({ example: 'John Doe' }),
      email: z.string().email().openapi({ example: 'john@example.com' }),
    }),
  }),
});

export type SignupWithEmailInput = z.infer<typeof signupWithEmailSchema>['body'];
