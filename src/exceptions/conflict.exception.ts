import { HttpException } from '@/exceptions/http-exception';

/**
 * 409 Conflict.
 * Use when the request conflicts with existing state (e.g. duplicate email).
 */
export class ConflictException extends HttpException {
  constructor(message = 'Resource already exists') {
    super(409, message);
  }
}
