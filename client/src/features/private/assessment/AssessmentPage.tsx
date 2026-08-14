import { useCallback, useEffect, useState } from 'react';
import { routes } from '../../../config/routes';
import { useDocumentMeta } from '../../../hooks/useDocumentMeta';
import type { ApiFailure, AssessmentView } from '../../../types/api';
import { fetchLatestAssessment, submitAssessment } from '../../assessment/api/assessmentApi';
import {
  clearAssessmentDraft,
  readAssessmentDraft,
  toSubmission,
  type AssessmentDraft,
} from '../../assessment/draft';
import { Button } from '../../../components/ui/Button';
import { AppEmpty, AppError, AppLoading } from '../components/AppState';
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

  const [assessment, setAssessment] = useState<AssessmentView | null>(null);
  const [draft, setDraft] = useState<AssessmentDraft | null>(null);
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    // `loading` is true to begin with and is set again by the retry handler, so there is
    // nothing for the effect to do but wait for the answer.
    void fetchLatestAssessment(controller.signal).then((result) => {
      if (controller.signal.aborted) return;

      if (result.success) {
        setAssessment(result.data.assessment);
        setFailure(null);
        // Only offer the recovery when nothing landed. A draft left over from a
        // successful submission is noise, so it is cleared.
        const pending = readAssessmentDraft();
        if (result.data.assessment) clearAssessmentDraft();
        setDraft(result.data.assessment ? null : pending);
      } else {
        setFailure(result);
      }

      setLoading(false);
    });

    return () => controller.abort();
  }, [reloadToken]);

  const retry = useCallback(() => {
    setLoading(true);
    setReloadToken((token) => token + 1);
  }, []);

  async function sendDraft() {
    if (!draft || sending) return;

    setSending(true);
    const result = await submitAssessment(toSubmission(draft));
    setSending(false);

    if (result.success) {
      clearAssessmentDraft();
      setDraft(null);
      setAssessment(result.data.assessment);
    } else {
      setFailure(result);
    }
  }

  if (failure && !assessment) return <AppError failure={failure} onRetry={retry} />;
  if (loading) return <AppLoading label="Loading your assessment" />;

  if (!assessment) {
    return (
      <div className={styles['page']}>
        <h1 className={styles['title']}>Your assessment</h1>

        {draft ? (
          <section className={styles['panel']} aria-labelledby="assessment-recover">
            <h2 id="assessment-recover" className={styles['panelTitle']}>
              You have answers waiting
            </h2>
            <p className={styles['panelBody']}>
              We have your answers for <strong>{draft.businessName}</strong> but they did not save
              last time. Send them now and your score will appear here.
            </p>
            {failure ? (
              <p className={styles['error']} role="alert">
                {failure.error.message}
              </p>
            ) : null}
            <Button onClick={sendDraft} disabled={sending}>
              {sending ? 'Sending…' : 'Save my answers'}
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
