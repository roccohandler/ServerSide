import { Link } from 'react-router-dom';
import { routes } from '../../../config/routes';
import type { AssessmentView } from '../../../types/api';
import { AppEmpty } from './AppState';
import styles from './Cards.module.css';

const BAND_LABELS: Readonly<Record<AssessmentView['band'], string>> = {
  strong: 'In good shape',
  workable: 'Worth improving',
  'costing-you': 'Likely costing you work',
};

/** The date, as somebody would say it rather than as an ISO string. */
function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * The assessment result: the score, what it means, and the first recommendation.
 *
 * Only the first. All five are on the assessment page, and putting them here would make
 * the dashboard a document rather than a summary — the point of a summary is that it is
 * shorter than the thing it summarises.
 */
export function AssessmentSummaryCard({
  assessment,
}: {
  readonly assessment: AssessmentView | null;
}) {
  if (!assessment) {
    return (
      <AppEmpty
        title="You have not done the assessment yet"
        body="Twenty questions about your website, about five minutes, and you get the five things most likely costing you calls."
        /*
         * The private copy of the assessment, never `routes.audit`. A link from inside
         * the workspace to the public marketing page takes the customer's navigation
         * away — see the note on `appAssessmentStart` in `config/routes.ts`.
         */
        action={{ label: 'Start the assessment', to: routes.appAssessmentStart }}
      />
    );
  }

  const headline = assessment.recommendations[0];

  return (
    <article className={styles['card']}>
      <div className={styles['score']}>
        <span className={styles['scoreValue']}>{assessment.score}</span>
        <span className={styles['scoreOutOf']}>out of 100</span>
      </div>

      <p className={styles['status']}>{BAND_LABELS[assessment.band]}</p>

      {headline ? <p className={styles['statusDetail']}>{headline}</p> : null}

      <p className={styles['meta']}>Completed {formatDate(assessment.submittedAt)}</p>

      <ul className={styles['links']}>
        <li>
          <Link to={routes.appAssessment}>See the full assessment</Link>
        </li>
      </ul>
    </article>
  );
}
