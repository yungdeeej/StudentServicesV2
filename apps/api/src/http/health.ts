import { Router } from 'express';
import { prisma } from '../core/db/prisma.js';
import { redis } from '../core/db/redis.js';
import { getIntegrations } from '../integrations/factory.js';

export const healthRouter: Router = Router();

healthRouter.get('/health', async (_req, res) => {
  const dbStart = Date.now();
  let dbOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    dbOk = false;
  }

  let redisOk = false;
  const rStart = Date.now();
  try {
    redisOk = (await redis.ping()) === 'PONG';
  } catch {
    redisOk = false;
  }

  res.json({
    ok: dbOk && redisOk,
    service: 'mcg-api',
    db: { ok: dbOk, latency_ms: Date.now() - dbStart },
    redis: { ok: redisOk, latency_ms: Date.now() - rStart },
  });
});

healthRouter.get('/admin/health', async (_req, res) => {
  const i = getIntegrations();
  const checks = await Promise.all([
    i.sis.health().then((h) => ({ name: 'sis', ...h })),
    i.moodle.health().then((h) => ({ name: 'moodle', ...h })),
    i.bbb.health().then((h) => ({ name: 'bbb', ...h })),
    i.twilio.health().then((h) => ({ name: 'twilio', ...h })),
    i.justcall.health().then((h) => ({ name: 'justcall', ...h })),
    i.pandadoc.health().then((h) => ({ name: 'pandadoc', ...h })),
    i.google.health().then((h) => ({ name: 'google', ...h })),
    i.fal.health().then((h) => ({ name: 'fal', ...h })),
    i.claude.health().then((h) => ({ name: 'claude', ...h })),
    i.email.health().then((h) => ({ name: 'email', ...h })),
  ]);
  res.json({ ok: checks.every((c) => c.ok), checks });
});
