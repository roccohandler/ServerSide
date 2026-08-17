import type { ElementType, ReactNode } from 'react';
import { cx } from './cx';
import styles from './Card.module.css';

/*
 * The one card in the design system.
 *
 * It lived in `Layout.tsx` with the four layout primitives, and it is not layout — it is a
 * surface. That distinction is the reason it now has its own file and its own stylesheet:
 * `Layout.module.css` couples `Section`'s tone to `SectionHeading`'s classes on purpose
 * (`.surfaceBrand .eyebrow`), and a card has no such relationship with anything.
 *
 * Ten stylesheets still hand-roll a `.card` class of their own. Those are the migration
 * this move exists to make possible — see the design-system doc.
 */

export interface CardProps {
  readonly as?: ElementType;
  readonly interactive?: boolean;
  /** Removes padding so an image can sit flush against the card edge. */
  readonly flush?: boolean;
  readonly className?: string;
  readonly children: ReactNode;
}

export function Card({ as: Element = 'div', interactive, flush, className, children }: CardProps) {
  return (
    <Element
      className={cx(
        styles['card'],
        interactive && styles['cardInteractive'],
        flush && styles['cardFlush'],
        className,
      )}
    >
      {children}
    </Element>
  );
}
