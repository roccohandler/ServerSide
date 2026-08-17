import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { get, post, setSessionLostHandler } from '../lib/api';
import { CONSOLE_CAPABILITY } from './capabilities';
import { AdminSessionContext, type AdminIdentity, type AdminSessionState } from './useAdminSession';

/*
 * ============================================================================
 * WHO IS SIGNED IN, AND WHAT THE CONSOLE MAY SHOW THEM
 * ============================================================================
 *
 * The same identity system the customer application uses. **Not a second one.**
 *
 * That is the decision worth stating, because two auth systems is the obvious shape and
 * the wrong one: it doubles the number of places a password reset can go wrong, and it
 * makes "is this person an owner?" a question with two answers. There is one `User`, and
 * the difference between the two applications is *authorisation* — which capabilities the
 * account carries — not *authentication*.
 *
 *   User ─┬─ identity, email, credentials
 *         └─ capabilities ──→ what the server will let them do
 *
 * ## Nothing here holds a credential
 *
 * The session is an `HttpOnly` cookie the server set at sign-in. This file cannot read it,
 * which is the point — a token in JavaScript is a token any injected script can take. What
 * this holds is the *description* of the signed-in owner, and losing it costs one request.
 * ============================================================================
 */

export function AdminSessionProvider({ children }: { readonly children: ReactNode }) {
  const [state, setState] = useState<AdminSessionState>({ status: 'loading' });

  /*
   * ==========================================================================
   * A SESSION THAT ENDS WHILE SOMEBODY IS WORKING
   * ==========================================================================
   *
   * The cookie is thirty days of inactivity, rolling, so this is rare — and it is the one
   * failure where showing the server's sentence was the wrong answer. "You are not signed
   * in." appeared on a page still displaying five customers' projects, every control still
   * present, nothing working and no way to tell what to do about it.
   *
   * The first answer ended the session here and let `App` render the sign-in form, because
   * that is what it does for an anonymous console. No new route, no new screen — and it threw
   * the console away, including whatever half-written reply was in a box. On this application
   * that is a reply to somebody who has been waiting, which is the thing it exists to send.
   *
   * So the session is not ended here any more: `reauthNeeded` goes up, `state` stays
   * `signedIn`, and `ConsoleLayout` puts a dialog over the console asking for the password.
   * Giving up calls `abandonReauth` and lands exactly where this used to land immediately.
   *
   * **Only from `signedIn`.** `UNAUTHENTICATED` also comes back from the sign-in request
   * itself when a password is wrong, and that must not raise a re-authentication dialog over
   * an already-anonymous console. The ref is read rather than the state closed over, so the
   * handler registered once still sees the current status.
   * ==========================================================================
   */
  const [reauthNeeded, setReauthNeeded] = useState(false);

  const statusRef = useRef(state.status);
  useEffect(() => {
    statusRef.current = state.status;
  }, [state.status]);

  useEffect(() => {
    setSessionLostHandler(() => {
      if (statusRef.current === 'signedIn') setReauthNeeded(true);
    });
    return () => setSessionLostHandler(null);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    /*
     * Everything is set from inside the `then`, never in the synchronous effect body.
     * `react-hooks` fails the build on the latter — a `setState` during the effect pass is
     * a cascading render — and the customer application's `AuthContext` resolves the same
     * problem the same way. Two session providers behaving differently is how one of them
     * ends up untested.
     */
    void get<{ user: AdminIdentity }>('/auth/me', controller.signal).then((result) => {
      if (controller.signal.aborted) return;

      /*
       * A customer who reaches this console is *anonymous as far as it is concerned*. They
       * authenticated fine; they simply have no business in the owner's inbox, and showing
       * them an empty console would be worse than showing them the sign-in form.
       */
      const identity = result.success ? result.data.user : null;
      setState(
        identity && identity.capabilities.includes(CONSOLE_CAPABILITY)
          ? { status: 'signedIn', identity }
          : { status: 'anonymous' },
      );
    });

    return () => controller.abort();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await post<{ user: AdminIdentity }>('/auth/login', { email, password });

    if (!result.success) return result.error.message;

    if (!result.data.user.capabilities.includes(CONSOLE_CAPABILITY)) {
      /*
       * Correct credentials, wrong account. The message says exactly that rather than
       * "invalid email or password", because lying to somebody who authenticated
       * successfully sends them off to reset a password that already works.
       */
      return 'That account is not an owner account.';
    }

    setState({ status: 'signedIn', identity: result.data.user });
    return null;
  }, []);

  const signOut = useCallback(async () => {
    /* The server clears the cookie. Forgetting it here as well is belt and braces. */
    await post('/auth/logout');
    setState({ status: 'anonymous' });
  }, []);

  const can = useCallback(
    (capability: string) =>
      state.status === 'signedIn' && state.identity.capabilities.includes(capability),
    [state],
  );

  const endReauth = useCallback(() => setReauthNeeded(false), []);

  const abandonReauth = useCallback(async () => {
    /*
     * The old behaviour, kept as the way out. `signOut` rather than clearing state directly:
     * a browser left holding a half-dead cookie lands straight back in this dialog on the
     * next request.
     */
    setReauthNeeded(false);
    await signOut();
  }, [signOut]);

  return (
    <AdminSessionContext.Provider
      value={{
        state,
        status: state.status,
        signIn,
        signOut,
        can,
        reauthNeeded,
        endReauth,
        abandonReauth,
      }}
    >
      {children}
    </AdminSessionContext.Provider>
  );
}
