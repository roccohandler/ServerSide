import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';
import { failure, success } from '../lib/apiResponse.js';
import type { Logger } from '../lib/logger.js';

export interface LeadRateLimiterOptions {
  readonly windowMs: number;
  readonly max: number;
  readonly logger: Logger;
}

/**
 * Per-IP throttle for the public lead endpoint.
 *
 * Deliberately generous: a real business owner might legitimately submit twice while
 * correcting a typo, and locking them out would cost a customer. It only exists to make
 * automated flooding uneconomical.
 *
 * Known limitation: the store is in-memory, so on Vercel the counter is per warm
 * function instance rather than global. That is enough to blunt a naive script; a
 * distributed store would be the next step if abuse ever becomes real, and is
 * deliberately not built today.
 */
export function createLeadRateLimiter(options: LeadRateLimiterOptions): RateLimitRequestHandler {
  const { windowMs, max, logger } = options;

  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (request, response) => {
      logger.warn('lead.rate_limited', { method: request.method, path: request.path });
      response
        .status(429)
        .json(
          failure(
            'RATE_LIMITED',
            'Too many submissions from this connection. Please wait a few minutes and try again, or call or email us directly.',
          ),
        );
    },
  });
}

/**
 * Per-*address* throttle for password-reset requests, applied on top of the per-IP one.
 *
 * ## What the per-IP limiter does not cover
 *
 * It stops one connection making a hundred requests. It does nothing about a hundred
 * connections each making one request for the same address — which is the shape of the
 * attack that matters here, because the product of that attack is not a compromised
 * account. It is a hundred password-reset emails in somebody's inbox.
 *
 * That is a real harm even though nothing is breached: the victim is buried, the genuine
 * reset link is lost among the decoys, and the sending domain's reputation pays for it.
 * A botnet, an office behind one NAT, or a plain script rotating proxies all defeat an
 * IP counter, and none of them has to defeat this one.
 *
 * Five per hour per address is generous for somebody who genuinely cannot find the email —
 * and note that each new request invalidates the previous token, so the fifth link works
 * and the first four do not. Rejected requests still answer 202, like every other path
 * through this endpoint: a reset form that says "too many attempts for that address" is a
 * membership oracle with a rate limit attached.
 *
 * Same in-memory caveat as the others — see below.
 */
export function createPasswordResetRateLimiter(options: {
  readonly windowMs: number;
  readonly max: number;
  readonly logger: Logger;
}): RateLimitRequestHandler {
  const { windowMs, max, logger } = options;

  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    /*
     * Keyed on the address, normalised the same way the schema and the repository
     * normalise it — otherwise `Dana@Example.com` and `dana@example.com` are two buckets
     * and the limit is one request from being useless.
     *
     * A body without a usable address falls back to a single shared bucket rather than to
     * the IP. Those requests are malformed and about to be rejected by the schema anyway;
     * bucketing them by IP would mean a validation typo counted against a real limit.
     */
    keyGenerator: (request) => {
      const email = (request.body as { email?: unknown } | undefined)?.email;
      return typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : 'no-address';
    },
    handler: (_request, response) => {
      logger.warn('auth.password_reset_rate_limited');
      /*
       * 202 and the same sentence the endpoint always answers. A 429 here would tell an
       * attacker that the address they are hammering is worth hammering, which is exactly
       * the thing the whole flow refuses to say.
       */
      response.status(202).json(
        success({
          message: 'If that address has an account, a reset link is on its way.',
        }),
      );
    },
  });
}

/**
 * Per-IP throttle for the credential endpoints: sign in, sign up, password reset and
 * the Google credential exchange.
 *
 * Tighter than the lead limit and for a different reason. The lead limiter exists to
 * make flooding a form uneconomical; this one exists because every request it covers is
 * an attempt to guess or brute-force a secret. Twenty attempts in fifteen minutes is
 * generous for somebody who genuinely cannot remember their password and useless for
 * anybody working through a list.
 *
 * Same known limitation as the lead limiter: the store is in-memory, so on a serverless
 * host the counter is per warm instance rather than global. It blunts a naive script.
 * The defences that do not depend on it are scrypt on every verification, a uniform
 * failure message, and the fact that a session is a 256-bit random value.
 */
export function createAuthRateLimiter(options: {
  readonly windowMs: number;
  readonly max: number;
  readonly logger: Logger;
}): RateLimitRequestHandler {
  const { windowMs, max, logger } = options;

  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    /*
     * Successful sign-ins do not count. Somebody signing in on six devices in an
     * afternoon is not what this is defending against, and locking them out would be
     * the limiter causing exactly the failure it exists to prevent.
     */
    skipSuccessfulRequests: true,
    handler: (request, response) => {
      logger.warn('auth.rate_limited', { method: request.method, path: request.path });
      response
        .status(429)
        .json(
          failure(
            'RATE_LIMITED',
            'Too many attempts from this connection. Please wait a few minutes and try again.',
          ),
        );
    },
  });
}
