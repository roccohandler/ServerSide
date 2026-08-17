import type { Request, Response } from 'express';
import { SESSION_COOKIE_NAME, SESSION_TTL_MS } from './auth.types.js';

/*
 * The session cookie.
 *
 * Read by hand rather than with `cookie-parser`: one header, one name, and the
 * middleware would be a dependency added to split a string on `;`.
 *
 * The flags are the security properties, so each is written down:
 *
 *   - **HttpOnly** — script cannot read it, so an XSS bug is not automatically a stolen
 *     session. This is the single most valuable flag on the cookie.
 *   - **Secure in production** — never sent over plain HTTP. Left off locally because
 *     `http://localhost` would otherwise never receive it and nobody could sign in.
 *   - **SameSite=Lax** — a cross-site POST does not carry it, which is most of CSRF
 *     dealt with before any token scheme. `Strict` was considered and rejected: it also
 *     drops the cookie on an ordinary inbound link from an email, so somebody clicking
 *     "open my dashboard" would arrive signed out.
 *   - **Path=/** — a narrower path would silently stop working the day anything moves.
 *
 * ============================================================================
 * WHAT `Lax` REQUIRES OF THE OWNER CONSOLE, AND WHY IT IS NOT `None`
 * ============================================================================
 *
 * There are two frontends now, on two origins. `SameSite` is evaluated on the **site**
 * (the registrable domain), not the origin — so `admin.example.com` calling
 * `www.example.com/api` is *cross-origin and same-site*, and a `Lax` cookie is sent.
 *
 * That is a real deployment constraint rather than a detail: **the console has to be a
 * subdomain of whatever domain serves the API.** Put it on a different registrable domain
 * — `jobforge-admin.vercel.app` beside `jobforge.vercel.app`, say, since `vercel.app` is
 * on the Public Suffix List and those are two *sites* — and every console request arrives
 * with no cookie. The console would show a sign-in form that succeeds and then bounces
 * straight back to itself, with no error anywhere and a server that is behaving perfectly.
 * `apps/admin/DEPLOY.md` states it as a rule so the domain gets chosen with it in mind.
 *
 * The alternative is `SameSite=None; Secure`, and it is deliberately refused. It would let
 * the console live anywhere, at the cost of the strongest of the three CSRF layers listed
 * in `middleware/csrf.ts` — and it would still not work in Safari, which blocks
 * third-party cookies outright regardless of the attribute. Weakening a real defence to
 * buy a deployment shape that does not function is the wrong trade twice over.
 * ============================================================================
 */

export interface CookieOptions {
  /** False locally, so `http://localhost:5173` can hold a session. */
  readonly secure: boolean;
}

export function readSessionCookie(request: Request): string | undefined {
  const header = request.headers.cookie;
  if (!header) return undefined;

  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;

    if (part.slice(0, separator).trim() === SESSION_COOKIE_NAME) {
      const value = part.slice(separator + 1).trim();
      return value.length > 0 ? decodeURIComponent(value) : undefined;
    }
  }

  return undefined;
}

export function setSessionCookie(
  response: Response,
  token: string,
  options: CookieOptions & { readonly expiresAt?: Date },
): void {
  response.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: options.secure,
    sameSite: 'lax',
    path: '/',
    maxAge: options.expiresAt
      ? Math.max(0, options.expiresAt.getTime() - Date.now())
      : SESSION_TTL_MS,
  });
}

/**
 * Clears it with the same attributes it was set with. A cookie cleared with different
 * flags is a cookie that is still there — browsers match on name, domain and path.
 */
export function clearSessionCookie(response: Response, options: CookieOptions): void {
  response.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: options.secure,
    sameSite: 'lax',
    path: '/',
  });
}
