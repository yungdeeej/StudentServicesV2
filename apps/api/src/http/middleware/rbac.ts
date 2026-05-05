import type { Request, Response, NextFunction } from 'express';
import { roleHasCapability, type Capability } from '../../core/rbac/capabilities.js';
import { audit } from '../../core/audit.js';
import { als } from '../../core/async-context.js';

export function requirePermission(capability: Capability) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ctx = als.getStore();
    if (!ctx?.role) {
      res.status(401).json({ error: 'unauthenticated' });
      return;
    }
    if (!roleHasCapability(ctx.role, capability)) {
      void audit({
        action: `rbac.deny:${capability}`,
        resource_type: 'http',
        resource_id: req.originalUrl,
        outcome: 'denied',
      });
      res.status(403).json({ error: 'forbidden', capability });
      return;
    }
    next();
  };
}
