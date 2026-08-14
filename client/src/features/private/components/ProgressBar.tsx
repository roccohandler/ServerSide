import { useId } from 'react';
import styles from './Cards.module.css';

export interface ProgressBarProps {
  readonly step: number;
  readonly total: number;
  readonly label: string;
}

/**
 * How far along the build is.
 *
 * A real `progressbar` role, which needs two separate things and is usually only given
 * one:
 *
 *   - a **name** — what is being measured. Supplied by `aria-labelledby` pointing at the
 *     visible caption, so the accessible name is the text on the screen rather than a
 *     second copy of it in an `aria-label` that drifts.
 *   - a **value** — where it has got to. `aria-valuenow` is the number; `aria-valuetext`
 *     is what a screen reader actually says, because "3" is less useful than "step 3 of
 *     eight" to somebody who cannot see the bar.
 */
export function ProgressBar({ step, total, label }: ProgressBarProps) {
  const labelId = useId();
  const percent = Math.round((step / total) * 100);

  return (
    <div className={styles['progress']}>
      <div
        className={styles['progressTrack']}
        role="progressbar"
        aria-labelledby={labelId}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={step}
        aria-valuetext={label}
      >
        <div className={styles['progressFill']} style={{ width: `${percent}%` }} />
      </div>
      <p id={labelId} className={styles['progressLabel']}>
        {label}
      </p>
    </div>
  );
}
