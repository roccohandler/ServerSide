/**
 * The capability that separates an owner from a customer who happens to have a password.
 *
 * It lives in its own module rather than beside the provider so that file exports only
 * components — the Fast Refresh boundary React's tooling wants, and the same reason
 * `useAuth` is separate from `AuthContext` in the customer application.
 *
 * This decides what the console *renders*. `apps/server` decides what the console may
 * *do*, by checking the same capability against the session on every request. Changing
 * this constant changes which controls appear; it changes nothing about what is allowed.
 */
export const CONSOLE_CAPABILITY = 'customer:read:any';
