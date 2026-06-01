import type { Request, Response, NextFunction } from 'express';
import { ZodTypeAny, ZodError } from 'zod';
import { ValidationException } from '@/exceptions';

export class SchemaMiddleware {
  // Validate Schema
  public static validate(schema: ZodTypeAny) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const validated = (await schema.parseAsync({
          body: req.body,
          query: req.query,
          params: req.params,
        })) as { body?: any; query?: any; params?: any };

        // Reassign validated and sanitized data back to Express request properties
        if (validated.body !== undefined) {
          req.body = validated.body;
        }

        if (validated.query !== undefined) {
          // req.query is a read-only getter in Express 5, so we mutate its properties
          for (const key in req.query) {
            delete req.query[key];
          }
          Object.assign(req.query, validated.query);
        }

        if (validated.params !== undefined) {
          // req.params is a read-only getter in Express 5, so we mutate its properties
          for (const key in req.params) {
            delete req.params[key];
          }
          Object.assign(req.params, validated.params);
        }

        return next();
      } catch (error) {
        if (error instanceof ZodError) {
          const errorList = error.issues.map(issue => {
            const fullPath = issue.path.join('.');

            // Strip the prefix for a cleaner API response (e.g. "email" instead of "body.email")
            const cleanPath = issue.path.filter(p => p !== 'body' && p !== 'query' && p !== 'params').join('.');

            return {
              path: cleanPath || fullPath,
              message: issue.message,
            };
          });

          throw new ValidationException('Validation failed', errorList);
        }
        return next(error);
      }
    };
  }
}
