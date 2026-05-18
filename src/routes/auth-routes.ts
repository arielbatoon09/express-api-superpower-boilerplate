import { Router } from "express";
import { AuthController } from "@/controllers/auth-controller";
import { SchemaMiddleware } from "@/middlewares";
import { signupWithEmailSchema } from "@/schemas/auth";

const router = Router();
const authController = new AuthController();

router.post("/v1/signup", SchemaMiddleware.validate(signupWithEmailSchema), authController.signupWithEmail);

export default router;