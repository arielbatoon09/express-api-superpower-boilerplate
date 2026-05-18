import type { NextFunction, Request, Response } from 'express';
import { Role } from '@prisma/client';
import { JwtPayload } from '@/lib/jwt';
import { sendError } from '@/utils/apiResponse';

type AuthenticatedRequest = Request & { user?: JwtPayload };

export class RBACMiddleware {
  public static checkRole(roles: Role[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      const authReq = req as AuthenticatedRequest;

      if (!authReq.user) {
        return this.handleUnauthorized(res);
      }

      if (!roles.includes(authReq.user.role as Role)) {
        return this.handleForbidden(res);
      }

      return next();
    };
  }

  // Handle unauthorized requests (missing auth user details).
  private static handleUnauthorized(res: Response) {
    return sendError({
      res,
      message: 'Authentication required',
      statusCode: 401,
    });
  }

  // Handle forbidden requests (insufficient role privileges).
  private static handleForbidden(res: Response) {
    return sendError({
      res,
      message: 'Forbidden: You do not have the required role',
      statusCode: 403,
    });
  }
}
