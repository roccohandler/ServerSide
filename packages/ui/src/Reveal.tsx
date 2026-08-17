import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from 'react';
import styles from './Reveal.module.css';
import { cx } from './cx';

/*
 * A viewport-triggered fade and rise.
 *
 * ## The stagger is a claim about the content, so it is opt-in
 *
 * This component's comment used to say it existed "to walk the reader through the six
 * components of the offer rather than to decorate the page". By the time anybody checked,
 * it was on thirty-three lists across twenty-four files and thirty-two of them were
 * staggered — including sets of cards with no order at all.
 *
 * A staggered reveal says *these arrive in this order because the order means something*.
 * On the funnel, the launch timeline and the twenty improvements, that is true and the
 * motion is carrying information the layout cannot. On a three-column grid of service
 * categories it is a sequence the reader then has to wait out: 460ms of transition plus
 * up to 420ms of delay before the last card is readable, to communicate an order that
 * does not exist.
 *
 * So `sequence` replaced `index`. Passing it means "this is step N of something ordered",
 * and it is the only thing that produces a delay. Everything else fades in place, at
 * once. The rename was the point — it made all thirty-three call sites a type error, so
 * each one had to be looked at rather than left as whatever it already was.
 *
 * ## Why this and not an animation library
 *
 * The whole site is three runtime dependencies and a stated promise that it loads fast on
 * a phone. A motion library would be tens of kilobytes to move a handful of elements
 * fourteen pixels — the wrong trade on a page whose pitch is speed. An IntersectionObserver
 * and a CSS transition do the same job at no measurable cost.
 *
 * ## Why it can never hide content
 *
 * The hidden state is opt-in, decided once before the first paint:
 *
 *   - if the visitor has asked for reduced motion, the element starts visible and no
 *     observer is ever created;
 *   - if IntersectionObserver is missing, the element starts visible;
 *   - otherwise the element starts hidden and the observer reveals it, then disconnects.
 *
 * A browser that cannot run the effect still renders the page in full.
 */

/** Stagger between siblings. Capped so a long group never becomes a slow queue. */
const STAGGER_MS = 70;
const MAX_STAGGER_STEPS = 6;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export interface RevealProps {
  /** Defaults to `div`. Pass `li` inside a list so the markup stays valid. */
  readonly as?: ElementType;
  /**
   * Position in an **ordered** sequence, and the only thing that staggers the reveal.
   *
   * Pass it inside an `<ol>` — a funnel, a timeline, a numbered method — where arriving
   * in order is the information. Leave it off everywhere else: an unordered set that
   * animates in sequence makes the reader wait for an order that is not there.
   */
  readonly sequence?: number;
  readonly className?: string;
  readonly children: ReactNode;
}

export function Reveal({ as: Element = 'div', sequence = 0, className, children }: RevealProps) {
  const nodeRef = useRef<HTMLElement | null>(null);

  /*
   * A callback ref rather than an object ref: `Element` can be any tag, and a callback
   * that accepts the base `HTMLElement` satisfies every one of them without a cast.
   */
  const attach = useCallback((node: HTMLElement | null) => {
    nodeRef.current = node;
  }, []);

  // Decided once, before the first paint, so an element is never briefly hidden from
  // somebody who asked for no motion.
  const [isVisible, setIsVisible] = useState(
    () => prefersReducedMotion() || typeof IntersectionObserver === 'undefined',
  );

  useEffect(() => {
    if (isVisible) return;

    const node = nodeRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setIsVisible(true);
        observer.disconnect();
      },
      // A little of the element has to be on screen; anything already scrolled past on
      // load intersects immediately.
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [isVisible]);

  const delay = Math.min(sequence, MAX_STAGGER_STEPS) * STAGGER_MS;

  return (
    <Element
      ref={attach}
      className={cx(styles['reveal'], isVisible && styles['visible'], className)}
      style={{ '--reveal-delay': `${delay}ms` } as CSSProperties}
    >
      {children}
    </Element>
  );
}
