import { prisma } from './db/prisma.js';
import { currentContext } from './async-context.js';
import { logger } from './logger.js';

export type AuditEntry = {
  action: string;
  resource_type: string;
  resource_id?: string | null;
  before?: unknown;
  after?: unknown;
  outcome?: 'ok' | 'denied' | 'error';
  campus_id?: string | null;
  actor_label?: string;
};

export async function audit(entry: AuditEntry): Promise<void> {
  const ctx = currentContext();
  try {
    await prisma.auditLog.create({
      data: {
        actor_id: ctx?.user_id,
        actor_label: entry.actor_label,
        action: entry.action,
        resource_type: entry.resource_type,
        resource_id: entry.resource_id ?? undefined,
        before: (entry.before ?? null) as never,
        after: (entry.after ?? null) as never,
        outcome: entry.outcome ?? 'ok',
        campus_id: entry.campus_id ?? undefined,
        correlation_id: ctx?.correlation_id,
      },
    });
  } catch (err) {
    // Audit failures must not break the request — log loudly and move on.
    logger.error({ err, entry }, 'audit.write_failed');
  }
}
