/*
 * ============================================================================
 * PREFLIGHT — IS THIS DEPLOYMENT ACTUALLY ABLE TO DO ITS JOB?
 * ============================================================================
 *
 * Usage, from the repo root:
 *
 *     npm run preflight --workspace @jobforge/server              # check everything
 *     npm run preflight --workspace @jobforge/server -- --json    # machine-readable
 *
 * ## Why this exists, and why `loadServerConfig` is not enough
 *
 * `src/config/env.ts` refuses to boot production without four variables. That is the right
 * check and it is a check about *starting*. This one is about *working*, and the difference
 * between the two is where every failure in this system's history has lived:
 *
 *   - `RESEND_FROM_EMAIL` set to an address on `resend.dev` is a perfectly valid string. The
 *     server boots, the send returns 200, the log line says `email.sent` — and the message is
 *     delivered to nobody, because that domain only reaches the Resend account owner. Every
 *     verification link, password reset and prospect reply this deployment "sent" went nowhere.
 *   - A Stripe Price whose amount disagrees with the published price is a valid Price. The
 *     server boots. It fails at the moment a customer presses Pay, which is the worst possible
 *     moment to discover it — `requireVerifiedPrice` refuses loudly and correctly, but by then
 *     somebody is standing in front of a broken checkout.
 *   - A console deployed on a domain that is not a subdomain of the API's registrable domain
 *     signs in successfully and loops straight back to the form, because `SameSite=Lax` never
 *     sends the cookie. Nothing appears in any log. See DECISION 027.4.
 *
 * All three are configurations that pass every type check, every test and every existing guard,
 * and produce a system that answers 200 and does nothing. **This script is the guard for the
 * category.**
 *
 * ## It reports; it does not throw
 *
 * A boot check has to fail closed. A readiness check has to be runnable against a half-built
 * environment and still tell you the other nine things — so this one gathers every result and
 * prints them together, exactly as `EnvironmentConfigError` lists every problem at once rather
 * than the first.
 *
 * The exit code is 1 when anything FAILED, so CI can gate on it, and 0 when the only findings
 * are warnings.
 *
 * ## What it never prints
 *
 * No secret, no key, no connection string, no password. Addresses are printed **domain-only**:
 * knowing the from-address is on `resend.dev` is the finding, and the local part adds nothing
 * to it while being the half that identifies a person.
 * ============================================================================
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import {
  EXPECTED_AMOUNT_CENTS,
  BILLING_CURRENCY,
} from '../src/features/billing/billing.amounts.js';
import { createStripeClient } from '../src/features/billing/stripe.client.js';
import { BILLING_PRODUCTS, type BillingProduct } from '../src/features/billing/billing.types.js';

/* Three levels, for the reason `src/config/env.ts` sets out at length. */
dotenv.config({ path: ['.env', '../.env', '../../.env'], quiet: true });

/* ------------------------------------------------------------------ results */

type Level = 'pass' | 'warn' | 'fail';

interface Result {
  readonly area: string;
  readonly check: string;
  readonly level: Level;
  /** What was found. Never a secret. */
  readonly detail: string;
  /** What to do about it. Present on everything that is not a pass. */
  readonly fix?: string;
}

const results: Result[] = [];

function record(result: Result): void {
  results.push(result);
}

/* ------------------------------------------------------------------ helpers */

/**
 * The domain half of an address, or `undefined`.
 *
 * Used for every address this script reports on. The finding is always about the domain — is it
 * a sandbox, is it a free provider, is it the business's own — and the local part is the half
 * that names a person, so it never reaches the terminal.
 */
function domainOf(address: string | undefined): string | undefined {
  if (!address) return undefined;
  const at = address.lastIndexOf('@');
  return at === -1 ? undefined : address.slice(at + 1).toLowerCase();
}

/**
 * Pulls the address out of a `Name <addr@example.com>` header value.
 *
 * `RESEND_FROM_EMAIL` is documented as accepting that form, and a naive `split('@')` on
 * `JobForge <hello@example.com>` still finds the right domain — but only by luck. Parsing it
 * properly means the check keeps working when somebody puts an `@` in the display name.
 */
