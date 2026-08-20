/*
 * ============================================================================
 * TELLING SOMEBODY SOMETHING HAPPENED
 * ============================================================================
 *
 * Six services need to reach a person: `projects`, `tasks`, `feedback`, `deployments`,
 * `billing` and `assessments`. Before this feature existed, four of them imported no email
 * service at all — so the four moments a customer most needs to hear about produced a
 * correct, durable, attributed state change that the customer found out about only if they
 * happened to sign in.
 *
 * ## Why this is a feature and not a method on each service
 *
 * Six services each building their own message is six opinions on tone, six places the
 * from-address is decided, and six answers to "does this one get an unsubscribe link". The
 * repository already made this argument once, about colour, and answered it with
 * `lib/emailTheme.ts`. This is the same answer applied to *what* is said rather than how it
 * looks.
 *
 * Putting it in `infrastructure/email` would be wrong in the other direction: that layer is a
 * transport. It knows how to hand a message to Resend and it must never learn what a milestone
 * is.
 *
 * ## Its shape is `BillingFulfillment`'s, deliberately
 *
 * A port, injected, defaulting to a no-op, that **never throws**. The rule stated at length in
 * `billing.service.ts` applies here unchanged and for exactly the same reason: every call site
 * is a business operation that has already succeeded, and failing a milestone transition
 * because a mail server was briefly unreachable would turn a cosmetic problem into a lost state
 * change. The failure is logged loudly instead.
 *
 * This is also why the port is optional on every consumer. The existing tests for those
 * services are about domain state and have no mail to assert; requiring a stub would have meant
 * editing every one of them, which is churn rather than coverage.
 *
 * ## It does not own read state
 *
 * A notification is an outbound act. Whether somebody has *read* something is a property of the
 * reader, and it is answered by a marker on the user document against the activity stream —
 * see `auth/user.model.ts`. There is deliberately no per-notification row, because every event
 * this feature sends is already an `ActivityType`, and a second collection describing the same
 * events would be a second definition of what happened. `features/conversations` refused the
 * same thing for the same reason.
 * ============================================================================
 */

/**
 * Who a message is for.
 *
 * The distinction is not decorative — it decides deliverability obligations. `transactional`
 * is a message about something the recipient did or bought and is exempt from an unsubscribe
 * requirement; `digest` is a summary the owner asked for and can stop. Nothing in this feature
 * sends marketing mail; that is `features/followup`, which has its own suppression rules.
 */
export const NOTIFICATION_AUDIENCES = ['customer', 'owner'] as const;

export type NotificationAudience = (typeof NOTIFICATION_AUDIENCES)[number];

/**
 * Every notification this system can send, and who it goes to.
 *
 * Named `noun.past_tense` to match `ACTIVITY_TYPES`, because most of these pair one-to-one with
 * an activity entry and two vocabularies for one event is how a report becomes unreadable. The
 * ones that do not pair are named the same way anyway.
 *
 * **Adding a name here is cheap; renaming one is not.** These strings appear in logs, and a log
 * search six months from now is grouped by them.
 */
