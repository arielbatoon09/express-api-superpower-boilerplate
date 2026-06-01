import { HttpException } from '@/exceptions/http-exception';

/**
 * 401 Unauthorized.
 * Use when authentication is missing or credentials are invalid/expired.
 */
export class UnauthorizedException extends HttpException {
  constructor(message = 'Authentication required') {
    super(401, message);
  }
}
