import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchAuthConfig } from '../api/authApi';
import styles from './GoogleSignInButton.module.css';

/*
 * ============================================================================
 * CONTINUE WITH GOOGLE
 * ============================================================================
 *
 * ## The button is always rendered
 *
 * There is no `import.meta.env.PROD` anywhere in this file, and no branch that decides
 * whether the option exists. A sign-in page that shows two ways in locally and three in
 * production is a page nobody can develop against, and the first time anybody finds out
 * the button is broken is in production.
 *
 * What *does* vary is what happens when it is pressed, and that is a runtime question
 * answered by `/api/auth/config` rather than a build-time one. Three states:
 *
 *   - **Configured, script loaded.** Google's own button renders in the slot below and
 *     hands us a credential.
 *   - **Configured, script blocked or offline.** Our own button appears in the same
 *     slot and says the sign-in could not be loaded.
 *   - **Not configured** — the ordinary local-development case. Our own button appears
 *     and says so plainly when pressed. Nothing crashes, nothing is faked, and no
 *     Google user is invented.
 *
 * ## One label, on both pages
 *
 * "Continue with Google" wherever this appears, and `text: 'continue_with'` in Google's own
 * button to match. There used to be a `signup_with` variant on `/signup`, and it promised
 * something the system cannot deliver: there is one `POST /api/auth/google`, it cannot tell
 * a new account from a returning one, and `api/authApi.ts` is explicit that nothing
 * downstream may branch on which it was. So the second label described a distinction that
 * does not exist — and told somebody whose account already existed that they had just
 * created one. The prop that selected it is gone rather than defaulted, because a prop with
 * one caller and no effect is how the wording comes back.
 *
 * ## Why Google's own button, when it is configured
 *
 * Because Google's branding terms are specific about the mark, the wording and the
 * spacing, and their rendered button is the supported way to satisfy them. It is
 * configured to `outline`/`large` at the form's own width, which sits inside the
 * JobForge design system rather than next to it. The fallback below matches its height
 * exactly, so the layout does not move between the two.
 *
 * ## What this file never does
 *
 * It never reads the credential. The ID token is passed straight to the server, which
 * verifies Google's signature on it and decides who this is. Nothing in the browser is
 * entitled to an opinion about that.
 * ============================================================================
 */

const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
const SCRIPT_ID = 'google-identity-services';

/** The shape of the part of Google Identity Services this uses. */
interface GoogleIdentityApi {
  accounts: {
    id: {
      initialize(config: {
        client_id: string;
        callback: (response: { credential?: string }) => void;
        cancel_on_tap_outside?: boolean;
        use_fedcm_for_prompt?: boolean;
      }): void;
      renderButton(
        parent: HTMLElement,
        options: {
          type?: 'standard' | 'icon';
          theme?: 'outline' | 'filled_blue' | 'filled_black';
          size?: 'small' | 'medium' | 'large';
          text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
          shape?: 'rectangular' | 'pill' | 'circle' | 'square';
          logo_alignment?: 'left' | 'center';
          width?: number;
        },
      ): void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentityApi;
  }
}

/**
 * How long to wait for Google's script before giving up and showing our own button.
 *
 * A blocked CDN frequently does not *fail* — a corporate proxy or a content blocker
 * often black-holes the request, and `onerror` never fires. Without this the button
 * would sit at "Loading Google sign-in…", disabled, for the rest of the visit, which is
 * a worse failure than the one it is trying to report.
 */
const SCRIPT_TIMEOUT_MS = 8_000;

/** Loads Google's script once, however many buttons ask for it. */
let scriptPromise: Promise<void> | undefined;

function loadGoogleScript(): Promise<void> {
  if (typeof document === 'undefined') return Promise.reject(new Error('no document'));

  // Already loaded and initialised — another button on the page, or a soft navigation.
  if (window.google?.accounts?.id) return Promise.resolve();

  scriptPromise ??= new Promise<void>((resolve, reject) => {
    /** Whichever of load, error and timeout happens first wins; the rest are ignored. */
    let settled = false;

    const fail = (reason: string) => {
      if (settled) return;
      settled = true;
      // Let a later attempt retry rather than caching the failure forever.
      scriptPromise = undefined;
      reject(new Error(reason));
    };

    const succeed = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve();
    };

    const timer = setTimeout(
      () => fail('Google Identity Services did not load in time.'),
      SCRIPT_TIMEOUT_MS,
    );

    const existing = document.getElementById(SCRIPT_ID);
    const script =
      existing instanceof HTMLScriptElement ? existing : document.createElement('script');

    script.addEventListener('load', succeed);
    script.addEventListener('error', () => {
      clearTimeout(timer);
      fail('Google Identity Services could not be loaded.');
    });

    if (existing) return;

    script.id = SCRIPT_ID;
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;

    document.head.appendChild(script);
  });

