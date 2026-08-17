import { Button } from '@jobforge/ui';
import styles from './ShowMore.module.css';

/*
 * ============================================================================
 * THE WAY OUT OF A BOUNDED LIST
 * ============================================================================
 *
 * All three console lists stop at fifty and all three said so. Saying so was the right half
 * of the answer and, on its own, the more annoying one: *"Showing the 50 oldest. There are
 * more waiting"* tells somebody there is a room behind the wall and hands them no door. On
 * the inbox, the thing behind the wall is people waiting for a reply.
 *
 * `ux_completeness_plan.md` argued against a control at this scale — one operator, a handful
 * of rows, a control to build and maintain against a problem that arrives at a few hundred.
 * That was right about the scale and wrong about the shape. It is superseded here, and the
 * reason is that the cost of being *told* about an unreachable remainder is higher than the
 * cost of one button.
 *
 * ## Three states, and the third is the one that matters
 *
 *   more to come      a button, and how many are on screen now
 *   loading more      the same button, busy — never `disabled`, which would drop it out of
 *                     the tab order mid-press. See the note in `Button.tsx`.
 *   nothing behind    **it says so.** A list that simply stops offering a button leaves the
 *                     reader where they started: unsure whether they have seen everybody.
 *
 * That last line is the whole reason this renders something in the complete case rather than
 * returning `null`. It is one sentence, it is only correct because `hasMore` comes from the
 * server rather than from a row count, and it is the sentence somebody is actually looking
 * for when they scroll to the bottom of an inbox.
 *
 * ## What it does not do
 *
 * It does not page. It raises the limit — see the long note in `lib/endpoints.ts` about why
 * an offset window over a merged, continuously-growing list can skip a row, and why the row
 * it skips is the one that matters most.
 * ============================================================================
 */

export interface ShowMoreProps {
  /** How many rows are on screen. Stated rather than implied — see the third state above. */
  readonly showing: number;
  /** From the server. `undefined` means "not known", which renders nothing at all. */
  readonly hasMore: boolean | undefined;
  /** True while the larger page is in flight. */
  readonly busy: boolean;
  readonly onShowMore: () => void;
  /** Plural noun for the rows: "conversations", "projects", "accounts". */
  readonly noun: string;
}

export function ShowMore({ showing, hasMore, busy, onShowMore, noun }: ShowMoreProps) {
  /*
   * A console talking to a server that predates `hasMore` knows nothing, and a claim built
   * from `undefined` would be a guess presented as a fact. Silence is what it had before.
   */
  if (hasMore === undefined) return null;

  if (!hasMore) {
    return (
      <p className={styles['complete']}>
        That is all {showing} {noun}.
      </p>
    );
  }

  return (
    <div className={styles['more']}>
      <p className={styles['count']}>
        Showing {showing} {noun}.
      </p>
      <Button type="button" variant="secondary" loading={busy} onClick={onShowMore}>
        Show more
      </Button>
    </div>
  );
}
