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

/**
 * The origin the request was addressed to, as the browser would have written it.
 *
 * ============================================================================
 * SAME-ORIGIN IS NOT CROSS-SITE, AND IT NEEDS NO CONFIGURATION
 * ============================================================================
 *
 * This is the answer to a production failure that cost a whole evening, and the shape of it
 * is worth recording because the guard was not wrong — it was *incomplete*.
 *
 * The allowlist is built from `siteUrl` and `CLIENT_ORIGIN`, and the note at its call site
 * already anticipated the common deployment: the API and the site share a domain, so a
 * same-origin `fetch` sends an `Origin` header and the list has to contain it. What it
 * assumed is that `PUBLIC_SITE_URL` names the host the application is actually served from.
 *
 * On a preview deployment, a renamed project, or any Vercel URL that is not the one somebody
 * typed into the environment months ago, that assumption is false — and the failure is
 * miserable to diagnose: every `GET` works, sign-in works, and then **every state-changing
 * request from a signed-in browser answers 403** with a message about verification. Nothing
 * is broken. One environment variable disagrees with the URL bar.
 *
 * A request whose `Origin` equals its own `Host` cannot have been forged by another site.
 * That is what "same-origin" means, and no allowlist is needed to establish it: an attacker's
 * page at `evil.example` sending a request here sends `Origin: https://evil.example`, which
 * this never matches. So the guard accepts it, and the allowlist goes back to being what it
 * is for — naming the *other* origins that may drive this API, which is the console.
 *
 * The protocol comes from `request.protocol`, which honours `X-Forwarded-Proto` because
 * `trust proxy` is set from `TRUST_PROXY_HOPS`. That matters: behind Vercel the socket is
 * plain HTTP, so a naive `http://` here would never match the browser's `https://` and this
 * fix would silently do nothing.
 * ============================================================================
 */
function ownOrigin(protocol: string, host: string | undefined): string | undefined {
  return host ? `${protocol}://${host}` : undefined;
}

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

    const origin = request.headers.origin?.replace(/\/$/, '');
    const self = ownOrigin(request.protocol, request.get('host'));

    if (!origin || !(allowed.has(origin) || origin === self)) {
      logger.warn('csrf.rejected', {
        method: request.method,
        path: request.path,
        /*
         * Both origins, by name. They are public values — the browser sent one and the
         * other is the host this process is answering on — and withholding them is what
         * made the production failure this guard's own header describes take an evening
         * to find. A log that says only "rejected" cannot tell anybody which of the two
         * is wrong.
         */
        origin: origin ?? null,
        expected: self ?? null,
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