  return scriptPromise;
}

type ButtonState = 'checking' | 'ready' | 'unavailable';

export interface GoogleSignInButtonProps {
  /** Called with the opaque credential. Nothing here inspects it. */
  onCredential(credential: string): void | Promise<void>;
  /** True while the *application* is exchanging a credential for a session. */
  readonly busy?: boolean;
}

export function GoogleSignInButton({ onCredential, busy = false }: GoogleSignInButtonProps) {
  const [state, setState] = useState<ButtonState>('checking');
  const [message, setMessage] = useState<string | null>(null);
  const slotRef = useRef<HTMLDivElement>(null);

  /*
   * Held in a ref so the effect below does not re-run — and re-render Google's button —
   * every time the parent re-renders with a new callback identity.
   */
  const onCredentialRef = useRef(onCredential);
  useEffect(() => {
    onCredentialRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function initialise() {
      const config = await fetchAuthConfig(controller.signal);
      if (cancelled) return;

      if (!config.success || !config.data.googleEnabled || !config.data.googleClientId) {
        // The ordinary local case. The button still renders; pressing it explains.
        setState('unavailable');
        return;
      }

      try {
        await loadGoogleScript();
      } catch {
        if (!cancelled) setState('unavailable');
        return;
      }

      if (cancelled || !slotRef.current || !window.google) {
        if (!cancelled) setState('unavailable');
        return;
      }

      window.google.accounts.id.initialize({
        client_id: config.data.googleClientId,
        callback: (response) => {
          if (response.credential) void onCredentialRef.current(response.credential);
        },
        cancel_on_tap_outside: true,
      });

      window.google.accounts.id.renderButton(slotRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        shape: 'rectangular',
        text: 'continue_with',
        logo_alignment: 'left',
        // Matches the form's own width so the two sit in one column.
        width: Math.min(slotRef.current.offsetWidth || 360, 400),
      });

      setState('ready');
    }

    void initialise();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  /*
   * Worded to be true on both pages. It used to say "use your email address and password",
   * which is advice a visitor on `/signup` cannot take — they do not have a password yet,
   * they are about to choose one. It points at the form instead, which is directly above
   * this button in the panel either way.
   */
  const explain = useCallback(() => {
    setMessage(
      'Google sign-in is not available here yet. Use the email address and password form above instead — it does exactly the same thing.',
    );
  }, []);

  return (
    <div className={styles['wrapper']}>
      {/*
       * The slot Google renders into. Kept mounted in every state so the layout does
       * not shift when the script arrives, and hidden from assistive technology while
       * it is empty.
       */}
      <div
        ref={slotRef}
        className={styles['slot']}
        data-state={state}
        {...(state === 'ready' ? {} : { 'aria-hidden': true })}
      />

      {state !== 'ready' ? (
        <button
          type="button"
          className={styles['fallback']}
          onClick={explain}
          disabled={busy || state === 'checking'}
          aria-describedby={message ? 'google-signin-message' : undefined}
        >
          <GoogleMark />
          <span>{state === 'checking' ? 'Loading Google sign-in…' : 'Continue with Google'}</span>
        </button>
      ) : null}

      {busy && state === 'ready' ? (
        <p className={styles['status']} role="status">
          Signing you in…
        </p>
      ) : null}

      {message ? (
        <p id="google-signin-message" className={styles['message']} role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The Google "G", inline.
 *
 * Inline rather than an `<img>` from Google's CDN for two reasons: the content security
 * policy in `vercel.json` does not allow remote images, and a mark that has to be
 * fetched is a mark that is missing on the first paint of a sign-in page.
 */
function GoogleMark() {
  return (
    <svg
      className={styles['mark']}
      viewBox="0 0 18 18"
      width="18"
      height="18"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.02-3.7H.96v2.34A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.98 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.02-2.34Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.94l3.02 2.34C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}
