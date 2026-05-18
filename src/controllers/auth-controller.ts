import { Request, Response } from "express";
import { BaseController } from "@/controllers/base-controller";
import { AsyncController } from "@/lib/decorators";
import { SignupWithEmailService } from "@/services/auth";

export class AuthController extends BaseController {
  @AsyncController()
  async signupWithEmail(req: Request, res: Response) {
    const { name, email, password } = req.body ?? {};

    // Instantiate and execute the signup service
    const signupService = new SignupWithEmailService();
    const result = await signupService.execute({ name, email, password });

    return this.send(res, result);
  }
}