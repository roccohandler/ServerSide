import { useEffect, useState } from 'react';
import { useResource } from '@jobforge/ui';
import { routes } from '../../../config/routes';
import { useDocumentMeta } from '../../../hooks/useDocumentMeta';
import type {
  ApiFailure,
  AssessmentFindingSeverity,
  AssessmentReportView,
  AssessmentView,
} from '@jobforge/shared';
import { fetchLatestAssessment, submitAssessment } from '../../assessment/services/assessmentApi';
import {
  clearAssessmentDraft,
  readAssessmentDraft,
  toSubmission,
  type AssessmentDraft,
} from '../../assessment';
import { Badge, Button } from '@jobforge/ui';
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

/**
 * How a finding's severity is said and shown.
 *
 * The words are the customer's rather than ours — "Fix this first" is an instruction, where
 * `critical` is a label somebody has to translate. The badge tone carries the same ordering
 * for anybody scanning, and the word carries it for anybody listening.
 */
const SEVERITY: Readonly<
  Record<
    AssessmentFindingSeverity,
    { readonly label: string; readonly tone: 'accent' | 'brand' | 'neutral' }
  >
> = {
  critical: { label: 'Fix this first', tone: 'accent' },
  important: { label: 'Worth doing', tone: 'brand' },
  minor: { label: 'When you get to it', tone: 'neutral' },
};

/**
 * The owner's written review — the thing the free assessment actually promises.
 *
 * Rendered *above* the self-scored result on the page, and that order is the point: once a
 * person has looked at the website, what a person said is the answer and the score is the
 * working. Before then the score is all there is, and the panel below says so plainly rather
 * than leaving the reader to wonder whether they were forgotten.
 */
function ReviewPanel({ report }: { readonly report: AssessmentReportView }) {
  const delivered = new Date(report.deliveredAt);

  return (
    <section className={styles['panel']} aria-labelledby="assessment-review">
      <h2 id="assessment-review" className={styles['panelTitle']}>
        Your website review
      </h2>
      <p className={styles['panelMeta']}>
        Written by {report.preparedBy}
        {Number.isNaN(delivered.getTime())
          ? ''
          : ` on ${delivered.toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}`}
        .
      </p>

      <p className={styles['panelBody']}>{report.summary}</p>

      {report.findings.length > 0 ? (
        <ul className={styles['findings']}>
          {report.findings.map((finding) => (
            <li key={finding.title}>
              <div className={styles['findingHead']}>
                <h3 className={styles['findingTitle']}>{finding.title}</h3>
                <Badge tone={SEVERITY[finding.severity].tone}>
                  {SEVERITY[finding.severity].label}
                </Badge>
              </div>
              <p className={styles['panelBody']}>{finding.detail}</p>
            </li>
          ))}
        </ul>
      ) : null}

      {report.recommendations.length > 0 ? (
        <>
          <h3 className={styles['findingTitle']}>What we would do about it</h3>
          <ol className={styles['recommendations']}>
            {report.recommendations.map((recommendation) => (
              <li key={recommendation} className={styles['recommendation']}>
                {recommendation}
              </li>
            ))}
          </ol>
        </>
      ) : null}
    </section>
  );
}

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

      {assessment.report ? (
        <ReviewPanel report={assessment.report} />
      ) : (
        /*
         * Said plainly rather than left out.
         *
         * A page that shows only the machine's score, with nothing about the review, reads
         * as though the promise on the front page was the score — and somebody who has been
         * waiting three days has no way to tell whether they were forgotten. This is not a
         * loading state and must not look like one: it is a commitment with a person behind
         * it, and no spinner can say that.
         */
        <section className={styles['panel']} aria-labelledby="assessment-pending">
          <h2 id="assessment-pending" className={styles['panelTitle']}>
            Your review is being written
          </h2>
          <p className={styles['panelBody']}>
            Your answers are in and somebody is going through your website properly. When the review
            is ready it appears here and we will email you — you do not need to do anything in the
            meantime.
          </p>
        </section>
      )}

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
        {/*
         * The heading changes once a review exists, because the section's job changes.
         *
         * On its own it is the answer. Underneath a written review it is the working — the
         * generic advice attached to whichever categories the customer's own answers marked
         * weakest — and leaving it headed "What to do about it" would put two answers to one
         * question on one page, the second of which nobody looked at the website to write.
         */}
        <h2 id="assessment-recommendations" className={styles['panelTitle']}>
          {assessment.report ? 'From your own answers' : 'What to do about it'}
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
