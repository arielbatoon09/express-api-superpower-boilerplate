import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken, JwtPayload } from '@/lib/jwt';
import { UnauthorizedException } from '@/exceptions';

type AuthenticatedRequest = Request & { user?: JwtPayload };

export class AuthMiddleware {
  public static execute(req: Request, res: Response, next: NextFunction) {
    const authReq = req as AuthenticatedRequest;

    // 1. Get token from Authorization Header
    const accessToken = AuthMiddleware.extractBearerToken(req.headers.authorization);

    if (!accessToken) {
      throw new UnauthorizedException('Authentication required');
    }

    const payload = verifyAccessToken(accessToken);
    if (!payload) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    authReq.user = payload;
    return next();
  }

  // Extract Bearer Token from Authorization Header
  private static extractBearerToken(header?: string): string | undefined {
    if (!header) return undefined;
    const [scheme, token] = header.split(' ');
    if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) return undefined;
    return token.trim();
  }
}