function addressPart(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const angled = /<([^>]+)>/.exec(value);
  return (angled?.[1] ?? value).trim();
}

/**
 * Domains that cannot deliver on behalf of a business.
 *
 * `resend.dev` is the one that matters and it is first for that reason: it is Resend's shared
 * sandbox, it accepts mail from anybody, and it delivers **only to the address that owns the
 * Resend account**. A deployment sending from it is not misconfigured in a way anything can
 * detect at runtime — it is a deployment whose entire outbound email is silently discarded.
 *
 * The free providers below are a different failure: they will deliver, but SPF and DKIM cannot
 * be published for a domain you do not own, so the mail is unauthenticated and lands in spam at
 * a rate that makes a password reset unreliable. That is a warning for the notification address
 * and a failure for the sending address.
 */
const UNDELIVERABLE_SENDER_DOMAINS = ['resend.dev', 'example.com', 'localhost'];

const FREE_PROVIDER_DOMAINS = [
  'gmail.com',
  'googlemail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'yahoo.com',
  'icloud.com',
  'me.com',
  'aol.com',
  'proton.me',
  'protonmail.com',
];

/* ------------------------------------------------------------------ checks */

function checkEmail(env: NodeJS.ProcessEnv): void {
  const area = 'Email';

  if (!env.RESEND_API_KEY) {
    record({
      area,
      check: 'API key',
      level: 'fail',
      detail: 'RESEND_API_KEY is not set.',
      fix: 'Create an API key in Resend and set RESEND_API_KEY.',
    });
  } else {
    record({ area, check: 'API key', level: 'pass', detail: 'Set.' });
  }

  const from = domainOf(addressPart(env.RESEND_FROM_EMAIL));

  if (!from) {
    record({
      area,
      check: 'Sending address',
      level: 'fail',
      detail: 'RESEND_FROM_EMAIL is not set, or is not an address.',
      fix: 'Set RESEND_FROM_EMAIL to an address on a domain verified in Resend, e.g. "JobForge <hello@yourdomain.com>".',
    });
  } else if (UNDELIVERABLE_SENDER_DOMAINS.includes(from)) {
    record({
      area,
      check: 'Sending address',
      level: 'fail',
      detail: `Sending from @${from} — this domain cannot deliver to customers.`,
      fix:
        "resend.dev is Resend's shared sandbox: it delivers only to the address that owns the Resend " +
        'account, so every verification link, password reset, welcome email and prospect reply is ' +
        'silently dropped. Verify a real domain in Resend, publish SPF/DKIM/DMARC, and point ' +
        'RESEND_FROM_EMAIL at it.',
    });
  } else if (FREE_PROVIDER_DOMAINS.includes(from)) {
    record({
      area,
      check: 'Sending address',
      level: 'fail',
      detail: `Sending from @${from}, a free provider.`,
      fix: 'SPF and DKIM cannot be published for a domain you do not own, so this mail is unauthenticated. Use a domain you control.',
    });
  } else {
    record({ area, check: 'Sending address', level: 'pass', detail: `Sending from @${from}.` });
  }

  const notify = domainOf(env.CONTACT_NOTIFICATION_EMAIL);

  if (!notify) {
    record({
      area,
      check: 'Notification address',
      level: 'fail',
      detail: 'CONTACT_NOTIFICATION_EMAIL is not set.',
      fix: 'Without it, lead notifications are skipped and replying to a prospect from the console fails with SERVICE_UNAVAILABLE.',
    });
  } else if (FREE_PROVIDER_DOMAINS.includes(notify)) {
    /*
     * A warning rather than a failure, and DECISION 013 is why. This address works — it is the
     * Reply-To on prospect replies and the inbox lead notifications land in, and both of those
     * function perfectly from a personal account. What is wrong with it is commercial: it is
     * also the published support address and the channel the response guarantee is measured on,
     * and both of those should be on the business's own domain before the first paying client.
     */
    record({
      area,
      check: 'Notification address',
      level: 'warn',
      detail: `Owner notifications go to @${notify}, a personal provider.`,
      fix: 'DECISION 013: move to a domain mailbox before the first Growth Partner client — this is the channel the response guarantee is measured on.',
    });
  } else {
    record({ area, check: 'Notification address', level: 'pass', detail: `@${notify}.` });
  }
}

