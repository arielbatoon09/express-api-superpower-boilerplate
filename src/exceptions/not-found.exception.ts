import { HttpException } from '@/exceptions/http-exception';

/**
 * 404 Not Found.
 * Use when the requested resource does not exist.
 */
export class NotFoundException extends HttpException {
  constructor(message = 'Resource not found') {
    super(404, message);
  }
}
