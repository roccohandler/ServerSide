import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cx } from './cx';
import styles from './Button.module.css';

/*
 * Buttons and links look alike here but are never interchangeable in the markup.
 * Something that performs an action is a <button>; something that goes somewhere is an
 * <a>. Getting that wrong breaks keyboard behaviour, screen-reader announcements and
 * the browser's own "open in new tab".
 */

export type ButtonVariant = 'primary' | 'secondary' | 'inverse' | 'ghost';
export type ButtonSize = 'md' | 'lg';

interface SharedProps {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly block?: boolean;
  readonly className?: string;
  readonly children: ReactNode;
}

function classesFor({ variant = 'primary', size = 'md', block, className }: SharedProps): string {
  return cx(
    styles['base'],
    styles[variant],
    size === 'lg' && styles['lg'],
    block && styles['block'],
    className,
  );
}

export type ButtonProps = SharedProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> & {
    /**
     * The action this button starts is already running.
     *
     * ## `loading` and `disabled` are not the same thing, and the difference is a bug
     *
     * `disabled` means *not applicable* — there is nothing to submit, a precondition is
     * unmet. `loading` means *temporarily busy* — the thing you asked for is happening.
     * Twenty-seven call sites spelled the second one as the first, and a native `disabled`
     * button is removed from the tab order the instant it becomes disabled. A keyboard
     * user who presses Enter on "Send request" therefore loses focus mid-submit and is
     * returned to the top of the document, with no announcement of what happened — on the
     * one page of this site that has to work.
     *
     * `aria-disabled` keeps the button focusable and still announces it as unavailable,
     * `aria-busy` says why, and the click guard below is what `disabled` was doing for
     * free. `FeedbackThread` shows why both props have to exist: its reply button is busy
     * *or* has an empty box, and those want different words from a screen reader.
     */
    readonly loading?: boolean;
  };

/** Performs an action on the current page. */
export function Button({
  variant,
  size,
  block,
  className,
  children,
  loading,
  onClick,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={rest.type ?? 'button'}
      {...rest}
      className={classesFor({ variant, size, block, className, children })}
      aria-disabled={loading || rest['aria-disabled'] || undefined}
      aria-busy={loading || undefined}
      onClick={(event) => {
        /* `aria-disabled` does not stop activation the way `disabled` does. This does. */
        if (loading) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
    >
      {children}
    </button>
  );
}

export interface ButtonLinkProps extends SharedProps {
  /** Internal route path, or an absolute/`tel:`/`mailto:` URL. */
  readonly to: string;
  /**
   * Fired before navigation. Used to record which call to action was clicked — see
   * `lib/analytics.ts`. Never do anything here that could delay or prevent the
   * navigation itself.
   */
  readonly onClick?: () => void;
}

/** Navigates. Renders a router link for internal paths and a plain anchor otherwise. */
export function ButtonLink({
  to,
  variant,
  size,
  block,
  className,
  children,
  onClick,
}: ButtonLinkProps) {
  const classes = classesFor({ variant, size, block, className, children });
  const isInternal = to.startsWith('/') && !to.startsWith('//');

  if (isInternal) {
    return (
      <Link to={to} className={classes} onClick={onClick}>
        {children}
      </Link>
    );
  }

  const isExternalHttp = /^https?:\/\//i.test(to);

  return (
    <a
      href={to}
      className={classes}
      onClick={onClick}
      {...(isExternalHttp ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {children}
    </a>
  );
}
