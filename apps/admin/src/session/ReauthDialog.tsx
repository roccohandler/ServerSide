import { useState } from 'react';
import { Button, Modal, PasswordField } from '@jobforge/ui';
import { Notice } from '../components/Notice';
import { useAdminSession } from './useAdminSession';
import styles from './ReauthDialog.module.css';

/*
 * ============================================================================
 * SIGN IN AGAIN WITHOUT LOSING THE CONSOLE
 * ============================================================================
 *
 * The customer application has its own copy of this dialog, and this is another instance of
 * the arrangement DECISION 026 describes — the *behaviour* is shared through the session
 * contract, the dialog is not. What differs here is one thing and it is not cosmetic:
 * `signIn` on this side refuses an account without the console capability, so this dialog
 * can be handed correct credentials and still have to say no.
 *
 * It renders that refusal as what it is: "That account is not an owner account." Not
 * "invalid password", because lying to somebody who authenticated successfully sends them
 * off to reset a password that already works.
 *
 * What is at stake is different too. The customer's half-typed thing is a change request;
 * the owner's is usually a reply to a prospect who has been waiting since Tuesday, in a box
 * that `useUnsavedChanges` is already protecting against a reload. This protects the same
 * text against the cookie expiring, which is the case a reload warning cannot see.
 *
 * The request that discovered the expiry is lost and the dialog says so. See the note in the
 * customer application's copy for why replaying it would be worse than losing it.
 * ============================================================================
 */

export function ReauthDialog() {
  const { reauthNeeded, state, signIn, endReauth, abandonReauth } = useAdminSession();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const email = state.status === 'signedIn' ? state.identity.email : null;

  if (!reauthNeeded || !email) return null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !email) return;

    setBusy(true);
    setError(null);
    const message = await signIn(email, password);
    setBusy(false);

    if (message) {
      setError(message);
      return;
    }

    setPassword('');
    endReauth();
  }

  return (
    <Modal
      open
      title="Your session ended"
      /* Escape is the give-up path, not a dismissal — a console left visible behind a closed
         dialog would be every control present and nothing working, which is the state this
         replaced. */
      onClose={() => void abandonReauth()}
      footer={
        <div className={styles['actions']}>
          <Button type="submit" form="console-reauth" loading={busy}>
            Sign in
          </Button>
          <Button type="button" variant="ghost" onClick={() => void abandonReauth()}>
            Sign out instead
          </Button>
        </div>
      }
    >
      <p className={styles['lede']}>
        Signed out after thirty days. The console is still here — whatever you were just doing did
        not go through, so try it again once you are back in.
      </p>

      <form id="console-reauth" onSubmit={(event) => void submit(event)} className={styles['form']}>
        <p className={styles['who']}>
          Signing back in as <strong>{email}</strong>
        </p>

        <PasswordField
          id="console-reauth-password"
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
