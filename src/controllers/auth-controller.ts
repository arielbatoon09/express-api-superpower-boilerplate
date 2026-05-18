import { injectable, inject } from 'tsyringe';
import type { Request, Response } from 'express';
import { BaseController } from '@/controllers/base-controller';
import { AsyncController } from '@/lib/decorators';
import {
  SignupWithEmailService,
  VerifyEmailService,
  LoginWithEmailService,
  ResendEmailVerificationService,
  ForgotPasswordService,
  ResetPasswordService,
  ChangePasswordService,
} from '@/services/auth';
import { setAuthCookies } from '@/utils/cookie';

@injectable()
export class AuthController extends BaseController {
  constructor(
    @inject(SignupWithEmailService) private readonly signupService: SignupWithEmailService,
    @inject(VerifyEmailService) private readonly verifyEmailService: VerifyEmailService,
    @inject(LoginWithEmailService) private readonly loginService: LoginWithEmailService,
    @inject(ResendEmailVerificationService) private readonly resendEmailVerificationService: ResendEmailVerificationService,
    @inject(ForgotPasswordService) private readonly forgotPasswordService: ForgotPasswordService,
    @inject(ResetPasswordService) private readonly resetPasswordService: ResetPasswordService,
    @inject(ChangePasswordService) private readonly changePasswordService: ChangePasswordService
  ) {
    super();
  }

  // Sign up with email controller
  @AsyncController()
  async signupWithEmail(req: Request, res: Response) {
    const { name, email, password } = req.body ?? {};
    const result = await this.signupService.execute({ name, email, password });
    return this.send(res, result);
  }

  // Verify email controller
  @AsyncController()
  async verifyEmail(req: Request, res: Response) {
    const token = req.query.token as string;
    const result = await this.verifyEmailService.execute({ token });
    return this.send(res, result);
  }

  // Login with email controller
  @AsyncController()
  async loginWithEmail(req: Request, res: Response) {
    const { email, password } = req.body ?? {};
    const result = await this.loginService.execute({ email, password });

    if (result.code === 200 && result.data?.tokens) {
      const { accessToken, refreshToken, expiresIn, refreshExpiresIn } = result.data.tokens;

      // Detect if the client requests native token delivery instead of secure cookies
      const useCookies = req.headers['x-use-cookies'] !== 'false';

      if (useCookies) {
        // --- WEB CLIENTS: Secure HTTP-Only Cookies ---
        setAuthCookies(res, { refreshToken });

        result.data.tokens = {
          accessToken,
          expiresIn,
        };
      } else {
        // --- NATIVE CLIENTS (Mobile/Desktop): Direct JSON Delivery ---
        result.data.tokens = {
          accessToken,
          refreshToken,
          expiresIn,
          refreshExpiresIn,
        };
      }
    }

    return this.send(res, result);
  }

  // Resend verification email controller
  @AsyncController()
  async resendEmailVerification(req: Request, res: Response) {
    const { email } = req.body ?? {};
    const result = await this.resendEmailVerificationService.execute({ email });
    return this.send(res, result);
  }

  // Forgot password controller
  @AsyncController()
  async forgotPassword(req: Request, res: Response) {
    const { email } = req.body ?? {};
    const result = await this.forgotPasswordService.execute({ email });
    return this.send(res, result);
  }

  // Reset password controller
  @AsyncController()
  async resetPassword(req: Request, res: Response) {
    const { token, password } = req.body ?? {};
    const result = await this.resetPasswordService.execute({ token, password });
    return this.send(res, result);
  }

  // Change password controller
  @AsyncController()
  async changePassword(req: Request, res: Response) {
    const { currentPassword, newPassword } = req.body ?? {};
    const userId = (req as any).user?.sub;
    const result = await this.changePasswordService.execute({ userId, currentPassword, newPassword });
    return this.send(res, result);
  }
}
