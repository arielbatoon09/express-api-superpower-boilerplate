import { injectable, inject } from 'tsyringe';
import { Request, Response } from 'express';
import { BaseController } from '@/controllers/base-controller';
import { AsyncController } from '@/lib/decorators';
import { SignupWithEmailService } from '@/services/auth';

@injectable()
export class AuthController extends BaseController {
  constructor(
    @inject(SignupWithEmailService) private readonly signupService: SignupWithEmailService
  ) {
    super();
  }

  @AsyncController()
  async signupWithEmail(req: Request, res: Response) {
    const { name, email, password } = req.body ?? {};

    // Execute the signup service
    const result = await this.signupService.execute({ name, email, password });

    return this.send(res, result);
  }
}
