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
  /**
   * The PlayBook workbook.
   *
   * `pdfUrl` being set is what turns automatic delivery on. Until it is, a request is
   * stored and the owner is notified — which is a working flow rather than a broken one,
   * and stops the site promising an email that nothing sends.
   */
  readonly playbook: {
    readonly pdfUrl: string | undefined;
    readonly autoSendEnabled: boolean;
  };
  /**
   * Stripe billing — the consultative payment flow. Everything here is optional:
   * without it the site runs exactly as before, the billing endpoints answer 503 with
   * an instruction, and nothing pretends a payment system exists.
   *
   * The secret key and webhook secret must NEVER be given a VITE_ prefix. They are
   * server-side credentials; Vite inlines VITE_ variables into the public bundle.
   */
  readonly billing: {
    readonly stripeSecretKey: string | undefined;
    readonly webhookSecret: string | undefined;
    /** Bearer token for the owner-only project/checkout endpoints. */
    readonly adminToken: string | undefined;
    /** Stripe Price IDs, created in the dashboard and mapped here. See README. */
    readonly priceIds: {
      readonly 'build-deposit': string | undefined;
      readonly 'build-final': string | undefined;
      readonly 'growth-partner-monthly': string | undefined;
      readonly 'growth-partner-annual': string | undefined;
    };
    /** Public origin for Checkout redirect URLs. Falls back to VITE_SITE_URL. */
    readonly siteUrl: string;
    /** True when checkout sessions and webhooks can actually work. */
    readonly enabled: boolean;
  };
  /**
   * Authentication.
   *
   * `googleClientId` is the OAuth 2.0 **Web** client id from Google Cloud. It is a
   * public value — it ships to the browser either way — but it is served from
   * `/api/auth/config` rather than inlined at build time, so one build can be deployed
   * against a development client and a production client without rebuilding.
   *
   * There is deliberately **no client secret**. The Google Identity Services flow used
   * here returns a signed ID token to the browser, which the server verifies against
   * Google's published keys. No token exchange happens, so no secret exists to leak.
   */
  readonly auth: {
    readonly googleClientId: string | undefined;
    readonly googleEnabled: boolean;
    readonly rateLimit: {
      readonly windowMs: number;
      readonly max: number;
    };
    /** Keyed on the email address rather than the connection. */
    readonly passwordResetRateLimit: {
      readonly windowMs: number;
      readonly max: number;
    };
  };
  /**
   * Deployment tracking.
   *
   * Optional. Without the secret the webhook answers 503 and preview URLs are set by
   * hand from the admin surface — a working flow rather than a broken one. With it,
   * every Vercel deployment that carries a `jobforgeProjectId` in its metadata updates
   * the customer's dashboard by itself.
   */
  readonly deployments: {
    readonly vercelWebhookSecret: string | undefined;
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

/** Treats a blank value as unset, so an empty variable in a host's UI is not a type error. */
const optionalEnum = <const T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess((value) => (value === '' ? undefined : value), z.enum(values).optional());

const envSchema = z.object({
  NODE_ENV: optionalEnum(['development', 'test', 'production']),
  /*
   * Set automatically by Vercel on every deployment. Used only as a fallback for
   * NODE_ENV — see `resolveNodeEnv` for why that matters.
   */
  VERCEL_ENV: optionalEnum(['production', 'preview', 'development']),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  LOG_LEVEL: z.enum(LOG_LEVELS).optional(),

  MONGODB_URI: optionalString,
  MONGODB_DB_NAME: optionalString,

  RESEND_API_KEY: optionalString,
  RESEND_FROM_EMAIL: optionalString,
  CONTACT_NOTIFICATION_EMAIL: optionalString,
  /*
   * Where the PlayBook workbook PDF is hosted.
   *
   * Optional, and it is the switch on automatic delivery. Set it and a subscriber gets an
   * email with the workbook link; leave it unset and the request is stored and I am
   * notified instead. Deliberately not `VITE_`-prefixed: the browser never needs to know
   * it, and the server decides which of the two emails to send.
   */
  PLAYBOOK_PDF_URL: optionalString,

  CLIENT_ORIGIN: optionalString,

  /*
   * Stripe. All optional: billing is a feature the deployment grows into, not a
   * requirement to run the site. None of these may ever gain a VITE_ prefix.
   */
  STRIPE_SECRET_KEY: optionalString,
  STRIPE_WEBHOOK_SECRET: optionalString,
  BILLING_ADMIN_TOKEN: optionalString,
  STRIPE_PRICE_BUILD_DEPOSIT: optionalString,
  STRIPE_PRICE_BUILD_FINAL: optionalString,
  STRIPE_PRICE_GROWTH_PARTNER_MONTHLY: optionalString,
  STRIPE_PRICE_GROWTH_PARTNER_ANNUAL: optionalString,
  /** Public origin for Checkout redirects. Falls back to VITE_SITE_URL. */
  PUBLIC_SITE_URL: optionalString,
  VITE_SITE_URL: optionalString,

  /*
   * Google sign-in.
   *
   * Optional, and independently configurable per environment: a development deployment
   * points at a Google client whose authorised origin is `http://localhost:5173`, and
   * production points at one whose authorised origin is the live domain. Neither set of
   * credentials works for the other, which is why there is no single "the" client id.
   *
   * The `VITE_` twin exists only so a developer who prefers a build-time value can set
   * one; the server still serves it from `/api/auth/config` and that is what the client
   * actually reads. There is no client *secret* here on purpose — see `auth` above.
   */
  GOOGLE_CLIENT_ID: optionalString,
  VITE_GOOGLE_CLIENT_ID: optionalString,

  AUTH_RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().min(1).max(1440).default(15),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(1000).default(20),
  /*
   * The per-address password-reset budget, separate from the per-IP one above.
   *
   * An hour and five requests. What it bounds is not guessing — it is how many reset
   * emails one address can be made to receive, which is a harm even when nothing is
   * breached. See `createPasswordResetRateLimiter`.
   */
  PASSWORD_RESET_RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().min(1).max(1440).default(60),
  PASSWORD_RESET_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(100).default(5),

  /*
   * The Vercel integration's client secret, used to verify deployment webhooks. Never
   * VITE_-prefixed: it is what stops anybody on the internet setting the URL a client
   * is told is their website.
   */
  VERCEL_WEBHOOK_SECRET: optionalString,

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

/**
 * Works out which environment we are in.
 *
 * NODE_ENV is preferred, but it deliberately cannot be set as a build-time variable on
 * Vercel: npm reads NODE_ENV during `npm install` and omits devDependencies when it is
 * `production`, which strips out TypeScript, Vite and tsx and breaks the build. Vercel
 * sets NODE_ENV=production for the function runtime by itself.
 *
 * The VERCEL_ENV fallback exists so that if that ever stops happening, a public
 * deployment still runs in production mode instead of silently switching to
 * development mode and returning stack traces to visitors. Failing safe matters more
 * here than trusting the platform.
 */
function resolveNodeEnv(raw: { NODE_ENV?: NodeEnv; VERCEL_ENV?: string }): NodeEnv {
  if (raw.NODE_ENV) return raw.NODE_ENV;
  // Both `production` and `preview` deployments are reachable from the internet.
  if (raw.VERCEL_ENV === 'production' || raw.VERCEL_ENV === 'preview') return 'production';
  return 'development';
}

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
  const nodeEnv = resolveNodeEnv(raw);
  const isProduction = nodeEnv === 'production';

  if (isProduction) {
    const missing = PRODUCTION_REQUIRED.filter((key) => !raw[key]);
    if (missing.length > 0) {
      throw new EnvironmentConfigError(
        missing.map((key) => `${key} is required when NODE_ENV=production`),
      );
    }
  }

  return Object.freeze({
    nodeEnv,
    isProduction,
    isTest: nodeEnv === 'test',
    port: raw.PORT,
    logLevel: raw.LOG_LEVEL ?? (nodeEnv === 'test' ? 'silent' : 'info'),
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
    playbook: {
      pdfUrl: raw.PLAYBOOK_PDF_URL,
      /** True when the workbook can actually be delivered automatically. */
      autoSendEnabled: Boolean(raw.PLAYBOOK_PDF_URL),
    },
    billing: {
      stripeSecretKey: raw.STRIPE_SECRET_KEY,
      webhookSecret: raw.STRIPE_WEBHOOK_SECRET,
      adminToken: raw.BILLING_ADMIN_TOKEN,
      priceIds: {
        'build-deposit': raw.STRIPE_PRICE_BUILD_DEPOSIT,
        'build-final': raw.STRIPE_PRICE_BUILD_FINAL,
        'growth-partner-monthly': raw.STRIPE_PRICE_GROWTH_PARTNER_MONTHLY,
        'growth-partner-annual': raw.STRIPE_PRICE_GROWTH_PARTNER_ANNUAL,
      },
      siteUrl: (raw.PUBLIC_SITE_URL ?? raw.VITE_SITE_URL ?? 'http://localhost:5173').replace(
        /\/$/,
        '',
      ),
      enabled: Boolean(raw.STRIPE_SECRET_KEY && raw.STRIPE_WEBHOOK_SECRET),
    },
    auth: {
      googleClientId: raw.GOOGLE_CLIENT_ID ?? raw.VITE_GOOGLE_CLIENT_ID,
      googleEnabled: Boolean(raw.GOOGLE_CLIENT_ID ?? raw.VITE_GOOGLE_CLIENT_ID),
      rateLimit: {
        windowMs: raw.AUTH_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
        max: raw.AUTH_RATE_LIMIT_MAX,
      },
      passwordResetRateLimit: {
        windowMs: raw.PASSWORD_RESET_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
        max: raw.PASSWORD_RESET_RATE_LIMIT_MAX,
      },
    },
    deployments: {
      vercelWebhookSecret: raw.VERCEL_WEBHOOK_SECRET,
      enabled: Boolean(raw.VERCEL_WEBHOOK_SECRET),
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
