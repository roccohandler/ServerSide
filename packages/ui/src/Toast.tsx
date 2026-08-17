import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cx } from './cx';
import { Icon } from './Icon';
import styles from './Toast.module.css';

/*
 * ============================================================================
 * A MESSAGE THAT ARRIVES, WAITS, AND LEAVES
 * ============================================================================
 *
 * Landing without a consumer — DECISION 029. Worth being unusually clear about *why* there is
 * no consumer, because the obvious one was considered and deliberately not taken.
 *
 * Every outcome in both applications is already announced. `useAnnouncerState` and one live
 * region per shell do that, and a toast was rejected for the job on the grounds that it is a
 * *visual* component solving an *announcement* problem — it would have added a stacking
 * layer, dismiss timing and hover-pause to say something the live region already says.
 *
 * So what is this for? The case a live region cannot cover: a message that must **survive a
 * navigation**. "Your reply was sent" while the operator is already on the next screen; "we
 * saved that" after a redirect. Nothing in either application does that today, and the day
 * one does, this is what it reaches for rather than inventing a fifth message treatment.
 *
 * ## The three things a toast gets wrong
 *
 *   1. **It disappears while being read.** Auto-dismiss is a timer racing a human. This one
 *      pauses on hover *and* on focus — focus matters more, because a keyboard user reaching
 *      the dismiss button is exactly the person the timer is about to rob.
 *   2. **It cannot be dismissed.** Every toast here has a real close button. A message that
 *      only time can remove is a message obscuring the corner of the screen.
 *   3. **It is announced twice, or not at all.** This one does **not** carry a live-region
 *      role, and that is deliberate: both applications already own one region each, and two
 *      regions announcing one outcome is worse than none — the reader hears it twice and
 *      stops trusting either. Whatever opens a toast announces through the shell's region.
 *
 * ## `--z-toast` (60), above `--z-modal` (50)
 *
 * A notification about the thing you are doing has to be readable while you are doing it, and
 * a dialog is a thing you are doing. `tokens.css` reserved both numbers in that order.
 * ============================================================================
 */

/** Long enough to read two lines without hurrying, short enough not to be furniture. */
const DEFAULT_DURATION_MS = 6000;

export type ToastTone = 'success' | 'problem' | 'info';

export interface ToastProps {
  readonly open: boolean;
  readonly tone?: ToastTone;
  readonly children: ReactNode;
  /** Milliseconds before it dismisses itself. `null` keeps it until something closes it. */
  readonly duration?: number | null;
  readonly className?: string;
  onClose(): void;
}

const TONES = {
  success: { className: 'success', icon: 'check' },
  problem: { className: 'problem', icon: 'alert' },
  info: { className: 'info', icon: null },
} as const;

export function Toast({
  open,
  tone = 'info',
  children,
  duration = DEFAULT_DURATION_MS,
  className,
  onClose,
}: ToastProps) {
  const [held, setHeld] = useState(false);
  const { className: toneClass, icon } = TONES[tone];

  /*
   * The callback in a ref, so a caller passing an inline arrow does not restart the timer on
   * every render — which would mean a toast that never dismisses on a page that re-renders.
   */
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open || duration === null || held) return;

    const timer = setTimeout(() => close.current(), duration);
    return () => clearTimeout(timer);
  }, [open, duration, held]);

  if (!open) return null;

  return (
    /*
     * No `role="status"` and no `aria-live`. Both applications own exactly one live region
     * each and whatever opened this announces through that — see the note at the top about
     * why two regions is worse than one.
     */
    <div
      className={cx(styles['toast'], styles[toneClass], className)}
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocusCapture={() => setHeld(true)}
      onBlurCapture={() => setHeld(false)}
    >
      {icon ? <Icon name={icon} size={20} className={styles['icon']} /> : null}
      <div className={styles['body']}>{children}</div>

      <button type="button" className={styles['close']} onClick={onClose}>
        <Icon name="close" size={18} />
        <span className="visually-hidden">Dismiss</span>
      </button>
    </div>
  );
}
