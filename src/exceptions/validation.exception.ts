import { HttpException } from '@/exceptions/http-exception';

/**
 * 400 Validation Error.
 * Use for schema/payload validation failures that include field-level error details.
 */
export class ValidationException extends HttpException {
  constructor(message = 'Validation failed', errors?: any[]) {
    super(400, message, errors);
  }
}
