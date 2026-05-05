import { Queue, Worker, type Job, type JobsOptions, QueueEvents } from 'bullmq';
import { randomUUID } from 'node:crypto';
import { redis, createRedis } from '../db/redis.js';
import { prisma } from '../db/prisma.js';
import { logger } from '../logger.js';
import { currentContext } from '../async-context.js';
import { EVENT_TYPES, type DomainEvent, type EventType } from './types.js';

const QUEUE_NAME = 'mcg.events';

const queue = new Queue<DomainEvent>(QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  },
});

export type Handler<T = unknown> = (event: DomainEvent<T>) => Promise<void> | void;

const handlers = new Map<EventType, Handler[]>();

export function on<T = unknown>(eventType: EventType, handler: Handler<T>): void {
  const list = handlers.get(eventType) ?? [];
  list.push(handler as Handler);
  handlers.set(eventType, list);
}

export type EmitInput<T = unknown> = {
  event_type: EventType;
  student_id: string | null;
  actor_id?: string;
  payload: T;
  delay_ms?: number;
};

export async function emit<T>(input: EmitInput<T>): Promise<DomainEvent<T>> {
  const ctx = currentContext();
  const event: DomainEvent<T> = {
    event_id: randomUUID(),
    event_type: input.event_type,
    student_id: input.student_id,
    actor_id: input.actor_id ?? ctx?.user_id ?? 'system',
    payload: input.payload,
    occurred_at: new Date().toISOString(),
    correlation_id: ctx?.correlation_id ?? randomUUID(),
  };

  await prisma.eventStore.create({
    data: {
      event_id: event.event_id,
      event_type: event.event_type,
      student_id: event.student_id ?? undefined,
      actor_id: event.actor_id,
      payload: event.payload as never,
      correlation_id: event.correlation_id,
      occurred_at: new Date(event.occurred_at),
    },
  });

  const opts: JobsOptions = {
    jobId: event.event_id,
    delay: input.delay_ms,
  };
  await queue.add(event.event_type, event, opts);

  logger.debug({ event_type: event.event_type, event_id: event.event_id }, 'event.emitted');
  return event;
}

let worker: Worker<DomainEvent> | undefined;
let queueEvents: QueueEvents | undefined;

export async function startWorker(): Promise<void> {
  if (worker) return;
  worker = new Worker<DomainEvent>(
    QUEUE_NAME,
    async (job: Job<DomainEvent>) => {
      const event = job.data;
      const list = handlers.get(event.event_type) ?? [];
      if (list.length === 0) {
        logger.debug({ event_type: event.event_type }, 'event.no_handlers');
        return;
      }
      for (const handler of list) {
        await handler(event);
      }
    },
    { connection: createRedis(), concurrency: 8 },
  );

  worker.on('failed', (job, err) => {
    logger.error(
      { event_id: job?.id, event_type: job?.data?.event_type, err: err.message },
      'event.handler_failed',
    );
  });

  queueEvents = new QueueEvents(QUEUE_NAME, { connection: createRedis() });
  queueEvents.on('completed', ({ jobId }) => {
    logger.trace({ jobId }, 'event.completed');
  });
}

export async function stopWorker(): Promise<void> {
  await Promise.all([worker?.close(), queueEvents?.close()].filter(Boolean));
  worker = undefined;
  queueEvents = undefined;
}

export function listHandlers(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of handlers.entries()) out[k] = v.length;
  return out;
}

export { EVENT_TYPES };
