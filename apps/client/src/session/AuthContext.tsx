import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ApiResult, PublicUser, SessionData } from '@jobforge/shared';
import { setSessionLostHandler } from '../lib/http';
import * as authApi from './authApi';
import { AuthContext, type AuthContextValue, type AuthStatus } from './useAuth';

/*
 * ============================================================================
 * THE ONE AUTHENTICATED-USER STATE
 * ============================================================================
 *
 * There is exactly one of these in the application and everything reads from it. That
 * is the property worth protecting, and it is the reason Google sign-in does not get a
 * context of its own: a second source of "who is signed in" is how a UI ends up showing
 * a signed-out header above a signed-in page.
 *
 * ## The session lives in an HttpOnly cookie, not here
 *
 * Nothing in this file can read the session token, and that is deliberate — a token in
 * `localStorage` is a token any injected script can take. What this holds is the
 * *description* of the signed-in user, fetched from `/api/auth/me` on load and replaced
 * whenever an authentication call returns a new one.
 *
 * The practical consequence: a reload is a round trip, and there is a `status` of
 * `'loading'` while it happens. Route guards wait for it rather than treating unknown
 * as signed out, which would flash the sign-in page at somebody who is signed in.
 *
 * The context object and the hooks live in `useAuth.ts`, for two reasons: a file
 * exporting both a component and a hook cannot be hot-reloaded reliably, and a
 * component that only needs `useAuth` should not have to import the provider.
 *
 * It is named for the hook rather than the context on purpose. `authContext.ts` beside
 * `AuthContext.tsx` resolves to the same specifier on a case-insensitive filesystem, and
 * the `.ts` wins — so every `import { AuthProvider } from './AuthContext'` silently
 * loaded the wrong module and failed at runtime rather than at build time.
 * ============================================================================
 */

export interface AuthProviderProps {
  readonly children: ReactNode;
  /**
   * Skips the initial `/api/auth/me`. Tests that already know who is signed in pass a
   * user here; nothing in the application does.
   */
  readonly initialUser?: PublicUser | null;
}

export function AuthProvider({ children, initialUser }: AuthProviderProps) {
  const [user, setUserState] = useState<PublicUser | null>(initialUser ?? null);
  const [status, setStatus] = useState<AuthStatus>(
    initialUser === undefined ? 'loading' : initialUser ? 'authenticated' : 'anonymous',
  );

  /*
   * ==========================================================================
   * A SESSION THAT ENDS WHILE SOMEBODY IS WORKING
   * ==========================================================================
   *
   * The cookie is thirty days of inactivity, rolling, so this is rare — and it was the one
   * failure where showing the server's sentence was the wrong answer. A customer halfway
   * through approving their website saw "You are not signed in." beside a page still
   * displaying their project, with every control present, nothing working, and no way to
   * tell that the fix was to sign in again.
   *
   * The first answer was to end the session here and let `RequireAuth` do what it already
   * does for anybody not signed in: send them to `/login` with `from` set to where they were,
   * so signing in puts them back. That was a large improvement and it still threw the page
   * away — `from` returns you to the *route*, and the route remounts empty. Three fields into
   * a change request, that is three fields gone.
   *
   * So the session is not ended here any more. `reauthNeeded` goes up, `status` stays
   * `'authenticated'`, nothing unmounts, and `AppLayout` puts a dialog over the page asking
   * for the password. Signing in dismisses it and the screen underneath is exactly as it was.
   * Giving up calls `abandonReauth`, which ends the session for real and hands the reader back
   * to the redirect that used to happen immediately.
   *
   * The application is wrong about being signed in for the width of that dialog. That costs
   * nothing — `apps/server` is the security boundary and every request in the window fails
   * identically — and it is the only way the page survives.
   *
   * **Only from `authenticated`.** `UNAUTHENTICATED` also comes back from `/api/auth/me` for
   * every anonymous visitor on every marketing page, and from the sign-in request itself when
   * a password is wrong. Neither is an expiry. The functional update is what makes this a
   * transition rather than an assignment, and it is why `lib/http.ts` can report the code
   * without knowing which endpoint produced it.
   *
   * Repeat reports are free: a page with four requests in flight fires this four times, and
   * setting a flag that is already true is not a change.
   * ==========================================================================
   */
  const [reauthNeeded, setReauthNeeded] = useState(false);

  /*
   * The status, readable from a callback that was registered once.
   *
   * The previous version of this made the decision inside a `setStatus` updater, which read
   * the current value for free — and that only worked because the decision *was* the update.
   * It is not any more: raising `reauthNeeded` from inside an updater is a side effect in a
   * function React is allowed to call twice, so it moves out here.
   */
  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    setSessionLostHandler(() => {
      if (statusRef.current === 'authenticated') setReauthNeeded(true);
    });

    return () => setSessionLostHandler(null);
  }, []);

  useEffect(() => {
    if (initialUser !== undefined) return;

    const controller = new AbortController();

    void authApi.fetchCurrentUser(controller.signal).then((result) => {
      if (controller.signal.aborted) return;

      /*
       * A failed request is treated as anonymous rather than as an error state. The
       * only thing a visitor can do about a dead `/me` is what an anonymous visitor
       * does — and a marketing page behind an error screen would be far worse than a
       * header that shows "Sign in" during an outage.
       */
      const next = result.success ? result.data.user : null;
      setUserState(next);
      setStatus(next ? 'authenticated' : 'anonymous');
    });

    return () => controller.abort();
  }, [initialUser]);

  /** Every authentication call funnels through here, so there is one place state moves. */
  const applySession = useCallback((result: ApiResult<SessionData>) => {
    if (result.success) {
      setUserState(result.data.user);
      setStatus('authenticated');
    }
    return result;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      isLoading: status === 'loading',

      async signup(input) {
        return applySession(await authApi.signup(input));
      },

      async login(input) {
        return applySession(await authApi.login(input));
      },

      async continueWithGoogle(credential) {
        return applySession(await authApi.continueWithGoogle(credential));
      },

      async logout() {
        /*
         * Cleared locally whatever the server said. A failed sign-out that left the
         * header saying "Dana" would be worse than one that signs the browser out and
         * leaves a session to expire on its own — and the request is retried by the
         * next page load anyway.
         */
        await authApi.logout();
        setUserState(null);
        setStatus('anonymous');
      },

      setUser(next) {
        setUserState(next);
        setStatus('authenticated');
      },

      async refresh() {
        const result = await authApi.fetchCurrentUser();
        const next = result.success ? result.data.user : null;
        setUserState(next);
        setStatus(next ? 'authenticated' : 'anonymous');
      },

      reauthNeeded,

      endReauth() {
        setReauthNeeded(false);
      },

      async abandonReauth() {
        /*
         * The old behaviour, kept as the way out rather than as the only path. Ending the
         * session here is what lets `RequireAuth` send them to `/login?from=…`, which is
         * where somebody who cannot remember their password needs to be — the reset link is
         * there and it is not going in a dialog.
         *
         * `logout()` rather than clearing state directly: the cookie may still be valid on
         * a different request path, and a browser left holding a half-dead session is how
         * the next page load lands in this dialog again.
         */
        setReauthNeeded(false);
        await authApi.logout();
        setUserState(null);
        setStatus('anonymous');
      },
    }),
    [applySession, status, user, reauthNeeded],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
