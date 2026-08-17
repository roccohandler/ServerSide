import type { ElementType, Ref, ReactNode } from 'react';
import { cx } from './cx';
import styles from './Layout.module.css';

/*
 * ============================================================================
 * THE LAYOUT PRIMITIVES
 * ============================================================================
 *
 * Four small components cover every page in the site, which is why no page-level
 * stylesheet needs to invent its own spacing or container width.
 *
 * `Card` and `Badge` used to live here and now do not: they are a surface and an
 * indicator, not layout, and nothing in this file relates to them.
 *
 * ## Why `Section` and `SectionHeading` share a file and a stylesheet
 *
 * They are coupled on purpose. `Layout.module.css` carries `.surfaceBrand .eyebrow` and
 * `.surfaceBrand .lede` — a section's tone changing the colours of the heading inside it,
 * because Ember only clears AA as a kicker once the ground is charcoal. CSS Modules hashes
 * class names per file, so splitting these into two stylesheets would leave those
 * selectors referring to names that no longer match anything. They would not error; the
 * kicker would simply stop being ember on dark sections, on the pages that matter most.
 * ============================================================================
 */

/* ------------------------------------------------------------------ Container */

export interface ContainerProps {
  readonly narrow?: boolean;
  readonly className?: string;
  readonly children: ReactNode;
}

export function Container({ narrow, className, children }: ContainerProps) {
  return (
    <div className={cx(styles['container'], narrow && styles['narrow'], className)}>{children}</div>
  );
}

/* ------------------------------------------------------------------ Section */

export type SectionTone = 'default' | 'muted' | 'brand';

export interface SectionProps {
  /** Defaults to `section`; pass `div` when the element is not a landmark on its own. */
  readonly as?: ElementType;
  readonly tone?: SectionTone;
  readonly tight?: boolean;
  /** Anchor target for in-page navigation. */
  readonly id?: string;
  /** Ties the section to its own heading for assistive technology. */
  readonly labelledBy?: string;
  /**
   * Forwarded to the rendered element. Exists so a whole section can be watched by
   * `useInViewOnce` — "did anybody scroll this far" — without wrapping it in a div that
   * means nothing. React 19 passes `ref` as an ordinary prop, so no forwardRef is needed.
   */
  readonly ref?: Ref<HTMLElement>;
  readonly className?: string;
  readonly children: ReactNode;
}

export function Section({
  as: Element = 'section',
  tone = 'default',
  tight,
  id,
  labelledBy,
  ref,
  className,
  children,
}: SectionProps) {
  return (
    <Element
      id={id}
      ref={ref}
      aria-labelledby={labelledBy}
      className={cx(
        styles['section'],
        tight && styles['sectionTight'],
        tone === 'muted' && styles['surfaceMuted'],
        tone === 'brand' && styles['surfaceBrand'],
        className,
      )}
    >
      {children}
    </Element>
  );
}

/* ------------------------------------------------------------------ SectionHeading */

export interface SectionHeadingProps {
  /** Required: it is what `Section`'s `aria-labelledby` points at. */
  readonly id: string;
  readonly eyebrow?: string;
  readonly title: string;
  readonly lede?: string;
  /** Heading rank. Sections inside a page are `h2`; a page's own title passes `1`. */
  readonly level?: 1 | 2 | 3;
  readonly centred?: boolean;
}

export function SectionHeading({
  id,
  eyebrow,
  title,
  lede,
  level = 2,
  centred,
}: SectionHeadingProps) {
  const Heading = `h${level}` as const;

  return (
    <div className={cx(styles['heading'], centred && styles['headingCentred'])}>
      {eyebrow ? <span className={styles['eyebrow']}>{eyebrow}</span> : null}
      <Heading id={id}>{title}</Heading>
      {lede ? <p className={styles['lede']}>{lede}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ Grid */

export interface GridProps {
  readonly columns?: 2 | 3;
  readonly as?: ElementType;
  readonly className?: string;
  readonly children: ReactNode;
}

export function Grid({ columns = 3, as: Element = 'div', className, children }: GridProps) {
  return (
    <Element
      className={cx(
        styles['grid'],
        columns === 2 ? styles['gridTwo'] : styles['gridThree'],
        className,
      )}
    >
      {children}
    </Element>
  );
}
