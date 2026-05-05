import { prisma } from '../../core/db/prisma.js';
import { getIntegrations } from '../../integrations/factory.js';
import { logger } from '../../core/logger.js';
import { loadEnv } from '../../core/config/env.js';

type CacheEntry<T> = { value: T; expires_at: number };
const cache = new Map<string, CacheEntry<unknown>>();

const env = loadEnv();
const TTL_MS = env.ANTHROPIC_CACHE_TTL_HOURS * 60 * 60 * 1000;
let killSwitch = false;

export function setAiKillSwitch(v: boolean): void {
  killSwitch = v;
}

export function isAiEnabled(): boolean {
  return !killSwitch;
}

async function cached<T>(key: string, factory: () => Promise<T>): Promise<T> {
  const hit = cache.get(key) as CacheEntry<T> | undefined;
  if (hit && hit.expires_at > Date.now()) return hit.value;
  const value = await factory();
  cache.set(key, { value, expires_at: Date.now() + TTL_MS });
  return value;
}

export async function summarizeRiskFor(student_id: string): Promise<{
  predicted_risk: number;
  top_factors: string[];
  recommended_action: string;
}> {
  if (!isAiEnabled()) {
    return { predicted_risk: 0, top_factors: [], recommended_action: 'AI disabled' };
  }
  return cached(`risk:${student_id}`, async () => {
    const flags = await prisma.studentFlags.findUnique({ where: { student_id } });
    const ninetyDays = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const timeline = await prisma.eventStore.findMany({
      where: { student_id, occurred_at: { gte: ninetyDays } },
      orderBy: { occurred_at: 'asc' },
      take: 200,
      select: { event_type: true, occurred_at: true, payload: true },
    });
    const integrations = getIntegrations();
    try {
      const result = await integrations.claude.summarizeRisk({
        student_id,
        risk_score: flags?.risk_score ?? 0,
        timeline: timeline.map((t) => ({
          event_type: t.event_type,
          occurred_at: t.occurred_at.toISOString(),
          payload: t.payload,
        })),
      });
      return result;
    } catch (err) {
      logger.warn({ err, student_id }, 'ai.summarizeRisk_failed');
      return { predicted_risk: 0, top_factors: [], recommended_action: 'unavailable' };
    }
  });
}

export async function draftNudgeFor(args: {
  student_id: string;
  context: string;
}): Promise<{ draft: string }> {
  if (!isAiEnabled()) return { draft: 'AI disabled' };
  const student = await prisma.student.findUnique({ where: { id: args.student_id } });
  if (!student) return { draft: '' };
  const integrations = getIntegrations();
  return integrations.claude.draftNudge({
    student_first_name: student.first_name,
    context: args.context,
  });
}
