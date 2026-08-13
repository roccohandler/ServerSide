import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
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
  return [
    styles['base'],
    styles[variant],
    size === 'lg' ? styles['lg'] : undefined,
    block ? styles['block'] : undefined,
    className,
  ]
    .filter(Boolean)
    .join(' ');
}

export type ButtonProps = SharedProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'>;

/** Performs an action on the current page. */
export function Button({ variant, size, block, className, children, ...rest }: ButtonProps) {
  return (
    <button
      type={rest.type ?? 'button'}
      className={classesFor({ variant, size, block, className, children })}
      {...rest}
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
