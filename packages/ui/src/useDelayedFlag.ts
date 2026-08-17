import { useEffect, useState } from 'react';

/*
 * ============================================================================
 * TRUE ONLY IF THIS IS TAKING LONGER THAN IT SHOULD
 * ============================================================================
 *
 * Both applications argued, in five separate comments, that a loading indicator which
 * appears for thirty milliseconds is worse than no indicator at all:
 *
 *   SiteLayout   "The chunk is small and same-origin, so it lands in a frame or two on any
 *                 real connection, and a spinner that appears for 30ms is more distracting
 *                 than nothing at all."
 *   RequireAuth  "…a spinner that appears for 40ms is more distracting than nothing."
 *   admin/App    "Deliberately blank rather than a spinner. This resolves in one request
 *                 against a cookie the browser already has."
 *
 * Every one of those is correct, and every one of them is an argument about the *fast* case
 * that was applied to all cases. On a cold cache, a slow connection, or the first visit
 * after a deploy, the same reasoning produces a blank content area for as long as it takes —
 * with nothing on screen and nothing announced.
 *
 * This is the distinction those comments were reaching for. Below the threshold nothing is
 * shown, exactly as before; above it, something is. The fast path is unchanged, which is why
 * this is a fix rather than a reversal.
 *
 * ## One number, in one place
 *
 * It is here rather than in either application because it is behaviour, and because two
 * copies of a threshold is how one of them becomes 400 and the other 300 with nobody
 * noticing — the same drift `useResource`'s header describes, and the reason DECISION 027
 * puts behaviour in this package and appearance in the apps.
 * ============================================================================
 */

/**
 * Long enough that no healthy same-origin request or warm chunk ever reaches it, short
 * enough that somebody who *is* waiting is not left looking at nothing.
 *
 * 400ms rather than the ~100ms a person can distinguish, because the cost of being wrong in
 * each direction is not symmetrical: a fallback that flashes is noise on every navigation,
 * and a fallback that is late by a quarter of a second is invisible.
 */
const DEFAULT_DELAY_MS = 400;

/**
 * @param active Whether the thing being waited for is still pending.
 * @returns `false` until `active` has been true for the delay, then `true`. Resets the
 *          moment `active` goes false, so a fast resolution never shows anything at all.
 */
export function useDelayedFlag(active: boolean, delayMs: number = DEFAULT_DELAY_MS): boolean {
  const [elapsed, setElapsed] = useState(false);

  useEffect(() => {
    if (!active) {
      /*
       * Reset on the way down as well as up. Without this, a second load that resolves
       * quickly would show the fallback immediately, because the flag was left true by the
       * slow one before it.
       */
      setElapsed(false);
      return;
    }

    const timer = setTimeout(() => setElapsed(true), delayMs);
    return () => clearTimeout(timer);
  }, [active, delayMs]);

  return active && elapsed;
}
