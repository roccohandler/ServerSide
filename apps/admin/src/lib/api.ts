import type { ApiResult } from '@jobforge/shared';

/*
 * ============================================================================
 * EVERY REQUEST THIS CONSOLE MAKES
 * ============================================================================
 *
 * One place, so there is one answer to "how does the owner console authenticate?" — and
 * the answer is: **it does not carry a credential at all.**
 *
 * `credentials: 'include'` sends the session cookie the server set at sign-in. The cookie
 * is `HttpOnly`, so this file cannot read it, which is the point: a token in JavaScript is
 * a token any script on the page can take. Nothing here holds a secret, because a bundle
 * served to a browser cannot hold one.
 *
 * ## The console decides what to *show*. The server decides what is *allowed*.
 *
 * A 403 from here is not a bug to route around. It means the signed-in account does not
 * have the capability, and the correct response is to say so — never to retry, and never
 * to add a header that "makes it work".
 *
 * ## One code gets behaviour. Every other one gets shown.
 *
 * `UNAUTHENTICATED` is the session having ended, and it is the only failure where printing
 * the server's sentence is the wrong answer: no wording recovers a dead session, and an
 * operator staring at "You are not signed in." on a page full of stale data has to work out
 * for themselves that the fix is to sign in again. So it clears the session and the console
 * falls to its sign-in form, which is machinery that already exists.
 *
 * Everything else — `NOT_FOUND` from `requireAdmin`, a refused transition, a rate limit — is
 * still shown verbatim. `components/State` defends that at length and it is still right: the
 * server writes those messages for a person, and a second copy of what each code means, in
 * the browser, is a copy that disagrees with the first one eventually.
 * ============================================================================
 */

/*
 * ---------------------------------------------------------------- session loss
 *
 * A module-level registration rather than an import of the session provider, and the
 * direction is the reason: `AdminSession` imports this file, so this file importing it back
 * is a cycle. The provider registers itself on mount, which is before any screen can render
 * and therefore before any request can be made.
 *
 * The provider is also the only thing that knows whether losing a session is a *change* —
 * `UNAUTHENTICATED` on the sign-in request itself is a wrong password, not an expiry, and
 * transitioning an already-anonymous console to anonymous has to be a no-op rather than a
 * re-render. That check lives with the state it is about.
 */
let sessionLost: (() => void) | null = null;

export function setSessionLostHandler(handler: (() => void) | null): void {
  sessionLost = handler;
}

/**
 * Longer than any healthy request and short enough that a hung one is not left spinning.
 *
 * The same fifteen seconds `apps/client/src/lib/http.ts` uses, and deliberately the same
 * number: two applications talking to one server, with two different opinions about when it
 * has stopped answering, is a difference nobody would ever be able to explain. This console
 * had no timeout at all, so a request that never resolved left the screen loading for as long
 * as the tab stayed open.
 */
const REQUEST_TIMEOUT_MS = 15_000;

/*
 * The same variable name the customer application reads, deliberately. Both apps ask one
 * question — "where is the API?" — and giving it two spellings is how somebody sets the
 * documented one, gets an empty base, and watches the console fetch `admin.example.com/api`,
 * which is itself. Two Vercel projects hold two different values under the one name.
 *
 * Trailing slash stripped for the same reason it is stripped in `apps/client/src/config/env.ts`:
 * `https://api.example.com/` would otherwise build `//api/conversations`, which is a
 * protocol-relative URL to the host `api`.
 */
const BASE = (import.meta.env['VITE_API_BASE_URL'] ?? '').trim().replace(/\/$/, '');

async function request<TData>(path: string, init?: RequestInit): Promise<ApiResult<TData>> {
  /*
   * Our own timeout, plus the caller's abort if it passed one. Both have to be able to stop
   * the request: the caller's is a screen unmounting, ours is a server that stopped
   * answering, and a request that only honours one of them hangs on the other.
   */
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const callerSignal = init?.signal;
  const onCallerAbort = () => controller.abort();
  callerSignal?.addEventListener('abort', onCallerAbort);

  try {
    const response = await fetch(`${BASE}/api${path}`, {
      ...init,
      signal: controller.signal,
      /* The session cookie. Cross-origin in production, same-origin behind the dev proxy. */
      credentials: 'include',
      headers: {
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    });

    /*
     * A 204 has no body to parse, and treating that as a failure is exactly what this
     * used to do: `response.json()` rejects on an empty payload, the result fell through
     * to the "no usable body" branch below, and a reply that had genuinely been delivered
     * came back as `The server responded with 204`. The owner would have sent it twice.
     *
     * Handled before the parse rather than after, so success is never inferred from the
     * shape of something that was never sent.
     */
    if (response.status === 204) {
      return { success: true, data: undefined as TData };
    }

    const body: unknown = await response.json().catch(() => null);

    if (!response.ok || !body || typeof body !== 'object') {
      const error =
        body && typeof body === 'object' && 'error' in body
          ? (body as { error: { code: string; message: string } }).error
          : {
              code: 'NETWORK_ERROR',
              message: `The server responded with ${response.status}.`,
            };

      /*
       * The session ended. Told once, here, so every screen gets it without any of them
       * having to remember — and after the result is built rather than instead of it, so a
       * caller that wants to say something about the request it just lost still can.
       */
      if (error.code === 'UNAUTHENTICATED') sessionLost?.();

      return { success: false, error } as ApiResult<TData>;
    }

    return body as ApiResult<TData>;
  } catch {
    /*
     * Offline, DNS failure, a CORS rejection, the caller unmounting, or our own timeout —
     * all the same to the operator, and all of them mean the same next step.
     */
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: 'The server could not be reached. Check that the API is running.',
      },
    } as ApiResult<TData>;
  } finally {
    clearTimeout(timeout);
    callerSignal?.removeEventListener('abort', onCallerAbort);
  }
}

export const get = <TData>(path: string, signal?: AbortSignal) =>
  request<TData>(path, signal ? { signal } : undefined);

export const post = <TData>(path: string, payload?: unknown) =>
  request<TData>(path, {
    method: 'POST',
    ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
  });

export const patch = <TData>(path: string, payload: unknown) =>
  request<TData>(path, { method: 'PATCH', body: JSON.stringify(payload) });

/**
 * For the one write in this console that is addressed by what it *is* rather than by an id.
 *
 * A monthly report is identified by `{ project, month }` — saving August twice is one
 * August, and the server has a unique index saying so. `PUT` is the verb for that; `POST`
 * would promise a new record each time and the second call would be a lie the database then
 * refuses.
 */
export const put = <TData>(path: string, payload: unknown) =>
  request<TData>(path, { method: 'PUT', body: JSON.stringify(payload) });

/**
 * The first verb this console has that removes something.
 *
 * No body, so no `Content-Type`, so no preflight beyond the method itself — which is why
 * `DELETE` had to be added to the server's CORS `methods` list. See the note there: a method
 * a browser is told it may use and no route answers is worse than not listing it.
 */
export const remove = <TData>(path: string) => request<TData>(path, { method: 'DELETE' });
