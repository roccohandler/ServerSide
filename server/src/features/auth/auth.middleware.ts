import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { AppError } from '../../lib/appError.js';
import type { Logger } from '../../lib/logger.js';
import { readSessionCookie } from './auth.cookies.js';
import type { AuthService } from './auth.service.js';
import { roleHasCapability, type Capability, type StoredUser } from './auth.types.js';

/*
 * ============================================================================
 * THE AUTHORIZATION BOUNDARY
 * ============================================================================
 *
 * Three layers, and all three are required on a protected route:
 *
 *   1. `attachUser` — resolves the cookie. Never rejects; a request with no session
 *      simply carries no user, because plenty of endpoints are legitimately public.
 *   2. `requireAuth` / `requireCapability` — is there somebody, and may that kind of
 *      person do this kind of thing.
 *   3. **Ownership, in the service.** Not here, because middleware cannot see which
 *      record was asked for. This is the layer that a customer typing another
 *      customer's project id into the URL bar tests, and it is the one that has to be
 *      written per resource rather than declared once.
 *
 * A route that only has 1 and 2 is a route where every customer can read every other
 * customer's data. `authorizeOwnership` below is the helper that makes 3 one line.
 * ============================================================================
 */

/** What a resolved request carries. Attached by `attachUser`, read by everything after. */
export interface RequestAuth {
  readonly user: StoredUser;
  readonly sessionToken: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    /** Present when a valid session cookie was sent. Never set from a header or body. */
    auth?: RequestAuth;
  }
}

export interface AttachUserDependencies {
  readonly authService: AuthService;
  readonly logger: Logger;
}

/**
 * Resolves the session cookie onto the request. Does not reject.
 *
 * A failure to reach storage is swallowed into "not signed in" rather than a 500: the
 * public marketing endpoints go through this too, and a database blip must not take the
 * contact form down with it.
 */
export function createAttachUser(dependencies: AttachUserDependencies): RequestHandler {
  const { authService, logger } = dependencies;

  return (request: Request, _response: Response, next: NextFunction) => {
    const token = readSessionCookie(request);
    if (!token) {
      next();
      return;
    }

    authService
      .resolveSession(token)
      .then((user) => {
        if (user) request.auth = { user, sessionToken: token };
      })
      .catch((error: unknown) => {
        logger.warn('auth.session_resolution_failed', {
          errorName: error instanceof Error ? error.name : 'UnknownError',
        });
      })
      .finally(() => next());
  };
}

const NOT_SIGNED_IN = 'Please sign in to continue.';

/** Rejects anything without a session. */
export const requireAuth: RequestHandler = (request, _response, next) => {
  if (!request.auth) {
    next(new AppError('UNAUTHENTICATED', NOT_SIGNED_IN));
    return;
  }
  next();
};

/**
 * Rejects anything whose role does not hold the capability.
 *
 * Capabilities are derived from the role on every request rather than stored on the
 * user document, so revoking one takes effect immediately instead of whenever a stale
 * document is next written.
 */
export function requireCapability(capability: Capability): RequestHandler {
  return (request, _response, next) => {
    if (!request.auth) {
      next(new AppError('UNAUTHENTICATED', NOT_SIGNED_IN));
      return;
    }

    if (!roleHasCapability(request.auth.user.role, capability)) {
      next(new AppError('FORBIDDEN', 'Your account does not have access to that.'));
      return;
    }

    next();
  };
}

/**
 * The admin surface: signed in, and staff. Everything else gets the same answer.
 *
 * ## One response for every kind of failure, and it took a test to notice
 *
 * This used to answer **401 for an anonymous request** and 404 for a signed-in customer. The
 * intent was already written down — "a customer probing it should not learn that there is
 * something here to be forbidden from" — and the anonymous branch quietly broke it: a scanner
 * with no session at all got `401 Please sign in to continue`, which confirms the path is real
 * and that a credential is the thing standing in the way. That is the more likely attacker and
 * they were getting the more useful answer.
 *
 * Now all three cases — no session, expired session, valid session belonging to a customer —
 * are indistinguishable from a route that does not exist. `admin.api.test.ts` asserts the
 * status *and* the message match, because a 404 whose body differs is still a signal.
 *
 * Nothing in the client depended on the 401: `RequireAdmin` decides where to send somebody
 * from `/api/auth/me`, which is the endpoint whose job that is.
 */
export const requireAdmin: RequestHandler = (request, _response, next) => {
  /*
   * Deliberately one object for both conditions rather than two `next()` calls with the same
   * argument — so a later edit cannot reintroduce a difference between them by accident.
   */
  if (!request.auth || request.auth.user.role !== 'admin') {
    next(new AppError('NOT_FOUND', 'Not found.'));
    return;
  }

  next();
};

/** The auth on a request, or a throw. Removes the non-null assertion from every handler. */
export function requireRequestAuth(request: Request): RequestAuth {
  if (!request.auth) {
    throw new AppError('UNAUTHENTICATED', NOT_SIGNED_IN);
  }
  return request.auth;
}

/**
 * Layer three. Given a record and the person asking, either return it or behave exactly
 * as though it does not exist.
 *
 * NOT_FOUND rather than FORBIDDEN is deliberate and is the whole point: an API that
 * answers 403 for "exists but not yours" and 404 for "no such id" has told an attacker
 * which ids are real, which is most of what they wanted. Both answer the same sentence.
 *
 * Staff bypass ownership by holding the `:any` capability — never by an `isAdmin` check
 * written inline, which is the version that gets forgotten on the fourth route.
 */
export function authorizeOwnership<T>(params: {
  readonly record: T | null | undefined;
  readonly ownerId: (record: T) => string | undefined;
  readonly auth: RequestAuth;
  /** Held by staff. When the caller has it, ownership is not consulted. */
  readonly overrideCapability: Capability;
  readonly missingMessage: string;
}): T {
  const { record, ownerId, auth, overrideCapability, missingMessage } = params;

  if (record === null || record === undefined) {
    throw new AppError('NOT_FOUND', missingMessage);
  }

  if (roleHasCapability(auth.user.role, overrideCapability)) return record;

  if (ownerId(record) !== auth.user.id) {
    throw new AppError('NOT_FOUND', missingMessage);
  }

  return record;
}
