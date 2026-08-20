import { useState } from 'react';
import { Button } from '@jobforge/ui';
import type { ProjectView } from '@jobforge/shared';
import { InlineConfirm } from '../../../components/patterns/InlineConfirm';
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

/**
 * Rounds used, said in words.
 *
 * Three states and each says something different. None used is reassurance. Some left is a
 * fact. **None left is deliberately not a refusal** — the terms say further rounds are quoted
 * before the work starts, never that changes stop being possible, and a portal that implied
 * otherwise would be publishing a harder term than the one the client agreed to.
 */
function revisionSentence({ used, included }: { used: number; included: number }): string {
  if (used === 0) {
    return `Asking for changes is expected — ${included} rounds are included, and a round is one list of everything you want changed.`;
  }

  const left = included - used;

  if (left > 0) {
    return `You have used ${used} of your ${included} included revision rounds. A round is one list of everything you want changed, however many things are on it.`;
  }

  return `You have used both included revision rounds. Anything further is still absolutely fine — we will quote it before doing it, never after.`;
}

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
        <Button variant="secondary" onClick={onRequestChanges} loading={busy}>
          I would like changes after all
        </Button>
      </section>
    );
  }

  /*
   * No preview yet.
   *
   * This returned `null`, so the Preview tab and the overview both simply lacked a panel —
   * an absence where an explanation belonged. A customer part-way through a build opened the
   * one page that is about approving their website and found nothing about approving their
   * website, which reads as something missing rather than as something not ready.
   *
   * The heading stays the same as the ready state, deliberately: it is the same section
   * answering the same question, and a customer who checks back should recognise the place
   * rather than wonder whether a new panel has appeared.
   */
  if (!project.previewUrl) {
    return (
      <section className={styles['panel']} aria-labelledby="approval-heading">
        <h2 id="approval-heading" className={styles['panelTitle']}>
          Ready to go live?
        </h2>
        <p className={styles['panelBody']}>
          Not yet — there is nothing to look at so far. When your preview is ready it appears here,
          along with the two buttons that decide what happens next.
        </p>
        <p className={styles['panelMeta']}>
          We email you the moment it is ready. Nothing goes public until you say so.
        </p>
      </section>
    );
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

      {/*
       * ======================================================================
       * WHICH ROUND THEY ARE ON
       * ======================================================================
       *
       * The site publishes "two revision rounds" in four places and the terms define one as a
       * consolidated list of changes. The portal said nothing at all — so a client had no way
       * to tell whether they had used one, which is exactly where the argument about it
       * starts, and it starts at the worst possible moment: after the second one.
       *
       * The count and the allowance both come from the server (`project.revisions`), so the
       * figure on this screen cannot drift from the one the site publishes.
       *
       * Written as a sentence rather than "1/2", because a fraction beside a button is a
       * budget somebody starts economising against — and asking for changes is the thing this
       * panel most wants them to do when the site is not right yet.
       */}
      <p className={styles['panelMeta']}>{revisionSentence(project.revisions)}</p>

      {confirming ? (
        <InlineConfirm
          question="Approve this website?"
          detail="We will put it live at your domain and it will be public. You can still ask for changes afterwards."
          confirmLabel="Yes, approve and go live"
          busyLabel="Approving…"
          busy={busy}
          onConfirm={onApprove}
          onCancel={() => setConfirming(false)}
        />
      ) : (
        <div className={styles['actions']}>
          <Button onClick={() => setConfirming(true)} loading={busy}>
            Approve website
          </Button>
          <Button variant="secondary" onClick={onRequestChanges} loading={busy}>
            Request changes
          </Button>
        </div>
      )}
    </section>
  );
}
