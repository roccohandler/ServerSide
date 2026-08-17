import {
  useState,
  type ComponentPropsWithRef,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cx } from './cx';
import { Icon } from './Icon';
import styles from './Field.module.css';

/*
 * Accessible form controls.
 *
 * Every control gets a real <label>, and hints and error messages are wired up through
 * `aria-describedby` so a screen reader announces them as part of the field rather than
 * as loose text somewhere on the page. Errors are never signalled by colour alone: the
 * message carries a hidden "Error:" prefix, an icon, and wording that says what to fix.
 */

interface FieldShellProps {
  readonly id: string;
  readonly label: string;
  readonly hint?: string;
  readonly error?: string;
  /** Text such as "optional". Shown next to the label for fields that may be left blank. */
  readonly optionalLabel?: string;
  readonly children: (describedBy: string | undefined) => ReactNode;
}

function FieldShell({ id, label, hint, error, optionalLabel, children }: FieldShellProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={styles['field']}>
      <label className={styles['label']} htmlFor={id}>
        {label}
        {optionalLabel ? <span className={styles['optional']}>({optionalLabel})</span> : null}
      </label>

      {hint ? (
        <p className={styles['hint']} id={hintId}>
          {hint}
        </p>
      ) : null}

      {children(describedBy)}

      {error ? (
        <p className={styles['error']} id={errorId}>
          <Icon name="alert" size={18} className={styles['errorIcon']} />
          <span>
            <span className="visually-hidden">Error: </span>
            {error}
          </span>
        </p>
      ) : null}
    </div>
  );
}

function controlClassName(error: string | undefined, extra?: string): string {
  return cx(styles['control'], error && styles['controlInvalid'], extra);
}

/* ------------------------------------------------------------------ TextField */

/*
 * `ComponentPropsWithRef` rather than `InputHTMLAttributes`, so a caller can hold a ref to
 * the input itself. The stepped credential form needs it: moving to a step has to put the
 * caret in that step's first field, and validation on submit has to focus the first field
 * it rejected. React 19 passes `ref` as an ordinary prop, so the existing spread carries
 * it through to the element with no `forwardRef` involved.
 */
export type TextFieldProps = Omit<FieldShellProps, 'children'> &
  Omit<ComponentPropsWithRef<'input'>, 'id' | 'className'>;

export function TextField({ id, label, hint, error, optionalLabel, ...input }: TextFieldProps) {
  return (
    <FieldShell {...{ id, label, hint, error, optionalLabel }}>
      {(describedBy) => (
        <input
          {...input}
          id={id}
          className={controlClassName(error)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
        />
      )}
    </FieldShell>
  );
}

/* ------------------------------------------------------------------ PasswordField */

export type PasswordFieldProps = Omit<FieldShellProps, 'children'> &
  Omit<ComponentPropsWithRef<'input'>, 'id' | 'className' | 'type'>;

/**
 * A password input with a show/hide toggle.
 *
 * ## Why a toggle at all
 *
 * The masking is protection against somebody reading over a shoulder, and that threat is
 * real perhaps once in fifty sign-ups. The cost is paid every time: a password typed
 * blind, mistyped, rejected, and retyped — which is the single most common reason people
 * abandon a sign-up form, and the reason the minimum here is twelve characters rather
 * than a short one. Letting somebody check what they typed is the trade almost every
 * password guideline now recommends, and it is theirs to make rather than ours.
 *
 * ## The details that matter
 *
 * The control is a `button`, not a checkbox styled as one, so it is reachable by keyboard
 * and announced as pressable. `aria-pressed` carries the state — a screen reader user has
 * no way to see whether the characters are visible, and the label alone ("Show"/"Hide")
 * only says what pressing it will do next.
 *
 * It starts hidden, always. A field that arrives with a password already legible is a
 * field that has made the shoulder-surfing decision on the visitor's behalf.
 *
 * `autoComplete` is deliberately not defaulted. `new-password` and `current-password` mean
 * different things to a password manager, getting it wrong is what makes a manager offer
 * to sign somebody in with a password they are in the middle of choosing, and there is no
 * safe guess — so every caller states it.
 */
export function PasswordField({
  id,
  label,
  hint,
  error,
  optionalLabel,
  ...input
}: PasswordFieldProps) {
  const [revealed, setRevealed] = useState(false);

  /*
   * The toggle's accessible name carries the field's own label.
   *
   * A constant "Show password" is only safe while there is one of these on screen, and
   * two pages render two: sign-up asks for a password and a confirmation, and so does the
   * reset page. Two buttons with one name doing different things is a coin toss for
   * anybody navigating by button, so each says which password it reveals.
   *
   * The label is dropped where it would only stutter. A field called exactly "Password" is
   * the single-password case by definition — "Show password: Password" would be noise, and
   * "Show password" is already unique on that page.
   */
  const revealName =
    label.trim().toLowerCase() === 'password' ? 'Show password' : `Show password: ${label}`;

  return (
    <FieldShell {...{ id, label, hint, error, optionalLabel }}>
      {(describedBy) => (
        <div className={styles['password']}>
          <input
            {...input}
            id={id}
            type={revealed ? 'text' : 'password'}
            className={controlClassName(error, styles['passwordControl'])}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
          />
          <button
            type="button"
            className={styles['reveal']}
            /*
             * Pressed means "the password is showing". The accessible name stays constant
             * so the state is carried by the attribute rather than by a name that changes
             * under the reader — which is what `aria-pressed` is for. See `revealName`
             * above for why that constant name is built from the field's label.
             */
            aria-pressed={revealed}
            aria-label={revealName}
            onClick={() => setRevealed((current) => !current)}
          >
            <Icon name={revealed ? 'eye-off' : 'eye'} size={18} />
            <span aria-hidden="true">{revealed ? 'Hide' : 'Show'}</span>
          </button>
        </div>
      )}
    </FieldShell>
  );
}

/* ------------------------------------------------------------------ TextAreaField */

export type TextAreaFieldProps = Omit<FieldShellProps, 'children'> &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id' | 'className'>;

export function TextAreaField({
  id,
  label,
  hint,
  error,
  optionalLabel,
  ...textarea
}: TextAreaFieldProps) {
  return (
    <FieldShell {...{ id, label, hint, error, optionalLabel }}>
      {(describedBy) => (
        <textarea
          {...textarea}
          id={id}
          className={controlClassName(error, styles['textarea'])}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
        />
      )}
    </FieldShell>
  );
}

/* ------------------------------------------------------------------ SelectField */

export interface SelectOption {
  readonly value: string;
  readonly label: string;
}

export type SelectFieldProps = Omit<FieldShellProps, 'children'> &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id' | 'className' | 'children'> & {
    readonly options: readonly SelectOption[];
    /** Shown as a disabled first option so the field starts with no answer chosen. */
    readonly placeholder?: string;
  };

