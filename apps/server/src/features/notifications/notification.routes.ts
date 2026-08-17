import { timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import { success } from '../../lib/apiResponse.js';
import { AppError } from '../../lib/appError.js';
import type { Logger } from '../../lib/logger.js';
import type { DigestService } from './notification.digest.js';

export interface DigestRoutesDependencies {
  readonly digestService: DigestService;
  /**
   * The shared secret a scheduled invocation must present.
   *
   * Undefined switches the route off entirely — see the note below. It is deliberately not
   * optional-with-a-default: a default would be a published credential.
   */
  readonly cronSecret: string | undefined;
  readonly logger: Logger;
}

/*
 * ============================================================================
 * THE SCHEDULED HALF OF THE DIGEST
 * ============================================================================
 *
 * One route. It is not part of `/api/admin` and it is not behind a session, because the caller
 * is a scheduler rather than a person — there is no browser, no cookie and nobody to sign in.
 *
 * ## Why a bearer secret rather than an IP allowlist or "it is fine, it is idempotent"
 *
 * The endpoint sends email. An unauthenticated one would let anybody on the internet drain the
 * queue on demand — not a data breach, but a reliable way to make the owner's only daily summary
 * arrive at 3am in forty pieces, and a free way to burn a sending reputation that Phase 0 exists
 * to establish.
 *
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET` on every scheduled invocation. That is
 * the whole mechanism and it is the platform's documented one, so this compares against
 * `CRON_SECRET` and answers NOT_FOUND to everybody else.
 *
 * **NOT_FOUND rather than UNAUTHORIZED**, matching `requireAdmin` and the owner-only billing
 * endpoints, and for the same reason those chose it: a 401 confirms the endpoint exists and that
 * the caller merely lacks a credential, which is a free answer to somebody probing. 404 says
 * nothing at all.
 *
 * ## Unset means off, and off is a supported state
 *
 * With no `CRON_SECRET` the route is not mounted. A deployment without a scheduler is a
 * deployment where digest lines accumulate and expire on their TTL — every *immediate*
 * notification still works, which is the half that matters, and nothing silently sends mail
 * from an endpoint nobody secured.
 *
 * ## Why the timing comparison is constant-time
 *
 * The secret is compared with `timingSafeEqual` rather than `===`. This is one route, called
 * once a day, and a timing attack against it is not a realistic threat — but the alternative is
 * a credential comparison written the fast way in a file that somebody will copy the next time
 * a shared secret is needed. The cost is four lines.
 * ============================================================================
 */
export function createDigestRouter(dependencies: DigestRoutesDependencies): Router {
  const { digestService, cronSecret, logger } = dependencies;
  const router = Router();

  router.post('/digest', async (request, response) => {
    if (!cronSecret || !presentedSecretMatches(request.headers.authorization, cronSecret)) {
      /*
       * The same answer for "not configured" and "wrong secret". An attacker learning that the
       * scheduler is switched off is an attacker who knows to come back after the next deploy.
       */
      throw new AppError('NOT_FOUND', 'No such route.');
    }

    const count = await digestService.sendPending();

    logger.info('digest.run_completed', { count });

    /*
     * The count, so a failed run and a quiet day are distinguishable in the scheduler's own log
     * without opening the application's. `sendPending` returns 0 for both an empty queue and an
     * unconfigured address, and logs which — this is the summary, not the diagnosis.
     */
    response.json(success({ sent: count > 0, entries: count }));
  });

  return router;
}

/**
 * Constant-time comparison of the presented bearer token against the configured secret.
 *
 * Length is checked first and separately, because `timingSafeEqual` throws on a length mismatch
 * rather than returning false — so a caller sending a one-character token would produce a 500
 * instead of a 404, which is itself an oracle.
 */
function presentedSecretMatches(header: string | undefined, secret: string): boolean {
  if (!header?.startsWith('Bearer ')) return false;

  const presented = Buffer.from(header.slice('Bearer '.length));
  const expected = Buffer.from(secret);

  if (presented.length !== expected.length) return false;

  return timingSafeEqual(presented, expected);
}
