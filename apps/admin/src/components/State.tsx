import type { ApiFailure } from '@jobforge/shared';
import { Button } from '@jobforge/ui';
import styles from './State.module.css';

/*
 * The three states a console page can be in.
 *
 * The customer portal has its own set of these — `components/patterns/AppState` over in
 * `apps/client` — and they are deliberately **not** shared. That is the one piece of this
 * split where duplication is the right answer, and the reason is the same reason the bar
 * above is charcoal: the two surfaces must not look alike. A shared empty state would put
 * the customer application's voice ("Your website preview is ready") on a screen showing
 * five other businesses' data, and the whole point of the console's chrome is that an
 * operator can tell at a glance which one they are looking at.
 *
 * What *is* shared is `useResource`, which renders nothing. Behaviour is worth one copy;
 * appearance here is worth two.
 */

/** Plain text, not a skeleton. There is nothing to avoid jolting on an internal table. */
export function Loading({ label }: { readonly label: string }) {
  return (
    <p className={styles['loading']} role="status">
      {label}…
    </p>
  );
}

/**
 * A failure, in the server's own words.
 *
 * The likeliest one here is a 404 from `requireAdmin` — a session that has lost its admin
 * role. The message is shown as-is rather than translated into "you are not an admin",
 * because the server is deliberately not saying that and the console should not fill the
 * gap in on its behalf.
 */
export function Failure({
  failure,
  onRetry,
}: {
  readonly failure: ApiFailure;
  readonly onRetry?: () => void;
}) {
  return (
    <div className={styles['failure']} role="alert">
      <p className={styles['failureBody']}>{failure.error.message}</p>
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

/** An empty state that says why it is empty, so it does not read as a bug. */
export function Empty({ title, body }: { readonly title: string; readonly body: string }) {
  return (
    <div className={styles['empty']}>
      <h2 className={styles['emptyHeading']}>{title}</h2>
      <p className={styles['emptyBody']}>{body}</p>
    </div>
  );
}
