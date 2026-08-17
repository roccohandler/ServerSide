import { Router } from 'express';
import { success } from '../../lib/apiResponse.js';
import { describeError, type Logger } from '../../lib/logger.js';
import { requireRequestAuth } from '../auth/index.js';
import type { ActivityService } from './activity.service.js';

/*
 * ============================================================================
 * "IS THERE ANYTHING HERE I HAVE NOT SEEN?"
 * ============================================================================
 *
 * Two endpoints, and between them they are the whole of read state.
 *
 * ## Why this is on `/activity` and not on `/notifications`
 *
 * Because there is no notification record to read. A notification in this system is an
 * *outbound act* — an email composed and sent, or a line queued for the owner's digest —
 * and it is gone the moment it is delivered. What a customer catches up on when they sign
 * in is the activity stream, which already exists, is already scoped to them, and is
 * already the thing their dashboard renders.
 *
 * A `/notifications` mount would have promised a second collection behind it. There is not
 * one, deliberately: `activity.types.ts` already records every event a notification would
 * duplicate, and two tables answering "what happened" is how they come to disagree.
 *
 * ## Nothing here takes an id
 *
 * Not the account's, and not an entry's. The account comes from the session, and the mark
 * is a single timestamp covering everything — see `StoredUser.activityReadAt` for why per-row
 * read flags were refused. There is no parameter on this router anybody could change to read
 * or clear somebody else's state.
 * ============================================================================
 */

export interface ActivityRoutesDependencies {
  readonly activityService: ActivityService;
  /**
   * Stamps the account's catch-up marker.
   *
   * A function rather than the `AuthRepository`, for the reason the admin routes take the
   * repository and not the service: the narrowest thing that does the job is the thing that
   * cannot be made to do another one. This router can move one timestamp on the caller's own
   * account and there is nothing else it could reach for.
   */
  readonly markRead: (userId: string, at: Date) => Promise<void>;
  readonly logger: Logger;
}

export function createActivityRouter(dependencies: ActivityRoutesDependencies): Router {
  const { activityService, markRead, logger } = dependencies;
  const router = Router();

  router.get('/unread', async (request, response) => {
    const { user } = requireRequestAuth(request);

    const unread = await activityService.unreadForUser({
      userId: user.id,
      readAt: user.activityReadAt,
      accountCreatedAt: user.createdAt,
    });

    response.json(
      success({
        count: unread.count,
        since: unread.since.toISOString(),
        capped: unread.capped,
      }),
    );
  });

  /*
   * Catching up.
   *
   * Stamped with the server's clock rather than a time the browser sends, which is the
   * difference between "I have seen everything up to now" and "I have seen everything up to
   * whenever this machine thinks it is" — a skewed-fast clock would silently mark future
   * events read.
   *
   * The response is what the count *is* now rather than an acknowledgement, so the caller
   * does not have to ask again to redraw.
   */
  router.post('/read', async (request, response) => {
    const { user } = requireRequestAuth(request);
    const at = new Date();

    try {
      await markRead(user.id, at);
    } catch (error) {
      /*
       * Never fails the request. The worst outcome of a marker that did not move is that
       * somebody is told about the same three things twice; the worst outcome of a 500 here
       * is an error banner on a dashboard that is otherwise perfectly fine. The badge is not
       * worth breaking the page it sits on.
       */
      logger.error('activity.mark_read_failed', { userId: user.id, ...describeError(error) });
    }

    response.json(success({ count: 0, since: at.toISOString(), capped: false }));
  });

  return router;
}
