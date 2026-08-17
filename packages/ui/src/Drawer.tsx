import { useEffect, useId, useRef, type ReactNode } from 'react';
import { cx } from './cx';
import { Icon } from './Icon';
import styles from './Drawer.module.css';

/*
 * ============================================================================
 * THE SAME THING AS A MODAL, ARRIVING FROM THE SIDE
 * ============================================================================
 *
 * Also landing without a consumer — DECISION 029, and the same honest note as `Modal`.
 *
 * ## Why it is not a `side` prop on `Modal`
 *
 * That was the first version and it was wrong, for the reason composition rule 1 gives: a
 * prop that switches between two layouts is two components sharing a name. What they share is
 * the *behaviour* — the focus trap, Escape, the scroll lock, returning focus — and what
 * differs is everything a reader can see, plus one thing they cannot:
 *
 *   A modal is centred, bounded and about **one decision**. A drawer is anchored to an edge,
 *   full-height, and about **a body of content or a set of controls** — navigation, a filter
 *   panel, a detail view beside a list. Their maximum sizes, their entrance, their scroll
 *   behaviour and their relationship to the page all follow from that difference.
 *
 * The duplicated forty lines of focus handling are the price, and it is the right price: the
 * alternative is a `useFocusTrap` hook, which is a third exported thing to justify when there
 * are two consumers between them. If a third overlay ever lands, that is the extraction, and
 * the Rule of Three will have earned it rather than predicted it.
 *
 * ## `aria-modal` is still true here
 *
 * A drawer that leaves the page behind operable is a `<aside>`, not this. This traps focus and
 * locks scroll exactly as `Modal` does, so it claims the same thing and the claim holds.
 * ============================================================================
 */

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface DrawerProps {
  readonly open: boolean;
  /** The drawer's accessible name. Rendered as its heading. */
  readonly title: string;
  /** Which edge it is anchored to. `end` is the right in a left-to-right document. */
  readonly side?: 'start' | 'end';
  readonly children: ReactNode;
  readonly className?: string;
  onClose(): void;
}

export function Drawer({ open, title, side = 'end', children, className, onClose }: DrawerProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    opener.current = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = [...(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (!first || !last) {
        event.preventDefault();
        panelRef.current?.focus();
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = previousOverflow;
      opener.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={styles['scrim']} onClick={onClose} role="presentation">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cx(styles['panel'], styles[side], className)}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles['head']}>
          <h2 id={titleId} className={styles['title']}>
            {title}
          </h2>
          <button type="button" className={styles['close']} onClick={onClose}>
            <Icon name="close" size={20} />
            <span className="visually-hidden">Close</span>
          </button>
        </div>

        <div className={styles['body']}>{children}</div>
      </div>
    </div>
  );
}
