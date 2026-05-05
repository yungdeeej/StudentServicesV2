import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';

export type Schemas = {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
};

export function validate(schemas: Schemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (schemas.body) req.body = schemas.body.parse(req.body);
    if (schemas.params) req.params = schemas.params.parse(req.params) as Request['params'];
    if (schemas.query) req.query = schemas.query.parse(req.query) as Request['query'];
    next();
  };
}
