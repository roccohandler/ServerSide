import { cloneElement, useId, useState, type ReactElement, type ReactNode } from 'react';
import { cx } from './cx';
import styles from './Tooltip.module.css';

/*
 * ============================================================================
 * A DEFINITION, NOT A PLACE TO PUT THINGS
 * ============================================================================
 *
 * Landing without a consumer — DECISION 029.
 *
 * ## What a tooltip may contain, and it is one thing
 *
 * A short clarification of the control it is attached to. Never a link, never a button, never
 * anything a person has to *reach* — because reaching for it is the failure mode: a tooltip
 * that appears on hover disappears the moment the pointer travels toward it, and one that
 * contains a link is a link a keyboard user cannot get to at all.
 *
 * If content needs to be interacted with, it is a popover or a dialog and this is the wrong
 * component. That is the whole reason `design-system.md` §7 still lists Popover as absent.
 *
 * ## Never hover-only
 *
 * `onFocus` as well as `onMouseEnter`, always. A tooltip a keyboard cannot summon is a
 * tooltip that does not exist for a large fraction of the people it was written for, and
 * hover does not exist on a touchscreen at all.
 *
 * ## `aria-describedby`, not `aria-label`
 *
 * A label *replaces* the control's name; a description is read after it. "Deposit, the half
 * paid up front to start the build" is right. `aria-label` would have made the control's name
 * the tooltip text and lost the word Deposit entirely.
 *
 * The tip is rendered whether or not it is visible, so `aria-describedby` always resolves —
 * a description pointing at an element that is not in the DOM is silently nothing, which is
 * the quietest way to have no tooltip while appearing to have one.
 * ============================================================================
 */

export interface TooltipProps {
  /** The clarification. Text only — see the note above about why. */
  readonly tip: ReactNode;
  /**
   * The control being described. Receives `aria-describedby` and the four handlers.
   *
   * A single element rather than arbitrary children, because the description has to attach to
   * something focusable and a wrapper `<span>` is not.
   */
  readonly children: ReactElement<{
    'aria-describedby'?: string;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    onFocus?: () => void;
    onBlur?: () => void;
  }>;
  readonly className?: string;
}

export function Tooltip({ tip, children, className }: TooltipProps) {
  const id = useId();
  const [shown, setShown] = useState(false);

  /*
   * `cloneElement` so the described control keeps its own identity and position — a wrapper
   * around it would change the layout of whatever it sits in. This is the case `cloneElement`
   * exists for: augmenting one child with props it already declares.
   *
   * The child's own handlers are called first, so a control that was already doing something
   * on focus keeps doing it.
   */
  const described = cloneElement(children, {
    'aria-describedby': id,
    onMouseEnter: () => {
      children.props.onMouseEnter?.();
      setShown(true);
    },
    onMouseLeave: () => {
      children.props.onMouseLeave?.();
      setShown(false);
    },
    onFocus: () => {
      children.props.onFocus?.();
      setShown(true);
    },
    onBlur: () => {
      children.props.onBlur?.();
      setShown(false);
    },
  });

  return (
    <span className={cx(styles['wrap'], className)}>
      {described}

      {/*
       * Always in the DOM so `aria-describedby` always resolves; hidden from sight only. A
       * description pointing at an element that is not rendered is silently nothing.
       *
       * `role="tooltip"` names what it is. No live region: a description that announced
       * itself on every hover would interrupt the reader constantly, and it is already read
       * as part of the control it describes.
       */}
      <span id={id} role="tooltip" className={cx(styles['tip'], shown && styles['tipShown'])}>
        {tip}
      </span>
    </span>
  );
}
