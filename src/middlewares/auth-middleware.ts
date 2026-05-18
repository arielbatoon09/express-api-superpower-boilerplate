import { NextFunction, Request, Response } from "express";
import { verifyAccessToken, JwtPayload } from "@/lib/jwt";
import { sendError } from "@/utils/apiResponse";

type AuthenticatedRequest = Request & { user?: JwtPayload };

export class AuthMiddleware {
  public static execute(req: Request, res: Response, next: NextFunction) {
    const authReq = req as AuthenticatedRequest;

    // 1. Try to get token from Authorization Header
    let accessToken = AuthMiddleware.extractBearerToken(req.headers.authorization);

    // 2. Fallback to Cookies (for Web applications)
    if (!accessToken && req.cookies) {
      accessToken = req.cookies.accessToken;
    }

    if (!accessToken) {
      return AuthMiddleware.handleUnauthorized(res, "Authentication required");
    }

    const payload = verifyAccessToken(accessToken);
    if (!payload) {
      return AuthMiddleware.handleUnauthorized(res, "Invalid or expired token");
    }

    authReq.user = payload;
    return next();
  }

  // Extract Bearer Token from Authorization Header
  private static extractBearerToken(header?: string): string | undefined {
    if (!header) return undefined;
    const [scheme, token] = header.split(" ");
    if (!scheme || scheme.toLowerCase() !== "bearer" || !token) return undefined;
    return token.trim();
  }

  // Handle Unauthorized Requests
  private static handleUnauthorized(res: Response, message: string) {
    return sendError({
      res,
      message,
      statusCode: 401,
    });
  }
}