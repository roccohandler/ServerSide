import { env } from '../config/env';
import type { ApiFailure, ApiResult } from '../types/api';

/*
 * ============================================================================
 * THE HTTP LAYER
 * ============================================================================
 *
 * One `fetch` wrapper, shared by the marketing forms and the authenticated
 * application. Still deliberately not a data-fetching library: the additions the
 * private app needed were a `GET`, a `PATCH` and a shared timeout, which is thirty
 * lines — against a dependency, a provider and a cache.
 *
 * ## Nothing here throws
 *
 * Every outcome, including a dead network and a session that expired mid-request, comes
 * back as a discriminated result. A component then has one code path for failure rather
 * than a try/catch wrapped around a promise chain, and — more importantly — there is no
 * way to forget one.
 *
 * ## Cookies
 *
 * `same-origin`, which is also the browser default, stated explicitly because it is a
 * security property rather than an accident. The Vite dev server proxies `/api` and
 * Vercel serves both from one domain, so the session cookie travels on every request
 * without any cross-origin credential sharing being enabled anywhere.
 * ============================================================================
 */

/** Longer than any healthy request, short enough that a hung form is not left spinning. */
const REQUEST_TIMEOUT_MS = 15_000;

export const NETWORK_FAILURE: ApiFailure = {
  success: false,
  error: {
    code: 'NETWORK_ERROR',
    message:
      'We could not reach the server. Check your connection and try again, or call or email us directly.',
  },
};

export const UNEXPECTED_FAILURE: ApiFailure = {
  success: false,
  error: {
    code: 'INTERNAL_ERROR',
    message: 'Something went wrong on our end. Please try again, or call or email us directly.',
  },
};

/** Narrows an unknown JSON body to the response envelope both sides agreed on. */
function isApiResult<TData>(value: unknown): value is ApiResult<TData> {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as { success?: unknown; error?: unknown };

  if (candidate.success === true) return true;
  if (candidate.success !== false) return false;

  return (
    typeof candidate.error === 'object' &&
    candidate.error !== null &&
    typeof (candidate.error as { message?: unknown }).message === 'string'
  );
}

interface RequestOptions {
  readonly method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  readonly path: string;
  readonly body?: unknown;
  readonly signal?: AbortSignal;
}

async function send<TData>(options: RequestOptions): Promise<ApiResult<TData>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  // A caller's own abort (a component unmounting) has to win too.
  const onExternalAbort = () => controller.abort();
  options.signal?.addEventListener('abort', onExternalAbort);

  try {
    const response = await fetch(`${env.apiBaseUrl}${options.path}`, {
      method: options.method,
      headers: {
        Accept: 'application/json',
        ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      /*
       * A JSON content type is one of the three things standing between the session
       * cookie and cross-site request forgery — an HTML form cannot produce one. See
       * `server/src/middleware/csrf.ts`.
       */
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
      credentials: 'same-origin',
      signal: controller.signal,
    });

    const parsed: unknown = await response.json().catch(() => null);

    if (!isApiResult<TData>(parsed)) {
      // A response we cannot read is a server problem, not something to show raw.
      return UNEXPECTED_FAILURE;
    }

    return parsed;
  } catch {
    // Offline, DNS failure, CORS rejection or our own timeout — all the same to the visitor.
    return NETWORK_FAILURE;
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', onExternalAbort);
  }
}

export function httpGet<TData>(path: string, signal?: AbortSignal): Promise<ApiResult<TData>> {
  return send<TData>({ method: 'GET', path, ...(signal ? { signal } : {}) });
}

export function httpPost<TData>(path: string, body?: unknown): Promise<ApiResult<TData>> {
  return send<TData>({ method: 'POST', path, body: body ?? {} });
}

export function httpPatch<TData>(path: string, body: unknown): Promise<ApiResult<TData>> {
  return send<TData>({ method: 'PATCH', path, body });
}
