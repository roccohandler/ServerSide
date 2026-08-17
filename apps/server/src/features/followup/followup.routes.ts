import { Router } from 'express';
import { z } from 'zod';
import { success } from '../../lib/apiResponse.js';
import { escapeHtml } from '../../lib/html.js';
import type { Logger } from '../../lib/logger.js';
import { parseQuery } from '../../lib/requestSchema.js';
import { requireCronSecret } from '../../middleware/cronSecret.js';
import type { FollowUpService } from './followup.service.js';

/*
 * ============================================================================
 * `GET /api/unsubscribe` — PUBLIC, UNAUTHENTICATED, AND IT RETURNS A PAGE
 * ============================================================================
 *
 * The only route in the application that answers HTML rather than JSON, and the only one
 * whose caller may be a mail client rather than a browser. Both are deliberate.
 *
 * **HTML**, because the audience is somebody who clicked a link in an email and who is owed a
 * sentence they can read, not `{"success":true}`. Routing it through the React application
 * would mean an unsubscribe that depends on 163 kB of JavaScript loading successfully in
 * whatever browser a mail client happens to open — for a person who has just told us they
 * want less from us. This is twenty lines of self-contained markup and it works with
 * scripting off.
 *
 * **GET**, against the usual rule that a state change is a POST, and this is the one place
 * that rule is wrong: an unsubscribe link has to work from a click in a mail client, and mail
 * clients do not post. The mitigation for the thing POST would have bought is the signature —
 * a link can only have come from a message we sent to that address. See `sign` in the service.
 *
 * There is no CSRF check here for the same reason, and it is not a gap: the request carries no
 * cookie, changes nothing about a session, and is authorised entirely by a token in its own
 * URL. It is also outside `/app`, so the CSRF middleware's own allowlist never sees it.
 *
 * ## Why prefetching does not break it
 *
 * Some mail clients and link scanners fetch every URL in a message. That means an unsubscribe
 * can be triggered by a machine rather than a person, and there is no way to tell them apart —
 * which is a known cost of one-click unsubscribe and the reason `suppress` is an upsert. The
 * alternative, a confirmation button, is a second click for every genuine person to protect
 * against an automated fetch that would only ever *reduce* the mail we send. Wrong trade.
 * ============================================================================
 */

const unsubscribeQuerySchema = z.object({
  email: z.string().trim().min(3).max(320),
  token: z.string().trim().min(1).max(200),
});

export interface FollowUpRoutesDependencies {
  readonly followUpService: FollowUpService;
}

/** A whole document, because a fragment in a mail client's browser is an unstyled orphan. */
function page(heading: string, body: string): string {
  return [
    '<!doctype html><html lang="en"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<meta name="robots" content="noindex">',
    `<title>${escapeHtml(heading)}</title>`,
    '<style>',
    'body{margin:0;padding:48px 24px;background:#F3EEE4;color:#17191E;',
    "font-family:Archivo,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;",
    'line-height:1.6}',
    'main{max-width:34rem;margin:0 auto;padding:32px;background:#FFFDF9;',
    'border:1px solid #E4DED2;border-radius:12px}',
    'h1{margin:0 0 16px;font-size:22px;letter-spacing:-0.02em}',
    'p{margin:0 0 12px}',
    '@media (prefers-color-scheme:dark){body{background:#17191E;color:#F3EEE4}',
    'main{background:#1F2229;border-color:#33373F}}',
    '</style></head><body><main>',
    `<h1>${escapeHtml(heading)}</h1>`,
    body,
    '</main></body></html>',
  ].join('');
}

export function createUnsubscribeRouter(dependencies: FollowUpRoutesDependencies): Router {
  const { followUpService } = dependencies;
  const router = Router();

  router.get('/', async (request, response) => {
    const { email, token } = parseQuery(unsubscribeQuerySchema, request.query);
    const done = await followUpService.unsubscribe(email, token);

    /*
     * 200 on both branches, and the failure page does not say why.
     *
     * A 400 with "invalid token" tells somebody probing that the address exists and that only
     * the signature was wrong, which is the one fact this endpoint has to keep. It also reads
     * as broken to the far more likely visitor: a person whose mail client mangled a long URL
     * across a line break. Both get a sentence and a way forward.
     */
    response
      .status(200)
      .type('html')
      .send(
        done
          ? page(
              'You will not hear from us again',
              '<p>That address has been removed from our reminders. Nothing else is needed.</p>' +
                '<p>You will still receive messages about anything you have actually asked for — ' +
                'a website review you requested, or a payment receipt. Those are not reminders and ' +
                'there are only ever a handful of them.</p>',
            )
          : page(
              'That link did not work',
              '<p>It may have been split across two lines by your email program, which is the ' +
                'usual cause. Try clicking it again from the message rather than copying it.</p>' +
                '<p>If it still does not work, reply to any email from us and say "unsubscribe" — ' +
                'a person reads those and it has exactly the same effect.</p>',
            ),
      );
  });

  return router;
}

/**
 * `POST /api/cron/followup`.
 *
 * Mounted at `/cron` alongside the digest and behind the same guard — `requireCronSecret`,
 * which is `middleware/cronSecret.ts` and is shared rather than copied. The full reasoning for
 * a bearer secret, a 404 answer and a constant-time comparison is in the header of
 * `notification.routes.ts`, and is deliberately not repeated here: two statements of one rule
 * is how the second one ends up wrong.
 *
 * A second router rather than a second route on the digest's, so neither feature imports the
 * other and each owns its own path.
 */
export function createFollowUpCronRouter(
  dependencies: FollowUpRoutesDependencies & {
    readonly cronSecret: string | undefined;
    readonly logger: Logger;
  },
): Router {
  const { followUpService, cronSecret, logger } = dependencies;
  const router = Router();

  router.post('/followup', requireCronSecret(cronSecret), async (_request, response) => {
    const sent = await followUpService.run();
    logger.info('followup.cron_completed', { sent });

    /* The count, so a failed run and a quiet day are distinguishable from the scheduler's log. */
    response.json(success({ sent: sent > 0, emails: sent }));
  });

  return router;
}
