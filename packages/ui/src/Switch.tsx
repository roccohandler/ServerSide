import { useId } from 'react';
import { cx } from './cx';
import styles from './Switch.module.css';

/*
 * ============================================================================
 * A SETTING THAT TAKES EFFECT WHEN YOU FLIP IT
 * ============================================================================
 *
 * Landing without a consumer — DECISION 029. `PasswordField`'s show/hide control looks like
 * the obvious first one and is deliberately not: it is a `<button>` with `aria-pressed`,
 * which is the right thing for an action that toggles a *view*. This is for a stored setting.
 *
 * ## `role="switch"` on a real checkbox, not a styled `<div>`
 *
 * The input underneath is a genuine `<input type="checkbox">`, visually hidden and fully
 * functional. That is what gets keyboard operation, form participation and the browser's own
 * focus handling for free — every one of which has to be rebuilt, badly, by a `<div>` with a
 * click handler.
 *
 * `role="switch"` on top of it changes only how it is announced: "on" and "off" rather than
 * "checked" and "unchecked", which is what a person reading a settings list expects.
 *
 * ## Switch versus checkbox, which is a real distinction
 *
 * A **checkbox** is a choice you are making, taken with the rest of the form when you submit.
 * A **switch** takes effect the moment you flip it. Getting this the wrong way round produces
 * either a setting that silently did nothing until Save, or a form field that changed
 * something before the visitor was finished deciding.
 *
 * So: if there is a Save button, it is a checkbox. `RadioGroupField` and the `Field` family
 * cover the form cases and this does not overlap them.
 *
 * ## The label is a real label
 *
 * Not `aria-label`. A `<label>` wrapping the control means the words are a click target too,
 * which on a phone is the difference between a 24px switch and a whole row.
 * ============================================================================
 */

export interface SwitchProps {
  readonly checked: boolean;
  readonly label: string;
  /** Shown under the label. Wired through `aria-describedby`, so it is read with the control. */
  readonly hint?: string;
  readonly disabled?: boolean;
  readonly className?: string;
  onChange(checked: boolean): void;
}

export function Switch({ checked, label, hint, disabled, className, onChange }: SwitchProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <div className={cx(styles['field'], className)}>
      <label className={styles['row']} htmlFor={id}>
        <input
          id={id}
          type="checkbox"
          role="switch"
          className={styles['input']}
          checked={checked}
          disabled={disabled}
          aria-describedby={hintId}
          onChange={(event) => onChange(event.target.checked)}
        />

        {/*
         * The track and its thumb. `aria-hidden` because the input beside it already carries
         * every piece of state a reader needs — without this, the switch is announced once as
         * a control and once as an empty group.
         */}
        <span className={styles['track']} aria-hidden="true">
          <span className={styles['thumb']} />
        </span>

        <span className={styles['label']}>{label}</span>
      </label>

      {hint ? (
        <p id={hintId} className={styles['hint']}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
