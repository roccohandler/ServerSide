import type { ReactNode } from 'react';
import { useAnnouncerState } from '@jobforge/ui';
import { AnnounceContext } from './useAnnounce';

/*
 * ============================================================================
 * THE CONSOLE'S ONE LIVE REGION
 * ============================================================================
 *
 * Every operation an operator performs here — moving a milestone, saving URLs, adding a
 * task, sending a reply, resolving a thread — changed the page and said nothing. The
 * failures were announced (`role="alert"` on the problem line); the successes were not, so
 * the only surface where a mistake reaches a customer by email was also the one that never
 * confirmed anything had been sent.
 *
 * ## Why the provider is in `App` rather than in `ConsoleLayout`
 *
 * The customer application puts its equivalent inside `AppLayout`, because that layout is
 * lazy and the marketing site has nothing to announce — putting it higher would spend eager
 * bytes on a region no marketing page writes to.
 *
 * Nothing in this bundle is lazy and there is no such trade. Sitting above `Console` means
 * the region exists in *both* of the console's two states, so a sign-in failure and a
 * reply-sent confirmation go through one mechanism rather than one going through a mechanism
 * and the other through whatever the page happened to do.
 *
 * ## `polite`, never `assertive`
 *
 * `assertive` interrupts whatever the reader is in the middle of. Nothing this console does
 * is worth cutting somebody off mid-sentence: the outcomes are confirmations of an action
 * the operator just took, so they can wait for a gap. `role="alert"` remains where it is on
 * the failure lines, which is the one place interruption is right.
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
       *
       * `visually-hidden` rather than a visible strip: the console already shows outcomes
       * visually by updating the thing that changed, and a second visible copy of every
       * confirmation would be noise on a surface built to be scanned.
       */}
      <p className="visually-hidden" aria-live="polite" aria-atomic="true">
        {message}
      </p>
    </AnnounceContext.Provider>
  );
}
