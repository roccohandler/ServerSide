import { useEffect, useState } from 'react';

/**
 * Reports which of a set of elements is currently the one being read.
 *
 * Used by the PlayBook's stage navigation so the current stage is highlighted as somebody
 * scrolls. Built from IntersectionObserver and about thirty lines, for the same reason
 * `Reveal` is: a scroll-spy library would be a runtime dependency bought with nothing on
 * a site whose own PlayBook argues about page weight.
 *
 * Two behaviours worth knowing:
 *
 *   - It returns `null` until something is genuinely in view, so the navigation starts
 *     with nothing highlighted rather than guessing at the first item.
 *   - Where several sections are visible at once — which happens constantly on a tall
 *     screen — the topmost wins, because that is the one the reader is working through.
 *
 * A browser without IntersectionObserver simply never highlights. The links still work,
 * which is the part that matters.
 *
 * @param ids Element ids to watch, in document order.
 */
export function useActiveSection(ids: readonly string[]): string | null {
  const [activeId, setActiveId] = useState<string | null>(null);

  // A stable key, so re-rendering with an inline array literal does not re-observe.
  const key = ids.join('|');

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;

    const watched = key
      .split('|')
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);

    if (watched.length === 0) return;

    const visible = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }

        /*
         * Topmost visible section wins. Resolved against the original id order rather
         * than the observer's callback order, which is not guaranteed to be positional.
         */
        const next = watched.find((element) => visible.has(element.id));
        setActiveId(next ? next.id : null);
      },
      {
        /*
         * A band across the upper-middle of the viewport. Without it, a tall section is
         * "intersecting" for its entire length and the highlight never moves on.
         */
        rootMargin: '-20% 0px -60% 0px',
      },
    );

    for (const element of watched) observer.observe(element);

    return () => observer.disconnect();
  }, [key]);

  return activeId;
}