async function checkStripe(env: NodeJS.ProcessEnv): Promise<void> {
  const area = 'Stripe';
  const secretKey = env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    record({
      area,
      check: 'Secret key',
      level: 'fail',
      detail: 'STRIPE_SECRET_KEY is not set — nothing is purchasable.',
      fix: 'Checkout answers 503 and no product can be bought. Set it from the Stripe dashboard.',
    });
    return;
  }

  /*
   * Which mode the key is for, reported rather than judged.
   *
   * A test key in production is a deployment that takes no money and says nothing about it; a
   * live key in development is a deployment that takes real money from whoever is testing. Both
   * are worth naming and neither is knowable from here without also knowing the intent, so this
   * prints the mode and lets the reader decide.
   */
  const mode = secretKey.startsWith('sk_live_')
    ? 'live'
    : secretKey.startsWith('sk_test_')
      ? 'test'
      : 'unrecognised';

  record({
    area,
    check: 'Secret key',
    level: mode === 'unrecognised' ? 'warn' : 'pass',
    detail: `Set (${mode} mode).`,
    ...(mode === 'unrecognised'
      ? { fix: 'The key does not begin sk_test_ or sk_live_. Check it was copied whole.' }
      : {}),
  });

  if (!env.STRIPE_WEBHOOK_SECRET) {
    record({
      area,
      check: 'Webhook secret',
      level: 'fail',
      detail: 'STRIPE_WEBHOOK_SECRET is not set.',
      fix:
        'Without it the webhook cannot verify a signature, so no payment is ever recorded: a paid ' +
        'deposit creates no project, seeds no tasks and writes no activity. Register an endpoint at ' +
        '/api/billing/webhook and set its signing secret.',
    });
  } else {
    record({ area, check: 'Webhook secret', level: 'pass', detail: 'Set.' });
  }

  if (!env.BILLING_ADMIN_TOKEN) {
    record({
      area,
      check: 'Owner billing token',
      level: 'warn',
      detail: 'BILLING_ADMIN_TOKEN is not set — the owner-only billing endpoints are switched off.',
      fix: 'Generate 32+ random bytes and store it in a password manager. Without it, /api/billing answers as though it does not exist.',
    });
  } else {
    record({ area, check: 'Owner billing token', level: 'pass', detail: 'Set.' });
  }

  /*
   * ==========================================================================
   * THE PRICE CHECK, RUN HERE RATHER THAN AT CHECKOUT
   * ==========================================================================
   *
   * This is the same comparison `requireVerifiedPrice` makes in `billing.service.ts`, against
   * the same constants, and it is deliberately duplicated rather than shared — not because
   * sharing would be hard, but because what is being verified is different. That one is a
   * *refusal*: it stops a wrong charge reaching a customer. This one is a *report*: it tells the
   * owner the refusal is going to happen, before anybody is standing in front of it.
   *
   * A mistyped Price is otherwise discovered at the only moment it cannot be fixed quickly.
   * ==========================================================================
   */
  const priceIdByProduct: Readonly<Record<BillingProduct, string | undefined>> = {
    'build-deposit': env.STRIPE_PRICE_BUILD_DEPOSIT,
    'build-final': env.STRIPE_PRICE_BUILD_FINAL,
    'growth-partner-monthly': env.STRIPE_PRICE_GROWTH_PARTNER_MONTHLY,
    'growth-partner-annual': env.STRIPE_PRICE_GROWTH_PARTNER_ANNUAL,
  };

  /*
   * The webhook secret is required by the constructor and unused by the one method called here.
   *
   * `getPriceAmount` is a read against the Stripe API and touches nothing signature-related;
   * `verifyWebhook` is the only method that reads this field, and this script never calls it.
   * Passing the real value when it exists keeps the object honest, and the empty-string fallback
   * is what lets the price check still run on a deployment whose webhook is not configured yet —
   * which is precisely the deployment most in need of being told its prices are wrong.
   */
  const stripe = createStripeClient({
    secretKey,
    webhookSecret: env.STRIPE_WEBHOOK_SECRET ?? '',
  });

  for (const product of BILLING_PRODUCTS) {
    const priceId = priceIdByProduct[product];
    const expected = EXPECTED_AMOUNT_CENTS[product];

    if (!priceId) {
      record({
        area,
        check: `Price: ${product}`,
        level: 'fail',
        detail: 'No Price ID configured.',
        fix: `Create a Price charging ${formatCents(expected)} ${BILLING_CURRENCY.toUpperCase()} and map its id. Asking for a link to this product currently answers 503.`,
      });
      continue;
    }

    try {
      const amount = await stripe.getPriceAmount(priceId);

      if (amount.unitAmountCents !== expected || amount.currency !== BILLING_CURRENCY) {
        const found =
          amount.unitAmountCents === null
            ? 'no fixed amount'
            : `${formatCents(amount.unitAmountCents)} ${amount.currency.toUpperCase()}`;

        record({
          area,
          check: `Price: ${product}`,
          level: 'fail',
          detail: `Stripe charges ${found}; the published price requires ${formatCents(expected)} ${BILLING_CURRENCY.toUpperCase()}.`,
          fix: 'Fix the Price in the Stripe dashboard, or the env mapping. Checkout for this product will be refused until they agree.',
        });
        continue;
      }

      record({
        area,
        check: `Price: ${product}`,
        level: 'pass',
        detail: `${formatCents(expected)} ${BILLING_CURRENCY.toUpperCase()}.`,
      });
    } catch (error) {
      record({
        area,
        check: `Price: ${product}`,
        level: 'fail',
        /* The provider's message only — it names the id, which is not a secret, and never the key. */
        detail: `Could not be retrieved: ${error instanceof Error ? error.message : 'unknown error'}`,
        fix: 'Check the Price ID exists in the same Stripe mode as the secret key.',
      });
    }
  }
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
}

