import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../../core/logger.js';
import { als } from '../../core/async-context.js';

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ error: 'not_found' });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const ctx = als.getStore();
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'validation_failed', issues: err.issues });
    return;
  }
  logger.error({ err, correlation_id: ctx?.correlation_id }, 'http.error');
  const status = (err as { status?: number })?.status ?? 500;
  const message = (err as { message?: string })?.message ?? 'internal_error';
  res.status(status).json({ error: 'internal_error', message });
}
