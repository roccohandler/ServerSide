import { Router, type RequestHandler } from 'express';
import { success } from '../../lib/apiResponse.js';
import { clearSessionCookie, setSessionCookie, type CookieOptions } from './auth.cookies.js';
import { requireAuth, requireRequestAuth } from './auth.middleware.js';
import {
  parseChangePassword,
  parseLogin,
  parseProviderCredential,
  parseRequestPasswordReset,
  parseResetPassword,
  parseSignup,
  parseUpdateProfile,
  parseVerifyEmail,
} from './auth.schema.js';
import type { AuthService, AuthSession } from './auth.service.js';
import { toPublicUser } from './auth.types.js';

export interface AuthRoutesDependencies {
  readonly authService: AuthService;
  readonly cookieOptions: CookieOptions;
  /** Applied to every credential endpoint. Undefined switches it off, for tests. */
  readonly rateLimiter?: RequestHandler | undefined;
  /**
   * Applied to `/password-reset` only, on top of the per-IP limiter, and keyed on the
   * address rather than the connection. See `createPasswordResetRateLimiter` for why one
   * counter is not enough here. Undefined switches it off, for tests.
   */
  readonly passwordResetRateLimiter?: RequestHandler | undefined;
  /**
   * Whether Google sign-in has a client id configured. Reported to the browser so the
   * sign-in page can explain an unconfigured button instead of failing mysteriously.
   * The id itself is a public value and is served here rather than baked into the
   * bundle, so one build can be deployed to environments with different clients.
   */
  readonly googleClientId: string | undefined;
}

/**
 * Everything under `/api/auth`.
 *
 * Public by definition — these are the endpoints somebody uses when they have no
 * session. The three that read one (`/me`, `/profile`, `/password`) say so explicitly.
 */
export function createAuthRouter(dependencies: AuthRoutesDependencies): Router {
  const { authService, cookieOptions, rateLimiter, passwordResetRateLimiter, googleClientId } =
    dependencies;
  const router = Router();

  const limited: RequestHandler[] = rateLimiter ? [rateLimiter] : [];

  /*
   * Two counters, in this order. The per-IP one runs first because it is the cheaper
   * check and does not have to read the body; the per-address one is what stops a
   * distributed flood filling one person's inbox.
   */
  const resetLimited: RequestHandler[] = passwordResetRateLimiter
    ? [...limited, passwordResetRateLimiter]
    : limited;

  /** One place that turns a session into a cookie plus a body. */
  function respondWithSession(
    response: Parameters<RequestHandler>[1],
    session: AuthSession,
    status = 200,
  ): void {
    setSessionCookie(response, session.token, {
      ...cookieOptions,
      expiresAt: session.expiresAt,
    });
    response.status(status).json(success({ user: toPublicUser(session.user) }));
  }

  /*
   * What the browser needs to render the sign-in page before anybody has signed in.
   *
   * `googleEnabled` is false when no client id is configured. The button is rendered
   * either way — see the client — and this is what lets it explain itself rather than
   * throwing when Google's script has nothing to initialise with.
   */
  router.get('/config', (_request, response) => {
    response.json(
      success({
        googleEnabled: Boolean(googleClientId),
        googleClientId: googleClientId ?? null,
      }),
    );
  });

  /** The current session, or null. Called once on page load to rehydrate the client. */
  router.get('/me', (request, response) => {
    response.json(success({ user: request.auth ? toPublicUser(request.auth.user) : null }));
  });

  router.post('/signup', ...limited, async (request, response) => {
    const input = parseSignup(request.body);
    const session = await authService.signup(input);
    respondWithSession(response, session, 201);
  });

  router.post('/login', ...limited, async (request, response) => {
    const input = parseLogin(request.body);
    const session = await authService.login(input);
    respondWithSession(response, session);
  });

  /*
   * The provider exchange. One opaque credential in; a JobForge session out.
   *
   * Deliberately the same shape as `/login` from the client's point of view — the
   * response is a `PublicUser` and a session cookie, with nothing to tell downstream
   * code which mechanism was used, because nothing downstream is allowed to care.
   */
  router.post('/google', ...limited, async (request, response) => {
    const { credential } = parseProviderCredential(request.body);
    const session = await authService.continueWithProvider(credential);
    respondWithSession(response, session);
  });

  router.post('/logout', async (request, response) => {
    if (request.auth) await authService.logout(request.auth.sessionToken);
    clearSessionCookie(response, cookieOptions);
    response.json(success({ signedOut: true }));
  });

  /*
   * Always 202, whether or not the address is registered. The service does the same.
   * A reset form that distinguishes the two is a membership oracle anybody can query.
   */
  router.post('/password-reset', ...resetLimited, async (request, response) => {
    const { email } = parseRequestPasswordReset(request.body);
    await authService.requestPasswordReset(email);
    response.status(202).json(
      success({
        message: 'If that address has an account, a reset link is on its way.',
      }),
    );
  });

  router.post('/password-reset/confirm', ...limited, async (request, response) => {
    const input = parseResetPassword(request.body);
    await authService.resetPassword(input);
    /*
     * No session is issued. Completing a reset revoked every session including any the
     * attacker held, and handing one straight back to whoever submitted the form would
     * mean the link itself was a credential. They sign in with the new password.
     */
    clearSessionCookie(response, cookieOptions);
    response.json(success({ reset: true }));
  });

  router.post('/verify-email', ...limited, async (request, response) => {
    const { token } = parseVerifyEmail(request.body);
    const user = await authService.verifyEmail(token);
    response.json(success({ user: toPublicUser(user) }));
  });

  router.post('/verify-email/resend', requireAuth, ...limited, async (request, response) => {
    const { user } = requireRequestAuth(request);
    await authService.requestEmailVerification(user);
    response.status(202).json(success({ sent: true }));
  });

  router.patch('/profile', requireAuth, async (request, response) => {
    const { user } = requireRequestAuth(request);
    const input = parseUpdateProfile(request.body);
    const updated = await authService.updateProfile(user.id, input);
    response.json(success({ user: toPublicUser(updated) }));
  });

  router.post('/password', requireAuth, ...limited, async (request, response) => {
    const { user } = requireRequestAuth(request);
    const input = parseChangePassword(request.body);
    const session = await authService.changePassword({ userId: user.id, ...input });
    // Every session ended, including this one. The replacement cookie is why the
    // person who just changed their password is not signed out of their own browser.
    respondWithSession(response, session);
  });

  return router;
}