function checkStorage(env: NodeJS.ProcessEnv): void {
  const area = 'Files';

  if (!env.BLOB_READ_WRITE_TOKEN) {
    record({
      area,
      check: 'Blob storage',
      level: 'fail',
      detail: 'BLOB_READ_WRITE_TOKEN is not set.',
      fix: 'Create a Blob store in the Vercel dashboard and link it to the project. Without it, a client cannot send a logo or photographs and two seeded onboarding tasks have no way to be answered.',
    });
    return;
  }

  record({ area, check: 'Blob storage', level: 'pass', detail: 'Set.' });
}

function checkAuthAndOrigins(env: NodeJS.ProcessEnv, isProduction: boolean): void {
  const area = 'Origins';

  const siteUrl = env.PUBLIC_SITE_URL ?? env.VITE_SITE_URL;
  const configured = (env.CLIENT_ORIGIN ?? '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter((origin) => origin.length > 0);

  if (configured.includes('*')) {
    record({
      area,
      check: 'CLIENT_ORIGIN',
      level: 'fail',
      detail: 'CLIENT_ORIGIN contains `*`.',
      fix: 'These requests carry the session cookie, so a wildcard would let any site make authenticated calls on a signed-in user’s behalf. The server refuses to boot with this set.',
    });
  } else if (configured.length === 0) {
    record({
      area,
      check: 'CLIENT_ORIGIN',
      level: isProduction ? 'fail' : 'warn',
      detail: 'Not set — the allowlist is derived from the site URL plus an `admin.` subdomain.',
      fix: 'Set it explicitly to both production origins. A derived allowlist is one nobody thinks to check, and it cannot express a console on a different subdomain.',
    });
  } else {
    const unparseable = configured.filter((origin) => {
      try {
        new URL(origin);
        return false;
      } catch {
        return true;
      }
    });

    if (unparseable.length > 0) {
      record({
        area,
        check: 'CLIENT_ORIGIN',
        level: 'fail',
        detail: `Not a valid origin: ${unparseable.join(', ')}`,
        fix: 'Each entry must be a scheme and host with no path, e.g. https://admin.example.com.',
      });
    } else {
      record({
        area,
        check: 'CLIENT_ORIGIN',
        level: 'pass',
        detail: `${String(configured.length)} origin(s) allowed.`,
      });
    }

    /*
     * ========================================================================
     * THE COOKIE TRAP — DECISION 027.4
     * ========================================================================
     *
     * The session cookie is `SameSite=Lax`, and `SameSite` is evaluated on the **registrable
     * domain**, not the origin. Two `*.vercel.app` names are two *sites*, so the cookie set by
     * the API is never sent to the console.
     *
     * What that looks like: the console's sign-in succeeds — a real session is created and a
     * `Set-Cookie` is returned — and the next request arrives without it, so the app decides
     * nobody is signed in and renders the form again. There is no error, in any log, on either
     * side. It is the single most confusing failure in this system, and it is invisible to
     * every other check because nothing is misconfigured in a way a type or a schema can see.
     * ========================================================================
     */
    if (siteUrl) {
      try {
        const site = new URL(siteUrl);
        const strangers = configured.filter((origin) => {
          const candidate = new URL(origin);
          if (candidate.hostname === site.hostname) return false;
          return registrableDomain(candidate.hostname) !== registrableDomain(site.hostname);
        });

        if (strangers.length > 0) {
          record({
            area,
            check: 'Cookie domain',
            level: 'fail',
            detail: `Not on the API's registrable domain: ${strangers.join(', ')}`,
            fix:
              'SameSite=Lax is evaluated on the registrable domain, so the session cookie is never sent ' +
              'to these origins. Sign-in will succeed and loop back to the form with nothing in any log. ' +
              'Put the console on a subdomain of the API’s domain — DECISION 027.4.',
          });
        } else {
          record({
            area,
            check: 'Cookie domain',
            level: 'pass',
            detail: 'Every allowed origin shares the API’s registrable domain.',
          });
        }
      } catch {
        record({
          area,
          check: 'Cookie domain',
          level: 'warn',
          detail: 'Site URL could not be parsed, so the cookie-domain check was skipped.',
          fix: 'Set PUBLIC_SITE_URL to the site’s origin.',
        });
      }
    }
  }

  /* --------------------------------------------------------------- optional integrations */

  record(
    (env.GOOGLE_CLIENT_ID ?? env.VITE_GOOGLE_CLIENT_ID)
      ? { area: 'Sign-in', check: 'Google', level: 'pass', detail: 'Client id set.' }
      : {
          area: 'Sign-in',
          check: 'Google',
          level: 'warn',
          detail: 'GOOGLE_CLIENT_ID is not set — the Google button is hidden.',
          fix: 'Supported and normal. Note it removes DECISION 028’s “the account is one click” mitigation, so the account-first funnel costs every visitor a password.',
        },
  );

  record(
    env.VERCEL_WEBHOOK_SECRET
      ? { area: 'Deployments', check: 'Vercel webhook', level: 'pass', detail: 'Secret set.' }
      : {
          area: 'Deployments',
          check: 'Vercel webhook',
          level: 'warn',
          detail:
            'VERCEL_WEBHOOK_SECRET is not set — preview and production URLs must be typed by hand.',
          fix: 'A working flow, not a broken one: the console’s URL fields are the manual path. Set it to have deployments update the customer’s dashboard by themselves.',
        },
  );

  /*
   * The digest, and the one check here whose failure is invisible in every other way.
   *
   * Without the secret the scheduled route is not mounted, which is correct and safe — but it
   * means digest-tier events are written to the queue and never sent, and the only symptom is
   * an email that does not arrive. Nothing errors, nothing logs a warning at request time, and
   * the queue quietly expires its own rows after a week.
   *
   * A warning rather than a failure: every notification a customer receives is immediate and
   * unaffected, so this is the owner's convenience rather than the product's function.
   */
  record(
    env.CRON_SECRET
      ? { area: 'Scheduled', check: 'Daily digest', level: 'pass', detail: 'Secret set.' }
      : {
          area: 'Scheduled',
          check: 'Daily digest',
          level: 'warn',
          detail: 'CRON_SECRET is not set — the daily summary is queued and never sent.',
          fix: 'Customer notifications are immediate and unaffected. Set it to receive the once-a-day summary of new accounts, completed tasks and client comments; queued lines otherwise expire after seven days.',
        },
  );

  /*
   * Demo Mode. Reported, never printed.
   *
   * A `pass` either way, and that is the point: unset is not a degraded state here, it is the
   * safe one — the routes are not mounted, `/api/demo/enter` is a genuine 404, and nothing
   * else in the application behaves differently. This line exists so somebody reading the
   * preflight output can tell which of the two deployments they are looking at, because the
   * difference is otherwise invisible until you type a passcode into `/promo`.
   *
   * The value never appears. Every other check in this file holds to the same rule, and this
   * is the one where breaking it would publish the secret to a build log.
   */
  record(
    env.DEMO_PASSCODE
      ? {
          area: 'Demo',
          check: 'Demonstration access',
          level: 'pass',
          detail: '/promo is open. Passcode set (not shown).',
        }
      : {
          area: 'Demo',
          check: 'Demonstration access',
          level: 'pass',
          detail: 'DEMO_PASSCODE is not set — /api/demo is unmounted, which is the safe default.',
          fix: 'Set DEMO_PASSCODE (12+ characters) to open /promo for a private demonstration. See docs/DEMO-MODE.md.',
        },
  );
}

/**
 * The registrable domain, approximately — the last two labels.
 *
 * Deliberately not a public-suffix-list implementation. That would be correct for `co.uk` and
 * would mean a dependency and a data file that goes stale, for a check whose entire job is to
 * catch one specific mistake: a console and an API on two different `*.vercel.app` names, or on
 * two unrelated domains. Both of those are caught by comparing the last two labels.
 *
 * The known false positive is a deployment on `example.co.uk` and `admin.example.co.uk`, which
 * this would compare as `co.uk` against `co.uk` and pass — the right answer, reached by luck.
 * The false negative would need a multi-part suffix where the two hosts genuinely differ, which
 * is a warning worth having rather than a check worth abandoning.
 */
function registrableDomain(hostname: string): string {
  const labels = hostname.split('.');
  return labels.slice(-2).join('.');
}

async function checkDatabase(env: NodeJS.ProcessEnv): Promise<void> {
  const area = 'Database';
  const uri = env.MONGODB_URI;

  if (!uri) {
    record({
      area,
      check: 'Connection',
      level: 'fail',
      detail: 'MONGODB_URI is not set.',
      fix: 'Nothing is stored. Every data-backed endpoint answers SERVICE_UNAVAILABLE.',
    });
    return;
  }

  try {
    await mongoose.connect(uri, {
      ...(env.MONGODB_DB_NAME ? { dbName: env.MONGODB_DB_NAME } : {}),
    });
    record({ area, check: 'Connection', level: 'pass', detail: 'Reachable.' });
  } catch (error) {
    /*
     * The message only, and only when it is safe. A Mongoose connection error can carry the
     * connection string, and a connection string carries a database password — so the message is
     * checked for the URI before it is printed rather than trusted not to contain it.
     */
    const message = error instanceof Error ? error.message : 'unknown error';
    record({
      area,
      check: 'Connection',
      level: 'fail',
      detail: message.includes(uri) ? 'Connection refused.' : `Connection failed: ${message}`,
      fix: 'Check the URI, the database user’s password, and whether this host’s IP is on the Atlas allowlist.',
    });
    return;
  }

  /*
   * At least one admin, which is the check DECISION 020 recommended as option C.
   *
   * A fresh production deployment has no admin until `npm run admin:create` is run against the
   * production database — the intended trade, and an operational step whose failure mode is
   * twenty minutes of wondering why the console is empty. This is that twenty minutes, spent
   * once, by a script.
   *
   * Queried through the connection directly rather than through the auth repository: this needs
   * a count, the repository offers a bounded list, and reading five hundred user documents to
   * find out whether one of them is an admin is the wrong shape.
   */
  try {
    const count = await mongoose.connection.collection('users').countDocuments({ role: 'admin' });

    record(
      count > 0
        ? {
            area,
            check: 'Admin account',
            level: 'pass',
            detail: `${String(count)} admin account(s).`,
          }
        : {
            area,
            check: 'Admin account',
            level: 'fail',
            detail: 'No account has the admin role.',
            fix: 'The console cannot be signed into and /api/admin answers NOT_FOUND to everybody. Set ADMIN_EMAIL and ADMIN_PASSWORD, run `npm run admin:create --workspace @jobforge/server`, then remove both variables.',
          },
    );
  } catch (error) {
    record({
      area,
      check: 'Admin account',
      level: 'warn',
      detail: `Could not be counted: ${error instanceof Error ? error.message : 'unknown error'}`,
    });
  }
}

/* ------------------------------------------------------------------ output */

const SYMBOL: Readonly<Record<Level, string>> = { pass: '✓', warn: '!', fail: '✗' };

function print(): void {
  const areas = [...new Set(results.map((result) => result.area))];

  console.log('');
  console.log('  JobForge preflight');
  console.log('  ' + '─'.repeat(64));

  for (const area of areas) {
    console.log('');
    console.log(`  ${area}`);

    for (const result of results.filter((entry) => entry.area === area)) {
      console.log(`    ${SYMBOL[result.level]}  ${result.check.padEnd(28)} ${result.detail}`);
      if (result.fix && result.level !== 'pass') {
        /* Wrapped by hand rather than by a helper: one call site, and the width is fixed. */
        for (const line of wrap(result.fix, 72)) {
          console.log(`         → ${line}`);
        }
      }
    }
  }

  const failed = results.filter((result) => result.level === 'fail').length;
  const warned = results.filter((result) => result.level === 'warn').length;

  console.log('');
  console.log('  ' + '─'.repeat(64));
  console.log(
    `  ${String(results.length - failed - warned)} passed · ${String(warned)} warning(s) · ${String(failed)} failure(s)`,
  );
  console.log(
    failed > 0
      ? '  NOT READY. Every failure above is a thing this deployment cannot do.'
      : warned > 0
        ? '  Ready, with warnings.'
        : '  Ready.',
  );
  console.log('');
}

function wrap(text: string, width: number): readonly string[] {
  const lines: string[] = [];
  let current = '';

  for (const word of text.split(' ')) {
    if (current.length + word.length + 1 > width) {
      lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }

  if (current) lines.push(current);
  return lines;
}

/* ------------------------------------------------------------------ main */

async function main(): Promise<void> {
  const json = process.argv.includes('--json');
  const env = process.env;

  /*
   * The same resolution `config/env.ts` performs, repeated rather than imported.
   *
   * Importing `loadServerConfig` would mean this script throws on a production environment with
   * a missing variable — which is exactly the environment it exists to describe. A readiness
   * check that cannot run against a broken deployment is not a readiness check.
   */
  const isProduction =
    env.NODE_ENV === 'production' ||
    env.VERCEL_ENV === 'production' ||
    env.VERCEL_ENV === 'preview';

  checkEmail(env);
  await checkStripe(env);
  checkStorage(env);
  checkAuthAndOrigins(env, isProduction);
  await checkDatabase(env);

  await mongoose.disconnect().catch(() => undefined);

  if (json) {
    console.log(JSON.stringify({ results }, null, 2));
  } else {
    print();
  }

  process.exit(results.some((result) => result.level === 'fail') ? 1 : 0);
}

main().catch((error: unknown) => {
  console.error(`[preflight] ${error instanceof Error ? error.message : 'Unknown error.'}`);
  process.exit(1);
});
