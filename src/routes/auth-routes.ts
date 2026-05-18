import { container } from '@/lib/container';
import { AuthController } from '@/controllers/auth-controller';
import {
  signupWithEmailSchema,
  SignupSuccessResponseSchema,
  verifyEmailSchema,
  VerifyEmailSuccessResponseSchema,
  loginWithEmailSchema,
  LoginSuccessResponseSchema,
  resendEmailVerificationSchema,
  ResendVerificationSuccessResponseSchema,
  forgotPasswordSchema,
  ForgotPasswordSuccessResponseSchema,
  resetPasswordSchema,
  ResetPasswordSuccessResponseSchema,
  changePasswordSchema,
  ChangePasswordSuccessResponseSchema,
  refreshTokenSchema,
  RefreshTokenSuccessResponseSchema,
  logoutSchema,
  LogoutSuccessResponseSchema,
} from '@/schemas/auth';
import { AuthMiddleware } from '@/middlewares';
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

// Resend Verification Email
openApiRouter.post({
  path: '/v1/resend-email-verification',
  summary: 'Resend email verification',
  description: 'Resends email verification to the user.',
  tags: ['Authentication'],
  request: resendEmailVerificationSchema,
  response: ResendVerificationSuccessResponseSchema,
  errors: [400, 401, 500],
  handler: authController.resendEmailVerification,
});

// Forgot Password
openApiRouter.post({
  path: '/v1/forgot-password',
  summary: 'Forgot Password',
  description: 'Generates a secure password reset token and dispatches an instruction email to the user.',
  tags: ['Authentication'],
  request: forgotPasswordSchema,
  response: ForgotPasswordSuccessResponseSchema,
  errors: [400, 500],
  handler: authController.forgotPassword,
});

// Reset Password
openApiRouter.post({
  path: '/v1/reset-password',
  summary: 'Reset Password',
  description: 'Resets the user password using a valid, unexpired PASSWORD_RESET token.',
  tags: ['Authentication'],
  request: resetPasswordSchema,
  response: ResetPasswordSuccessResponseSchema,
  errors: [400, 404, 410, 500],
  handler: authController.resetPassword,
});

// Change Password
openApiRouter.post({
  path: '/v1/change-password',
  summary: 'Change Password',
  description: 'Allows logged-in users to securely change their password.',
  tags: ['Authentication'],
  request: changePasswordSchema,
  response: ChangePasswordSuccessResponseSchema,
  errors: [400, 401, 500],
  middlewares: [AuthMiddleware.execute],
  handler: authController.changePassword,
});

// Refresh Token
openApiRouter.post({
  path: '/v1/refresh-token',
  summary: 'Refresh Token',
  description: 'Refreshes the user access token and provides a rotated refresh token.',
  tags: ['Authentication'],
  request: refreshTokenSchema,
  response: RefreshTokenSuccessResponseSchema,
  errors: [400, 401, 404, 500],
  handler: authController.refreshToken,
});

// Logout
openApiRouter.post({
  path: '/v1/logout',
  summary: 'Logout',
  description: 'Invalidates the refresh token and clears all secure cookies.',
  tags: ['Authentication'],
  request: logoutSchema,
  response: LogoutSuccessResponseSchema,
  errors: [500],
  handler: authController.logout,
});

export default openApiRouter.router;
