/**
 * Who is signed in — a shared root, not a feature.
 *
 * This lived in `features/auth/` and had to move, because three files in
 * `components/layout/` imported it. Shared UI reaching into a feature is the dependency
 * direction inverted: the design system would have depended on a business capability, and
 * no shared component could then be used without the auth feature coming with it.
 *
 * The session is genuinely cross-cutting — the marketing header reads it to decide between
 * "Sign in" and "Dashboard", both route guards read it, and four features read it. That is
 * what a shared root is for, and the bar for one (two or more features actually use it) is
 * met several times over.
 *
 * What stayed behind in `features/auth/` is the part that really is a feature: the
 * credential screens, the Google button, and the API calls behind them. Signing in is a
 * feature; being signed in is application state.
 */

/*
 * `useUnread` is deliberately absent, exactly as `ReauthDialog` is.
 *
 * Every marketing page imports this barrel for `useAuth`, so a module re-exported from it is
 * a module in the chunk a first-time visitor downloads. Its one consumer is `AppLayout`,
 * which is lazy — and putting a hook only the signed-in workspace uses into the eager bundle
 * cost 0.1 kB gzipped against 0.2 kB of headroom, measured. Import it by path.
 */
export { AuthProvider } from './AuthContext';
export { useAuth } from './useAuth';
export { fetchAuthConfig } from './authApi';
export * as authApi from './authApi';
