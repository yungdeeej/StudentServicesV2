import { Queue, Worker } from 'bullmq';
import { runDueTimelineSteps } from '../modules/engagement/timeline.js';
import { runEscalationSweep } from '../modules/risk/workflows.js';
import { runReentryWeeklyChecks } from '../modules/support/workflows.js';
import { syncSisOnce } from './sis-sync.js';
import { redis, createRedis } from '../core/db/redis.js';
import { logger } from '../core/logger.js';

const QUEUE = 'mcg.cron';
const queue = new Queue(QUEUE, { connection: redis });

const JOBS = [
  { name: 'timeline', cron: '* * * * *', fn: runDueTimelineSteps },
  { name: 'escalation', cron: '*/5 * * * *', fn: runEscalationSweep },
  { name: 'reentry-checks', cron: '0 9 * * *', fn: runReentryWeeklyChecks },
  { name: 'sis-sync', cron: '*/15 * * * *', fn: syncSisOnce },
] as const;

let worker: Worker | undefined;

export async function startScheduler(): Promise<void> {
  if (worker) return;

  // Register repeating jobs
  for (const job of JOBS) {
    await queue.add(
      job.name,
      {},
      {
        jobId: `cron:${job.name}`,
        repeat: { pattern: job.cron },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    );
  }

  worker = new Worker(
    QUEUE,
    async (job) => {
      const def = JOBS.find((j) => j.name === job.name);
      if (!def) return;
      try {
        const ran = await def.fn();
        logger.info({ job: job.name, ran }, 'cron.completed');
      } catch (err) {
        logger.error({ err, job: job.name }, 'cron.failed');
        throw err;
      }
    },
    { connection: createRedis(), concurrency: 2 },
  );
}

export async function stopScheduler(): Promise<void> {
  await worker?.close();
  worker = undefined;
}
