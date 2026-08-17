import { useCallback, useState } from 'react';
import { Badge, Button, TextAreaField, useResource } from '@jobforge/ui';
import type { AdminAssessmentView, AssessmentFindingSeverity } from '@jobforge/shared';
import { ASSESSMENT_FINDING_SEVERITIES } from '@jobforge/shared';
import { Notice } from '../../components/Notice';
import { Failure, Loading } from '../../components/State';
import {
  deliverAssessmentReport,
  fetchAssessmentQueue,
  saveAssessmentReport,
} from '../../lib/endpoints';
import { useTitle } from '../../hooks/useTitle';
import { formatDate } from '../../utils/formatDate';
import styles from '../projects/Projects.module.css';

/*
 * ============================================================================
 * THE QUEUE FOR THE THING THE FRONT PAGE PROMISES
 * ============================================================================
 *
 * Every marketing page on the site ends in "Get my free website assessment". Somebody presses
 * it, makes an account, answers twenty questions — and until this screen existed the only
 * trace of that on this side was an email, in an inbox, competing with everything else in an
 * inbox.
 *
 * So this is the operational surface for the **primary offer**, and it is the one the console
 * did not have. It is a queue rather than an archive: only requests with no delivered review
 * appear, oldest first, and it is empty when nobody is waiting.
 *
 * ## Why the editor is on the same screen as the list
 *
 * Because writing one is the only thing anybody comes here to do. A list that links to a
 * detail page would put a navigation between the operator and the work on the screen whose
 * entire purpose is getting through the work. Selecting a row opens the editor beside it,
 * with the visitor's own answers on screen — their score, their weakest categories, whatever
 * they typed in the note — because the review is written *from* those and hunting for them on
 * another page is how a review gets written without them.
 *
 * ## Save and deliver are two buttons
 *
 * Delivering emails the customer and writes into their permanent history. Saving does neither.
 * The same rule, for the same reason, as the monthly report.
 * ============================================================================
 */

const SEVERITY_LABELS: Readonly<Record<AssessmentFindingSeverity, string>> = {
  critical: 'Fix this first',
  important: 'Worth doing',
  minor: 'When you get to it',
};

interface DraftFinding {
  readonly title: string;
  readonly detail: string;
  readonly severity: AssessmentFindingSeverity;
}

/**
 * Findings, typed as text rather than as a repeating form.
 *
 * One block per finding: a severity, a title, and a paragraph, separated by blank lines. A
 * repeating fieldset with add and remove buttons is the obvious build and it is the wrong one
 * here — the operator is writing prose, in one pass, and every control between them and the
 * next sentence is a reason to write four findings instead of five.
 *
 * The format is `severity | title` on the first line and the detail underneath. Anything that
 * does not parse becomes an `important` finding with the whole block as its detail, because
 * losing somebody's writing to a syntax error is worse than mislabelling it.
 */
function parseFindings(value: string): readonly DraftFinding[] {
  return value
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0)
    .map((block) => {
      const [head = '', ...rest] = block.split('\n');
      const [severityPart, titlePart] = head.split('|').map((part) => part.trim());
      const severity = ASSESSMENT_FINDING_SEVERITIES.find(
        (candidate) => candidate === severityPart?.toLowerCase(),
      );

      if (!severity || !titlePart) {
        return { title: head.slice(0, 200), detail: block, severity: 'important' as const };
      }

      return {
        title: titlePart,
        detail: rest.join('\n').trim() || titlePart,
        severity,
      };
    });
}

function toLines(value: string): readonly string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/** Turns a stored review back into the text the editor edits. Round-trips `parseFindings`. */
function toFindingText(assessment: AdminAssessmentView): string {
  return (assessment.draft?.findings ?? [])
    .map((finding) => `${finding.severity} | ${finding.title}\n${finding.detail}`)
    .join('\n\n');
}

