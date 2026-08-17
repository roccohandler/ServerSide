import { useCallback, useMemo, useState } from 'react';

/*
 * ============================================================================
 * SAYING WHAT JUST HAPPENED, TO SOMEBODY WHO CANNOT SEE IT HAPPEN
 * ============================================================================
 *
 * Approving a website, completing a task, sending a reply from the console and marking a
 * thread resolved all changed the page and announced nothing. For a sighted person the page
 * updating *is* the confirmation; for a screen-reader user pressing "Approve website" —
 * the most consequential control in the product — there was no confirmation at all.
 *
 * This is the state half of the fix. It renders nothing, which is why it is here rather than
 * in either application: the region's markup, its wording and its tone belong to whichever
 * surface owns them (DECISION 027 — behaviour is worth one copy, appearance is worth two),
 * but *when a message counts as new* is a single piece of behaviour and two copies of it
 * would drift the way the two resource hooks already did once.
 *
 * ## The region has to exist before the message does
 *
 * This is the single most common reason a live region announces nothing, and it is why this
 * hook hands back a `message` for a layout to render into an element that is always mounted,
 * rather than handing back an element to mount when there is something to say. A
 * `role="status"` node that appears at the same moment as its text is, to most screen
 * readers, a node that was always empty — the change they are watching for never happened.
 *
 * ## Why the same message twice still announces
 *
 * A live region announces *changes* to its content. Completing two tasks in a row produces
 * "Task marked as done." twice, which is one change followed by no change — so the second
 * one is silent, on the surface where repeating an action is most normal.
 *
 * The fix is a zero-width space appended on alternate calls. It makes the text genuinely
 * different so the region fires, and it is not spoken: U+200B has no pronunciation in any
 * screen reader tested against, unlike the non-breaking space the first version of this
 * used, which VoiceOver reads as a pause.
 * ============================================================================
 */

/** U+200B. Not rendered, not spoken, and enough of a change to re-trigger a live region. */
const NUDGE = '​';

export interface Announcer {
  /**
   * What the layout's live region should currently contain. Empty before anything has
   * happened, which is the correct initial state — a region that starts with text announces
   * it on first paint.
   */
  readonly message: string;
  /**
   * Says something. Pass a whole sentence written for a person: "Website approved. We will
   * put it live and email you." — not "success" and not an error code.
   */
  announce(text: string): void;
}

export function useAnnouncerState(): Announcer {
  const [state, setState] = useState({ text: '', nudged: false });

  const announce = useCallback((text: string) => {
    setState((current) => ({ text, nudged: !current.nudged }));
  }, []);

  return useMemo(
    () => ({ message: state.text ? `${state.text}${state.nudged ? NUDGE : ''}` : '', announce }),
    [state, announce],
  );
}
