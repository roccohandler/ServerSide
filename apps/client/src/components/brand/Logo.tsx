import type { CSSProperties, ReactNode } from 'react';
import { site } from '../../content';
import styles from './Logo.module.css';
import { cx } from '@jobforge/ui';

/*
 * ============================================================================
 * THE JOBFORGE LOGO
 * ============================================================================
 *
 * Direction B from the brand board — the "Forge Stamp": a solid struck tile with the
 * J and F cut out of it as negative space, and a single ember bar as the spark.
 *
 * ## Why it is drawn here rather than imported as a file
 *
 * The mark has to invert. It sits on the cream page, on white cards and on the charcoal
 * header and footer, and on charcoal the tile takes the cream while the letterforms cut
 * back to charcoal. An `<img>` cannot do that without shipping a second file and keeping
 * the two in step; inline SVG driven by custom properties does it with one class.
 *
 * `public/favicon.svg` is the one deliberate duplicate — a browser tab is requested
 * before any of this code exists, so that copy is hand-written with the same geometry
 * and fixed fills. Change the path data here and change it there too.
 *
 * ## Accessibility
 *
 * The mark is decorative whenever the wordmark is beside it: the name is already in the
 * text, and a second announcement of "JobForge" is noise. `LogoMark` is therefore
 * `aria-hidden` by default and takes a `label` only when it is used on its own.
 * ============================================================================
 */

/** The tile is 88 units inside a 100-unit box, leaving the optical padding the board draws. */
const VIEW_BOX = '0 0 100 100';

export interface LogoMarkProps {
  /**
   * Inverts the stamp for a charcoal ground. Everything else is inherited, so a mark
   * inside a dark band needs this and nothing else.
   */
  readonly onDark?: boolean;
  /**
   * Any CSS length. Defaults to `1em`, which makes the mark scale with the text it sits
   * beside rather than needing a pixel value at every call site.
   */
  readonly size?: string;
  /**
   * Supplying this makes the mark a labelled image instead of decoration. Use it only
   * where the mark appears without the wordmark next to it.
   */
  readonly label?: string;
  readonly className?: string;
}

/** The Forge Stamp on its own. */
export function LogoMark({ onDark, size, label, className }: LogoMarkProps) {
  const classes = cx(styles['mark'], onDark && styles['onDark'], className);

  return (
    <svg
      viewBox={VIEW_BOX}
      className={classes}
      style={size ? ({ '--mark-size': size } as CSSProperties) : undefined}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
      focusable="false"
    >
      {/* The struck tile. */}
      <rect x="6" y="6" width="88" height="88" rx="24" className={styles['tile']} />
      {/* The F's upper arm, tilted forward. */}
      <rect
        x="45"
        y="24.5"
        width="32"
        height="11.5"
        rx="5.75"
        transform="rotate(-14 45 30.25)"
        className={styles['cut']}
      />
      {/* The F's lower arm — the one element that is always ember. */}
      <rect
        x="45"
        y="43"
        width="28"
        height="11.5"
        rx="5.75"
        transform="rotate(-14 45 48.75)"
        className={styles['bar']}
      />
      {/* The J, drawn last so its cap closes over both arms. */}
      <path d="M45 24.5 L45 62 Q45 73 34.5 73" className={styles['stem']} />
    </svg>
  );
}

export interface WordmarkProps {
  /** Defaults to the configured business name. */
  readonly children?: ReactNode;
  readonly className?: string;
}

/**
 * "JobForge" in the Archivo expanded extra-bold cut.
 *
 * The capitals come from `text-transform`, so the text node stays cased — a screen
 * reader says "JobForge", not "J-O-B-F-O-R-G-E".
 */
export function Wordmark({ children, className }: WordmarkProps) {
  return <span className={cx(styles['wordmark'], className)}>{children ?? site.name}</span>;
}

export interface LogoProps extends LogoMarkProps {
  readonly children?: ReactNode;
}

/** The primary lockup: stamp, then wordmark. */
export function Logo({ onDark, size, className, children }: LogoProps) {
  return (
    <span className={cx(styles['lockup'], className)}>
      <LogoMark
        onDark={onDark}
        {...(size ? { size } : {})}
        className={styles['lockupMark'] ?? ''}
      />
      <Wordmark>{children}</Wordmark>
    </span>
  );
}
