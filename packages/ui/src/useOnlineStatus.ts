import { useEffect, useState } from 'react';

/*
 * ============================================================================
 * WHETHER THE BROWSER THINKS IT HAS A NETWORK
 * ============================================================================
 *
 * Nothing in either application read this. Every request already fails usefully — `http.ts`
 * turns a dead network into `NETWORK_ERROR` with a message that names the phone number — so
 * the case for a persistent indicator is narrower than it looks, and worth stating exactly:
 *
 * **`NETWORK_ERROR` answers "that did not work". It does not answer "is it me or is it
 * them?"** And that is the question that decides what somebody does next. A customer who
 * knows their connection has dropped waits and tries again; a customer who thinks the site
 * is broken calls, or leaves.
 *
 * ## What this genuinely detects, said plainly
 *
 * `navigator.onLine` is `false` only when the browser is certain there is no network
 * interface at all — flight mode, a dropped Wi-Fi association, an unplugged cable. It is
 * `true` on a captive portal, on a connection that reaches the router and nothing further,
 * and on any of the ways a network is present and useless.
 *
 * So a `false` here is reliable and a `true` proves nothing. That asymmetry is the whole
 * design: this is used only to *add* an explanation when the browser is sure, and never to
 * suppress or reinterpret a failure. `NETWORK_ERROR` remains the real signal, and it is what
 * the request layer keeps reporting either way.
 *
 * ## Why it is here rather than in either app
 *
 * Behaviour, not appearance — DECISION 027's line, and the same one `useResource`,
 * `useAnnouncerState` and `useDelayedFlag` sit on. Both shells need to know; each draws it
 * in its own voice on its own ground.
 * ============================================================================
 */

export function useOnlineStatus(): boolean {
  /*
   * Read lazily rather than defaulted to `true`, so a page opened while already offline says
   * so on its first paint instead of after the first `offline` event that never comes.
   *
   * Guarded because `navigator` is absent in a non-browser environment, and this hook is
   * reachable from a test renderer.
   */
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    /*
     * Re-read on mount as well as listening. The events fire on a *change*, and between the
     * lazy initialiser above and this effect the state can already have moved — a slow first
     * render on a flaky connection is exactly when that happens.
     */
    setOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return online;
}
