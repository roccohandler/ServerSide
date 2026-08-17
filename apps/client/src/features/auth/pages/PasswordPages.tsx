import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@jobforge/ui';
import { PasswordField, TextField } from '@jobforge/ui';
import { routes } from '../../../config/routes';
import { findPageMeta } from '../../../content';
import { useDocumentMeta } from '../../../hooks/useDocumentMeta';
import type { ApiFailure, PublicUser } from '@jobforge/shared';
import {
  PASSWORD_HINT,
  validateField,
  type CredentialErrors,
  type CredentialValues,
} from '../components/credentialSteps';
import { useAuth } from '../../../session';
import { authApi } from '../../../session';
import styles from '../components/AuthShell.module.css';

/*
 * The three pages that hang off a link in an email.
 *
 * Kept in one file because each is a form, a request and one of three outcomes, and
 * three files of forty lines each would be three places to make the same mistake about
 * what a token is. None of them is reachable from the site's navigation; all three are
 * reached by clicking something in an inbox.
 */

function useTokenFromUrl(): string {
  const [params] = useSearchParams();
  return params.get('token') ?? '';
}

interface PanelProps {
  readonly title: string;
  /**
   * Set on a panel that has *replaced* something — a form that was submitted, a request
   * that resolved. Left off for the panel a page simply renders on arrival, which has
   * replaced nothing and so has nothing to announce.
   */
  readonly outcome?: 'success' | 'failure';
  readonly children: React.ReactNode;
}

/*
 * No `Section`/`Container` wrapper — see the note in `AuthShell`, which this mirrors.
 *
 * ## Why an outcome is more than a different heading
 *
 * All three pages answer by swapping the whole panel: the form goes, "Check your inbox"
 * arrives. On screen that is unmissable. To anybody not looking at the screen it was
 * nothing at all — the button they pressed was destroyed, so focus fell to `<body>`, and
 * the sentence that replaced it was ordinary text with nothing to make a screen reader
 * read it out. A password reset that silently succeeds is indistinguishable from one that
 * silently failed.
 *
 * So an outcome panel does what `ContactForm` and `AuditSend` already do with theirs: it
 * takes focus, which both reports the result and leaves the reader somewhere real, and it
 * carries a live role so the swap is announced even if focus were to move elsewhere first.
 * `alert` for a failure and `status` for a success, because one interrupts and the other
 * waits its turn.
 */
function Panel({ title, outcome, children }: PanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (outcome) panelRef.current?.focus();
  }, [outcome]);

  return (
    <div className={styles['panelOuter']}>
      {/*
       * Keyed on the title, so an outcome arrives as a new element rather than as the old
       * one with its children swapped. A live region has to be in the document *before*
       * its contents change for the change to be announced; React would otherwise keep
       * this node and mutate it in place, which is the case that goes unread.
       */}
      <div
        key={title}
        ref={panelRef}
        className={styles['panel']}
        {...(outcome ? { tabIndex: -1, role: outcome === 'failure' ? 'alert' : 'status' } : {})}
      >
        <h1 id="auth-heading" className={styles['title']}>
          {title}
        </h1>
        {children}
      </div>
    </div>
  );
}

function FailureNote({ failure }: { readonly failure: ApiFailure | null }) {
  if (!failure) return null;
  return (
    <p className={styles['notice']} role="alert">
      {failure.error.message}
    </p>
  );
}

/* ------------------------------------------------------------ forgot password */

const forgotMeta = findPageMeta(routes.forgotPassword);

/**
 * `/forgot-password`.
 *
 * Answers the same thing whether or not the address is registered, because the server
 * does — a form that says "no account with that address" is a membership oracle anybody
 * can query. The confirmation is deliberately worded as a conditional.
 */
export function ForgotPasswordPage() {
  useDocumentMeta(
    forgotMeta ?? { path: routes.forgotPassword, title: 'Reset your password', description: '' },
  );

  const prefix = useId();
  const [params] = useSearchParams();
  /*
   * Seeded from `?email=`, which the sign-in page's reset link carries.
   *
   * Somebody arriving here has just typed their address into the field above the one that
   * rejected them. Asking for it again is the form admitting it was not paying attention.
   */
  const [email, setEmail] = useState(() => params.get('email')?.trim() ?? '');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [failure, setFailure] = useState<ApiFailure | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setFailure(null);

    const result = await authApi.requestPasswordReset(email.trim());
    setBusy(false);

    if (result.success) setSent(true);
    else setFailure(result);
  }

  if (sent) {
    return (
      <Panel title="Check your inbox" outcome="success">
        <p className={styles['lede']}>
          If that address has an account, a link to choose a new password is on its way. It works
          for one hour.
        </p>
        <p className={styles['footer']}>
          <Link to={routes.login}>Back to sign in</Link>
        </p>
      </Panel>
    );
  }

  return (
    <Panel title="Reset your password">
      <p className={styles['lede']}>
        Enter the address you signed up with and we will send you a link.
      </p>

      <FailureNote failure={failure} />

      <form onSubmit={handleSubmit} noValidate>
        <TextField
          id={`${prefix}-email`}
          label="Email address"
          /* `name`, because `id` is generated per render tree and a password manager
             matches on the stable one. Same reason as the fields on the reset page. */
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          error={failure?.error.fields?.['email']}
          onChange={(event) => setEmail(event.target.value)}
        />
        <div className={styles['submit']}>
          {/* `aria-disabled`, not `disabled` — see the note on the same button in
              `CredentialForm`. `handleSubmit` returns early on `busy`. */}
          <Button type="submit" size="lg" block aria-disabled={busy || undefined}>
            {busy ? 'Sending…' : 'Send me a link'}
          </Button>
        </div>
      </form>

      <p className={styles['footer']}>
        <Link to={routes.login}>Back to sign in</Link>
      </p>
    </Panel>
  );
}

