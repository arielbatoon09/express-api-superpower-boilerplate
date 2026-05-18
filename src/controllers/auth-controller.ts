import { injectable, inject } from 'tsyringe';
import type { Request, Response } from 'express';
import { BaseController } from '@/controllers/base-controller';
import { AsyncController } from '@/lib/decorators';
import { SignupWithEmailService, VerifyEmailService } from '@/services/auth';

@injectable()
export class AuthController extends BaseController {
  constructor(
    @inject(SignupWithEmailService) private readonly signupService: SignupWithEmailService,
    @inject(VerifyEmailService) private readonly verifyEmailService: VerifyEmailService
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
}