import { useEffect, useState } from 'react';
import { httpGet } from '../lib/http';
import type { UnreadSummary } from '@jobforge/shared';

/*
 * ============================================================================
 * HOW MANY THINGS HAVE HAPPENED THAT THIS PERSON HAS NOT SEEN
 * ============================================================================
 *
 * ## Why this is in `session/` and not in `features/private`
 *
 * Because the thing that renders it is `components/layout/AppLayout`, and shared UI may not
 * import a feature — ESLint fails the build on it, and the rule's own message names this
 * folder as the answer. That rule is not a formality here: a workspace shell that imported
 * `features/private/services` would drag the private feature's module graph into the shell
 * every screen renders, including the ones that are not the dashboard.
 *
 * So the count lives one layer down, beside the session it is a property of. It is the same
 * shape as `authApi` next to it: a single request, no library, no cache.
 *
 * ## It is not the same state as the dashboard's copy
 *
 * `/api/app/dashboard` carries an `unread` summary too, and that is deliberate rather than a
 * duplicate to remove — the dashboard prints "3 new" directly above the three entries it is
 * describing, and a second round trip is a second moment at which an event could land between
 * the heading and the list. Two callers, two needs, one server computation.
 *
 * ## Refetching on navigation is what keeps it honest
 *
 * The dashboard marks the stream read when somebody looks at it. Nothing tells this hook that
 * happened — and nothing needs to, because the caller re-asks on every route change and the
 * badge is not drawn on the dashboard itself. Somebody reading their activity therefore never
 * sees a number that has stopped being true; they see it disappear on the way out.
 *
 * A subscription between the two would be the other design, and it would buy a redraw nobody
 * is looking at, in exchange for a context provider around a shell that has no other state.
 * ============================================================================
 */

/**
 * @param reloadKey Change it to re-ask. The caller passes the current path, so the count is
 *                  refreshed on every navigation inside the workspace and at no other time.
 */
export function useUnread(reloadKey: string): UnreadSummary | null {
  const [unread, setUnread] = useState<UnreadSummary | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    void httpGet<UnreadSummary>('/api/app/activity/unread', controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      /*
       * A failure leaves whatever was there. This is a badge: the wrong answer to "could not
       * reach the server" is to silently tell somebody they are up to date, and the second
       * wrong answer is an error banner about a number nobody asked for. `OfflineNotice` in
       * the same shell already says the connection has gone.
       */
      if (result.success) setUnread(result.data);
    });

    return () => controller.abort();
  }, [reloadKey]);

  return unread;
}
