import { Router } from 'express';
import { success } from '../../lib/apiResponse.js';
import type { Logger } from '../../lib/logger.js';
import { requireCronSecret } from '../../middleware/cronSecret.js';
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
 *
 * That prediction came true within the week: `features/followup` needed the same guard for the
 * same reason. It is `middleware/cronSecret.ts` now, used by both, and the reasoning above is
 * still the canonical statement of it — the middleware's own header points back here rather
 * than restating it, so there is one copy to keep right.
 * ============================================================================
 */
export function createDigestRouter(dependencies: DigestRoutesDependencies): Router {
  const { digestService, cronSecret, logger } = dependencies;
  const router = Router();

  router.post('/digest', requireCronSecret(cronSecret), async (_request, response) => {
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
