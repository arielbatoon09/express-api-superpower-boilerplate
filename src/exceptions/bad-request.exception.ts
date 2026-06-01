import { HttpException } from '@/exceptions/http-exception';

/**
 * 400 Bad Request.
 * Use for invalid client input, business rule violations, or malformed payloads.
 */
export class BadRequestException extends HttpException {
  constructor(message = 'Bad Request') {
    super(400, message);
  }
}
