import IORedis, { type Redis } from 'ioredis';
import { loadEnv } from '../config/env.js';

const env = loadEnv();

export function createRedis(): Redis {
  return new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  });
}

export const redis = createRedis();
