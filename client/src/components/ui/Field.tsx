import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
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
  return [styles['control'], error ? styles['controlInvalid'] : undefined, extra]
    .filter(Boolean)
    .join(' ');
}

/* ------------------------------------------------------------------ TextField */

export type TextFieldProps = Omit<FieldShellProps, 'children'> &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'className'>;

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
