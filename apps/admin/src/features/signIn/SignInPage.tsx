import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button, PasswordField, TextField } from '@jobforge/ui';
import { Notice } from '../../components/Notice';
import { useAdminSession } from '../../session/useAdminSession';
import { useTitle } from '../../hooks/useTitle';
import styles from './SignIn.module.css';

/**
 * The whole console, when nobody is signed in.
 *
 * It advertises nothing — no product description, no hint about who holds an account, no
 * mention of what is behind it. A staff sign-in page that describes itself is a page
 * somebody probes. What it does say is which surface this is: the charcoal ground, the
 * ember rule and the word "Internal" are the same signature `ConsoleLayout` carries, so an
 * operator with both applications open can tell the two apart *before* typing a password
 * rather than after. See the note at the top of the stylesheet.
 *
 * ## Deliberately not here
 *
 * **No "forgot your password".** The reset flow lives on the customer origin, and linking
 * to it would put a hard-coded URL to another host in a bundle that otherwise needs no
 * configuration at all — the same reason `ConsoleLayout` has no link back to the owner's own
 * workspace. An owner who is locked out resets their password where every other account
 * does, then returns here.
 *
 * **No account creation, and no mention that it is impossible.** Roles are granted by
 * `npm run admin:create --workspace @jobforge/server` and by nothing else.
 */
export function SignInPage() {
  /*
   * "Sign in", not "Owner console — sign in". The page itself advertises nothing about what
   * is behind it, and a title is the one part of a page that shows up in a screenshot, a
   * shared tab list and a browser's history suggestions.
   */
  useTitle('Sign in');

  const { signIn } = useAdminSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errorRef = useRef<HTMLDivElement>(null);

  /*
   * Focus moves to the failure when one arrives.
   *
   * `role="alert"` announces the text to a screen reader, which is half of it. The other
   * half is that the person who pressed the button with the keyboard is otherwise left
   * standing on a control whose label went back to "Sign in", with the reason it failed
   * above them and out of reach. The customer application's `CredentialForm` resolves this
   * the same way, and for the same reason.
   */
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setError(await signIn(email.trim(), password));
    setBusy(false);
  }

  return (
    <div className={styles['page']}>
      <div className={styles['panel']}>
        <div className={styles['bar']}>
          {/*
           * The console's own tab icon, reused. `alt=""` because the word beside it says
           * the same thing — announcing "JobForge console" and then reading "Internal" is
           * the mark being described twice.
           */}
          <img src="/favicon.svg" alt="" className={styles['mark']} width={32} height={32} />
          <span className={styles['barLabel']}>Internal</span>
        </div>

        <div className={styles['body']}>
          <h1 id="sign-in-heading" className={styles['heading']}>
            Owner console
          </h1>
          <p className={styles['lede']}>Sign in with your JobForge account.</p>

          {error ? (
            <Notice tone="problem" ref={errorRef} className={styles['error']}>
              {error}
            </Notice>
          ) : null}

          {/*
           * Named by the heading, which is what makes the form a landmark a screen reader
           * can jump to. `noValidate` turns off the browser's own bubbles so there is one
           * error style; `required` stays on the inputs so assistive technology still
           * announces it.
           */}
          <form
            onSubmit={handleSubmit}
            noValidate
            aria-labelledby="sign-in-heading"
            className={styles['form']}
          >
            <TextField
              id="email"
              label="Email"
              type="email"
              inputMode="email"
              autoComplete="username"
              required
              /*
               * No `autoFocus`, and the lint rule that forbids it is right even here.
               *
               * A staff tool with one field on screen is the strongest case there is for
               * it, and it still costs the same two things: a screen-reader user is moved
               * past the heading that says which console this is before it has been read,
               * and a keyboard user who lands mid-page cannot tell where they are. Saving
               * one Tab, once a day, for one person, is not the trade.
               */
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <PasswordField
              id="password"
              label="Password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {/*
             * `loading`, never `disabled`. A disabled button cannot hold focus, so the
             * browser blurs it the instant the request starts and the keyboard user loses
             * their place mid-submission — along with the label change that is the only
             * thing reporting progress. See `Button.tsx`.
             */}
            <Button type="submit" size="lg" block loading={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
