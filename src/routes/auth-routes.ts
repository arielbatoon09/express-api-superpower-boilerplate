import { Router } from "express";
import { container } from "@/lib/container";
import { AuthController } from "@/controllers/auth-controller";
import { SchemaMiddleware } from "@/middlewares";
import { signupWithEmailSchema } from "@/schemas/auth";

const router = Router();
const authController = container.resolve(AuthController);

router.post("/v1/signup", SchemaMiddleware.validate(signupWithEmailSchema), authController.signupWithEmail);

export default router;