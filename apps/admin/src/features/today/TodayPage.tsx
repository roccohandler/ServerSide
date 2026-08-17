import { Link } from 'react-router-dom';
import { useResource } from '@jobforge/ui';
import type { WorklistGroup, WorklistItem } from '@jobforge/shared';
import { Failure, Loading } from '../../components/State';
import { useTitle } from '../../hooks/useTitle';
import { fetchWorklist } from '../../lib/endpoints';
import styles from '../projects/Projects.module.css';

/*
 * ============================================================================
 * TODAY — WHAT IS GOING STALE
 * ============================================================================
 *
 * The console's front page is the inbox, and it answers **who is waiting on a reply**. This
 * screen answers a different question — **what has quietly stopped moving** — and the two are
 * not the same list, because nobody is waiting on most of what appears here. A project stuck
 * at `review` for nine days has no unanswered message on it. That is the problem, not the
 * absence of one.
 *
 * ## Every group is shown, including the empty ones
 *
 * Unlike `OnboardingPage`, which renders one empty state and stops. The difference is what
 * the screen is claiming: that page is *about* unmatched submissions, so nothing to show
 * means nothing to say. This page is a claim about the whole business, and a group silently
 * omitted because it happens to be empty is indistinguishable from a group that stopped being
 * checked. "Every live website has its report" is information; a shorter page is not.
 *
 * ## It computes nothing
 *
 * No thresholds, no day counts, no sorting by staleness. All of it arrives composed from
 * `worklist.ts`, which in turn owns no definitions either — every group there is a call to a
 * method that already existed for another screen. A worklist is exactly the kind of surface
 * that grows its own opinion of "overdue", and the day it does, the console has two numbers
 * for one thing and no way to say which is right.
 * ============================================================================
 */

function Item({ item }: { readonly item: WorklistItem }) {
  return (
    <li className={styles['thread']}>
      <p className={styles['threadBody']}>
        {item.href ? (
          <Link to={item.href} className={styles['rowLink']}>
            {item.title}
          </Link>
        ) : (
          <span className={styles['rowLink']}>{item.title}</span>
        )}
      </p>
      <p className={styles['muted']}>{item.detail}</p>
    </li>
  );
}

function Group({ group }: { readonly group: WorklistGroup }) {
  return (
    <section className={styles['panel']} aria-labelledby={`worklist-${group.key}`}>
      <h2 id={`worklist-${group.key}`} className={styles['subheading']}>
        {group.title}
      </h2>

      {group.items.length === 0 ? (
        <p className={styles['muted']}>{group.emptyLabel}</p>
      ) : (
        <ul className={styles['threads']}>
          {group.items.map((item) => (
            <Item key={item.id} item={item} />
          ))}
        </ul>
      )}
    </section>
  );
}

export function TodayPage() {
  useTitle('Today');

  const { data, failure, isLoading, reload } = useResource('worklist', fetchWorklist);

  if (failure) return <Failure failure={failure} onRetry={reload} />;
  if (isLoading || !data) return <Loading label="Loading the worklist" />;

  const outstanding = data.groups.reduce((total, group) => total + group.items.length, 0);

  return (
    <div className={styles['detail']}>
      <div className={styles['panel']}>
        <h1 className={styles['heading']}>Today</h1>
        <p className={styles['muted']}>
          {outstanding === 0
            ? 'Nothing has gone quiet. Everything below is a check that came back clean.'
            : `${outstanding} ${outstanding === 1 ? 'thing has' : 'things have'} stopped moving. Nobody is waiting on a reply for these — that is the Inbox — so they are the ones nothing else would surface.`}
        </p>
      </div>

      {data.groups.map((group) => (
        <Group key={group.key} group={group} />
      ))}
    </div>
  );
}
