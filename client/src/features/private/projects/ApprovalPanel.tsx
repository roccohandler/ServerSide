import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import type { ProjectView } from '../../../types/api';
import styles from './Project.module.css';

/*
 * ============================================================================
 * APPROVAL IS AN ACT, NOT AN OPINION
 * ============================================================================
 *
 * Two buttons, and nothing else on the page can produce either outcome. A comment
 * saying "looks good, ship it" is a comment; approval is this button, and pressing it
 * records who pressed it, when, and what they were looking at.
 *
 * That distinction is worth a confirmation step, and it gets one. Approving is the
 * moment a customer says "put this in front of my customers" — the one irreversible
 * thing on the page — and a mis-tap on a phone should not be able to do it.
 *
 * Requesting changes gets no confirmation. It is reversible, it is the safe direction,
 * and putting a dialog in front of the button somebody presses when they are unhappy is
 * a way to make them more unhappy.
 * ============================================================================
 */

export interface ApprovalPanelProps {
  readonly project: ProjectView;
  readonly busy: boolean;
  onApprove(): void;
  onRequestChanges(): void;
}

export function ApprovalPanel({ project, busy, onApprove, onRequestChanges }: ApprovalPanelProps) {
  const [confirming, setConfirming] = useState(false);

  if (project.approval === 'approved') {
    const when = project.approvedAt ? new Date(project.approvedAt) : null;

    return (
      <section className={styles['panel']} aria-labelledby="approval-heading">
        <h2 id="approval-heading" className={styles['panelTitle']}>
          Approved
        </h2>
        <p className={styles['panelBody']}>
          You approved this website
          {when && !Number.isNaN(when.getTime())
            ? ` on ${when.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}`
            : ''}
          . We are putting it live — you will get an email when it is up.
        </p>
        <p className={styles['panelMeta']}>
          Changed your mind? Ask for changes and we will take it back off the schedule.
        </p>
        <Button variant="secondary" onClick={onRequestChanges} disabled={busy}>
          I would like changes after all
        </Button>
      </section>
    );
  }

  if (!project.previewUrl) {
    return null;
  }

  return (
    <section className={styles['panel']} aria-labelledby="approval-heading">
      <h2 id="approval-heading" className={styles['panelTitle']}>
        Ready to go live?
      </h2>

      <p className={styles['panelBody']}>
        Nothing goes public until you say so. Have a look at the preview, then either approve it or
        tell us what you would like changed.
      </p>

      {confirming ? (
        <div className={styles['confirm']} role="group" aria-labelledby="confirm-heading">
          <p id="confirm-heading" className={styles['confirmBody']}>
            <strong>Approve this website?</strong> We will put it live at your domain and it will be
            public. You can still ask for changes afterwards.
          </p>
          <div className={styles['actions']}>
            <Button onClick={onApprove} disabled={busy}>
              {busy ? 'Approving…' : 'Yes, approve and go live'}
            </Button>
            <Button variant="ghost" onClick={() => setConfirming(false)} disabled={busy}>
              Not yet
            </Button>
          </div>
        </div>
      ) : (
        <div className={styles['actions']}>
          <Button onClick={() => setConfirming(true)} disabled={busy}>
            Approve website
          </Button>
          <Button variant="secondary" onClick={onRequestChanges} disabled={busy}>
            Request changes
          </Button>
        </div>
      )}
    </section>
  );
}
