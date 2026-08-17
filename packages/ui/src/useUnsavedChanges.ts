import { useCallback, useEffect, useRef, useState } from 'react';

/*
 * ============================================================================
 * DO NOT LOSE WHAT SOMEBODY HAS ALREADY TYPED
 * ============================================================================
 *
 * Five forms can lose everything to a stray click: `/welcome`'s fourteen fields, the
 * twenty-question audit, the forty-point PlayBook assessment, and the console's task and
 * reply boxes. There was no `beforeunload` anywhere in the repository and no `useBlocker`
 * either.
 *
 * ## Two different departures, two different mechanisms
 *
 *   reload · closed tab · typed URL · a link off the site   `beforeunload`
 *   a click on an in-app link                               the capture listener below
 *
 * The second is the one a single-page application makes easy to get wrong, because the
 * document never unloads: clicking "Billing" in the header discards a half-written change
 * request and no browser event fires at all.
 *
 * ## Why this is not `useBlocker`
 *
 * `useBlocker` is react-router's answer and it is the right one on paper. It requires a data
 * router, and **the migration was attempted and reverted on the measurement**:
 * `createBrowserRouter` + `RouterProvider` moved the customer application's eager bundle from
 * 537.9 to 591.9 kB raw — **+16.6 kB gzipped** — because a data router brings loaders,
 * actions, fetchers and revalidation whether or not a single route uses one. This application
 * uses none. Sixteen kilobytes of render-blocking JavaScript on every marketing page, to warn
 * about four forms that all sit behind a sign-in, is not a trade worth making, and
 * `check-budget.ts` refused it. The full numbers are in `apps/client/src/app/App.tsx`.
 *
 * So: a capture-phase listener on the document, about 0.4 kB, and the same protection for
 * the case that actually happens.
 *
 * ## What the listener does and does not catch
 *
 * It catches a click on an `<a href>` that stays on this origin — which is every `Link`,
 * every `NavLink` and every plain anchor, because react-router renders real anchors and
 * intercepts their clicks. Running in the **capture** phase is what makes that work: the
 * listener sees the event before react-router's own handler does, so calling
 * `preventDefault()` and `stopPropagation()` stops the navigation rather than racing it.
 *
 * It deliberately ignores:
 *
 *   - **Modified clicks** (ctrl/cmd/shift/alt) and middle clicks. Those open a new tab; the
 *     page being protected is not going anywhere.
 *   - **`target="_blank"`, `download`, and `#fragment` links.** None of them leave the page.
 *   - **Other origins.** `beforeunload` has those, and it is the browser's own dialog.
 *   - **Programmatic `navigate()`.** Sign-out, and a redirect after a successful submit —
 *     both are the direct consequence of something the reader just chose, and warning about
 *     losing a form to the button that submitted it would be absurd.
 *   - **Back and forward.** `popstate` fires *after* the history entry has already changed,
 *     so "blocking" it means pushing the reader's own entry back, which breaks the button
 *     for everybody who meant it. This is the one genuine gap, it is the same gap
 *     `beforeunload` has, and it is stated rather than implied.
 *
 * ## The browser writes the words for the unload case, not us
 *
 * Every current browser ignores a custom `beforeunload` message and shows its own.
 * `preventDefault()` is the whole API; a `returnValue` string is a fossil. The in-app case is
 * ours, which is why it returns a `pending` href for a caller to render a real dialog around.
 * ============================================================================
 */

export interface UnsavedChanges {
  /**
   * The in-app destination a click was stopped from reaching, or `null`.
   *
   * Render a confirmation while this is set. Both applications do it with `Modal`; the words
   * belong to whichever form is at risk, which is why they are not in here.
   */
  readonly pending: string | null;
  /** Go anyway. Clears the guard first, so the navigation is not blocked a second time. */
  readonly proceed: () => void;
  /** Stay. */
  readonly cancel: () => void;
}

/**
 * @param dirty Whether there is unsaved work worth warning about. Pass `false` the moment a
 *              submission succeeds, or the confirmation itself gets warned about.
 */
export function useUnsavedChanges(dirty: boolean): UnsavedChanges {
  const [pending, setPending] = useState<string | null>(null);

  /*
   * Set for the width of a departure the reader has already confirmed.
   *
   * Without it they are asked twice: once by the dialog this hook raises, and then again by
   * the browser, because `proceed` leaves the page while the form is still dirty and
   * `beforeunload` cannot tell a confirmed departure from an accidental one. A ref rather
   * than state — nothing renders from it, and it has to be readable by a listener that was
   * registered before `proceed` ran.
   */
  const leaving = useRef(false);

  useEffect(() => {
    if (!dirty) return;

    const warn = (event: BeforeUnloadEvent) => {
      if (leaving.current) return;
      event.preventDefault();
    };

    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  useEffect(() => {
    if (!dirty) return;

    const intercept = (event: MouseEvent) => {
      /* A new tab is not a departure. Neither is a middle click or a right click. */
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as Element | null)?.closest?.('a[href]');
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;

      const href = anchor.getAttribute('href') ?? '';
      /* A fragment stays on the page — including every skip link on the site. */
      if (href.startsWith('#')) return;

      /* `anchor.href` is resolved, so this compares real origins rather than spellings. */
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return;
      }

      /*
       * Capture phase, so this runs before react-router's own click handler. Both calls are
       * needed: `preventDefault` stops the browser navigating and `stopPropagation` stops
       * the router doing it in JavaScript.
       */
      event.preventDefault();
      event.stopPropagation();
      setPending(`${url.pathname}${url.search}${url.hash}`);
    };

    document.addEventListener('click', intercept, true);
    return () => document.removeEventListener('click', intercept, true);
  }, [dirty]);

  const cancel = useCallback(() => setPending(null), []);

  const proceed = useCallback(() => {
    const destination = pending;
    setPending(null);
    if (!destination) return;

    leaving.current = true;

    /*
     * A full navigation rather than a router `navigate()`, and that is a deliberate trade
     * rather than a shortcut. This hook lives in `@jobforge/ui`, which must not import a
     * router — it is shared by two applications and the rule is that nothing here knows an
     * application's structure. Taking a `navigate` function as a parameter would push that
     * knowledge onto five call sites to save a page load somebody has just confirmed they
     * want, on the way to abandoning a form.
     */
    window.location.assign(destination);
  }, [pending]);

  return { pending, proceed, cancel };
}
