import { useState } from 'react';
import { Button, TextField } from '@jobforge/ui';
import type { ApiFailure, OnboardingView } from '@jobforge/shared';
import { Empty, Failure, Loading } from '../../components/State';
import { ShowMore } from '../../components/ShowMore';
import { useAnnounce } from '../../components/useAnnounce';
import { usePagedResource } from '../../hooks/usePagedResource';
import { useTitle } from '../../hooks/useTitle';
import { attachOnboarding, fetchUnmatchedOnboarding } from '../../lib/endpoints';
import { formatDate } from '../../utils/formatDate';
import styles from '../projects/Projects.module.css';

/*
 * ============================================================================
 * THE SUBMISSIONS THAT MATCHED NOTHING
 * ============================================================================
 *
 * A worklist, not an archive, and the difference decides what is on it.
 *
 * A welcome-form submission is matched to its project by email address on arrival, which
 * works because both were typed by the same person on the same afternoon. The matched ones
 * are on their project's page — where somebody building the site is looking — so listing them
 * again here would bury the rows that need a decision among rows that have somewhere better
 * to be.
 *
 * **So this screen is empty when everything is working**, and that is the design rather than
 * a gap. Every row on it is a paying client whose materials are in a table with no project
 * attached, and every one needs a person to say where they belong.
 *
 * ## Oldest first
 *
 * The same order as the inbox and for the same reason: the submission that has been sitting
 * unmatched longest is the build that has been stalled longest.
 * ============================================================================
 */
export function OnboardingPage() {
  useTitle('Onboarding');

  const { data, failure, isLoading, reload, showMore, loadingMore } = usePagedResource(
    'onboarding',
    fetchUnmatchedOnboarding,
  );

  if (failure) return <Failure failure={failure} onRetry={reload} />;
  if (isLoading || !data) return <Loading label="Loading submissions" />;

  const submissions = data.submissions;

  if (submissions.length === 0) {
    return (
      <Empty
        title="Nothing waiting"
        body="Every welcome-form submission has found its project. They are matched by email address on arrival, and a matched one appears on its project's page rather than here."
      />
    );
  }

  return (
    <div className={styles['panel']}>
      <h1 className={styles['heading']}>Onboarding</h1>
      <p className={styles['muted']}>
        {submissions.length} {submissions.length === 1 ? 'submission' : 'submissions'} matched no
        project, oldest first. Each one is a client whose materials are not attached to anything.
      </p>

      <ul className={styles['threads']}>
        {submissions.map((submission) => (
          <UnmatchedRow key={submission.id} submission={submission} onMatched={reload} />
        ))}
      </ul>

      <ShowMore
        showing={submissions.length}
        hasMore={data.hasMore}
        busy={loadingMore}
        onShowMore={showMore}
        noun="submissions"
      />
    </div>
  );
}

/**
 * One stray submission, and the field that files it.
 *
 * The project id rather than a picker, deliberately: a picker over five hundred projects is a
 * second search screen, and the operator arriving here almost always has the project open in
 * another tab — its id is in the URL they are already looking at. If that stops being true the
 * answer is the search from the projects list, reused, not a bespoke dropdown.
 *
 * Enough of the submission is shown to decide *which* project without opening anything: the
 * business, the address it came from, and what they said they do.
 */
function UnmatchedRow({
  submission,
  onMatched,
}: {
  readonly submission: OnboardingView;
  onMatched: () => void;
}) {
  const [projectId, setProjectId] = useState('');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const announce = useAnnounce();

  async function match() {
    setBusy(true);
    const result = await attachOnboarding(submission.id, projectId.trim());
    setBusy(false);

    if (!result.success) {
      setFailure(result);
      return;
    }

    setFailure(null);
    announce(`${submission.businessName} matched.`);
    onMatched();
  }

  return (
    <li className={styles['thread']}>
      <h2 className={styles['subheading']}>{submission.businessName}</h2>
      <p className={styles['rowSub']}>
        {submission.contactName} — {submission.email} — {formatDate(submission.at)}
      </p>
      <p className={styles['threadBody']}>{submission.services}</p>
      <p className={styles['rowSub']}>Areas: {submission.serviceAreas}</p>

      {failure ? <Failure failure={failure} /> : null}

      <div className={styles['inlineForm']}>
        <TextField
          id={`match-${submission.id}`}
          label="Project id"
          hint="From the project's own URL. Matching files these answers against it."
          value={projectId}
          disabled={busy}
          onChange={(event) => setProjectId(event.target.value)}
        />

        <div className={styles['formActions']}>
          <Button
            loading={busy}
            disabled={projectId.trim().length === 0}
            onClick={() => void match()}
          >
            Match to project
          </Button>
        </div>
      </div>
    </li>
  );
}
