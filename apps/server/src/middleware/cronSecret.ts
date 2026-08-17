import { timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';
import { AppError } from '../lib/appError.js';

/*
 * ============================================================================
 * AUTHENTICATING A CALLER THAT IS NOT A PERSON
 * ============================================================================
 *
 * Two scheduled routes now — the owner's digest and the follow-up run — and this is the guard
 * both are behind. It lives in `middleware/` rather than in either feature because it is
 * request authentication, which is what this directory is, and because the alternative was
 * the second feature copying nine lines of credential comparison out of the first. That copy
 * is the one that is still using `===` in two years.
 *
 * The reasoning it enforces, in full, is in the header of `notification.routes.ts`:
 *
 *   - **A bearer secret**, because the endpoints send email and an unauthenticated one lets
 *     anybody on the internet drain the queue on demand.
 *   - **NOT_FOUND rather than UNAUTHORIZED**, matching `requireAdmin`: a 401 confirms the
 *     endpoint exists and that the caller merely lacks a credential, which is a free answer
 *     to somebody probing.
 *   - **The same answer for "not configured" and "wrong secret"**, so an attacker cannot
 *     learn that the scheduler is switched off and come back after the next deploy.
 *   - **Constant-time comparison**, because a credential comparison written the fast way is
 *     the one that gets copied.
 *
 * Unset does not reach here at all: `routes.ts` leaves the whole `/cron` mount off when
 * `CRON_SECRET` is absent, which is a genuine 404 rather than a guarded route.
 * ============================================================================
 */

export function requireCronSecret(secret: string | undefined): RequestHandler {
  return (request, _response, next) => {
    if (!secret || !presentedSecretMatches(request.headers.authorization, secret)) {
      next(new AppError('NOT_FOUND', 'No such route.'));
      return;
    }
    next();
  };
}

/**
 * Constant-time comparison of the presented bearer token against the configured secret.
 *
 * Length is checked first and separately, because `timingSafeEqual` throws on a length
 * mismatch rather than returning false — so a caller sending a one-character token would
 * produce a 500 instead of a 404, which is itself an oracle.
 */
function presentedSecretMatches(header: string | undefined, secret: string): boolean {
  if (!header?.startsWith('Bearer ')) return false;

  const presented = Buffer.from(header.slice('Bearer '.length));
  const expected = Buffer.from(secret);

  if (presented.length !== expected.length) return false;

  return timingSafeEqual(presented, expected);
}