function Editor({
  assessment,
  onSaved,
}: {
  readonly assessment: AdminAssessmentView;
  readonly onSaved: () => void;
}) {
  const [summary, setSummary] = useState(assessment.draft?.summary ?? '');
  const [findings, setFindings] = useState(() => toFindingText(assessment));
  const [recommendations, setRecommendations] = useState(
    (assessment.draft?.recommendations ?? []).join('\n'),
  );
  const [pending, setPending] = useState<'save' | 'deliver' | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [saved, setSaved] = useState(assessment.draft !== undefined);

  async function save() {
    setPending('save');
    setProblem(null);
    setNote(null);

    const result = await saveAssessmentReport(assessment.id, {
      summary,
      findings: parseFindings(findings),
      recommendations: toLines(recommendations),
    });

    setPending(null);

    if (!result.success) {
      setProblem(result.error.message);
      return;
    }

    setSaved(true);
    setNote('Saved. Nothing has been sent.');
  }

  async function deliver() {
    setPending('deliver');
    setProblem(null);
    setNote(null);

    const result = await deliverAssessmentReport(assessment.id);

    setPending(null);

    if (!result.success) {
      setProblem(result.error.message);
      return;
    }

    setNote('Sent. It is on their assessment page and they have been emailed.');
    onSaved();
  }

  return (
    <div className={styles['panel']}>
      <h2 className={styles['subheading']}>Review for {assessment.businessName}</h2>

      {/*
       * Their own answers, on the screen the review is written on.
       *
       * The score is the visitor's self-assessment, not ours, and it is here as context rather
       * than as a verdict — a business that scored itself 40 and has a perfectly good website
       * is a common and useful thing to discover, and the review is where that gets said.
       */}
      <dl className={styles['facts']}>
        <div>
          <dt>They scored themselves</dt>
          <dd>{assessment.score} / 100</dd>
        </div>
        <div>
          <dt>Website</dt>
          <dd>
            {assessment.websiteUrl ? (
              <a href={assessment.websiteUrl} target="_blank" rel="noopener noreferrer">
                {assessment.websiteUrl}
              </a>
            ) : (
              'Not given'
            )}
          </dd>
        </div>
        <div>
          <dt>Trade</dt>
          <dd>{assessment.trade ?? 'Not given'}</dd>
        </div>
        <div>
          <dt>Weakest, by their answers</dt>
          <dd>
            {assessment.weakestCategories.length > 0
              ? assessment.weakestCategories.join(', ')
              : 'Nothing stood out'}
          </dd>
        </div>
      </dl>

      {assessment.note ? <p className={styles['notes']}>{assessment.note}</p> : null}

      <div className={styles['inlineForm']}>
        <TextAreaField
          id="review-summary"
          label="Summary"
          hint="Two or three sentences. What you found, in the words you would use on the phone."
          rows={4}
          value={summary}
          disabled={pending !== null}
          onChange={(event) => setSummary(event.target.value)}
        />

        <TextAreaField
          id="review-findings"
          label="Findings"
          hint={`One per block, blank line between them. First line "severity | title", then the detail underneath. Severities: ${ASSESSMENT_FINDING_SEVERITIES.join(', ')} — shown to them as “${SEVERITY_LABELS.critical}”, “${SEVERITY_LABELS.important}”, “${SEVERITY_LABELS.minor}”.`}
          rows={12}
          value={findings}
          disabled={pending !== null}
          onChange={(event) => setFindings(event.target.value)}
        />

        <TextAreaField
          id="review-recommendations"
          label="What we would do about it"
          hint="One per line, in the order you would do them."
          rows={5}
          value={recommendations}
          disabled={pending !== null}
          onChange={(event) => setRecommendations(event.target.value)}
        />

        <div className={styles['formActions']}>
          <Button
            variant="secondary"
            loading={pending === 'save'}
            disabled={pending !== null}
            onClick={() => void save()}
          >
            Save draft
          </Button>
          <Button
            loading={pending === 'deliver'}
            disabled={pending !== null || !saved}
            onClick={() => void deliver()}
          >
            Send it to them
          </Button>
        </div>
      </div>

      {!saved ? <p className={styles['muted']}>Save the review before sending it.</p> : null}

      {problem ? <Notice tone="problem">{problem}</Notice> : null}
      {note ? <Notice tone="success">{note}</Notice> : null}
    </div>
  );
}

export function AssessmentsPage() {
  useTitle('Assessments');

  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback((signal?: AbortSignal) => fetchAssessmentQueue(50, signal), []);
  const { data, failure, isLoading, reload } = useResource('assessment-queue', load);

  if (failure) return <Failure failure={failure} onRetry={reload} />;
  if (isLoading || !data) return <Loading label="Loading the assessment queue" />;

  const waiting = data.assessments;
  const open = waiting.find((assessment) => assessment.id === selected);

  return (
    <div className={styles['detail']}>
      <h1 className={styles['heading']}>Assessments waiting</h1>
      <p className={styles['muted']}>
        Everybody who asked for a free website assessment and has not had one, oldest first. This
        list is empty when nobody is waiting.
      </p>

      {waiting.length === 0 ? (
        <Notice tone="success">Nobody is waiting for a review.</Notice>
      ) : (
        <ul className={styles['list']}>
          {waiting.map((assessment) => (
            <li key={assessment.id}>
              <button
                type="button"
                className={styles['rowLink']}
                onClick={() => setSelected(assessment.id === selected ? null : assessment.id)}
              >
                {assessment.businessName}
              </button>
              <span className={styles['rowSub']}>
                Asked {formatDate(assessment.submittedAt)} · scored themselves {assessment.score}
                {assessment.draft ? ' · ' : ''}
                {assessment.draft ? <Badge tone="neutral">Draft started</Badge> : null}
              </span>
            </li>
          ))}
        </ul>
      )}

      {open ? (
        <Editor
          /* Keyed, so selecting a different row rebuilds the form rather than editing one
             person's review into another's. */
          key={open.id}
          assessment={open}
          onSaved={() => {
            setSelected(null);
            reload();
          }}
        />
      ) : null}
    </div>
  );
}
