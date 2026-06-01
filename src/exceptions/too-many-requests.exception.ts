import { HttpException } from './http-exception';

export class TooManyRequestsException extends HttpException {
  constructor(message = 'Too many requests, please try again later.') {
    super(429, message);
  }
}