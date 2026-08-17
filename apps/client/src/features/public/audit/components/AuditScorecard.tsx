import { Button } from '@jobforge/ui';
import { audit } from '../../../../content/audit';
import { playbook } from '../../../../content/playbook';
import { ScoreScale } from '../../../../components/patterns/ScoreScale';
import type { CategoryScore } from '../../playbook/useWebsiteScore';
import type { UseAuditResult } from '../useAudit';
import styles from '../Audit.module.css';

/*
 * The twenty questions, the running total, and the reset.
 *
 * Extracted from `AuditPage` so the private application can render the same assessment
 * inside the customer workspace. The alternative was linking a signed-in customer out to
 * the public marketing page, which is how somebody ends up on a page selling them
 * something they have already bought, with no obvious way back to their project.
 *
 * Nothing about this component is public-only: it is the assessment itself, and the two
 * surfaces differ in what surrounds it — a marketing hero on one, a workspace shell on
 * the other. Sharing it is what stops the two versions of the assessment drifting into
 * scoring the same website differently, which is exactly the drift `useAudit` already
 * refuses to allow between the audit and the PlayBook.
 */

export interface AuditScorecardProps {
  readonly state: UseAuditResult;
  /** The `id` of the heading this section is labelled by. */
  readonly headingId: string;
  /**
   * Rendered above the questions. The public page puts its step label and marketing
   * lede here; the private one puts a shorter instruction.
   */
  readonly intro?: React.ReactNode;
}

export function AuditScorecard({ state, headingId, intro }: AuditScorecardProps) {
  const { scorecard } = playbook;

  return (
    <>
      {intro}

      <p className={styles['instructions']}>{audit.assessment.instructions}</p>

      <ul className={styles['scale']}>
        {scorecard.scale.map((point) => (
          <li key={point.value} className={styles['scalePoint']}>
            <span className={styles['scaleValue']}>{point.value}</span>
            {point.label}
          </li>
        ))}
      </ul>

      <div className={styles['totalPanel']}>
        <p className={styles['total']} aria-live="polite">
          <span className={styles['totalValue']}>{state.total}</span>
          <span className={styles['totalMax']}> / {state.maxTotal}</span>
        </p>
        <p className={styles['totalProgress']}>
          {state.answered} of {state.categoryCount} {audit.assessment.progressLabel}
        </p>
        {state.hasStarted ? (
          <Button type="button" variant="ghost" onClick={state.reset}>
            {audit.assessment.resetLabel}
          </Button>
        ) : null}
      </div>

      <ol className={styles['categories']} aria-labelledby={headingId}>
        {state.categories.map((category) => {
          const current = state.scores[category.id];
          const promptId = `audit-${category.id}-prompt`;

          return (
            <li key={category.id} className={styles['category']}>
              <fieldset className={styles['fieldset']} aria-describedby={promptId}>
                <legend className={styles['legend']}>{category.label}</legend>
                <p id={promptId} className={styles['prompt']}>
                  {category.prompt}
                </p>

                <ScoreScale
                  group={`audit-${category.id}`}
                  points={scorecard.scale}
                  selected={current}
                  onSelect={(value: number) => state.setScore(category.id, value as CategoryScore)}
                />
              </fieldset>
            </li>
          );
        })}
      </ol>

      <p className={styles['storageNote']}>{audit.assessment.storageNote}</p>
    </>
  );
}
