import { useId, type ReactNode } from 'react';
import { Button } from '@jobforge/ui';
import styles from './InlineConfirm.module.css';

/*
 * ============================================================================
 * ARE YOU SURE — WITHOUT A DIALOG
 * ============================================================================
 *
 * A question and two buttons, rendered in place of the control that asked it.
 *
 * ## This is not a Modal, and the difference is the point
 *
 * No overlay, no focus trap, no scroll lock, no stacking layer, no portal. It replaces the
 * button that was pressed, in the flow of the page, and everything around it stays reachable
 * — which is right for a confirmation, because the thing somebody most often wants when
 * asked "are you sure?" is to look again at what they were about to do.
 *
 * `ApprovalPanel` invented this shape and its comment is the argument for it: approving is
 * the one irreversible act on the page and a mis-tap on a phone should not be able to do it.
 * Two console actions need the same shape — a milestone change that rewrites what a customer
 * sees, and a reply that leaves as email and cannot be recalled — so this is the third
 * occurrence, which is the bar.
 *
 * ## The question is `role="group"`, not `role="alertdialog"`
 *
 * `alertdialog` promises modality: a screen reader tells the user the rest of the page is
 * unavailable, and it is not. Announcing a constraint that does not exist is worse than
 * announcing nothing — the group is labelled by its own question, which is what a reader
 * needs to know what the two buttons are about.
 * ============================================================================
 */

export interface InlineConfirmProps {
  /** The question, in full. "Approve this website?" — never "Are you sure?". */
  readonly question: ReactNode;
  /** What pressing yes will actually do, in the customer's terms. */
  readonly detail?: ReactNode;
  /** Names the action rather than agreeing. "Yes, approve and go live". */
  readonly confirmLabel: string;
  readonly busyLabel?: string;
  readonly cancelLabel?: string;
  readonly busy?: boolean;
  onConfirm(): void;
  onCancel(): void;
}

export function InlineConfirm({
  question,
  detail,
  confirmLabel,
  busyLabel,
  cancelLabel = 'Not yet',
  busy,
  onConfirm,
  onCancel,
}: InlineConfirmProps) {
  const headingId = useId();

  return (
    <div className={styles['confirm']} role="group" aria-labelledby={headingId}>
      <p id={headingId} className={styles['question']}>
        <strong>{question}</strong>
        {detail ? <> {detail}</> : null}
      </p>

      <div className={styles['actions']}>
        {/*
         * `loading`, never `disabled`, on both. A disabled button leaves the tab order the
         * instant it becomes disabled, so a keyboard user who confirmed with Enter would lose
         * focus mid-request — on the one control in the product built to be pressed
         * deliberately. See `Button.tsx`.
         */}
        <Button onClick={onConfirm} loading={busy}>
          {busy && busyLabel ? busyLabel : confirmLabel}
        </Button>
        <Button variant="ghost" onClick={onCancel} loading={busy}>
          {cancelLabel}
        </Button>
      </div>
    </div>
  );
}
