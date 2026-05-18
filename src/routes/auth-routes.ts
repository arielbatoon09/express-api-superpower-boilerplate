import { container } from "@/lib/container";
import { AuthController } from "@/controllers/auth-controller";
import { signupWithEmailSchema, SignupSuccessResponseSchema } from "@/schemas/auth/signup-with-email-schema";
import { OpenApiRouter } from "@/lib/openapi-router";

// Note: This router gets mounted at "/api/auth" in the main index.ts.
// We pass "/api/auth" to OpenApiRouter so the Swagger path resolves correctly.
const openApiRouter = new OpenApiRouter("/api/auth");
const authController = container.resolve(AuthController);

openApiRouter.post({
  path: "/v1/signup",
  summary: "Signup a new user with Email",
  description: "Validates request payloads, hashes credentials securely, persists the user profile, and queues verification emails asynchronously.",
  tags: ["Authentication"],
  request: signupWithEmailSchema,
  response: SignupSuccessResponseSchema,
  errors: [400, 409, 500],
  handler: authController.signupWithEmail,
});

export default openApiRouter.router;