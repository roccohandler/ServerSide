import type { ReactNode } from 'react';
import { useAnnouncerState } from '@jobforge/ui';
import { AnnounceContext } from './useAnnounce';

/*
 * ============================================================================
 * THE WORKSPACE'S ONE LIVE REGION
 * ============================================================================
 *
 * Approving a website, completing a task, asking for changes and sending a comment all
 * changed the page and announced nothing. For a sighted customer the page updating *is* the
 * confirmation; for somebody using a screen reader, pressing "Approve website" — the single
 * most consequential control in the product, and the one the page describes as
 * irreversible — produced silence.
 *
 * The failures were announced already: `Notice` with the `problem` tone carries
 * `role="alert"`. It was the successes that had nothing, which is the harder half to notice
 * precisely because everything worked.
 *
 * ## Why the provider is in `AppLayout` rather than in `App`
 *
 * The console puts its equivalent above everything, because that bundle is not split and
 * there is no trade. Here there is: `App` wraps the marketing site as well, and no marketing
 * page announces anything, so a region mounted there would be eager weight for a feature the
 * whole public surface never uses. `AppLayout` is lazy and is the shell every page that
 * announces renders inside.
 *
 * ## `polite`, never `assertive`
 *
 * `assertive` interrupts whatever the reader is in the middle of. Nothing here is worth
 * cutting somebody off mid-sentence for: these are confirmations of an action the customer
 * just took, so they can wait for a gap. `role="alert"` stays where it is on the failures,
 * which is the one place interruption is right.
 * ============================================================================
 */

export function AnnouncerProvider({ children }: { readonly children: ReactNode }) {
  const { message, announce } = useAnnouncerState();

  return (
    <AnnounceContext.Provider value={announce}>
      {children}
      {/*
       * Always mounted, and empty until there is something to say. A region that appears at
       * the same moment as its text is a region most screen readers never announce — see the
       * note in `useAnnouncerState`.
       */}
      <p className="visually-hidden" aria-live="polite" aria-atomic="true">
        {message}
      </p>
    </AnnounceContext.Provider>
  );
}
