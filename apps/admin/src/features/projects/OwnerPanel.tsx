import { useState } from 'react';
import { Button, TextField } from '@jobforge/ui';
import type { AdminProjectView } from '@jobforge/shared';
import { InlineConfirm } from '../../components/InlineConfirm';
import styles from './Projects.module.css';

/*
 * ============================================================================
 * WHO CAN SEE THIS PROJECT
 * ============================================================================
 *
 * Attaching an account is not a field write, and this panel is built so it does not read like
 * one. On the server it seeds the onboarding tasks, writes the entry that starts the
 * customer's own history, and emails them what is needed — so the confirmation says so. An
 * operator pressing this on the wrong project sends a stranger an email about somebody else's
 * website, and that is worth one extra press.
 *
 * ## Detaching is confirmed and attaching is not
 *
 * They are asymmetric on purpose. Attaching announces itself immediately — the client gets an
 * email — and a mistake is visible and reversible. Detaching is silent: nothing is sent, and
 * the customer simply finds their project gone the next time they sign in. A silent
 * destructive act is exactly the shape that wants a question in front of it.
 *
 * Nothing is deleted either way. The tasks, the files and the history stay on the project;
 * this changes who can see it.
 * ============================================================================
 */

export interface OwnerPanelProps {
  readonly project: AdminProjectView;
  readonly busy: boolean;
  onAttach(email: string): void;
  onDetach(): void;
}

export function OwnerPanel({ project, busy, onAttach, onDetach }: OwnerPanelProps) {
  const [email, setEmail] = useState('');
  const [confirmingDetach, setConfirmingDetach] = useState(false);

  if (project.ownerUserId) {
    return (
      <div className={styles['panel']}>
        <h2 className={styles['subheading']}>Customer account</h2>
        <p className={styles['muted']}>
          Attached. This project appears in their dashboard, and tasks added here appear as things
          they have to do.
        </p>

        {confirmingDetach ? (
          <InlineConfirm
            question="Detach this account?"
            detail="The project disappears from their dashboard. Nothing is deleted — the tasks, files and history stay here — and they are not told."
            confirmLabel="Yes, detach it"
            busyLabel="Detaching…"
            cancelLabel="Keep it attached"
            busy={busy}
            onConfirm={onDetach}
            onCancel={() => setConfirmingDetach(false)}
          />
        ) : (
          <div className={styles['formActions']}>
            <Button variant="secondary" onClick={() => setConfirmingDetach(true)}>
              Detach account
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles['panel']}>
      <h2 className={styles['subheading']}>Customer account</h2>
      <p className={styles['muted']}>
        None attached, which is why tasks cannot be added. Attaching one starts their onboarding: it
        seeds the five things we need, begins their history, and emails them.
      </p>

      <div className={styles['inlineForm']}>
        <TextField
          id="attach-owner"
          type="email"
          label="Account email"
          hint="They must already have an account. If they do not, ask them to sign up first — this cannot create one."
          value={email}
          disabled={busy}
          onChange={(event) => setEmail(event.target.value)}
        />

        <div className={styles['formActions']}>
          <Button
            loading={busy}
            disabled={email.trim().length === 0}
            onClick={() => onAttach(email.trim())}
          >
            Attach account
          </Button>
        </div>
      </div>
    </div>
  );
}
