import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../../core/auth/tokens.js';
import { als } from '../../core/async-context.js';
import { buildScope } from '../../core/rbac/scope.js';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.header('authorization');
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'unauthenticated' });
    return;
  }
  const token = header.slice('Bearer '.length);

  try {
    const claims = verifyAccessToken(token);
    const ctx = als.getStore();
    const scope = buildScope(claims.role, {
      campus_ids: claims.campus_ids,
      program_ids: claims.program_ids,
      entity_ids: claims.entity_ids,
    });
    if (ctx) {
      ctx.user_id = claims.sub;
      ctx.role = claims.role;
      ctx.scope = scope;
    }
    (req as Request & { user?: typeof claims }).user = claims;
    next();
  } catch {
    res.status(401).json({ error: 'invalid_token' });
  }
}
