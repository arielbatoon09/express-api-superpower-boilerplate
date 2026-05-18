import { container } from '@/lib/container';
import { AuthController } from '@/controllers/auth-controller';
import {
  signupWithEmailSchema,
  SignupSuccessResponseSchema,
  verifyEmailSchema,
  VerifyEmailSuccessResponseSchema,
  loginWithEmailSchema,
  LoginSuccessResponseSchema,
} from '@/schemas/auth';
import { OpenApiRouter } from '@/lib/openapi-router';

const openApiRouter = new OpenApiRouter('/api/auth');
const authController = container.resolve(AuthController);

// Sign Up with Email
openApiRouter.post({
  path: '/v1/signup',
  summary: 'Signup a new user with Email',
  description: 'Validates request payloads, hashes credentials securely, persists the user profile, and queues verification emails asynchronously.',
  tags: ['Authentication'],
  request: signupWithEmailSchema,
  response: SignupSuccessResponseSchema,
  errors: [400, 409, 500],
  handler: authController.signupWithEmail,
});

// Verify Email
openApiRouter.get({
  path: '/v1/verify-email',
  summary: 'Verify email address',
  description: 'Verifies an email address using a one-time token sent to the user.',
  tags: ['Authentication'],
  request: verifyEmailSchema,
  response: VerifyEmailSuccessResponseSchema,
  errors: [400, 401, 500],
  handler: authController.verifyEmail,
});

// Login with Email
openApiRouter.post({
  path: '/v1/login',
  summary: 'Login a user with Email',
  description: 'Validates login credentials and returns a Access/Refresh token pair if successful.',
  tags: ['Authentication'],
  request: loginWithEmailSchema,
  response: LoginSuccessResponseSchema,
  errors: [400, 401, 500],
  handler: authController.loginWithEmail,
});

export default openApiRouter.router;
