import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PublicUser } from '@jobforge/shared';
import { AuthProvider } from './AuthContext';
import { ReauthDialog } from './ReauthDialog';
import { RequireAuth } from '../app/router/RequireAuth';
import { httpGet } from '../lib/http';
import { routes } from '../config/routes';

/*
 * ============================================================================
 * THE SESSION ENDING MID-ACTION
 * ============================================================================
 *
 * Before any of this, `ApiErrorCode` carried `UNAUTHENTICATED` and **no file in either
 * frontend read it**. A customer whose thirty-day cookie lapsed while they were approving
 * their website saw the server's sentence — "You are not signed in." — printed beside a page
 * still showing their project, every control still there and nothing working.
 *
 * The answer to that was to end the session and redirect to `/login?from=…`, which these
 * tests used to assert. It is **superseded**: `from` returns you to the route and the route
 * remounts empty, so anything half-typed went with it. The session now stays nominally alive
 * while a dialog asks for the password over the page that never unmounted.
 *
 * Four things have to hold together and none of them is sufficient alone. "Shows the dialog"
 * is satisfied by something that shows it at random; "keeps the page" is satisfied by the
 * code that was there before any of this; and the two negative cases are the ones a naive
 * implementation gets wrong, because `UNAUTHENTICATED` is the single most common error code
 * this application sees — every anonymous visitor produces one on every page load.
 * ============================================================================
 */

const CUSTOMER: PublicUser = {
  id: 'u1',
  email: 'dana@cascadeheating.example',
  name: 'Dana Reyes',
  role: 'customer',
  emailVerified: true,
  capabilities: [],
  authProviders: ['password'],
};

function failure(code: string, message: string): Response {
  return new Response(JSON.stringify({ success: false, error: { code, message } }), {
    status: code === 'UNAUTHENTICATED' ? 401 : 500,
    headers: { 'Content-Type': 'application/json' },
  });
}

function session(user: PublicUser): Response {
  return new Response(JSON.stringify({ success: true, data: { user } }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * A signed-in workspace with one control that makes a request, and the dialog above it.
 *
 * `ReauthDialog` is mounted here rather than being reached through `AppLayout`, because the
 * thing under test is the session, not the shell — and `AppLayout` would drag a header, a
 * live region and five navigation links into a test about one error code.
 *
 * `initialUser` skips the `/me` round trip, so the only request in the test is the one the
 * button makes — which is what makes the assertion about *that* request rather than about
 * the session bootstrap.
 */
function renderWorkspace() {
  return render(
    <MemoryRouter initialEntries={['/app/projects']}>
      <AuthProvider initialUser={CUSTOMER}>
        <ReauthDialog />
        <Routes>
          <Route element={<RequireAuth />}>
            <Route
              path="/app/projects"
              element={
                <button type="button" onClick={() => void httpGet('/app/projects')}>
                  Load my project
                </button>
              }
            />
          </Route>
          <Route path={routes.login} element={<p>Sign in page</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('a session that ends mid-action', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('asks for the password over the page instead of taking the page away', async () => {
    vi.mocked(fetch).mockResolvedValue(failure('UNAUTHENTICATED', 'You are not signed in.'));

    renderWorkspace();
    await userEvent.click(screen.getByRole('button', { name: 'Load my project' }));

    expect(await screen.findByRole('dialog', { name: 'Your session ended' })).toBeInTheDocument();

    /*
     * The assertion that is the whole point. The screen underneath never unmounted, so
     * anything typed into it is still typed into it — which is what `/login?from=…` could
     * not do, because it returns you to the route rather than to the page.
     */
    expect(screen.getByRole('button', { name: 'Load my project' })).toBeInTheDocument();
    expect(screen.queryByText('Sign in page')).not.toBeInTheDocument();
  });

  it('puts the reader back on the page they were on', async () => {
    vi.mocked(fetch).mockResolvedValue(failure('UNAUTHENTICATED', 'You are not signed in.'));

    renderWorkspace();
    await userEvent.click(screen.getByRole('button', { name: 'Load my project' }));
    await screen.findByRole('dialog', { name: 'Your session ended' });

    vi.mocked(fetch).mockResolvedValue(session(CUSTOMER));
    await userEvent.type(screen.getByLabelText('Password'), 'correct horse');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Load my project' })).toBeInTheDocument();
  });

  it('falls back to the full sign-in page when the reader gives up', async () => {
    vi.mocked(fetch).mockResolvedValue(failure('UNAUTHENTICATED', 'You are not signed in.'));

    renderWorkspace();
    await userEvent.click(screen.getByRole('button', { name: 'Load my project' }));
    await screen.findByRole('dialog', { name: 'Your session ended' });

    await userEvent.click(screen.getByRole('button', { name: 'Sign in on the full page' }));

    /*
     * The behaviour this replaced, kept as the escape hatch rather than deleted. Somebody who
     * cannot remember their password needs the reset link, and that is on `/login`.
     */
    expect(await screen.findByText('Sign in page')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Load my project' })).not.toBeInTheDocument();
  });

  it('leaves the session alone for every other failure', async () => {
    vi.mocked(fetch).mockResolvedValue(
      failure('SERVICE_UNAVAILABLE', 'We cannot reach our records right now.'),
    );

    renderWorkspace();
    await userEvent.click(screen.getByRole('button', { name: 'Load my project' }));

    /*
     * A database blip is not an expiry. Asking for a password over one would be asking
     * somebody to re-enter a credential that was never the problem.
     */
    expect(await screen.findByRole('button', { name: 'Load my project' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  /*
   * The two negative cases, and the reason `reauthNeeded` is raised only from `authenticated`.
   *
   * `UNAUTHENTICATED` is not an unusual response in this application — it is the *normal* one.
   * Every anonymous visitor to every marketing page produces one from `/api/auth/me`, and a
   * wrong password produces another from the sign-in form itself. A dialog that appeared for
   * either would appear on the homepage, for a stranger, asking for a password.
   */
  it('never appears for a visitor who was not signed in to begin with', async () => {
    vi.mocked(fetch).mockResolvedValue(failure('UNAUTHENTICATED', 'You are not signed in.'));

    render(
      <MemoryRouter>
        <AuthProvider initialUser={null}>
          <ReauthDialog />
          <button type="button" onClick={() => void httpGet('/auth/me')}>
            Check
          </button>
        </AuthProvider>
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Check' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('never appears because a password was wrong on the sign-in form', async () => {
    vi.mocked(fetch).mockResolvedValue(failure('UNAUTHENTICATED', 'Email or password is wrong.'));

    render(
      <MemoryRouter>
        <AuthProvider initialUser={null}>
          <ReauthDialog />
          <button type="button" onClick={() => void httpGet('/auth/login')}>
            Sign in
          </button>
        </AuthProvider>
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
