import { useEffect, useState } from 'react';
import { useResource } from '@jobforge/ui';
import { routes } from '../../../config/routes';
import { useDocumentMeta } from '../../../hooks/useDocumentMeta';
import type { ApiFailure, AssessmentView } from '@jobforge/shared';
import { fetchLatestAssessment, submitAssessment } from '../../assessment/services/assessmentApi';
import {
  clearAssessmentDraft,
  readAssessmentDraft,
  toSubmission,
  type AssessmentDraft,
} from '../../assessment';
import { Button } from '@jobforge/ui';
import { AppEmpty, AppError, AppLoading } from '../../../components/patterns/AppState';
import { Notice } from '../../../components/patterns/Notice';
import { useAnnounce } from '../../../components/patterns/useAnnounce';
/* Reached directly, not through the content barrel — see the note in `ProjectPage`. */
import { workspace } from '../../../content/app';
import styles from '../billing/Billing.module.css';

const BAND_LABELS: Readonly<Record<AssessmentView['band'], string>> = {
  strong: 'In good shape',
  workable: 'Worth improving',
  'costing-you': 'Likely costing you work',
};

/*
 * `/app/assessment` — the result, kept.
 *
 * Also the recovery point for the one failure the hand-off can have. If somebody signed
 * in with an assessment in progress and the submission failed — a blip between two
 * requests — the draft is still in the tab and this page offers to send it. Without
 * that, twenty answers would be lost to a moment of bad network on the one screen where
 * nobody would think to look for them.
 */
export function AssessmentPage() {
  useDocumentMeta({
    path: routes.appAssessment,
    title: 'Your assessment',
    description: 'Your website score, what it means, and what to do about it.',
  });

  const { data, failure, isLoading, isMutating, reload, mutate } = useResource(
    'assessment',
    fetchLatestAssessment,
  );
  const assessment: AssessmentView | null = data?.assessment ?? null;

  /** What the submission was refused for, as opposed to what the *read* failed with. */
  const [sendFailure, setSendFailure] = useState<ApiFailure | null>(null);
  const announce = useAnnounce();

  /*
   * Read once, on mount. A draft is meaningful for one sitting — `features/assessment/draft.ts`
   * is explicit about that, which is why it lives in `sessionStorage` — and nothing else in
   * this tab writes it while the page is open, so re-reading it on every render would be a
   * parse and a revalidation to get the same answer back.
   */
  const [draft, setDraft] = useState<AssessmentDraft | null>(() => readAssessmentDraft());

  /* Only offered when nothing landed. A draft behind a real score is not a recovery. */
  const pending = assessment ? null : draft;

  useEffect(() => {
    /*
     * This drives *storage*, not state, which is what an effect is actually for — and it is
     * the one thing `useResource` has no place for, because it is a consequence of the
     * response rather than a part of it. A draft left over from a submission that succeeded
     * is never shown (see `pending`), and this is what stops it lingering in the tab as well.
     */
    if (data?.assessment) clearAssessmentDraft();
  }, [data]);

  async function sendDraft() {
    if (!draft || isMutating) return;

    /*
     * Through `mutate`, so the score that appears is the one the server stored rather than
     * the one this component was handed. That is the rule the hook exists to make automatic
     * — see its header — and it is worth more here than anywhere: the score is computed on
     * the server precisely so the browser cannot decide it.
     */
    const rejected = await mutate(() => submitAssessment(toSubmission(draft)));
    setSendFailure(rejected);

    if (!rejected) {
      clearAssessmentDraft();
      setDraft(null);
      /*
       * The recovery panel is replaced by the score, which is the confirmation for anybody
       * who can see it. This is the same confirmation for anybody who cannot — and it is the
       * one that matters most on this screen, because the alternative reading of a page that
       * silently changes is that the twenty answers were lost again.
       */
      announce(workspace.announce.assessmentSaved);
    }
  }

  if (failure) return <AppError failure={failure} onRetry={reload} />;
  if (isLoading || !data) return <AppLoading label="Loading your assessment" />;

  if (!assessment) {
    return (
      <div className={styles['page']}>
        <h1 className={styles['title']}>Your assessment</h1>

        {pending ? (
          <section className={styles['panel']} aria-labelledby="assessment-recover">
            <h2 id="assessment-recover" className={styles['panelTitle']}>
              You have answers waiting
            </h2>
            <p className={styles['panelBody']}>
              We have your answers for <strong>{pending.businessName}</strong> but they did not save
              last time. Send them now and your score will appear here.
            </p>
            {sendFailure ? <Notice tone="problem">{sendFailure.error.message}</Notice> : null}
            {/*
             * `loading`, not `disabled`. A disabled button leaves the tab order the instant
             * it becomes disabled, so a keyboard user who presses Enter here loses focus
             * mid-submit with nothing announced — see `Button.tsx`. This is one of the call
             * sites that spelled busy as disabled.
             */}
            <Button onClick={sendDraft} loading={isMutating}>
              {isMutating ? 'Sending…' : 'Save my answers'}
            </Button>
          </section>
        ) : (
          <AppEmpty
            title="You have not done the assessment yet"
            body="Twenty questions about your website, about five minutes, and you get the five things most likely costing you calls and quote requests."
            /*
             * The private copy of the assessment, never `routes.audit`. A link from
             * inside the workspace to the public marketing page takes the customer's
             * navigation away — see the note on `appAssessmentStart`.
             */
            action={{ label: 'Start the assessment', to: routes.appAssessmentStart }}
          />
        )}
      </div>
    );
  }

  const submitted = new Date(assessment.submittedAt);

  return (
    <div className={styles['page']}>
      <h1 className={styles['title']}>Your assessment</h1>

      <section className={styles['panel']} aria-labelledby="assessment-score">
        <h2 id="assessment-score" className={styles['panelTitle']}>
          {assessment.score} out of 100 — {BAND_LABELS[assessment.band]}
        </h2>

        <dl className={styles['definitions']}>
          <div>
            <dt>Business</dt>
            <dd>{assessment.businessName}</dd>
          </div>
          {assessment.websiteUrl ? (
            <div>
              <dt>Website</dt>
              <dd>
                <a href={assessment.websiteUrl} target="_blank" rel="noopener noreferrer">
                  {assessment.websiteUrl.replace(/^https?:\/\//, '')}
                </a>
              </dd>
            </div>
          ) : null}
          <div>
            <dt>Completed</dt>
            <dd>
              {Number.isNaN(submitted.getTime())
                ? '—'
                : submitted.toLocaleDateString(undefined, {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
            </dd>
          </div>
        </dl>
      </section>

      <section className={styles['panel']} aria-labelledby="assessment-recommendations">
        <h2 id="assessment-recommendations" className={styles['panelTitle']}>
          What to do about it
        </h2>

        {assessment.recommendations.length === 0 ? (
          <p className={styles['panelBody']}>
            Nothing stood out as a problem — your website scored well across the board.
          </p>
        ) : (
          <ol className={styles['recommendations']}>
            {assessment.recommendations.map((recommendation) => (
              <li key={recommendation} className={styles['recommendation']}>
                {recommendation}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
