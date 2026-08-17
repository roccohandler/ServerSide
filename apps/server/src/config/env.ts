import dotenv from 'dotenv';
import { z } from 'zod';
import { LOG_LEVELS, type LogLevel } from '../lib/logger.js';

/*
 * ============================================================================
 * WHERE `.env` IS, AND WHY THERE ARE THREE PATHS
 * ============================================================================
 *
 * Local development reads a `.env` from the server workspace or from either directory
 * above it. On Vercel (and any other host) real environment variables are already present
 * and dotenv leaves them alone, so this is a no-op there.
 *
 * The paths are relative to the working directory, which for `npm run dev` is the server
 * workspace. **`../../.env` is the repository root and it is the one that actually exists.**
 * It was missing from this list, and the failure it caused is worth writing down because
 * nothing about it looked like a configuration problem:
 *
 * The list read `['.env', '../.env']` when the server lived at `server/` — one level down,
 * so `../.env` *was* the root. DECISION 026 moved it to `apps/server/`, which made `../.env`
 * resolve to `apps/.env`, a file that has never existed. From that commit the server ran
 * with no `MONGODB_URI`, no Resend key and no notification address, on a machine where all
 * three were sitting in the root `.env` the two Vite apps were reading correctly through
 * their `envDir`.
 *
 * What that looked like: signing in to the owner console at `localhost:5174` answered
 * "We cannot reach our records right now" — the no-database branch in `app/app.ts` — with a
 * correct password, a running API and a perfectly good Atlas cluster. Nothing was broken
 * except a relative path, and the message correctly described a state nobody had chosen.
 *
 * dotenv processes the list in order and never overrides a variable that is already set, so
 * a workspace-local `.env` still wins over the root one. Adding an entry is additive.
 * ============================================================================
 */
export const DOTENV_PATHS = ['.env', '../.env', '../../.env'] as const;

