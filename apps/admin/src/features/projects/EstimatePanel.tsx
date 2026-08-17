import { useState } from 'react';
import { Button, TextField } from '@jobforge/ui';
import type { AdminProjectView } from '@jobforge/shared';
import { Notice } from '../../components/Notice';
import { setEstimate } from '../../lib/endpoints';
import { formatDate } from '../../utils/formatDate';
import styles from './Projects.module.css';

/*
 * ============================================================================
 * WHEN WE THINK IT WILL BE FINISHED
 * ============================================================================
 *
 * The question every client of every agency actually asks, and the one this console could not
 * answer. It went in an email, or it did not go anywhere.
 *
 * ## The warning above the button is the whole design
 *
 * Setting a first date is quiet. **Moving** one emails the customer, because a date that slips
 * silently is worse than no date — and the operator has to know which of those two they are
 * about to do *before* they press save, not from the sent-mail folder afterwards. So the
 * button's own words change: `Set the date` when there is none, `Save and tell them` when
 * there is one and it is different.
 *
 * The rule itself lives on the server, in `ProjectService.setEstimate`, and nothing here
 * decides anything. This is the wording that makes the server's behaviour predictable to the
 * person triggering it.
 *
 * ## Clearing is offered and is deliberately silent
 *
 * "We no longer know when this will be finished" is not a sentence to put in an automated
 * email without a person writing the rest of it. Clearing returns the project to "not set yet",
 * the customer's page stops showing a date, and whoever cleared it owes them a phone call.
 * ============================================================================
 */

export interface EstimatePanelProps {
  readonly project: AdminProjectView;
  /**
   * Refetch the page.
   *
   * A callback rather than a returned project, because this page holds its record through
   * `useResource` and there is no setter to hand one to. Re-reading also picks up the activity
   * entry the change wrote, which a local splice would have left stale beside it.
   */
  readonly onChanged: () => void;
}

/** `2026-09-04`, which is what `<input type="date">` wants and what it gives back. */
function toDateInput(iso: string | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : (date.toISOString().split('T')[0] ?? '');
}

export function EstimatePanel({ project, onChanged }: EstimatePanelProps) {
  const current = toDateInput(project.estimatedCompletionAt);
  const [value, setValue] = useState(current);
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  /*
   * Whether pressing save will send an email. Computed from the two dates rather than from a
   * flag, so it cannot disagree with what the server is about to do.
   */
  const willNotify = current !== '' && value !== '' && value !== current;

  async function save(next: string | null) {
    setPending(true);
    setProblem(null);
    setSaved(null);

    /*
     * Noon UTC rather than midnight, and it is not fussiness. A date input gives back a bare
     * calendar day; parsed as midnight UTC it lands on the previous evening for every reader
     * west of Greenwich — which is most of this business's customers — so the date the client
     * reads is a day earlier than the one the operator typed.
     */
    const result = await setEstimate(project.id, next === null ? null : `${next}T12:00:00.000Z`);

    setPending(false);

    if (!result.success) {
      setProblem(result.error.message);
      return;
    }

    setValue(toDateInput(result.data.project.estimatedCompletionAt));
    onChanged();
    setSaved(
      next === null
        ? 'Cleared. Their project page no longer shows a date.'
        : willNotify
          ? 'Saved, and they have been emailed that the date moved.'
          : 'Saved. They will see it on their project page.',
    );
  }

  return (
    <div className={styles['panel']}>
      <h2 className={styles['subheading']}>Estimated launch</h2>
      <p className={styles['muted']}>
        {project.estimatedCompletionAt
          ? `Currently ${formatDate(project.estimatedCompletionAt)}${
              project.estimateUpdatedBy ? `, last changed by ${project.estimateUpdatedBy}` : ''
            }${project.estimateUpdatedAt ? ` on ${formatDate(project.estimateUpdatedAt)}` : ''}.`
          : 'Not set yet. Their project page shows no date at all until there is one, which is the honest answer early in a build.'}
      </p>

      <div className={styles['inlineForm']}>
        <TextField
          id="estimate-date"
          type="date"
          label="Target launch date"
          hint={
            willNotify
              ? 'This is a change. Saving emails the client to say the date moved.'
              : 'Setting a date for the first time does not email anybody. Moving it later does.'
          }
          value={value}
          disabled={pending}
          onChange={(event) => setValue(event.target.value)}
        />

        <div className={styles['formActions']}>
          <Button
            loading={pending}
            disabled={pending || value === ''}
            onClick={() => void save(value)}
          >
            {willNotify ? 'Save and tell them' : 'Set the date'}
          </Button>

          {project.estimatedCompletionAt ? (
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() => {
                setValue('');
                void save(null);
              }}
            >
              Clear it
            </Button>
          ) : null}
        </div>
      </div>

      {problem ? <Notice tone="problem">{problem}</Notice> : null}
      {saved ? <Notice tone="success">{saved}</Notice> : null}
    </div>
  );
}
