import type { ReactNode, Ref } from 'react';
import { Icon, cx } from '@jobforge/ui';
import styles from './Notice.module.css';

/*
 * ============================================================================
 * SOMETHING HAPPENED, AND HERE IS WHAT
 * ============================================================================
 *
 * One shape for every message the workspace shows *about an operation* — as opposed to
 * `AppState`, which is about the page's own data being absent, failed or still arriving.
 * The two are different objects and stay separate: `AppError` replaces the content, a
 * `Notice` sits beside it.
 *
 * ## This is a consolidation, not an addition
 *
 * Ten of these existed, hand-written, across five stylesheets:
 *
 *   Billing.module.css     .banner ×2 (a Stripe return, a cancelled checkout), .error
 *   StartAssessment…css    .error ×3 (start, request, and the draft recovery)
 *   Project.module.css     .actionError
 *   Dashboard.module.css   .note
 *
 * They differed in a border, a tint, a font size and — the part that mattered — in whether
 * they carried an ARIA role at all. Every one was somebody deciding the same thing again,
 * and the wrong answer is invisible: a `role="status"` that should have been `role="alert"`
 * looks identical and simply fails to interrupt.
 *
 * So this **removes** CSS rather than adding it, which is the only reason a new pattern was
 * defensible at all on a repository with a payload budget. It is also where the offline
 * notice and the expired-session message land without either needing a class of its own.
 *
 * ## Why it is not shared with the console
 *
 * The console has its own, deliberately — DECISION 027, and the same argument `AppState` and
 * `State` already make. This one speaks to a customer on a cream ground; that one speaks to
 * an operator on charcoal. Behaviour is worth one copy and appearance is worth two.
 * ============================================================================
 */

export type NoticeTone = 'problem' | 'success' | 'info';

export interface NoticeProps {
  readonly tone: NoticeTone;
  readonly children: ReactNode;
  /** For a caller that moves focus here after a failed submission. */
  readonly ref?: Ref<HTMLDivElement>;
  readonly className?: string;
}

/*
 * The tone decides the role, and that is the whole reason tone is a prop rather than a
 * class name. `alert` interrupts a screen reader mid-sentence: right for "we could not save
 * that", wrong for "your payment is with Stripe". Tying them together here means no call
 * site can pick a colour and forget the role.
 */
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

export interface NoticeActionProps {
  readonly onClick: () => void;
  readonly children: ReactNode;
}

/**
 * The one control a notice carries inline — "Check again" on the post-checkout banner.
 *
 * It is part of this pattern rather than a primitive because it is a *word in a sentence*
 * that happens to be pressable, not a button: `Button` would put a control with its own
 * padding, weight and hit area in the middle of a paragraph. That is also why it exists here
 * rather than the feature importing `Notice.module.css` — a stylesheet is private to the
 * thing that owns it, and reaching for one across the pattern boundary is the same defect as
 * reaching past a feature's index.
 *
 * A `<button>`, never a link: it re-reads this page's own data rather than going anywhere.
 */
export function NoticeAction({ onClick, children }: NoticeActionProps) {
  return (
    <button type="button" className={styles['action']} onClick={onClick}>
      {children}
    </button>
  );
}
