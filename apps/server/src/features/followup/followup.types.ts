/*
 * ============================================================================
 * FOLLOW-UP — FOUR RULES, NOT A CAMPAIGN ENGINE
 * ============================================================================
 *
 * Somebody creates an account, does not finish, and is never heard from again. That is the
 * single largest hole in the funnel DECISION 028 built: the account-first capture works —
 * a person who stops after the credential form has still left a name and an address — and
 * until this feature existed, nothing ever used the address.
 *
 * ## What this is deliberately not
 *
 * Not a campaign engine. There are no segments, no templates in a database, no A/B split, no
 * scheduling UI and no sequence builder. There is a **table of four rules in this file**, and
 * changing when somebody is emailed is a diff somebody reviews.
 *
 * That is the same argument `notification.types.ts` makes about `IMMEDIATE_KINDS`: what
 * interrupts a person is a list a human should be able to read in one screen and disagree
 * with. A rules engine moves that list somewhere nobody reads it.
 *
 * ## Everything anchors on the signup date, on purpose
 *
 * The obvious design measures the second track from the assessment request rather than from
 * the account, and it is worse. Two anchors means two clocks, and the day a rule misfires the
 * question "how long had this person been waiting?" has two answers that need reconciling
 * against a record nobody kept. One clock, started when the account was created, is the thing
 * everybody already agrees on.
 *
 * The tracks stay honest because a rule is chosen from the account's **current** state at
 * evaluation time, not from what it was on the day the clock started. Somebody who requests
 * on day two is in the second track by day three.
 *
 * ## The four rules, and the reasoning for each interval
 *
 * Day 1 and day 4 for an account that never asked for anything: the first is while they still
 * remember signing up, the second is the last honest one. Day 3 and day 10 for an account that
 * asked and did not buy: three days is roughly when a review has been read and thought about,
 * and ten is a fortnight of working days later.
 *
 * **Two emails is the cap and it is enforced separately from the table** — see
 * `FOLLOWUP_CAP`. Four rules exist and no account can receive more than two of them, because
 * the mixed case (nudged on day 1, requests on day 2, now in the other track) would otherwise
 * collect three.
 * ============================================================================
 */

/** Which state an account is in. Chosen fresh on every run, never stored. */
export const FOLLOWUP_TRACKS = ['no-request', 'no-purchase'] as const;

export type FollowUpTrack = (typeof FOLLOWUP_TRACKS)[number];

export interface FollowUpRule {
  /**
   * The idempotency key, stored with every send.
   *
   * Renaming one re-sends it to everybody who already had it. That is the whole correctness
   * property of this feature, so these strings are as good as immutable — add a rule rather
   * than adjust one.
   */
  readonly key: string;
  readonly track: FollowUpTrack;
  /** Days since the account was created. See the note above about one clock. */
  readonly afterDays: number;
  readonly subject: string;
  readonly heading: string;
  /** Body paragraphs. Plain sentences; the builder handles both halves of the message. */
  readonly lines: readonly string[];
  readonly action: { readonly label: string; readonly path: string };
}

/**
 * How many follow-ups one account may ever receive, across every rule and every track.
 *
 * Two, and then a person. A third automated email to somebody who has ignored two is not
 * persistence, it is spam with a schedule — and the address it burns is one the business
 * paid to acquire.
 */
export const FOLLOWUP_CAP = 2;

export const FOLLOWUP_RULES: readonly FollowUpRule[] = [
  {
    key: 'no-request-day-1',
    track: 'no-request',
    afterDays: 1,
    subject: 'Your free website assessment is still waiting',
    heading: 'Ready when you are',
    lines: [
      'You made an account yesterday and did not get as far as asking for your assessment. It takes about a minute — the address of your website, and what you would like it to do better.',
      'We look at it by hand and write back with what is worth fixing and why. There is nothing to pay and no call to sit through.',
    ],
    action: { label: 'Ask for my assessment', path: '/app/assessment/request' },
  },
  {
    key: 'no-request-day-4',
    track: 'no-request',
    afterDays: 4,
    subject: 'Still happy to look at your website',
    heading: 'The offer stands',
    lines: [
      'This is the last we will send about it. Your account is there whenever you want it, and the free assessment does not expire.',
      'If something about the site is not the reason you stopped, reply to this and tell us what is — it goes to a person, not a queue.',
    ],
    action: { label: 'Ask for my assessment', path: '/app/assessment/request' },
  },
  {
    key: 'no-purchase-day-3',
    track: 'no-purchase',
    afterDays: 3,
    subject: 'Any questions about your website assessment?',
    heading: 'Anything you want to go through?',
    lines: [
      'You asked us to look at your website a few days ago. If you have read what we sent and have a question about any of it, the quickest way to ask is to write back.',
      'If you would rather see what a build actually involves before deciding, the pricing page says what it costs and how long it takes, with no form in the way.',
    ],
    action: { label: 'Ask a question', path: '/app/messages' },
  },
  {
    key: 'no-purchase-day-10',
    track: 'no-purchase',
    afterDays: 10,
    subject: 'Leaving this with you',
    heading: 'Leaving this with you',
    lines: [
      'We will stop emailing about this now. Your assessment stays in your account and does not expire, so it is there if you come back to it.',
      'If the timing is simply wrong, say so and we will make a note to check in when you tell us to.',
    ],
    action: { label: 'Tell us when to check back', path: '/app/messages' },
  },
];

/** What one candidate looks like to the rule engine. Built by the service, never stored. */
export interface FollowUpCandidate {
  readonly userId: string;
  readonly email: string;
  readonly name: string;
  readonly createdAt: Date;
  /** True once they have asked for anything. Moves them to the second track. */
  readonly hasRequested: boolean;
  /** True once they own a project. Nothing is sent to somebody who has bought. */
  readonly hasPurchased: boolean;
}

/** A recorded send. The unique `(userId, ruleKey)` pair is the idempotency. */
export interface FollowUpSend {
  readonly userId: string;
  readonly ruleKey: string;
  readonly sentAt: Date;
}

/** Why an address stopped receiving anything that is not transactional. */
export const SUPPRESSION_REASONS = ['unsubscribed', 'bounced'] as const;

export type SuppressionReason = (typeof SUPPRESSION_REASONS)[number];

/**
 * Which rule applies to a candidate on a given day, or none.
 *
 * Pure, and separated from every repository for one reason: this is the part somebody will
 * want to argue with, and an argument about *when we email people* should be settleable by
 * reading one function and its tests rather than by reasoning about a query.
 *
 * Returns the **earliest** applicable rule rather than the latest, so an account that has been
 * quiet for a month and has never been nudged receives the day-1 message before the day-4 one
 * — which reads as a sequence rather than as a system that has just noticed them.
 */
export function ruleFor(params: {
  readonly candidate: FollowUpCandidate;
  readonly alreadySent: ReadonlySet<string>;
  readonly now: Date;
}): FollowUpRule | null {
  const { candidate, alreadySent, now } = params;

  /* Somebody who bought is not being followed up. This is the stop condition that matters. */
  if (candidate.hasPurchased) return null;
  if (alreadySent.size >= FOLLOWUP_CAP) return null;

  const track: FollowUpTrack = candidate.hasRequested ? 'no-purchase' : 'no-request';
  const ageInDays = (now.getTime() - candidate.createdAt.getTime()) / 86_400_000;

  return (
    FOLLOWUP_RULES.find(
      (rule) => rule.track === track && ageInDays >= rule.afterDays && !alreadySent.has(rule.key),
    ) ?? null
  );
}
