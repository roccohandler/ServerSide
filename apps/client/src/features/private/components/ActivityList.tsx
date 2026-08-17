import type { ActivityView } from '@jobforge/shared';
import { Badge, Card } from '@jobforge/ui';
import styles from './Cards.module.css';

/** "3 days ago" rather than a date: on a stream, recency is the useful part. */
function relative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';

  const minutes = Math.round((Date.now() - then) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;

  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long' });
}

/**
 * What has happened, most recent first.
 *
 * Every summary was written for a customer by whichever service caused it — this
 * component does not map event types to copy, and cannot show one it does not have
 * wording for. Entries marked internal never reach here; the server filters them.
 *
 * `<time>` with a machine-readable `dateTime` alongside the human phrasing, so
 * "3 days ago" is not the only form the date exists in.
 */
export function ActivityList({
  activity,
  newSince,
}: {
  readonly activity: readonly ActivityView[];
  /**
   * ISO. Entries after it are marked as new to this reader.
   *
   * Optional because the project overview renders this list too, and there "new" is not a
   * question that surface asks — it shows one project's history, not the reader's inbox.
   * Absent simply means nothing is marked, which is what an unmarked history should be.
   */
  readonly newSince?: string;
}) {
  if (activity.length === 0) {
    return (
      <Card as="article">
        <p className={styles['statusDetail']}>
          Nothing has happened yet. As soon as it does, it will appear here.
        </p>
      </Card>
    );
  }

  return (
    <Card as="article">
      <ol className={styles['activity']}>
        {activity.map((entry) => {
          /*
           * String comparison rather than two `Date` objects: both sides are ISO-8601 UTC
           * from the same server, and ISO-8601 sorts lexicographically by design. Parsing
           * them would add a way to get it wrong and buy nothing.
           */
          const isNew = newSince !== undefined && entry.at > newSince;

          return (
            <li key={entry.id} className={styles['activityItem']}>
              <p className={styles['activitySummary']}>
                {/*
                 * The marker leads the line rather than trailing it, so it is the first
                 * thing read in every entry it is on — including out loud, where a label
                 * after the sentence arrives too late to have framed it.
                 */}
                {isNew ? (
                  <Badge tone="accent" className={styles['activityNew']}>
                    New
                  </Badge>
                ) : null}
                {entry.summary}
              </p>
              <time className={styles['activityTime']} dateTime={entry.at}>
                {relative(entry.at)}
              </time>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
