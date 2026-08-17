import type { ReactNode } from 'react';
import type { ApiFailure } from '@jobforge/shared';
import { Button, ButtonLink, cx } from '@jobforge/ui';
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
 * What the page is about to look like, roughly.
 *
 * `lines` is the default and is what most screens are. `cards` matches the dashboard and the
 * billing page, which are panels rather than paragraphs. `table` exists for a list.
 *
 * Three concrete shapes, not one per screen. `shape="dashboard" | "billing" | "project" | …`
 * is a page list wearing a prop: it grows by one every time a screen is added, and each entry
 * silently stops matching the page it is named after the first time that page is changed.
 */
export type LoadingShape = 'lines' | 'cards' | 'table';

export interface AppLoadingProps {
  readonly label?: string;
  readonly shape?: LoadingShape;
}

/**
 * Deliberately not a spinner.
 *
 * A skeleton of roughly the right shape stops the page jumping when the data arrives,
 * and it does not draw the eye to the fact that something is taking time. `aria-busy`
 * and the status text are what tell a screen reader; the boxes are for everybody else.
 *
 * "Roughly the right shape" was the argument and it was only half kept: one three-box
 * skeleton served eight structurally different screens, so on the dashboard and the two
 * tables it was a shape that guaranteed a jump rather than avoiding one.
 */
export function AppLoading({ label = 'Loading', shape = 'lines' }: AppLoadingProps) {
  return (
    <div className={cx(styles['loading'], styles[shape])} aria-busy="true">
      <p className="visually-hidden" role="status">
        {label}
      </p>

      {/*
       * `aria-hidden`, because these are the shape of the content and not the content. A
       * screen reader gets the status line above and nothing else; without this it would
       * also get three empty group nodes announcing nothing.
       */}
      <div aria-hidden="true" className={styles['blocks']}>
        <div className={styles['block']} />
        <div className={styles['block']} />
        <div className={styles['blockShort']} />
      </div>
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
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
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
      {action ? <ButtonLink to={action.to}>{action.label}</ButtonLink> : null}
      {children}
    </div>
  );
}
