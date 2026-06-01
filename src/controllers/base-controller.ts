import type { Response } from 'express';
import { sendSuccess } from '@/utils/apiResponse';
import { HttpException, BadRequestException, UnauthorizedException, ForbiddenException, NotFoundException } from '@/exceptions';

/**
 * Base Controller class that provides common scaffolding, utility functions,
 * and automatic method-context binding to all derived application controllers.
 */
export abstract class BaseController {
  constructor() {
    this.autoBindMethods();
  }

  /**
   * Automatically binds all subclass methods to the class instance.
   * This permanently guards against the classic Express context loss (where `this` becomes undefined
   * when passing controller methods directly to Express route handlers).
   */
  private autoBindMethods(): void {
    const prototype = Object.getPrototypeOf(this);
    const propertyNames = Object.getOwnPropertyNames(prototype);

    for (const name of propertyNames) {
      if (name === 'constructor') continue;

      const descriptor = Object.getOwnPropertyDescriptor(prototype, name);
      if (descriptor && typeof descriptor.value === 'function') {
        (this as any)[name] = descriptor.value.bind(this);
      }
    }
  }

  // ==========================================
  // HTTP Success Response Helpers
  // ==========================================

  /**
   * HTTP 200 OK standard response.
   */
  protected ok<T>(res: Response, data?: T, message = 'Success') {
    return sendSuccess({ res, message, data, statusCode: 200 });
  }

  /**
   * HTTP 201 Created standard response.
   */
  protected created<T>(res: Response, data?: T, message = 'Created successfully') {
    return sendSuccess({ res, message, data, statusCode: 201 });
  }

  // ==========================================
  // HTTP Error Helpers (throw exceptions)
  // ==========================================

  /**
   * Throws a 400 Bad Request exception.
   */
  protected clientError(message = 'Bad Request'): never {
    throw new BadRequestException(message);
  }

  /**
   * Throws a 401 Unauthorized exception.
   */
  protected unauthorized(message = 'Authentication required'): never {
    throw new UnauthorizedException(message);
  }

  /**
   * Throws a 403 Forbidden exception.
   */
  protected forbidden(message = 'Forbidden: Insufficient privileges'): never {
    throw new ForbiddenException(message);
  }

  /**
   * Throws a 404 Not Found exception.
   */
  protected notFound(message = 'Resource not found'): never {
    throw new NotFoundException(message);
  }

  /**
   * Throws a generic HTTP exception with the given status code.
   */
  protected fail(statusCode = 500, message = 'Internal Server Error'): never {
    throw new HttpException(statusCode, message);
  }
}
