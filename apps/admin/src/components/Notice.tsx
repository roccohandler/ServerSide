import type { ReactNode, Ref } from 'react';
import { Icon, cx } from '@jobforge/ui';
import styles from './Notice.module.css';

/*
 * ============================================================================
 * SOMETHING HAPPENED, AND HERE IS WHAT
 * ============================================================================
 *
 * One shape for every message this console shows about an operation rather than about a
 * record. It replaces two bespoke class sets — `SignIn.module.css`'s `.error` and
 * `Projects.module.css`'s `.problem` — which were the same object drawn twice, differing in
 * a border, a text colour and whether they carried an icon.
 *
 * Two is under the Rule of Three, and this is extracted anyway. The reason is that the two
 * are not the whole count: the offline notice and the inbox's truncation line are the third
 * and fourth, and they were about to be written as a fifth and sixth bespoke class. The rule
 * is about not inventing an abstraction before the shape is known; the shape is known here,
 * because it already exists twice and the next two are specified.
 *
 * ## The tone decides the role, and that is the whole reason tone is a prop
 *
 * `role="alert"` interrupts a screen reader mid-sentence. That is right for "the server
 * refused this" and wrong for "showing the fifty oldest" — the second is context somebody
 * reads when they get to it, and interrupting them to say it is worse than not saying it.
 * Tying the two together here means no call site can pick a colour and forget the role, or
 * pick the role and get the colour wrong.
 *
 * ## Always focusable, never in the tab order
 *
 * `tabIndex={-1}` on every notice, unconditionally. The sign-in page moves focus to its
 * failure so a keyboard user is not left standing on a button whose label reverted, and
 * that needs a focusable element; making it a prop would mean the one page that needs it is
 * the one page that has to remember. `-1` keeps it out of the tab order, and `global.css`
 * suppresses the ring on a programmatic focus.
 * ============================================================================
 */

export type NoticeTone = 'problem' | 'success' | 'info';

export interface NoticeProps {
  readonly tone: NoticeTone;
  readonly children: ReactNode;
  /** For the one caller that moves focus here — see the note above. */
  readonly ref?: Ref<HTMLDivElement>;
  readonly className?: string;
}

const TONES = {
  problem: { className: 'problem', role: 'alert', icon: 'alert' },
  success: { className: 'success', role: 'status', icon: 'check' },
  info: { className: 'info', role: 'status', icon: null },
} as const;

export function Notice({ tone, children, ref, className }: NoticeProps) {
  const { className: toneClass, role, icon } = TONES[tone];

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role={role}
      className={cx(styles['notice'], styles[toneClass], className)}
    >
      {icon ? <Icon name={icon} size={20} className={styles['icon']} /> : null}
      <div className={styles['body']}>{children}</div>
    </div>
  );
}
