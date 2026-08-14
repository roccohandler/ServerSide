import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { ApiFailure } from '../../../types/api';
import styles from './AppState.module.css';

/*
 * The three states every private page can be in, in one place.
 *
 * They exist as components rather than as copy inside each page because they are the
 * states most likely to be got wrong quietly: a loading screen that never resolves, an
 * error that shows a stack trace, an empty state that reads as a bug. Writing each one
 * once means each one is right everywhere.
 */

/**
 * Deliberately not a spinner.
 *
 * A skeleton of roughly the right shape stops the page jumping when the data arrives,
 * and it does not draw the eye to the fact that something is taking time. `aria-busy`
 * and the status text are what tell a screen reader; the boxes are for everybody else.
 */
export function AppLoading({ label = 'Loading' }: { readonly label?: string }) {
  return (
    <div className={styles['loading']} aria-busy="true">
      <p className="visually-hidden" role="status">
        {label}
      </p>
      <div className={styles['skeleton']} />
      <div className={styles['skeleton']} />
      <div className={styles['skeletonShort']} />
    </div>
  );
}

export interface AppErrorProps {
  readonly failure: ApiFailure;
  readonly onRetry?: () => void;
}

/**
 * A failure a customer can act on.
 *
 * The message comes from the server's `AppError`, which is written for a visitor to
 * read — never a driver error, never a stack frame. A retry is offered because most of
 * what lands here is a network blip.
 */
export function AppError({ failure, onRetry }: AppErrorProps) {
  return (
    <div className={styles['error']} role="alert">
      <h2 className={styles['errorHeading']}>We could not load that</h2>
      <p className={styles['errorBody']}>{failure.error.message}</p>
      {onRetry ? (
        <button type="button" className={styles['retry']} onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  );
}

export interface AppEmptyProps {
  readonly title: string;
  readonly body: string;
  readonly action?: { readonly label: string; readonly to: string };
  readonly children?: ReactNode;
}

/** An empty state that says what to do next, rather than reporting an absence. */
export function AppEmpty({ title, body, action, children }: AppEmptyProps) {
  return (
    <div className={styles['empty']}>
      <h2 className={styles['emptyHeading']}>{title}</h2>
      <p className={styles['emptyBody']}>{body}</p>
      {action ? (
        <Link className={styles['emptyAction']} to={action.to}>
          {action.label}
        </Link>
      ) : null}
      {children}
    </div>
  );
}
