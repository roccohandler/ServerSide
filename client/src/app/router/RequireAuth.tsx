import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { routes } from '../../config/routes';
import { useAuth } from '../../features/auth/useAuth';

/*
 * ============================================================================
 * THE ROUTE BOUNDARY
 * ============================================================================
 *
 * One guard on the `/app` layout route, rather than a check inside every private page.
 * A page added under that route is protected before anybody writes a line of it, which
 * is the only version of this that stays true.
 *
 * ## This is not the security boundary
 *
 * Worth saying plainly, because a route guard looks like one. Every private route also
 * has a server-side check, and the server's is the one that matters: this guard is a
 * *navigation* decision, and anybody can skip it by opening the network tab. If the
 * only thing standing between two customers were this file, the application would be
 * wide open. See `server/src/features/auth/auth.middleware.ts` for the real boundary.
 *
 * ## Waiting is a state
 *
 * A reload has to ask the server who is signed in, so there is a moment where the
 * answer is unknown. Treating unknown as signed-out would bounce a signed-in customer
 * to the sign-in page on every refresh and then bounce them back — a flash of the wrong
 * page and a lost scroll position. The guard renders nothing until it knows.
 * ============================================================================
 */

export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    /*
     * Deliberately empty rather than a spinner. The session check is a same-origin
     * request that lands in a frame or two, and a spinner that appears for 40ms is
     * more distracting than nothing — the same reasoning as the lazy-route fallback
     * in `SiteLayout`.
     */
    return null;
  }

  if (status === 'anonymous') {
    /*
     * Where they were going travels with them, so signing in returns them to it rather
     * than to a generic dashboard. `replace` keeps the protected URL out of the back
     * history, which would otherwise bounce on every press of the back button.
     */
    return (
      <Navigate
        to={routes.login}
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  return <Outlet />;
}
