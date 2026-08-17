import type { ReactNode } from 'react';
import { cx } from './cx';
import styles from './Badge.module.css';

/*
 * A small status or category marker.
 *
 * Like `Card`, it was filed under layout and is not layout — it is an indicator. Its three
 * tones are the whole vocabulary, and each is an independently measured contrast pair: the
 * accent tone uses `--color-accent-text` rather than `--color-accent` because only the
 * former clears AA on that tint. `tokens.test.ts` checks that from the real hex values, so
 * a fourth tone that does not clear it cannot be added quietly.
 */

export interface BadgeProps {
  readonly tone?: 'neutral' | 'brand' | 'accent';
  readonly className?: string;
  readonly children: ReactNode;
}

export function Badge({ tone = 'neutral', className, children }: BadgeProps) {
  const toneClass = {
    neutral: styles['badgeNeutral'],
    brand: styles['badgeBrand'],
    accent: styles['badgeAccent'],
  }[tone];

  return <span className={cx(styles['badge'], toneClass, className)}>{children}</span>;
}
