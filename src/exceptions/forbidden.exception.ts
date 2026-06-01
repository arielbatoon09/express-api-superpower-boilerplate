import { HttpException } from '@/exceptions/http-exception';

/**
 * 403 Forbidden.
 * Use when the user is authenticated but lacks sufficient privileges.
 */
export class ForbiddenException extends HttpException {
  constructor(message = 'Forbidden: Insufficient privileges') {
    super(403, message);
  }
}
