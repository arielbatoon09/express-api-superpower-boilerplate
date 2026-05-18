import type { Response } from 'express';
import { sendSuccess, sendError } from '@/utils/apiResponse';

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

  /**
   * Sends a standardized response based on a service result object.
   * Automatically pipes the response through the standard sendSuccess/sendError loggers.
   */
  protected send(res: Response, result: { code: number; status: string; message: string; data?: any; errors?: any[] }) {
    if (result.code >= 200 && result.code < 300) {
      return sendSuccess({
        res,
        message: result.message,
        data: result.data,
        statusCode: result.code,
      });
    }

    return sendError({
      res,
      message: result.message,
      statusCode: result.code,
      errors: result.errors,
    });
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
  // HTTP Error Response Helpers
  // ==========================================

  /**
   * HTTP 400 Bad Request client error response.
   */
  protected clientError(res: Response, message = 'Bad Request', error?: any) {
    return sendError({ res, message, statusCode: 400, error });
  }

  /**
   * HTTP 401 Unauthorized response.
   */
  protected unauthorized(res: Response, message = 'Authentication required') {
    return sendError({ res, message, statusCode: 401 });
  }

  /**
   * HTTP 403 Forbidden response.
   */
  protected forbidden(res: Response, message = 'Forbidden: Insufficient privileges') {
    return sendError({ res, message, statusCode: 403 });
  }

  /**
   * HTTP 404 Not Found response.
   */
  protected notFound(res: Response, message = 'Resource not found') {
    return sendError({ res, message, statusCode: 404 });
  }

  /**
   * HTTP 500 Internal Server Error response.
   */
  protected fail(res: Response, message = 'Internal Server Error', error?: any) {
    return sendError({ res, message, statusCode: 500, error });
  }
}
