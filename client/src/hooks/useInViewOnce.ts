import { useCallback, useEffect, useRef } from 'react';

/**
 * Calls `onEnter` the first time the element is scrolled into view, then stops watching.
 *
 * Used for "did anybody get this far down the page" events. It is deliberately separate
 * from `components/ui/Reveal.tsx`, which looks similar but answers a different question:
 * Reveal starts an element *visible* when the visitor has asked for reduced motion, and
 * reusing it here would mean those visitors silently never reported a view. Measurement
 * and motion have nothing to do with each other, so they do not share a code path.
 *
 * A browser without IntersectionObserver simply never reports. That is a gap in the
 * data, not a gap in the page.
 *
 * @returns a ref callback to attach to the element being watched.
 */
export function useInViewOnce(onEnter: () => void): (node: Element | null) => void {
  const latest = useRef(onEnter);
  const observer = useRef<IntersectionObserver | null>(null);
  const observed = useRef<Element | null>(null);

  /*
   * The usual latest-ref pattern. Without it the returned callback would have to depend
   * on `onEnter`, and every call site passing an inline arrow function would detach and
   * re-observe its element on every render.
   */
  useEffect(() => {
    latest.current = onEnter;
  });

  useEffect(() => {
    return () => {
      observer.current?.disconnect();
      observer.current = null;
    };
  }, []);

  return useCallback((node: Element | null) => {
    if (node === observed.current) return;

    observer.current?.disconnect();
    observer.current = null;
    observed.current = node;

    if (!node || typeof IntersectionObserver === 'undefined') return;

    const created = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        created.disconnect();
        observer.current = null;
        latest.current();
      },
      { threshold: 0.25 },
    );

    created.observe(node);
    observer.current = created;
  }, []);
}
