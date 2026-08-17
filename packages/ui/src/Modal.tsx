import { useEffect, useId, useRef, type ReactNode } from 'react';
import { cx } from './cx';
import { Icon } from './Icon';
import styles from './Modal.module.css';

/*
 * ============================================================================
 * A DIALOG, AND EVERYTHING THAT MAKES ONE SAFE
 * ============================================================================
 *
 * `design-system.md` §7 said this application contains no modal and that adding one would
 * ship dead CSS. DECISION 029 changed that on the owner's instruction, and the honest
 * statement is that **this lands without a consumer**: nothing in either application opens a
 * dialog today. The amendment to composition rule 6 is narrow — no speculative surface in an
 * *eager* bundle — and the price is paid in `check-budget.ts` rather than argued away.
 *
 * What is not negotiable is that a dialog which exists must be a correct one. A modal is the
 * single most commonly broken component on the web, and every one of the failures below is
 * invisible to the person who built it:
 *
 *   - **Focus escapes.** Tab past the last control and you are behind the dialog, operating a
 *     page you cannot see. The trap below cycles instead.
 *   - **Focus never arrives.** Opening moves focus into the dialog; closing puts it back on
 *     the control that opened it, which is the thing that makes a dialog feel like a
 *     detour rather than a teleport.
 *   - **Escape does nothing.** The one keystroke everybody tries.
 *   - **The page behind scrolls.** On a phone this reads as the dialog sliding away.
 *   - **It is not announced as a dialog.** `role="dialog"` plus `aria-modal` plus a name from
 *     `aria-labelledby` is what tells a screen reader the rest of the page is unavailable —
 *     and that claim is only true because of the trap above.
 *
 * ## Not `<dialog>`
 *
 * The native element does most of this and is genuinely good. It is not used here because its
 * `::backdrop` cannot be styled from a CSS module's scope without `:global`, its
 * top-layer stacking sits outside the `--z-*` scale the token test enforces, and `showModal()`
 * is imperative in a tree that is otherwise declarative. The trade is about forty lines of
 * focus handling against three exceptions to rules this repository enforces by test.
 *
 * ## When to reach for this rather than `InlineConfirm`
 *
 * Almost never. A confirmation belongs in the flow of the page — `InlineConfirm` exists for
 * exactly that and has three consumers. A dialog is for something that genuinely cannot be
 * done in place: a task with its own form, its own errors and its own outcome, where the page
 * underneath would be misleading to interact with.
 * ============================================================================
 */

/** Everything focusable, in document order. Disabled controls are excluded by the selector. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface ModalProps {
  readonly open: boolean;
  /** The dialog's accessible name. Rendered as its heading, so it is never invented twice. */
  readonly title: string;
  readonly children: ReactNode;
  /** Actions, if any. Rendered after the content, where a reader expects them. */
  readonly footer?: ReactNode;
  readonly className?: string;
  onClose(): void;
}

export function Modal({ open, title, children, footer, className, onClose }: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  /** Whatever had focus before this opened, so it can be given back. */
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    opener.current = document.activeElement as HTMLElement | null;

    /*
     * Focus the panel itself rather than its first control. Landing on a button means the
     * dialog's own heading and body are behind the reader's cursor, and they are the part
     * that says what this is; from the panel, everything reads in order.
     */
    panelRef.current?.focus();

    /* The page behind must not scroll. Restored exactly, including an inline value. */
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

      /*
       * Nothing to tab to — the dialog is text and a close button that is somehow gone.
       * Keeping focus on the panel is better than letting it fall out to the page behind,
       * which is what "no focusable children" would otherwise mean.
       */
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
      /*
       * Focus goes back where it came from. Without this it lands on `<body>`, and somebody
       * who opened a dialog from halfway down a long page is returned to the top of it.
       */
      opener.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={styles['scrim']} onClick={onClose} role="presentation">
      {/*
       * `stopPropagation` so a click inside does not close it. The scrim's own handler is a
       * convenience, not the accessible way out — Escape and the close button are, and both
       * work without a pointer.
       */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cx(styles['panel'], className)}
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

        {footer ? <div className={styles['footer']}>{footer}</div> : null}
      </div>
    </div>
  );
}