export const NOTIFICATION_KINDS = [
  /* ---------------------------------------------------------------- customer */
  /**
   * The scope and price are written up and waiting to be accepted. DECISION 040.
   *
   * First in the list because it is first in the project: nothing else here can happen until
   * this one has been read, since an unaccepted scope means no deposit button.
   */
  'scope.ready',
  /** A preview exists and is worth looking at. The build waits on this one. */
  'preview.ready',
  /** Their changes are done and the site is waiting on their approval. */
  'approval.requested',
  /** Something is needed from them. Coalesced when several arrive at once — see below. */
  'tasks.assigned',
  /** Somebody on this side answered them. */
  'feedback.replied',
  /** It is up. */
  'project.launched',
  /** The launch instalment is now owed. */
  'payment.due',
  /*
   * ==========================================================================
   * THERE IS DELIBERATELY NO `payment.received`
   * ==========================================================================
   *
   * It was declared here and removed before anything called it, which is the shortest possible
   * life for a speculative surface and exactly what `CLAUDE.md` rule 6 asks for.
   *
   * Two things already tell a customer their payment worked, and both are better than a third
   * email would be. **Stripe sends the receipt** — it has the amount, the card, the invoice and
   * a legal footer, and it is the document somebody keeps; ours would be a worse copy arriving
   * seconds later. And on the one payment that changes anything, the deposit, `tasksAssigned`
   * fires within the same webhook and says something the receipt cannot: what happens next.
   *
   * `payment.failed` below stays, because the asymmetry is real. A receipt is a record. A failed
   * card is a thing the customer has to *do* something about, and Stripe's dunning mail is
   * about an invoice rather than about their website.
   * ==========================================================================
   */
  /** A payment did not go through and something will stop unless it is fixed. */
  'payment.failed',
  /** The target launch date moved. Sent on movement only — never on the first estimate. */
  'estimate.changed',
  /** A file was sent to them. */
  'file.delivered',
  /**
   * The website review they asked for has been written and published.
   *
   * The single most important message this system sends, because it is the one the primary
   * call to action promised. Everything else here reports on work somebody has already paid
   * for; this one is the delivery of the free thing that earns the right to ask.
   */
  'assessment.delivered',
  /** A monthly Website Performance Report was published. Growth Partner's deliverable. */
  'report.published',
  /* ------------------------------------------------------------------- owner */
  /**
   * A client accepted their scope and price, so the deposit is now payable.
   *
   * Immediate rather than digest, and it is the earliest of the three that are: it is the
   * moment a conversation becomes a project, and the owner's next action — watching for the
   * deposit, or invoicing if the figure was bespoke — depends on knowing.
   */
  'owner.scope_accepted',
  /**
   * A deposit was paid twice — two checkout tabs, one of which has to be refunded.
   *
   * Immediate, and the most time-sensitive owner alert here: it is the only one about money
   * that has to go *back*. A customer who spots the second charge before we do has a
   * considerably worse morning than one who gets an unprompted refund.
   */
  'owner.duplicate_payment',
  /** A client approved their website. */
  'owner.approved',
  /** A client asked for changes. */
  'owner.changes_requested',
  /** A client has finished everything that was blocking the build. */
  'owner.tasks_cleared',
  /**
   * A client wrote something on their project.
   *
   * Digest-tier, unlike `owner.changes_requested` immediately above it, and the two being
   * different is deliberate. A comment is often "looks great, one small thing" and it always
   * lands in the console inbox, which is the surface built to answer who is waiting. Requesting
   * changes is the same person saying the same thing through the button that *stops the build*.
   * The button is the signal; the sentence is the detail.
   */
  'owner.comment_received',
  /** A client uploaded something. */
  'owner.file_received',
  /** An onboarding submission arrived that matches no project. */
  'owner.onboarding_unmatched',
] as const;

export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

/**
 * Which notifications go out the moment they happen, and which wait for the digest.
 *
 * ============================================================================
 * THE SPLIT, AND WHY IT IS DATA RATHER THAN AN `IF`
 * ============================================================================
 *
 * Everything to a **customer** is immediate, without exception. A customer receives a handful
 * of messages across an entire project, every one of them is about something they are waiting
 * for or being asked for, and batching any of them would mean deliberately delaying the thing
 * that unblocks the work.
 *
 * The **owner** is the one who needs a split, because the owner is on the receiving end of
 * every customer's every action at once. The rule is: *money, and anything where somebody is
 * now waiting on a reply, is immediate. Everything else is a summary.*
 *
 * This is a table rather than a condition at each call site so that "what interrupts the
 * owner's day" is one list somebody can read and argue with, rather than a property distributed
 * across six services.
 *
 * **DECISION 028.1 is superseded here.** It chose an immediate email on every account
 * creation, and said so with the reason: "At this volume every account is worth knowing about;
 * if that stops being true the answer is a digest, not a flag." A public launch is that moment.
 * Account creation moves to the digest; nothing else about the capture changes.
 * ============================================================================
 */
export const IMMEDIATE_KINDS: readonly NotificationKind[] = [
  /* Every customer notification. Listed rather than derived, so the exception is visible. */
  'scope.ready',
  'preview.ready',
  'approval.requested',
  'tasks.assigned',
  'feedback.replied',
  'project.launched',
  'payment.due',
  'payment.failed',
  'estimate.changed',
  'file.delivered',
  'assessment.delivered',
  'report.published',
  /* Owner: somebody is now waiting on a reply, or money moved. */
  'owner.changes_requested',
  'owner.duplicate_payment',
  'owner.scope_accepted',
  'owner.approved',
  'owner.tasks_cleared',
];

/** True when this kind interrupts; false when it waits for the daily summary. */
export function isImmediate(kind: NotificationKind): boolean {
  return IMMEDIATE_KINDS.includes(kind);
}
