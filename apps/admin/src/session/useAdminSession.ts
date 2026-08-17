import { createContext, useContext } from 'react';

/*
 * The context and its hook, separated from the provider that fills it.
 *
 * Same arrangement as `useAuth` in the customer application, and for the same mundane
 * reason: a module that exports both a component and a hook cannot participate in Fast
 * Refresh, so editing the provider reloads the page and loses the session you were
 * testing with.
 */

export interface AdminIdentity {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  /**
   * What the console may *render*.
   *
   * Not what the account may *do*. The server re-checks every one of these against the
   * session on every request, and that check is the only one that decides anything. A
   * modified bundle can render every control in the console and still not use one.
   */
  readonly capabilities: readonly string[];
}

export type AdminSessionState =
  | { readonly status: 'loading' }
  | { readonly status: 'anonymous' }
  | { readonly status: 'signedIn'; readonly identity: AdminIdentity };

export interface AdminSession {
  readonly state: AdminSessionState;
  readonly status: AdminSessionState['status'];
  /** Resolves to an error message for the operator, or `null` on success. */
  signIn(email: string, password: string): Promise<string | null>;
  signOut(): Promise<void>;
  can(capability: string): boolean;

  /*
   * ==========================================================================
   * THE SESSION ENDED WHILE THE CONSOLE WAS OPEN
   * ==========================================================================
   *
   * Same mechanism as the customer application's `reauthNeeded`, same reason, and one
   * difference in the cost of getting it wrong: the console's half-typed thing is usually a
   * reply to somebody who has been waiting, and the previous behaviour — re-render the
   * sign-in form — discarded it silently.
   *
   * `state` stays `signedIn` while this is true, which is what keeps `App` rendering the
   * console rather than the sign-in form. See the long note in the customer application's
   * `useAuth.ts` about why being briefly wrong about the session costs nothing.
   * ==========================================================================
   */
  readonly reauthNeeded: boolean;
  endReauth(): void;
  /** Gave up. Ends the session for real, and `App` shows the sign-in form as it used to. */
  abandonReauth(): Promise<void>;
}

export const AdminSessionContext = createContext<AdminSession | null>(null);

export function useAdminSession(): AdminSession {
  const session = useContext(AdminSessionContext);
  if (!session) {
    throw new Error('useAdminSession must be rendered inside AdminSessionProvider.');
  }
  return session;
}
