import { createContext, useContext } from 'react';
import type { ApiResult, PublicUser, SessionData } from '../../types/api';

/*
 * The context object and its hooks, separated from the provider component.
 *
 * A file that exports both a component and a hook cannot be hot-reloaded reliably —
 * `react-refresh` says so, and the split is the fix rather than the suppression. It also
 * means a component that only needs `useAuth` does not import the provider.
 *
 * The *contract* lives here; `AuthContext.tsx` is the one implementation of it.
 */

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

export interface AuthContextValue {
  readonly status: AuthStatus;
  readonly user: PublicUser | null;
  /** True while the first `/api/auth/me` is in flight. Route guards wait on this. */
  readonly isLoading: boolean;
  signup(input: {
    readonly email: string;
    readonly name: string;
    readonly password: string;
    readonly businessName?: string;
  }): Promise<ApiResult<SessionData>>;
  login(input: {
    readonly email: string;
    readonly password: string;
  }): Promise<ApiResult<SessionData>>;
  /** Same contract as `login`. Nothing above this knows which was used. */
  continueWithGoogle(credential: string): Promise<ApiResult<SessionData>>;
  logout(): Promise<void>;
  /** Replaces the cached user after a profile edit or an email verification. */
  setUser(user: PublicUser): void;
  /** Re-reads `/api/auth/me`. Used after an action that may have changed the account. */
  refresh(): Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * The signed-in user, or null.
 *
 * Throws outside a provider rather than returning a null-ish default: a component that
 * renders "signed out" because it was mounted in the wrong tree is a bug that looks
 * exactly like working software.
 */
export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth was called outside an AuthProvider.');
  }
  return value;
}

/**
 * Whether the signed-in user holds a capability.
 *
 * The client's copy of the authorization model, and it is **only** for deciding what to
 * render. Every one of these is enforced again on the server, because a hidden button is
 * not a permission — see `requireCapability` there.
 */
export function useCapability(capability: string): boolean {
  const { user } = useAuth();
  return user?.capabilities.includes(capability) ?? false;
}
