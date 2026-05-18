import { injectable, inject } from 'tsyringe';
import type { Request, Response } from 'express';
import { BaseController } from '@/controllers/base-controller';
import { AsyncController } from '@/lib/decorators';
import { SignupWithEmailService, VerifyEmailService, LoginWithEmailService } from '@/services/auth';
import { setAuthCookies } from '@/utils/cookie';

@injectable()
export class AuthController extends BaseController {
  constructor(
    @inject(SignupWithEmailService) private readonly signupService: SignupWithEmailService,
    @inject(VerifyEmailService) private readonly verifyEmailService: VerifyEmailService,
    @inject(LoginWithEmailService) private readonly loginService: LoginWithEmailService
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
      const { accessToken, refreshToken, expiresIn } = result.data.tokens;

      // Set the refresh token in an HTTP-only, secure cookie
      setAuthCookies(res, { refreshToken });

      // Return ONLY the accessToken and its duration to the client to store in-memory
      result.data.tokens = {
        accessToken,
        expiresIn,
      };
    }

    return this.send(res, result);
  }
}
