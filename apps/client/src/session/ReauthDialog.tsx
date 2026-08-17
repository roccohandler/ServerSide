import { useState } from 'react';
import { Button, Modal, PasswordField } from '@jobforge/ui';
import { Notice } from '../components/patterns/Notice';
import { useAuth } from './useAuth';
import styles from './ReauthDialog.module.css';

/*
 * ============================================================================
 * SIGN IN AGAIN WITHOUT LOSING THE PAGE
 * ============================================================================
 *
 * A thirty-day rolling cookie expires at whatever moment it expires at, and until now that
 * moment cost the reader everything on screen. The best previous answer sent them to
 * `/login?from=/app/projects/abc`, which returns you to the *route* — and a route remounts
 * empty. Three fields into a change request, that is three fields gone, and the person it
 * happens to has no idea why.
 *
 * So the page stays and this goes over it. See the long note in `useAuth.ts` about why
 * `status` deliberately remains `'authenticated'` for the width of this dialog.
 *
 * ## The email is shown and not asked for
 *
 * `user.email` is still in memory — the session description outlived the session — so the
 * dialog states who it is signing in and asks for one thing. Asking for an address somebody
 * has already given, on a screen full of their own data, reads as a phishing page.
 *
 * ## What happens to the request that discovered the expiry
 *
 * It is lost, and this says so. Replaying it would mean every call site in the application
 * being replayable, and worse, it would silently re-fire a mutation the reader may have
 * changed their mind about in the meantime — a second identical comment, a second approval.
 * "Whatever you were doing did not go through" plus a page that still works is an honest
 * answer somebody can act on; a silent replay is not.
 *
 * ## The way out is the way it used to work
 *
 * "Sign in on the full page" calls `abandonReauth`, which ends the session properly and lets
 * `RequireAuth` do the redirect it always did. That path is not a fallback nobody needs: it
 * is where the password-reset link lives, and somebody who cannot remember their password is
 * exactly who ends up in this dialog.
 * ============================================================================
 */

export function ReauthDialog() {
  const { reauthNeeded, user, login, endReauth, abandonReauth } = useAuth();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!reauthNeeded) return null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !user) return;

    setBusy(true);
    setError(null);
    const result = await login({ email: user.email, password });
    setBusy(false);

    if (!result.success) {
      setError(result.error.message);
      return;
    }

    setPassword('');
    endReauth();
  }

  return (
    <Modal
      open
      title="Your session ended"
      /*
       * `onClose` is the give-up path rather than a dismissal. A dialog that closed on
       * Escape and left the page behind it silently broken would be the exact state this
       * whole change exists to remove — every control present, nothing working.
       */
      onClose={() => void abandonReauth()}
      footer={
        <div className={styles['actions']}>
          <Button type="submit" form="reauth-form" loading={busy}>
            Sign in
          </Button>
          <Button type="button" variant="ghost" onClick={() => void abandonReauth()}>
            Sign in on the full page
          </Button>
        </div>
      }
    >
      <p className={styles['lede']}>
        You have been signed out — sessions end after thirty days. Everything on this page is still
        here; whatever you were just doing did not go through, so try it again once you are back in.
      </p>

      <form id="reauth-form" onSubmit={(event) => void submit(event)} className={styles['form']}>
        <p className={styles['who']}>
          Signing back in as <strong>{user?.email}</strong>
        </p>

        <PasswordField
          id="reauth-password"
          label="Password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        {error ? <Notice tone="problem">{error}</Notice> : null}
      </form>
    </Modal>
  );
}
