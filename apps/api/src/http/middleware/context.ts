import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { als } from '../../core/async-context.js';

export function requestContext(req: Request, res: Response, next: NextFunction): void {
  const correlation_id = (req.header('x-correlation-id') as string) || randomUUID();
  res.setHeader('x-correlation-id', correlation_id);
  als.run({ correlation_id }, () => next());
}
