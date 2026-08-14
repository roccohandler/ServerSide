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
 *   - **Path=/** — the API and the app are one origin here, and a narrower path would
 *     silently stop working the day either moves.
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
