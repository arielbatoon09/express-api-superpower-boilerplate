import type { Request, Response, NextFunction } from 'express';

/**
 * Method decorator to wrap asynchronous Express route handlers.
 * Intercepts unhandled async rejections and routes them automatically to the next() handler.
 * Supports both standard TS 5.x ES Decorators and legacy experimental decorators.
 */
export function AsyncController() {
  return function (
    target: any, // 'value' (the function) in standard, 'target' (prototype) in legacy
    contextOrKey: any, // 'context' object in standard, 'propertyKey' (string/symbol) in legacy
    descriptor?: PropertyDescriptor // undefined in standard, object in legacy
  ): any {
    // 1. Standard ES Decorators (TS 5.x+)
    if (contextOrKey && typeof contextOrKey === 'object' && contextOrKey.kind === 'method') {
      const originalMethod = target;
      return async function (this: any, req: Request, res: Response, next: NextFunction) {
        try {
          return await originalMethod.call(this, req, res, next);
        } catch (error) {
          next(error);
        }
      };
    }

    // 2. Legacy / Experimental Decorators (TS <5.0 or experimentalDecorators: true)
    if (descriptor) {
      const originalMethod = descriptor.value;
      descriptor.value = async function (this: any, req: Request, res: Response, next: NextFunction) {
        try {
          return await originalMethod.call(this, req, res, next);
        } catch (error) {
          next(error);
        }
      };
      return descriptor;
    }
  };
}
