import pino from 'pino';
import { loadEnv } from './config/env.js';

const env = loadEnv();

export const logger = pino({
  name: 'mcg-api',
  level: env.LOG_LEVEL,
  base: { service: 'mcg-api', env: env.NODE_ENV },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      '*.password',
      '*.password_hash',
      '*.token',
      '*.refresh_token',
    ],
    censor: '[redacted]',
  },
});

export type Logger = typeof logger;
