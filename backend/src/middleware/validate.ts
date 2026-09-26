import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Middleware factory: Validates request body/query/params against a Zod schema.
 * Rejects with friendly error messages if validation fails.
 */
export const validate = (schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = schema.parse(req[source]);
      if (source === 'body') {
        req.body = data;
      } else {
        Object.defineProperty(req, source, {
          value: data,
          writable: true,
          enumerable: true,
          configurable: true,
        });
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.issues.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        const firstMessage = formattedErrors[0]?.message;

        res.status(400).json({
          success: false,
          message: firstMessage || 'Please check your input and try again.',
          errors: formattedErrors,
        });
        return;
      }
      next(error);
    }
  };
};