dotenv.config({ path: [...DOTENV_PATHS], quiet: true });

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
  /**
   * Scheduled work — today, the owner's daily digest.
   *
   * `enabled` false is a normal state and not a degraded one: every notification a *customer*
   * receives is immediate and unaffected. What stops is the owner's summary of the things that
   * were judged not worth interrupting them for.
   */
  readonly cron: {
    readonly secret: string | undefined;
    readonly enabled: boolean;
  };
  /** Follow-up nudges. Unset leaves the feature unwired and nobody is emailed. */
  readonly followUp: {
    readonly unsubscribeSecret: string | undefined;
    readonly enabled: boolean;
  };
  /**
   * File storage — Vercel Blob.
   *
   * Optional, like every other provider here, and unset means the token endpoint answers 503
   * with an instruction rather than the application pretending it can take a file. What stops
   * working is uploads; nothing else does.
   *
   * **Never `VITE_`-prefixed.** This token can write to and delete from the store, and Vite
   * inlines that prefix into the public bundle. The browser is issued a *client* token
   * instead — scoped to one path, one content type and one minute — minted from this one on
   * the server. That asymmetry is the whole design; see `file.routes.ts`.
   */
  readonly files: {
    readonly blobToken: string | undefined;
    readonly enabled: boolean;
  };
  /**
   * Demo Mode. `enabled` false leaves every `/api/demo` route unmounted — a genuine 404
   * rather than an open door, the same shape `cron` uses for the same reason.
   */
  readonly demo: {
    readonly passcode: string | undefined;
    readonly sessionTtlMs: number;
    readonly enabled: boolean;
  };
  readonly cors: {
    /**
     * Never empty, and never a wildcard. Read by both the CORS middleware and the CSRF
     * guard — see `resolveAllowedOrigins` for what fills it when `CLIENT_ORIGIN` does not.
     */
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

  /*
   * ==========================================================================
   * WHICH BROWSER ORIGINS THE API ANSWERS
   * ==========================================================================
   *
   * A comma-separated allowlist. There are two frontends now — the customer application
   * and the owner console — and in production they are separate origins:
   *
   *   CLIENT_ORIGIN=https://www.example.com,https://admin.example.com
   *
   * In development this can stay unset: both dev servers are allowed unconditionally.
   * That is not merely a convenience — cookies are scoped by host and ignore the port, so
   * a session set on `localhost:5173` is sent to the console on `localhost:5174`, the CSRF
   * guard engages on the console's first sign-in, and without the default it is refused on
   * a machine where there is nothing to configure. See `resolveAllowedOrigins`.
   *
   * Unset in *production* falls back to the site's origin plus its `admin.` subdomain,
   * which is a convenience and not the configuration. Set this explicitly for a real
   * deployment.
   *
   * **`*` is never correct here.** These requests carry the session cookie, so a wildcard
   * would let any page on the internet make authenticated calls on a signed-in user's
   * behalf. The `cors` middleware in `app/app.ts` answers an unrecognised origin by
   * omitting the CORS headers rather than by returning an error, which is what makes a
   * misconfiguration look like a blocked request in the browser instead of a leak.
   *
   * The two frontends being separate origins is the point of the architecture, not an
   * inconvenience it works around: neither browser bundle can reach the other, and the
   * only thing they share is this API — which re-authorises every request from the
   * session regardless of which origin it came from.
   * ==========================================================================
   */
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

  /*
   * The shared secret Vercel Cron presents on a scheduled invocation.
   *
   * Optional, and unset means the scheduled route is not mounted at all rather than mounted
   * unguarded — the owner's daily digest simply does not send, every immediate notification
   * still works, and queued lines expire on their TTL. Never `VITE_`-prefixed: it is a
   * credential, and Vite inlines that prefix into the public bundle.
   */
  CRON_SECRET: optionalString,

  /*
   * Signs the unsubscribe link on a follow-up email.
   *
   * Optional, and unset means `features/followup` is not wired at all — the `/api/cron/followup`
   * route is absent and nobody is ever nudged. That is the `DEMO_PASSCODE` pattern and it is
   * the right one here for a sharper reason than usual: this is the only feature in the
   * application that emails somebody who did not ask to hear from us, so it should take a
   * deliberate act to switch on, not a default.
   *
   * **Deliberately not `CRON_SECRET`**, which would have saved a variable. That value is held
   * by a third party, is rotated on somebody else's schedule, and rotating it would silently
   * invalidate every unsubscribe link already sitting in somebody's inbox — the one link in
   * the system that must keep working months after the message it arrived in.
   *
   * Never `VITE_`-prefixed: it is a credential, and Vite inlines that prefix into the public
   * bundle. `followup.test.ts` sweeps the client source for the attempt, as `demo.api.test.ts`
   * does for the passcode.
   */
  UNSUBSCRIBE_SECRET: optionalString,

  /*
   * The Vercel Blob store's read-write token. Vercel injects it automatically once a store is
   * linked to the project; locally it is pasted into `.env`.
   *
   * Never VITE_-prefixed: it can delete every file in the store. What the browser gets is a
   * short-lived client token minted from it, scoped to one path.
   */
  BLOB_READ_WRITE_TOKEN: optionalString,

  /*
   * ==========================================================================
   * THE DEMONSTRATION PASSCODE
   * ==========================================================================
   *
   * One shared secret that opens `/promo` and signs somebody in as the demonstration
   * customer. **Unset leaves every `/api/demo` route unmounted**, which is the `/api/cron`
   * pattern and is deliberate: an unconfigured deployment has a genuine 404 rather than an
   * open door, so the feature cannot be half-on.
   *
   * Never `VITE_`-prefixed. It is a credential, Vite inlines that prefix into the public
   * bundle, and the whole point of the design is that the passcode never reaches a browser.
   * `check-demo.ts` sweeps the built bundles for it after every build.
   *
   * Rotating it is one environment variable and a redeploy, which invalidates nothing else —
   * sessions already minted keep working until they expire, and that is the right behaviour:
   * rotating the door does not throw out the person already through it.
   *
   * A minimum length rather than a complexity rule. It is guessed over the network, behind
   * `authRateLimiter`, so length is the only property that matters and a rule demanding a
   * punctuation mark would produce a passcode somebody has to spell out on a phone call.
   */
  DEMO_PASSCODE: z
    .string()
    .trim()
    .min(12, 'DEMO_PASSCODE must be at least 12 characters. It is guessed over the network.')
    .optional()
    .or(z.literal('').transform(() => undefined)),

  /*
   * How long a demo session lasts. Hours, not the thirty days a customer gets.
   *
   * A demo session must not quietly become an indefinite credential: it is minted from a
   * shared secret that several people have been told, so its value is that it expires.
   * Twelve hours covers a demonstration, an afternoon of poking, and somebody coming back
   * after lunch — and not a laptop left in a coffee shop overnight.
   */
  DEMO_SESSION_HOURS: z.coerce.number().int().min(1).max(72).default(12),

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

  const origins = value
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter((origin) => origin.length > 0);

  /*
   * `*` is refused rather than passed through, and the difference matters.
   *
   * Passed through it becomes a literal entry that matches no `Origin` header, so the
   * deployment fails closed — correct, but silently: somebody who wrote `CLIENT_ORIGIN=*`
   * expecting a wildcard gets a console that cannot sign in and an allowlist that looks
   * like it permits everything. Refusing says what is wrong at boot, when it is cheap.
   *
   * And a wildcard is never right here. These requests carry the session cookie, so one
   * that worked would let any page on the internet make authenticated calls on a signed-in
   * user's behalf.
   */
  if (origins.includes('*')) {
    throw new EnvironmentConfigError([
      'CLIENT_ORIGIN must list explicit origins, comma separated. `*` is not supported: ' +
        'these requests carry the session cookie, so a wildcard would let any site make ' +
        'authenticated calls on a signed-in user’s behalf.',
    ]);
  }

  return origins;
}