export function SelectField({
  id,
  label,
  hint,
  error,
  optionalLabel,
  options,
  placeholder,
  ...select
}: SelectFieldProps) {
  return (
    <FieldShell {...{ id, label, hint, error, optionalLabel }}>
      {(describedBy) => (
        <select
          {...select}
          id={id}
          className={controlClassName(error, styles['select'])}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
        >
          {placeholder ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </FieldShell>
  );
}

/* ------------------------------------------------------------------ RadioGroupField */

export interface RadioGroupFieldProps {
  /** Also the id of the first radio, so an error summary link can jump to the group. */
  readonly id: string;
  readonly name: string;
  readonly label: string;
  readonly hint?: string;
  readonly error?: string;
  readonly options: readonly SelectOption[];
  readonly value: string;
  readonly onChange: (value: string) => void;
}

/**
 * A single-choice question rendered as radios rather than a `<select>`.
 *
 * A dropdown hides its options until tapped, which is the wrong trade when the options
 * *are* the question — someone scanning "what is wrong with my website" should be able
 * to recognise their own situation without opening anything. It also gives every choice
 * a full-width touch target instead of a native picker wheel.
 *
 * `fieldset`/`legend` is what ties the question to its answers for a screen reader; the
 * hint and error are wired to the group through `aria-describedby` so both are read out
 * as part of it.
 */
export function RadioGroupField({
  id,
  name,
  label,
  hint,
  error,
  options,
  value,
  onChange,
}: RadioGroupFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <fieldset className={styles['group']} aria-describedby={describedBy}>
      <legend className={styles['label']}>{label}</legend>

      {hint ? (
        <p className={styles['hint']} id={hintId}>
          {hint}
        </p>
      ) : null}

      <div className={styles['options']}>
        {options.map((option, index) => (
          <label
            key={option.value}
            className={cx(styles['option'], value === option.value && styles['optionChosen'])}
          >
            <input
              type="radio"
              className={styles['radio']}
              id={index === 0 ? id : `${id}-${option.value}`}
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={(event) => onChange(event.target.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>

      {error ? (
        <p className={styles['error']} id={errorId}>
          <Icon name="alert" size={18} className={styles['errorIcon']} />
          <span>
            <span className="visually-hidden">Error: </span>
            {error}
          </span>
        </p>
      ) : null}
    </fieldset>
  );
}

/* ------------------------------------------------------------------ Honeypot */

export interface HoneypotProps {
  readonly name: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
}

/**
 * A decoy input that real visitors never see and never fill in.
 *
 * It is positioned off-screen rather than `display: none`, because some bots skip
 * hidden inputs. `aria-hidden` and `tabIndex={-1}` keep it out of the way of anyone
 * using a screen reader or the keyboard, and `autoComplete="off"` stops a browser
 * filling it in on their behalf — a real person must never trip this.
 */
export function Honeypot({ name, value, onChange }: HoneypotProps) {
  return (
    <div className={styles['honeypot']} aria-hidden="true">
      <label htmlFor={name}>Company fax (leave this field empty)</label>
      <input
        id={name}
        name={name}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        tabIndex={-1}
        autoComplete="off"
      />
    </div>
  );
}
