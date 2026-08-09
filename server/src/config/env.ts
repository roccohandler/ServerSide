import dotenv from 'dotenv';
import { z } from 'zod';
import { LOG_LEVELS, type LogLevel } from '../lib/logger.js';

/*
 * Local development reads a `.env` from either the server workspace or the repo root.
 * On Vercel (and any other host) real environment variables are already present and
 * dotenv leaves them alone, so this is a no-op there.
 */
dotenv.config({ path: ['.env', '../.env'], quiet: true });

export type NodeEnv = 'development' | 'test' | 'production';

export interface ServerConfig {
  readonly nodeEnv: NodeEnv;
  readonly isProduction: boolean;
  readonly isTest: boolean;
  readonly port: number;
  readonly logLevel: LogLevel;
  readonly database: {
    /** Absent means "not configured" — the lead endpoint then fails loudly, not silently. */
    readonly uri: string | undefined;
    readonly dbName: string | undefined;
    readonly enabled: boolean;
  };
  readonly email: {
    readonly apiKey: string | undefined;
    readonly from: string | undefined;
    readonly notificationRecipient: string | undefined;
    readonly enabled: boolean;
  };
  readonly cors: {
    /** Empty means same-origin only: no cross-origin browser requests are permitted. */
    readonly allowedOrigins: readonly string[];
  };
  readonly rateLimit: {
    readonly windowMs: number;
    readonly max: number;
  };
  /**
   * Number of proxy hops to trust for client IP resolution. Vercel puts exactly one
   * proxy in front of the function; locally there is none. Getting this wrong either
   * breaks rate limiting or makes it spoofable, so it is never `true`.
   */
  readonly trustProxyHops: number;
}

const optionalString = z
  .string()
  .trim()
  .min(1)
  .optional()
  .or(z.literal('').transform(() => undefined));

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  LOG_LEVEL: z.enum(LOG_LEVELS).optional(),

  MONGODB_URI: optionalString,
  MONGODB_DB_NAME: optionalString,

  RESEND_API_KEY: optionalString,
  RESEND_FROM_EMAIL: optionalString,
  CONTACT_NOTIFICATION_EMAIL: optionalString,

  CLIENT_ORIGIN: optionalString,

  LEAD_RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().min(1).max(1440).default(15),
  LEAD_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(1000).default(5),

  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(10).optional(),
});

/**
 * Thrown during startup when configuration is missing or malformed. The message lists
 * every problem at once so a deploy can be fixed in a single pass instead of a dozen.
 */
export class EnvironmentConfigError extends Error {
  readonly problems: readonly string[];

  constructor(problems: readonly string[]) {
    super(
      `Invalid environment configuration:\n${problems.map((problem) => `  - ${problem}`).join('\n')}`,
    );
    this.name = 'EnvironmentConfigError';
    this.problems = problems;
  }
}

/** Variables that a production deployment cannot function without. */
const PRODUCTION_REQUIRED = [
  'MONGODB_URI',
  'RESEND_API_KEY',
  'RESEND_FROM_EMAIL',
  'CONTACT_NOTIFICATION_EMAIL',
] as const;

function parseOrigins(value: string | undefined): readonly string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter((origin) => origin.length > 0);
}

export function loadServerConfig(source: NodeJS.ProcessEnv = process.env): ServerConfig {
  const parsed = envSchema.safeParse(source);

  if (!parsed.success) {
    const problems = parsed.error.issues.map(
      (issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`,
    );
    throw new EnvironmentConfigError(problems);
  }

  const raw = parsed.data;
  const isProduction = raw.NODE_ENV === 'production';

  if (isProduction) {
    const missing = PRODUCTION_REQUIRED.filter((key) => !raw[key]);
    if (missing.length > 0) {
      throw new EnvironmentConfigError(
        missing.map((key) => `${key} is required when NODE_ENV=production`),
      );
    }
  }

  return Object.freeze({
    nodeEnv: raw.NODE_ENV,
    isProduction,
    isTest: raw.NODE_ENV === 'test',
    port: raw.PORT,
    logLevel: raw.LOG_LEVEL ?? (raw.NODE_ENV === 'test' ? 'silent' : 'info'),
    database: {
      uri: raw.MONGODB_URI,
      dbName: raw.MONGODB_DB_NAME,
      enabled: Boolean(raw.MONGODB_URI),
    },
    email: {
      apiKey: raw.RESEND_API_KEY,
      from: raw.RESEND_FROM_EMAIL,
      notificationRecipient: raw.CONTACT_NOTIFICATION_EMAIL,
      enabled: Boolean(
        raw.RESEND_API_KEY && raw.RESEND_FROM_EMAIL && raw.CONTACT_NOTIFICATION_EMAIL,
      ),
    },
    cors: {
      allowedOrigins: parseOrigins(raw.CLIENT_ORIGIN),
    },
    rateLimit: {
      windowMs: raw.LEAD_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
      max: raw.LEAD_RATE_LIMIT_MAX,
    },
    trustProxyHops: raw.TRUST_PROXY_HOPS ?? (isProduction ? 1 : 0),
  });
}

let cached: ServerConfig | undefined;

/** Memoised accessor used by the real entry points. Tests call `loadServerConfig` directly. */
export function getServerConfig(): ServerConfig {
  cached ??= loadServerConfig();
  return cached;
}
