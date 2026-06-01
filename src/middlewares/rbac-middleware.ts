import type { NextFunction, Request, Response } from 'express';
import { Role } from '@prisma/client';
import { JwtPayload } from '@/lib/jwt';
import { UnauthorizedException, ForbiddenException } from '@/exceptions';

type AuthenticatedRequest = Request & { user?: JwtPayload };

export class RBACMiddleware {
  public static checkRole(roles: Role[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      const authReq = req as AuthenticatedRequest;

      if (!authReq.user) {
        throw new UnauthorizedException('Authentication required');
      }

      if (!roles.includes(authReq.user.role as Role)) {
        throw new ForbiddenException('Forbidden: You do not have the required role');
      }

      return next();
    };
  }
}
