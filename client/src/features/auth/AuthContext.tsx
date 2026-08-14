import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ApiResult, PublicUser, SessionData } from '../../types/api';
import * as authApi from './api/authApi';
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
    }),
    [applySession, status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
