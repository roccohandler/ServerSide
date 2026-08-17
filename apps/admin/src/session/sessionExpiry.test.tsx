import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminSessionProvider } from './AdminSession';
import { ReauthDialog } from './ReauthDialog';
import { useAdminSession } from './useAdminSession';
import { get } from '../lib/api';
import { CONSOLE_CAPABILITY } from './capabilities';

/*
 * ============================================================================
 * THE CONSOLE'S SESSION ENDING MID-REPLY
 * ============================================================================
 *
 * The customer application's copy of this file explains the shape at length. What is
 * specific here is the stake and one branch:
 *
 *   - **The stake.** The half-written thing in this application is a reply to a prospect who
 *     has been waiting. `useUnsavedChanges` already protects it against a reload; nothing
 *     protected it against the cookie lapsing, which re-rendered the sign-in form over the
 *     top of it.
 *
 *   - **The branch.** `signIn` here refuses an account without the console capability, so
 *     this dialog can be handed *correct* credentials and still have to refuse. It must say
 *     which, because "invalid password" sends somebody to reset a password that works.
 * ============================================================================
 */

const OWNER = {
  id: 'staff-1',
  email: 'sam@example.com',
  name: 'Sam Staff',
  capabilities: [CONSOLE_CAPABILITY],
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const unauthenticated = () =>
  json(
    { success: false, error: { code: 'UNAUTHENTICATED', message: 'You are not signed in.' } },
    401,
  );

/** A console with one control that makes a request, and the dialog above it. */
function Console() {
  const { status } = useAdminSession();

  return (
    <>
      <ReauthDialog />
      <p>status: {status}</p>
      <button type="button" onClick={() => void get('/admin/conversations')}>
        Load the inbox
      </button>
    </>
  );
}

function renderConsole() {
  return render(
    <AdminSessionProvider>
      <Console />
    </AdminSessionProvider>,
  );
}

describe('the console session ending mid-action', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('asks for the password over the console instead of replacing it', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(json({ success: true, data: { user: OWNER } }));
    renderConsole();
    expect(await screen.findByText('status: signedIn')).toBeInTheDocument();

    vi.mocked(fetch).mockResolvedValue(unauthenticated());
    await userEvent.click(screen.getByRole('button', { name: 'Load the inbox' }));

    expect(await screen.findByRole('dialog', { name: 'Your session ended' })).toBeInTheDocument();
    /* Still signed in as far as the shell is concerned, which is what keeps it mounted. */
    expect(screen.getByText('status: signedIn')).toBeInTheDocument();
  });

  it('says which problem it is when the credentials are right and the account is wrong', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(json({ success: true, data: { user: OWNER } }));
    renderConsole();
    await screen.findByText('status: signedIn');

    vi.mocked(fetch).mockResolvedValue(unauthenticated());
    await userEvent.click(screen.getByRole('button', { name: 'Load the inbox' }));
    await screen.findByRole('dialog');

    /* Authenticates fine, holds no console capability. */
    vi.mocked(fetch).mockResolvedValueOnce(
      json({ success: true, data: { user: { ...OWNER, capabilities: [] } } }),
    );
    await userEvent.type(screen.getByLabelText('Password'), 'correct horse');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('That account is not an owner account.')).toBeInTheDocument();
    /* Still open. A refusal that closed the dialog would leave a dead console behind it. */
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('never appears for an anonymous console', async () => {
    vi.mocked(fetch).mockResolvedValue(unauthenticated());
    renderConsole();

    expect(await screen.findByText('status: anonymous')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Load the inbox' }));

    /*
     * The bootstrap `/auth/me` for a signed-out operator is itself an `UNAUTHENTICATED`, and
     * so is every wrong password typed into the sign-in form. Neither is an expiry.
     */
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
