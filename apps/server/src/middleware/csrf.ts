import type { RequestHandler } from 'express';
import { AppError } from '../lib/appError.js';
import type { Logger } from '../lib/logger.js';
import { SESSION_COOKIE_NAME } from '../features/auth/auth.types.js';

/*
 * ============================================================================
 * CROSS-SITE REQUEST FORGERY
 * ============================================================================
 *
 * ## What this actually defends
 *
 * CSRF is an attack on *ambient authority*: the browser attaches a cookie to a request
 * the application did not initiate, and the server acts on it because the cookie is
 * valid. A request carrying no session cookie has no ambient authority to abuse — the
 * attacker's page could have made the same call from their own server — so the guard
 * scopes itself to cookie-bearing, state-changing requests.
 *
 * That scoping is the load-bearing decision in this file, and it is what makes the rest
 * of it strict rather than lenient. The public endpoints — the contact form, the
 * PlayBook request, the Stripe and Vercel webhooks — are unauthenticated by design and
 * are reached by curl, by servers and by browsers alike. Demanding an `Origin` from all
 * of them would break real callers to defend against an attack that does not apply.
 *
 * ## Three independent layers, for the requests it does apply to
 *
 *   1. **SameSite=Lax on the cookie.** A cross-site POST does not carry it at all.
 *      Strongest of the three, and universal in current browsers.
 *   2. **A JSON content type.** An HTML form can only send `urlencoded`, `multipart` or
 *      `text/plain`, so it cannot produce a body this API will parse. `fetch` can, but
 *      only same-origin or with CORS permission, and the CORS policy grants neither.
 *   3. **Origin checking, here.** A state-changing request that carries a session must
 *      also carry an `Origin` we recognise.
 *
 * `Origin` is *required* on those requests rather than merely checked when present.
 * Every browser has sent it on cross-origin requests for years, and treating its
 * absence as permission is how the check gets bypassed by anything that can suppress a
 * header. A non-browser client that legitimately needs to drive the authenticated API
 * can set it; a browser always does.
 *
 * Not a synchroniser-token scheme, and the reason is that a token would add a second
 * cookie, a second header and a rotation story to defend against something these three
 * already cover. If this application ever accepts cross-site form posts, that
 * calculation changes and this is the file it changes in.
 * ============================================================================
 */

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export interface CsrfGuardOptions {
  /**
   * Origins allowed to make authenticated state-changing requests. The application's
   * own public origin, plus anything in `CLIENT_ORIGIN`.
   */
  readonly allowedOrigins: readonly string[];
  readonly logger: Logger;
  /** Present so the guard itself can be tested against a request that has no cookie. */
  readonly enabled?: boolean;
}

/** Whether the request carries a session cookie at all. Cheap string scan, no parsing. */
function carriesSession(cookieHeader: string | undefined): boolean {
  if (!cookieHeader) return false;
  return cookieHeader.split(';').some((part) => part.trim().startsWith(`${SESSION_COOKIE_NAME}=`));
}

export function createCsrfGuard(options: CsrfGuardOptions): RequestHandler {
  const { logger } = options;
  const enabled = options.enabled ?? true;
  const allowed = new Set(options.allowedOrigins.map((origin) => origin.replace(/\/$/, '')));

  return (request, _response, next) => {
    if (!enabled || SAFE_METHODS.has(request.method)) {
      next();
      return;
    }

    // No ambient authority, nothing to forge. See the note above.
    if (!carriesSession(request.headers.cookie)) {
      next();
      return;
    }

    const origin = request.headers.origin;

    if (!origin || !allowed.has(origin.replace(/\/$/, ''))) {
      logger.warn('csrf.rejected', {
        method: request.method,
        path: request.path,
        hasOrigin: Boolean(origin),
      });
      next(
        new AppError(
          'FORBIDDEN',
          'That request could not be verified as coming from this site. Reload the page and try again.',
        ),
      );
      return;
    }

    next();
  };
}