/* ------------------------------------------------------------- reset password */

const resetMeta = findPageMeta(routes.resetPassword);

/**
 * `/reset-password?token=…`.
 *
 * Completing a reset revokes every session, including any an attacker held — so this
 * deliberately does *not* sign anybody in. They choose a password and then use it.
 */
export function ResetPasswordPage() {
  useDocumentMeta(
    resetMeta ?? { path: routes.resetPassword, title: 'Choose a new password', description: '' },
  );

  const prefix = useId();
  const token = useTokenFromUrl();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [done, setDone] = useState(false);

  /*
   * The same two checks the sign-up form makes, from the same module.
   *
   * Choosing a password here and choosing one at sign-up are the same act, and a rule that
   * is enforced in one place and not the other is a rule somebody meets twice and is
   * surprised by once. `validateField` is shared rather than reimplemented for exactly
   * that reason — including the confirmation, which matters more here than at sign-up:
   * somebody resetting a password is often doing it because they mistyped one before.
   */
  const [localErrors, setLocalErrors] = useState<CredentialErrors>({});

  const values: CredentialValues = {
    email: '',
    name: '',
    businessName: '',
    password,
    confirmPassword,
  };

  const blur = (field: 'password' | 'confirmPassword') => () => {
    const message = validateField(field, values, 'signup');
    setLocalErrors((current) => {
      const next = { ...current };
      if (message) next[field] = message;
      else delete next[field];
      return next;
    });
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const problems: CredentialErrors = {};
    for (const field of ['password', 'confirmPassword'] as const) {
      const message = validateField(field, values, 'signup');
      if (message) problems[field] = message;
    }

    if (Object.keys(problems).length > 0) {
      setLocalErrors(problems);
      return;
    }

    setBusy(true);
    setFailure(null);
    setLocalErrors({});

    const result = await authApi.confirmPasswordReset({ token, password });
    setBusy(false);

    if (result.success) setDone(true);
    else setFailure(result);
  }

  if (!token) {
    return (
      <Panel title="That link is incomplete">
        <p className={styles['lede']}>
          The address is missing its token. Open the link from the email again, or{' '}
          <Link to={routes.forgotPassword}>ask for a new one</Link>.
        </p>
      </Panel>
    );
  }

  if (done) {
    return (
      <Panel title="Password changed" outcome="success">
        <p className={styles['lede']}>
          Every device signed out, including any you did not recognise. Sign in with your new
          password.
        </p>
        <Button size="lg" block onClick={() => navigate(routes.login)}>
          Go to sign in
        </Button>
      </Panel>
    );
  }

  return (
    <Panel title="Choose a new password">
      <FailureNote failure={failure} />

      {/*
       * ## What a password manager can and cannot be told here
       *
       * Both fields carry a `name`. They had none, and `id` is generated by `useId` — it
       * changes with the render tree, so a manager matching on it learns nothing that will
       * still be true next time. `name` is the stable handle, and the two names are the
       * ones the sign-up form already uses for the same two fields.
       *
       * What is *not* here is a username field, and its absence is deliberate rather than
       * an omission. A manager wants one beside a `new-password` field so it knows which
       * saved entry to update, and every guide says to supply one. This page cannot: it is
       * reached from a link in an email carrying an opaque single-use token, the server
       * answers it with nothing but success or failure, and there is no point in the flow
       * at which the address is known. Putting it in the link instead would leak it into
       * the URL, the referrer and the browser history to save a manager one guess.
       *
       * Both fields being `new-password` is correct and not the duplication it looks like:
       * that is the pairing browsers read as "password and confirmation", which is what
       * stops one being offered the other's saved value.
       */}
      <form onSubmit={handleSubmit} noValidate>
        <PasswordField
          id={`${prefix}-password`}
          label="New password"
          name="password"
          autoComplete="new-password"
          required
          hint={PASSWORD_HINT}
          value={password}
          error={localErrors['password'] ?? failure?.error.fields?.['password']}
          onBlur={blur('password')}
          onChange={(event) => setPassword(event.target.value)}
        />

        <PasswordField
          id={`${prefix}-confirm`}
          label="Type it again"
          name="confirmPassword"
          autoComplete="new-password"
          required
          value={confirmPassword}
          error={localErrors['confirmPassword']}
          onBlur={blur('confirmPassword')}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />

        <div className={styles['submit']}>
          {/* `aria-disabled`, not `disabled` — see `CredentialForm`. */}
          <Button type="submit" size="lg" block aria-disabled={busy || undefined}>
            {busy ? 'Saving…' : 'Save my new password'}
          </Button>
        </div>
      </form>
    </Panel>
  );
}

