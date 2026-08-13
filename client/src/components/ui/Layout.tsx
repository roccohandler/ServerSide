import type { ElementType, Ref, ReactNode } from 'react';
import styles from './Layout.module.css';

/*
 * Layout primitives. Four small components cover every page in the site, which is why
 * no page-level stylesheet needs to invent its own spacing or container width.
 */

function cx(...values: (string | undefined | false)[]): string {
  return values.filter(Boolean).join(' ');
}

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

/* ------------------------------------------------------------------ Card */

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

/* ------------------------------------------------------------------ Badge */

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
