/*
 * ============================================================================
 * THE WORDS THE WORKSPACE SAYS ABOUT ITSELF
 * ============================================================================
 *
 * A note about where this sits, because it is a partial exception to a rule `CLAUDE.md`
 * states without qualification.
 *
 * "Every word lives in `apps/client/src/content/`" is true of the **marketing site**, which
 * is what that rule was written for: twenty-four modules, eleven thousand lines, and a
 * content edit that never touches a component. It has never been true of `features/private`,
 * which writes its prose inline — "Nothing is waiting on you", "We could not load that",
 * every panel body on every workspace page. Nobody decided that; the portal was built later,
 * under a different habit, and the rule was not revisited.
 *
 * This module does not resolve that split and does not quietly widen it. What lands here is
 * the copy that is **shared across workspace screens** — the same sentence said in more than
 * one place, where two copies would drift. Copy that belongs to one screen stays with that
 * screen, which is where the portal already keeps it.
 *
 * The distinction is the same one that decides everything else in this repository: a thing
 * with two consumers lives above both of them, a thing with one lives with its consumer.
 *
 * ## Announcements are copy, and this is why they are here rather than inline
 *
 * Every string under `announce` is read aloud to somebody who cannot see the page change.
 * That makes the wording load-bearing in a way a visible label is not: a sighted customer who
 * reads "Approved" also sees the panel change, and a screen-reader user gets only the
 * sentence. So they say what happened *and* what follows from it, and they are written once
 * rather than at each call site, where the second one would inevitably be terser than the
 * first.
 * ============================================================================
 */

export const workspace = {
  /**
   * What a screen reader hears when an action finishes.
   *
   * Whole sentences, in the customer's language, never a status word. "Success" tells
   * somebody that something worked and nothing about what is now true.
   */
  announce: {
    /*
     * Says what follows from it, which is the whole rule for this block — and here that is
     * the part the customer most needs: agreeing is what makes the deposit payable, and a
     * screen-reader user who hears only "Agreed" has been told nothing about what changed.
     */
    scopeAccepted:
      'Scope agreed. The deposit is on your billing page now, and nothing is charged until you pay it.',
    approved: 'Website approved. We are putting it live and will email you when it is up.',
    changesRequested:
      'Changes requested. We have it and will come back to you — nothing goes live in the meantime.',
    taskCompleted: 'Marked as done. Thank you — that is one less thing we are waiting on.',
    commentSent: 'Your message is sent. We reply within one business day.',
    assessmentSaved: 'Your answers are saved. Your score is on this page now.',
    profileSaved: 'Your details are saved.',
    passwordChanged: 'Your password is changed.',
    verificationSent: 'Verification email sent. Check your inbox.',
  },

  /**
   * The states the workspace can be in that are not about one screen.
   *
   * `offline` is deliberately not alarming. Losing a connection is ordinary, it usually comes
   * back on its own, and nothing has been lost when it does — which is what the second
   * sentence is for.
   */
  offline: {
    title: 'You are offline.',
    body: 'We will keep trying. Anything you have typed is still here.',
    announce: 'You are offline. We will keep trying.',
    restoredAnnounce: 'You are back online.',
  },
} as const;
