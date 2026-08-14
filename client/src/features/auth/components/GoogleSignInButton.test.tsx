import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GoogleSignInButton } from './GoogleSignInButton';

/*
 * ============================================================================
 * THE BUTTON IS ALWAYS THERE
 * ============================================================================
 *
 * The requirement these tests exist for, stated as plainly as the brief states it: the
 * Google option renders in development, in staging and in production, configured or
 * not. Not behind `import.meta.env.PROD`, not behind a feature flag, not behind a
 * successful script load.
 *
 * The failure this prevents is specific and has happened to every project that has ever
 * hidden a button in development: nobody sees it for weeks, and the first person to
 * find out it is broken is a customer on the live site.
 *
 * What varies is what pressing it does, and that is a *runtime* question answered by
 * `/api/auth/config`. Both answers are tested here.
 * ============================================================================
 */

const fetchAuthConfig = vi.fn();

vi.mock('../api/authApi', () => ({
  fetchAuthConfig: (...args: unknown[]) => fetchAuthConfig(...args),
}));

function configured(googleClientId: string | null) {
  return {
    success: true as const,
    data: { googleEnabled: googleClientId !== null, googleClientId },
  };
}

beforeEach(() => {
  fetchAuthConfig.mockReset();
  delete (window as { google?: unknown }).google;
  document.getElementById('google-identity-services')?.remove();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the Google sign-in button', () => {
  it('renders before the configuration has even been fetched', () => {
    // A promise that never settles: this is the first frame, and the slot has to be
    // occupied in it or the form jumps when the answer arrives.
    fetchAuthConfig.mockReturnValue(new Promise(() => {}));

    render(<GoogleSignInButton onCredential={vi.fn()} />);

    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('renders when Google is not configured — the ordinary local case', async () => {
    fetchAuthConfig.mockResolvedValue(configured(null));

    render(<GoogleSignInButton onCredential={vi.fn()} />);

    expect(
      await screen.findByRole('button', { name: /continue with google/i }),
    ).toBeInTheDocument();
  });

  it('renders when Google is configured but its script cannot be loaded', async () => {
    fetchAuthConfig.mockResolvedValue(configured('test-client-id.apps.googleusercontent.com'));

    render(<GoogleSignInButton onCredential={vi.fn()} />);

    /*
     * The blocked-CDN case: an ad blocker, a corporate proxy, an offline laptop. The
     * error is dispatched by hand because jsdom never fetches the script at all, so it
     * would otherwise neither load nor fail — which is the *third* case, and the one
     * the component's own load timeout exists for.
     */
    const script = await waitFor(() => {
      const found = document.getElementById('google-identity-services');
      expect(found).not.toBeNull();
      return found as HTMLScriptElement;
    });

    script.dispatchEvent(new Event('error'));

    expect(
      await screen.findByRole('button', { name: /continue with google/i }),
    ).toBeInTheDocument();
  });

  /*
   * There used to be a test here for a different label on the sign-up page. There is now a
   * test that there is no different label, which is the requirement: `POST /api/auth/google`
   * cannot tell a new account from a returning one, and `api/authApi.ts` forbids anything
   * downstream from branching on it — so "Sign up with Google" promised a distinction the
   * system does not make, and told somebody whose account already existed that they had
   * just created one.
   */
  it('says the same thing wherever it appears', async () => {
    fetchAuthConfig.mockResolvedValue(configured(null));

    render(<GoogleSignInButton onCredential={vi.fn()} />);

    expect(
      await screen.findByRole('button', { name: /continue with google/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /sign up with google/i })).toBeNull();
  });

  /*
   * The brief is explicit: clicking an unconfigured button produces a clear message
   * rather than a crash, a silent no-op, or — worst of all — a faked sign-in.
   */
  it('explains itself when pressed and nothing is configured', async () => {
    const user = userEvent.setup();
    const onCredential = vi.fn();
    fetchAuthConfig.mockResolvedValue(configured(null));

    render(<GoogleSignInButton onCredential={onCredential} />);

    await user.click(await screen.findByRole('button', { name: /continue with google/i }));

    const message = await screen.findByRole('status');
    expect(message).toHaveTextContent(/not available here yet/i);
    expect(message).toHaveTextContent(/email address and password/i);
    /*
     * Not "use *your* email address and password". The same button is on the sign-up page,
     * where the visitor has neither yet, and telling them to use a password they have not
     * chosen is an instruction that cannot be followed.
     */
    expect(message).not.toHaveTextContent(/your email address and password/i);

    // Nothing was faked. No credential, no user, no session.
    expect(onCredential).not.toHaveBeenCalled();
  });

  it('never invents a credential', async () => {
    const user = userEvent.setup();
    const onCredential = vi.fn();
    fetchAuthConfig.mockResolvedValue(configured(null));

    render(<GoogleSignInButton onCredential={onCredential} />);

    const button = await screen.findByRole('button', { name: /continue with google/i });
    await user.click(button);
    await user.click(button);

    expect(onCredential).not.toHaveBeenCalled();
  });

  it('survives a configuration endpoint that is down', async () => {
    fetchAuthConfig.mockResolvedValue({
      success: false as const,
      error: { code: 'INTERNAL_ERROR' as const, message: 'nope' },
    });

    render(<GoogleSignInButton onCredential={vi.fn()} />);

    // The page is not broken, and the option is still visible.
    expect(
      await screen.findByRole('button', { name: /continue with google/i }),
    ).toBeInTheDocument();
  });

  /* ------------------------------------------------------------ accessibility */

  it('is a real button, reachable and operable from the keyboard', async () => {
    const user = userEvent.setup();
    fetchAuthConfig.mockResolvedValue(configured(null));

    render(<GoogleSignInButton onCredential={vi.fn()} />);

    const button = await screen.findByRole('button', { name: /continue with google/i });
    expect(button).toHaveAttribute('type', 'button');

    await user.tab();
    expect(button).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(await screen.findByRole('status')).toBeInTheDocument();
  });

  it('does not announce the empty slot Google would render into', async () => {
    fetchAuthConfig.mockResolvedValue(configured(null));
    const { container } = render(<GoogleSignInButton onCredential={vi.fn()} />);

    await screen.findByRole('button', { name: /continue with google/i });

    const slot = container.querySelector('[data-state]');
    expect(slot).toHaveAttribute('aria-hidden', 'true');
  });

  it('disables itself while the application is exchanging a credential', async () => {
    fetchAuthConfig.mockResolvedValue(configured(null));

    render(<GoogleSignInButton busy onCredential={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /continue with google/i })).toBeDisabled();
    });
  });

  /* ------------------------------------------------ the configured happy path */

  /*
   * The one case jsdom can be made to exercise: Google's script has loaded and the
   * component hands the credential straight through without reading it.
   */
  it('passes a credential from Google through untouched', async () => {
    const onCredential = vi.fn();
    let capturedCallback: ((response: { credential?: string }) => void) | undefined;

    fetchAuthConfig.mockResolvedValue(configured('test-client-id.apps.googleusercontent.com'));

    (window as { google?: unknown }).google = {
      accounts: {
        id: {
          initialize: (config: { callback: (response: { credential?: string }) => void }) => {
            capturedCallback = config.callback;
          },
          renderButton: () => {},
        },
      },
    };

    // The script tag is already present, so the loader resolves immediately.
    const script = document.createElement('script');
    script.id = 'google-identity-services';
    document.head.appendChild(script);

    render(<GoogleSignInButton onCredential={onCredential} />);

    await waitFor(() => expect(capturedCallback).toBeDefined());

    capturedCallback?.({ credential: 'an.opaque.id-token' });

    expect(onCredential).toHaveBeenCalledWith('an.opaque.id-token');
  });

  it('ignores a Google response that carries no credential', async () => {
    const onCredential = vi.fn();
    let capturedCallback: ((response: { credential?: string }) => void) | undefined;

    fetchAuthConfig.mockResolvedValue(configured('test-client-id.apps.googleusercontent.com'));

    (window as { google?: unknown }).google = {
      accounts: {
        id: {
          initialize: (config: { callback: (response: { credential?: string }) => void }) => {
            capturedCallback = config.callback;
          },
          renderButton: () => {},
        },
      },
    };

    const script = document.createElement('script');
    script.id = 'google-identity-services';
    document.head.appendChild(script);

    render(<GoogleSignInButton onCredential={onCredential} />);

    await waitFor(() => expect(capturedCallback).toBeDefined());

    // A cancelled or dismissed prompt. Not an error, and not a sign-in.
    capturedCallback?.({});

    expect(onCredential).not.toHaveBeenCalled();
  });
});