/** The console's Vite dev server. Its port is set in `apps/admin/vite.config.ts`. */
const ADMIN_DEV_ORIGIN = 'http://localhost:5174';

/**
 * Where the owner console is, when `CLIENT_ORIGIN` has not said.
 *
 * ============================================================================
 * WHY THIS DEFAULT EXISTS AT ALL
 * ============================================================================
 *
 * The console is a second origin, and two things reject an origin nobody listed: the CORS
 * middleware (which withholds its headers, so the browser discards the response) and the
 * CSRF guard (which answers FORBIDDEN to a state-changing request carrying a session).
 *
 * **In development that bites immediately, and for a reason worth writing down.** Cookies
 * are scoped by host and ignore the port, so a session set by the customer app on
 * `localhost:5173` is sent to the console on `localhost:5174`. The console's very first
 * sign-in therefore arrives *carrying a session*, the CSRF guard engages, and the request
 * is refused with "that request could not be verified as coming from this site" — on a
 * machine where nothing is misconfigured and there is nothing to configure.
 *
 * So the two dev servers are always allowed. They are `localhost` and cannot be reached
 * from anywhere else, and hard-coding them beats making every contributor discover this.
 *
 * ## The production fallback, and its limits
 *
 * With no `CLIENT_ORIGIN` set, production allows the site's own origin with its host's
 * first label replaced by `admin` — `https://www.example.com` → `https://admin.example.com`.
 * That is not a guess about an unrelated domain: DECISION 027.4 requires the console to be
 * a subdomain of the API's registrable domain anyway, because the session cookie is
 * `SameSite=Lax` and would otherwise never be sent. The fallback simply names the
 * conventional one.
 *
 * **It is a convenience, not the configuration.** Set `CLIENT_ORIGIN` explicitly for a real
 * deployment: it is the only way to allow a console on a different subdomain, and an
 * allowlist that is derived rather than stated is one nobody thinks to check. It is
 * deliberately *additive to nothing* — a wildcard is never produced, and an explicit
 * `CLIENT_ORIGIN` replaces this entirely rather than being merged with it, so the value in
 * the environment is the whole answer.
 * ============================================================================
 */
function resolveAllowedOrigins(params: {
  readonly configured: readonly string[];
  readonly siteUrl: string;
  readonly isProduction: boolean;
}): readonly string[] {
  const { configured, siteUrl, isProduction } = params;

  if (!isProduction) {
    /* Explicit values still win; the dev servers are added, never substituted. */
    return [...new Set([...configured, siteUrl, ADMIN_DEV_ORIGIN])];
  }

  if (configured.length > 0) return configured;

  const derived = adminSubdomainOf(siteUrl);
  return derived ? [siteUrl, derived] : [siteUrl];
}

/** `https://www.example.com` → `https://admin.example.com`. Undefined if the URL is unusable. */
function adminSubdomainOf(siteUrl: string): string | undefined {
  try {
    const url = new URL(siteUrl);
    const labels = url.hostname.split('.');

    /*
     * A bare `example.com` gains a label; `www.example.com` has its first replaced. Both
     * land on the same host, which is the point — the two spellings of the same site must
     * not produce two different consoles.
     */
    const hostname =
      labels.length > 2 ? ['admin', ...labels.slice(1)].join('.') : `admin.${url.hostname}`;

    url.hostname = hostname;
    return url.origin;
  } catch {
    /* Not a URL we can reason about. Better to allow nothing extra than to allow something wrong. */
    return undefined;
  }
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

  /* Hoisted: the CORS allowlist derives its production fallback from it. */
  const siteUrl = (raw.PUBLIC_SITE_URL ?? raw.VITE_SITE_URL ?? 'http://localhost:5173').replace(
    /\/$/,
    '',
  );

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
      siteUrl,
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
    cron: {
      secret: raw.CRON_SECRET,
      enabled: Boolean(raw.CRON_SECRET),
    },
    followUp: {
      unsubscribeSecret: raw.UNSUBSCRIBE_SECRET,
      enabled: Boolean(raw.UNSUBSCRIBE_SECRET),
    },
    files: {
      blobToken: raw.BLOB_READ_WRITE_TOKEN,
      enabled: Boolean(raw.BLOB_READ_WRITE_TOKEN),
    },
    demo: {
      passcode: raw.DEMO_PASSCODE,
      sessionTtlMs: raw.DEMO_SESSION_HOURS * 60 * 60 * 1000,
      enabled: Boolean(raw.DEMO_PASSCODE),
    },
    cors: {
      allowedOrigins: resolveAllowedOrigins({
        configured: parseOrigins(raw.CLIENT_ORIGIN),
        siteUrl,
        isProduction,
      }),
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
