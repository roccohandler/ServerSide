import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { get, post, setSessionLostHandler } from './api';

/*
 * ============================================================================
 * THE VARIABLE THE BUNDLE READS IS THE VARIABLE THE DOCS NAME
 * ============================================================================
 *
 * The console is deployed to its own origin, so it is the one bundle in this repository
 * that *must* be told where the API is. An unset base is not a broken state the browser
 * reports — it is an empty string, and every request goes to `admin.example.com/api/…`,
 * which is the console fetching itself. Every screen then shows "The server could not be
 * reached" against a perfectly healthy API.
 *
 * That failure is configured, not coded, which means the only thing standing between it
 * and the owner is a variable name written down in two files. It had already drifted once:
 * the bundle read `VITE_API_URL`, `.env.example` documented `VITE_API_BASE_URL` and nothing
 * else, so following the repository's own environment file produced exactly the silent
 * failure above.
 *
 * So the name is asserted rather than trusted. Rename it in `api.ts` and this fails until
 * both documents say the new name — which is the only moment anybody is in a position to
 * update them.
 * ============================================================================
 */

const ROOT = join(import.meta.dirname, '..', '..', '..', '..');

const read = (...segments: readonly string[]) => readFileSync(join(ROOT, ...segments), 'utf8');

const API_SOURCE = read('apps', 'admin', 'src', 'lib', 'api.ts');

/** Every `import.meta.env['VITE_…']` the console's request layer reads. */
function environmentNames(source: string): readonly string[] {
  const matches = source.matchAll(/import\.meta\.env\[['"](VITE_[A-Z0-9_]+)['"]\]/g);
  return [...new Set([...matches].map((match) => match[1] as string))];
}

describe('the console API base URL', () => {
  it('comes from exactly one environment variable', () => {
    /*
     * One, because "where is the API?" is one question. Two would mean one of them is set
     * on a deployment and the other is not, and the symptom of the unset one is a console
     * that quietly talks to itself.
     */
    expect(environmentNames(API_SOURCE)).toHaveLength(1);
  });

  it('is named in the deployment guide and in .env.example', () => {
    const [name] = environmentNames(API_SOURCE);
    expect(name).toBeDefined();

    expect(read('apps', 'admin', 'DEPLOY.md')).toContain(name as string);
    expect(read('.env.example')).toContain(name as string);
  });

  it('shares its name with the customer application, so there is one thing to set', () => {
    const [name] = environmentNames(API_SOURCE);

    /*
     * Both apps read the same name and the two Vercel projects hold different values under
     * it. The alternative — one name each — reads as two settings and is set as one.
     */
    expect(read('apps', 'client', 'src', 'config', 'env.ts')).toContain(name as string);
  });

  it('strips a trailing slash', () => {
    /*
     * `https://api.example.com/` would otherwise build `https://api.example.com//api/…`.
     * A double slash after the host is tolerated by most servers and by none of the ones
     * that matter here; `//api/conversations` in a *relative* position is worse still — it
     * is a protocol-relative URL to a host called `api`.
     */
    expect(API_SOURCE).toContain(".replace(/\\/$/, '')");
  });
});

/*
 * ============================================================================
 * WHAT THE REQUEST LAYER DOES WHEN THINGS GO WRONG
 * ============================================================================
 *
 * Three behaviours, and two of them did not exist before 2026-08-15.
 * ============================================================================
 */

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

describe('a console request', () => {
  beforeEach(() => {
    setSessionLostHandler(null);
  });

  afterEach(() => {
    setSessionLostHandler(null);
    vi.useRealTimers();
  });

  /*
   * The defect this branch exists for is recorded in `api.ts`: `response.json()` rejects on
   * an empty payload, so a reply that had genuinely been delivered came back as "The server
   * responded with 204" and the owner would have sent it twice. Pinned rather than trusted,
   * because the timeout work below rewrote the function around it.
   */
  it('treats a 204 as success rather than as an unreadable body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, status: 204 } as Response)),
    );

    await expect(post('/admin/conversations/lead:1/replies', { body: 'x' })).resolves.toEqual({
      success: true,
      data: undefined,
    });
  });

  /*
   * The console had no timeout at all, so a server that accepted the connection and never
   * answered left the screen loading for as long as the tab stayed open. Fake timers rather
   * than a fifteen-second test.
   */
  it('gives up after the timeout instead of hanging forever', async () => {
    vi.useFakeTimers();

    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
          }),
      ),
    );

    const pending = get('/admin/projects');
    await vi.advanceTimersByTimeAsync(15_000);

    const result = await pending;
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('NETWORK_ERROR');
  });

  /*
   * The session ending is the one failure the console acts on rather than prints. It is
   * reported once, from here, so no screen has to remember to check for it.
   */
  it('reports a lost session exactly once, and still returns the failure', async () => {
    const lost = vi.fn();
    setSessionLostHandler(lost);

    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          jsonResponse(401, {
            success: false,
            error: { code: 'UNAUTHENTICATED', message: 'You are not signed in.' },
          }),
        ),
      ),
    );

    const result = await get('/admin/projects');

    expect(lost).toHaveBeenCalledTimes(1);
    /* Still a result, not a throw: the caller may want to say something about what it lost. */
    expect(result.success).toBe(false);
  });

  it('does not report a lost session for any other failure', async () => {
    const lost = vi.fn();
    setSessionLostHandler(lost);

    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          jsonResponse(404, {
            success: false,
            error: { code: 'NOT_FOUND', message: 'Not found.' },
          }),
        ),
      ),
    );

    await get('/admin/projects');

    /*
     * `requireAdmin` answers NOT_FOUND to a signed-in customer, deliberately. Treating that
     * as an expired session would sign somebody out of a console they were never in.
     */
    expect(lost).not.toHaveBeenCalled();
  });
});
