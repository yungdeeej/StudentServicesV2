import { z } from 'zod';

const adapterMode = z.enum(['http', 'mock']).default('mock');
const sisAdapterMode = z.enum(['campuslogin', 'salesforce', 'mock']).default('mock');

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  TZ: z.string().default('America/Edmonton'),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),
  BCRYPT_COST: z.coerce.number().int().min(8).max(15).default(12),

  SIS_ADAPTER: sisAdapterMode,
  MOODLE_ADAPTER: adapterMode,
  BBB_ADAPTER: adapterMode,
  TWILIO_ADAPTER: adapterMode,
  JUSTCALL_ADAPTER: adapterMode,
  PANDADOC_ADAPTER: adapterMode,
  GOOGLE_ADAPTER: adapterMode,
  FAL_ADAPTER: adapterMode,
  CLAUDE_ADAPTER: adapterMode,

  CAMPUSLOGIN_BASE_URL: z.string().optional(),
  CAMPUSLOGIN_API_KEY: z.string().optional(),
  CAMPUSLOGIN_POLL_INTERVAL_MIN: z.coerce.number().int().min(1).default(15),

  SALESFORCE_BASE_URL: z.string().optional(),
  SALESFORCE_CLIENT_ID: z.string().optional(),
  SALESFORCE_CLIENT_SECRET: z.string().optional(),
  SALESFORCE_USERNAME: z.string().optional(),
  SALESFORCE_PASSWORD: z.string().optional(),

  MOODLE_BASE_URL: z.string().optional(),
  MOODLE_TOKEN: z.string().optional(),

  BBB_BASE_URL: z.string().optional(),
  BBB_SHARED_SECRET: z.string().optional(),

  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(),

  JUSTCALL_API_KEY: z.string().optional(),
  JUSTCALL_API_SECRET: z.string().optional(),

  PANDADOC_API_KEY: z.string().optional(),

  GOOGLE_OIDC_CLIENT_ID: z.string().optional(),
  GOOGLE_OIDC_CLIENT_SECRET: z.string().optional(),
  GOOGLE_SERVICE_ACCOUNT_JSON: z.string().optional(),

  FAL_API_KEY: z.string().optional(),

  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default('claude-opus-4-7'),
  ANTHROPIC_CACHE_TTL_HOURS: z.coerce.number().int().default(24),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('MCG Student Services <noreply@mcg.example>'),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | undefined;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

export function isProd(): boolean {
  return loadEnv().NODE_ENV === 'production';
}
