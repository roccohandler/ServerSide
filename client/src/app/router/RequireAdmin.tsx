import { Navigate, Outlet } from 'react-router-dom';
import { routes } from '../../config/routes';
import { useAuth } from '../../features/auth/useAuth';

/*
 * ============================================================================
 * THE ADMIN ROUTE BOUNDARY — AND IT IS NOT A SECURITY BOUNDARY
 * ============================================================================
 *
 * This file decides which *page* renders. It decides nothing about what anybody may read or
 * change, and it must never be the reason a request is safe.
 *
 * Worth spelling out, because a guard like this is exactly what gets mistaken for
 * authorization:
 *
 *   - The role it reads arrives from `/api/auth/me`, over the network, into a JavaScript
 *     variable. Anybody can set that variable to `admin` from a console in about four
 *     seconds.
 *   - Doing so renders the admin pages, and every one of them then calls `/api/admin/*`,
 *     and every one of those calls comes back **404**, because the server checks the role
 *     against the session on the server side — see `requireAdmin` in
 *     `server/src/features/auth/auth.middleware.ts`.
 *   - So the worst an attacker achieves by defeating this file is an empty admin layout with
 *     error states in it. That is the design, and it is the only version of this that holds.
 *
 * **The route being unguessable is not part of the protection either.** `/admin` is the first
 * path anybody tries. It is not in the sitemap and not linked from the marketing site because
 * a sign-in-shaped page in a search result is noise, not because hiding it defends anything.
 *
 * ## Why a customer is sent to their own dashboard rather than to sign-in
 *
 * A signed-in customer who reaches `/admin` is not unauthenticated — sending them to the sign-in
 * page would ask them to fix a problem that signing in cannot fix, and after signing in again
 * they would land right back here. They go to `/app`, which is theirs.
 *
 * They are deliberately **not** told that an admin area exists. `requireAdmin` on the server
 * answers NOT_FOUND for the same reason; a client that announced "you are not an admin" would
 * give away what the server is careful not to.
 * ============================================================================
 */

export function RequireAdmin() {
  const { status, user } = useAuth();

  if (status === 'loading') {
    /* Same reasoning as `RequireAuth`: unknown is not signed-out, and a spinner for one frame
       is worse than nothing. */
    return null;
  }

  if (status === 'anonymous') {
    /*
     * No `state.from`, unlike `RequireAuth`. Carrying the admin path through the sign-in page
     * would put it in a form's state and then in the browser's history for whoever signs in
     * next, which for a staff-only path is a small leak for no benefit — an admin knows where
     * they were going.
     */
    return <Navigate to={routes.login} replace />;
  }

  if (user?.role !== 'admin') {
    return <Navigate to={routes.appDashboard} replace />;
  }

  return <Outlet />;
}
