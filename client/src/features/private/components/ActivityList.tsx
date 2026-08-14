import type { ActivityView } from '../../../types/api';
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
export function ActivityList({ activity }: { readonly activity: readonly ActivityView[] }) {
  if (activity.length === 0) {
    return (
      <article className={styles['card']}>
        <p className={styles['statusDetail']}>
          Nothing has happened yet. As soon as it does, it will appear here.
        </p>
      </article>
    );
  }

  return (
    <article className={styles['card']}>
      <ol className={styles['activity']}>
        {activity.map((entry) => (
          <li key={entry.id} className={styles['activityItem']}>
            <p className={styles['activitySummary']}>{entry.summary}</p>
            <time className={styles['activityTime']} dateTime={entry.at}>
              {relative(entry.at)}
            </time>
          </li>
        ))}
      </ol>
    </article>
  );
}
