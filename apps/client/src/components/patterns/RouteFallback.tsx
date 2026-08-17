import { useDelayedFlag } from '@jobforge/ui';
import styles from './RouteFallback.module.css';

/*
 * ============================================================================
 * WHAT A ROUTE LOOKS LIKE WHILE IT IS STILL ARRIVING
 * ============================================================================
 *
 * Five `<Suspense fallback={null}>` boundaries and two `return null` guards rendered nothing
 * at all while a chunk or a session check was in flight. Every one of them carried the same
 * argument, and the argument was right:
 *
 *   "The chunk is small and same-origin, so it lands in a frame or two on any real
 *    connection, and a spinner that appears for 30ms is more distracting than nothing."
 *
 * That is a statement about a warm cache on a good connection, applied to every case. On a
 * cold cache, on a phone connection, or on the first visit after a deploy, the same code
 * produces a blank content area for as long as it takes — with the header and footer still
 * painted around a hole, which reads as a broken page rather than a loading one.
 *
 * So the fast path is preserved exactly: `useDelayedFlag` returns false for the first 400ms
 * and this renders `null`, which is what these boundaries did before. Past that, something
 * appears and is announced.
 *
 * ## Why this one is eager, when everything else in this plan is not
 *
 * `SiteLayout` is in the eager bundle, so its fallback has to be too. A fallback that arrives
 * in a chunk is a fallback that was not there while the chunk was slow — which is the only
 * situation it exists for. It is about three hundred bytes and it is the only eager cost in
 * the customer-portal work.
 * ============================================================================
 */

export interface RouteFallbackProps {
  /**
   * What is being waited for, for a screen reader. Never shown: the point is that the reader
   * hears "Loading the page" while everybody else sees the bars.
   */
  readonly label?: string;
}

export function RouteFallback({ label = 'Loading' }: RouteFallbackProps) {
  /*
   * `true` unconditionally: this component only exists while something is pending, because
   * React unmounts a Suspense fallback the moment its boundary resolves. The delay is
   * therefore measured from the moment the wait began, which is exactly right.
   */
  const show = useDelayedFlag(true);

  if (!show) return null;

  return (
    <div className={styles['fallback']}>
      {/*
       * `role="status"` and not `role="alert"`: a page taking a moment is not something to
       * interrupt somebody mid-sentence about. `aria-live` is implicit in the role, and the
       * region is mounted at the same time as its text — normally the mistake that stops an
       * announcement, and safe here precisely because the whole element is new to the tree.
       */}
      <p className="visually-hidden" role="status">
        {label}
      </p>
      <div aria-hidden="true" className={styles['bar']} />
      <div aria-hidden="true" className={styles['barShort']} />
    </div>
  );
}
