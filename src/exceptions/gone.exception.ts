import { HttpException } from '@/exceptions/http-exception';

/**
 * 410 Gone.
 * Use when a resource existed but is no longer available (e.g. expired token).
 */
export class GoneException extends HttpException {
  constructor(message = 'Resource is no longer available') {
    super(410, message);
  }
}
