import { PrismaClient } from '@prisma/client';
import { loadEnv } from '../config/env.js';
import { logger } from '../logger.js';
import { applyRowLevelScope } from '../rbac/row-level.js';

const env = loadEnv();

export const prisma = new PrismaClient({
  log:
    env.NODE_ENV === 'development'
      ? [{ emit: 'event', level: 'query' }, 'info', 'warn', 'error']
      : ['warn', 'error'],
  datasources: { db: { url: env.DATABASE_URL } },
});

if (env.NODE_ENV === 'development') {
  // @ts-expect-error Prisma typings for $on('query') vary between versions
  prisma.$on('query', (e) => {
    logger.trace({ query: e.query, duration_ms: e.duration }, 'prisma.query');
  });
}

applyRowLevelScope(prisma);

export type Prisma = typeof prisma;
