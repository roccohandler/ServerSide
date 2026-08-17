import { useEffect, useState } from 'react';
import { Badge, Button, TextAreaField, TextField } from '@jobforge/ui';
import type { AdminProjectView, AdminReportView } from '@jobforge/shared';
import { Notice } from '../../components/Notice';
import { fetchProjectReports, publishReport, saveReport } from '../../lib/endpoints';
import styles from './Projects.module.css';

/*
 * ============================================================================
 * THE MONTHLY REPORT — GROWTH PARTNER'S ONLY DELIVERABLE
 * ============================================================================
 *
 * DECISION 015 sells this as a *monthly operational commitment*. Before this panel there was
 * nowhere to write one and nothing that knew whether one had ever been sent, which is the
 * state a monthly commitment quietly stops in.
 *
 * ## Save and publish are two buttons, and that is not a UX preference
 *
 * Publishing emails the client and writes into their permanent history. Saving does neither.
 * A single "Save" that also published would be the button somebody presses on the eighth
 * revision of a paragraph they were still thinking about, and the thing on the other side of
 * it cannot be recalled. The same reasoning, in the same words, governs the assessment review.
 *
 * ## Two numbers, and this panel computes nothing between them
 *
 * There is no percentage, no arrow and no "up 40%" anywhere in this component or in the
 * customer's view of it. Some months the number goes down, and the month it goes down is
 * exactly the month the report is most worth reading — `changeExplanation` is where a person
 * says what happened, and a derived verdict beside it would be the system contradicting them.
 *
 * ## The overdue warning
 *
 * A missing month is shown as a warning rather than as an absence, because an absence is what
 * this looked like for however long nobody noticed. The server decides what counts as overdue
 * — a report covering August cannot be written in August, so it turns amber once October
 * starts. See `OVERDUE_AFTER_MONTHS`.
 * ============================================================================
 */

export interface ReportsPanelProps {
  readonly project: AdminProjectView;
}

/** The month before the current one, as `YYYY-MM`. What a new report almost always covers. */
function lastMonth(): string {
  const now = new Date();
  const index = now.getUTCMonth();
  return index === 0
    ? `${now.getUTCFullYear() - 1}-12`
    : `${now.getUTCFullYear()}-${String(index).padStart(2, '0')}`;
}

/** Splits a textarea into lines, dropping the blanks somebody left while typing. */
function toLines(value: string): readonly string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function ReportsPanel({ project }: ReportsPanelProps) {
  const [reports, setReports] = useState<readonly AdminReportView[] | null>(null);
  const [month, setMonth] = useState(lastMonth());
  const [enquiries, setEnquiries] = useState('');
  const [baseline, setBaseline] = useState('');
  const [explanation, setExplanation] = useState('');
  const [changed, setChanged] = useState('');
  const [next, setNext] = useState('');
  const [pending, setPending] = useState<'save' | 'publish' | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    void fetchProjectReports(project.id, controller.signal).then((result) => {
      if (result.success) setReports(result.data.reports);
    });

    return () => controller.abort();
  }, [project.id]);

  /* The draft for the month being typed, if one is already stored. */
  const existing = reports?.find((report) => report.month === month);

  async function save() {
    setPending('save');
    setProblem(null);
    setNote(null);

    const count = Number(enquiries);

    if (!Number.isInteger(count) || count < 0) {
      setPending(null);
      setProblem('Enquiries has to be a whole number — how many came through the website.');
      return;
    }

    const result = await saveReport(project.id, {
      month,
      enquiries: count,
      /* Blank means "we do not know", which is a real answer and must not become a zero. */
      ...(baseline.trim() === '' ? {} : { baseline: Number(baseline) }),
      changeExplanation: explanation,
      whatWeChanged: toLines(changed),
      whatIsNext: toLines(next),
    });

    setPending(null);

    if (!result.success) {
      setProblem(result.error.message);
      return;
    }

    setReports((current) => [
      result.data.report,
      ...(current ?? []).filter((report) => report.month !== result.data.report.month),
    ]);
    setNote('Saved as a draft. Nothing has been sent.');
  }

  async function send(report: AdminReportView) {
    setPending('publish');
    setProblem(null);
    setNote(null);

    const result = await publishReport(project.id, report.id);

    setPending(null);

    if (!result.success) {
      setProblem(result.error.message);
      return;
    }

    setReports((current) =>
      (current ?? []).map((row) => (row.id === result.data.report.id ? result.data.report : row)),
    );
    setNote(`The ${result.data.report.monthLabel} report was sent to ${project.email}.`);
  }

  return (
    <div className={styles['panel']}>
      <h2 className={styles['subheading']}>Monthly reports</h2>
      <p className={styles['muted']}>
        What the website produced, what we changed, and what is next. Say what happened in your own
        words — do not promise the number went up, because some months it will not and that is the
        month this is most worth reading.
      </p>

      <div className={styles['inlineForm']}>
        <TextField
          id="report-month"
          label="Month"
          hint="YYYY-MM. A month that has not finished yet is refused."
          value={month}
          disabled={pending !== null}
          onChange={(event) => setMonth(event.target.value)}
        />
        <TextField
          id="report-enquiries"
          type="number"
          label="Enquiries this month"
          value={enquiries}
          disabled={pending !== null}
          onChange={(event) => setEnquiries(event.target.value)}
        />
        <TextField
          id="report-baseline"
          type="number"
          label="Before the new website"
          hint="Leave blank if nobody counted. Blank reads as “not measured”, which is honest; a zero would read as “you had none”."
          optionalLabel="optional"
          value={baseline}
          disabled={pending !== null}
          onChange={(event) => setBaseline(event.target.value)}
        />
        <TextAreaField
          id="report-explanation"
          label="What happened"
          hint="A short paragraph. This is the part they actually read."
          rows={4}
          value={explanation}
          disabled={pending !== null}
          onChange={(event) => setExplanation(event.target.value)}
        />
        <TextAreaField
          id="report-changed"
          label="What we changed"
          hint="One per line."
          rows={3}
          value={changed}
          disabled={pending !== null}
          onChange={(event) => setChanged(event.target.value)}
        />
        <TextAreaField
          id="report-next"
          label="What is next"
          hint="One per line."
          rows={3}
          value={next}
          disabled={pending !== null}
          onChange={(event) => setNext(event.target.value)}
        />

        <div className={styles['formActions']}>
          <Button
            loading={pending === 'save'}
            disabled={pending !== null}
            onClick={() => void save()}
          >
            Save draft
          </Button>
        </div>
      </div>

      {problem ? <Notice tone="problem">{problem}</Notice> : null}
      {note ? <Notice tone="success">{note}</Notice> : null}

      {existing && !existing.published ? (
        <Notice tone="info">
          {existing.monthLabel} is saved and has not been sent. Publishing emails {project.email}{' '}
          and writes it into their history.
        </Notice>
      ) : null}

      <ul className={styles['list']}>
        {(reports ?? []).map((report) => (
          <li key={report.id}>
            <strong>{report.monthLabel}</strong>{' '}
            <Badge tone={report.published ? 'brand' : 'neutral'}>
              {report.published ? 'Sent' : 'Draft'}
            </Badge>{' '}
            — {report.enquiries} enquiries
            {report.published ? null : (
              <>
                {' '}
                <Button
                  variant="secondary"
                  loading={pending === 'publish'}
                  disabled={pending !== null}
                  onClick={() => void send(report)}
                >
                  Publish
                </Button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
