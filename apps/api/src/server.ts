import express from 'express';
import http from 'node:http';
import { Server as SocketIoServer } from 'socket.io';
import { loadEnv } from './core/config/env.js';
import { logger } from './core/logger.js';
import { prisma } from './core/db/prisma.js';
import { startWorker } from './core/events/bus.js';
import { registerCrossModuleRules } from './core/cross-module-rules.js';
import { registerIntakeWorkflows } from './modules/intake/workflows.js';
import { registerEngagementTimeline } from './modules/engagement/timeline.js';
import { registerEngagementScoreRecompute } from './modules/engagement/score.js';
import { registerRiskWorkflows } from './modules/risk/workflows.js';
import { registerSupportWorkflows } from './modules/support/workflows.js';
import { registerPracticumWorkflows } from './modules/practicum/workflows.js';
import { registerWellnessWorkflows } from './modules/wellness/workflows.js';
import { registerSentimentAnalysis } from './modules/messaging/sentiment.js';
import { registerSocketBroadcasts } from './http/sockets.js';
import { startScheduler } from './jobs/scheduler.js';

import { requestContext } from './http/middleware/context.js';
import { errorHandler, notFound } from './http/middleware/error.js';
import { healthRouter } from './http/health.js';
import { authRouter } from './modules/auth/routes.js';
import { studentsRouter } from './modules/students/routes.js';
import { intakeRouter } from './modules/intake/routes.js';
import { engagementRouter } from './modules/engagement/routes.js';
import { riskRouter } from './modules/risk/routes.js';
import { supportRouter } from './modules/support/routes.js';
import { practicumRouter } from './modules/practicum/routes.js';
import { reportingRouter } from './modules/reporting/routes.js';
import { aiRouter } from './modules/ai/routes.js';

import { studentSelfRouter } from './modules/student/routes.js';
import { messagingRouter } from './modules/messaging/routes.js';
import { appointmentsRouter } from './modules/appointments/routes.js';
import { documentsRouter } from './modules/documents/routes.js';
import { wellnessRouter } from './modules/wellness/routes.js';
import { resourcesRouter } from './modules/resources/routes.js';
import { tutoringRouter } from './modules/tutoring/routes.js';
import { studyGroupsRouter } from './modules/study-groups/routes.js';
import { bookableResourcesRouter } from './modules/bookable-resources/routes.js';
import { coursesRouter } from './modules/courses/routes.js';
import { transcriptsRouter } from './modules/transcripts/routes.js';
import {
  anonymousReportsPublicRouter,
  anonymousReportsStaffRouter,
} from './modules/anonymous-reports/routes.js';

const env = loadEnv();

export function createApp(): express.Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));
  app.use(requestContext);

  app.use(healthRouter);
  app.use('/api/v1/auth', authRouter);

  // Public (no auth) endpoints
  app.use('/api/v1', anonymousReportsPublicRouter);

  // Staff-side
  app.use('/api/v1/students', studentsRouter);
  app.use('/api/v1/intake', intakeRouter);
  app.use('/api/v1/engagement', engagementRouter);
  app.use('/api/v1/risk', riskRouter);
  app.use('/api/v1/support', supportRouter);
  app.use('/api/v1/practicum', practicumRouter);
  app.use('/api/v1/reporting', reportingRouter);
  app.use('/api/v1/ai', aiRouter);
  app.use('/api/v1/anon-reports', anonymousReportsStaffRouter);

  // Shared (staff + student) — RBAC inside the routers gates each verb
  app.use('/api/v1/messaging', messagingRouter);
  app.use('/api/v1/appointments', appointmentsRouter);
  app.use('/api/v1/documents', documentsRouter);
  app.use('/api/v1/wellness', wellnessRouter);
  app.use('/api/v1/resources', resourcesRouter);
  app.use('/api/v1/tutoring', tutoringRouter);
  app.use('/api/v1/study-groups', studyGroupsRouter);
  app.use('/api/v1/bookable-resources', bookableResourcesRouter);
  app.use('/api/v1/courses', coursesRouter);
  app.use('/api/v1/transcripts', transcriptsRouter);

  // Student-only self-service surface
  app.use('/api/v1/student', studentSelfRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

export function registerAllWorkflows(): void {
  registerCrossModuleRules();
  registerIntakeWorkflows();
  registerEngagementTimeline();
  registerEngagementScoreRecompute();
  registerRiskWorkflows();
  registerSupportWorkflows();
  registerPracticumWorkflows();
  registerWellnessWorkflows();
  registerSentimentAnalysis();
}

async function main(): Promise<void> {
  const app = createApp();
  const server = http.createServer(app);
  const io = new SocketIoServer(server, {
    cors: { origin: '*', credentials: true },
  });
  registerSocketBroadcasts(io);

  registerAllWorkflows();
  await startWorker();
  await startScheduler();

  server.listen(env.PORT, () => {
    logger.info({ port: env.PORT, node_env: env.NODE_ENV }, 'mcg-api.listening');
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'mcg-api.shutting_down');
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

if (process.env.NODE_ENV !== 'test' && process.argv[1]?.endsWith('server.js')) {
  void main();
}

export { prisma };