/* -------------------------------------------------------------- verify email */

const verifyMeta = findPageMeta(routes.verifyEmail);

/**
 * `/verify-email?token=…`.
 *
 * Runs on mount rather than behind a button: the click already happened, in the email.
 * Asking somebody to confirm that they meant to confirm is a step that exists only
 * because it was easier to build.
 */
export function VerifyEmailPage() {
  useDocumentMeta(
    verifyMeta ?? { path: routes.verifyEmail, title: 'Confirm your email', description: '' },
  );

  const token = useTokenFromUrl();
  const { setUser, status } = useAuth();
  const [state, setState] = useState<'working' | 'done' | 'failed'>('working');
  const [message, setMessage] = useState('');
  const [confirmed, setConfirmed] = useState<PublicUser | null>(null);

  useEffect(() => {
    // A missing token is answered during render below rather than by setting state
    // here — it is knowable without asking the server, so there is nothing to wait for.
    if (!token) return;

    let cancelled = false;

    void authApi.verifyEmail(token).then((result) => {
      if (cancelled) return;

      if (result.success) {
        setConfirmed(result.data.user);
        setState('done');
        return;
      }

      setState('failed');
      setMessage(result.error.message);
    });

    return () => {
      cancelled = true;
    };
  }, [token]);

  /*
   * ==========================================================================
   * A LINK IN AN INBOX IS NOT A CREDENTIAL
   * ==========================================================================
   *
   * `POST /api/auth/verify-email` answers with a user and deliberately sets no session
   * cookie: anybody holding the message can click the link, including whoever a forwarded
   * copy of it reaches, so the click proves the address receives mail and nothing else.
   *
   * This page used to hand that user straight to `setUser`, and `AuthContext.setUser`
   * forces `status: 'authenticated'`. The result was a browser that believed it was signed
   * in with no cookie behind it — offered "Go to my dashboard", waved through by
   * `RequireAuth`, and then answered 401 by every `/api/app/*` request on the other side.
   * An anonymous visitor was shown a broken dashboard instead of a sign-in form.
   *
   * So the returned user is adopted only where there is already a session for it to
   * update, which is the case it was written for: somebody who already has one in this
   * tab, whose header and dashboard should stop asking them to confirm an address they
   * have just confirmed. Everybody else stays anonymous and gets the "Sign in" branch
   * below.
   *
   * It is a second effect rather than a test inside the first because the provider's own
   * `/api/auth/me` is in flight at the same time as this request and either can land
   * first. Keyed on `status`, this adopts as soon as a session is known to exist. Keeping
   * `status` out of the fetching effect's dependencies is the point: re-running that
   * effect would POST the token again, and the token is single-use, so the second answer
   * would be a failure screen for a verification that had already worked.
   * ==========================================================================
   */
  useEffect(() => {
    if (confirmed && status === 'authenticated') setUser(confirmed);
  }, [confirmed, setUser, status]);

  if (!token) {
    return (
      <Panel title="That link is incomplete">
        <p className={styles['lede']}>
          The address is missing its token. Open the link from the email again, or{' '}
          <Link to={routes.login}>sign in</Link> and ask for a new one from your account page.
        </p>
      </Panel>
    );
  }

  if (state === 'working') {
    return (
      <Panel title="Confirming your email address">
        <p className={styles['lede']} role="status">
          One moment…
        </p>
      </Panel>
    );
  }

  if (state === 'done') {
    return (
      <Panel title="Email confirmed" outcome="success">
        <p className={styles['lede']}>
          Thank you — that is everything. You will get updates about your website as they happen.
        </p>
        <Link className={styles['footer']} to={status === 'authenticated' ? '/app' : routes.login}>
          {status === 'authenticated' ? 'Go to my dashboard' : 'Sign in'}
        </Link>
      </Panel>
    );
  }

  return (
    <Panel title="That link did not work" outcome="failure">
      <p className={styles['lede']}>{message}</p>
      <p className={styles['footer']}>
        <Link to={routes.login}>Sign in</Link> and ask for a new one from your account page.
      </p>
    </Panel>
  );
}
