/*
 * ============================================================================
 * DEMO MODE — WHAT IT IS, AND THE ONE DECISION EVERYTHING FOLLOWS FROM
 * ============================================================================
 *
 * The product could not be shown to anybody. A prospective partner, a friend, or somebody
 * being sold to had three options: watch a screen share, be given a real account on the
 * production database, or be shown the marketing site and asked to imagine the rest.
 *
 * This feature is a private entry at `/promo`, a server-checked passcode, and an isolated
 * demonstration customer whose account exercises **the real application**. Not a second
 * frontend, not a screenshot tour, not a mocked API.
 *
 * ## A demo customer is a customer — DECISION 033
 *
 * The single decision this feature turns on. The demo account holds `role: 'customer'` and
 * one flag, `demo`, on the user document. Everything that keeps a demo visitor away from a
 * real customer's data is the ownership boundary that already existed and is already tested:
 * `authorizeOwnership`, `createProjectAccess`, and the rule that an ownership failure answers
 * 404 rather than 403. Not one line of it needed changing.
 *
 * That also settles the brief's hardest requirement — no admin access, no owner functionality,
 * no administrative APIs — **by construction**. `requireAdmin` already answers NOT_FOUND to
 * every customer, so there is no demo-specific check to remember and none to forget.
 *
 * What was rejected, and why:
 *
 *   - **A `demo: true` column on every collection, filtered in every repository.** Eleven
 *     repositories, and one forgotten filter is a leak in *either* direction.
 *   - **A separate database.** Mongoose binds models to a connection at module scope, so
 *     per-request `useDb()` means resolving every model per request — a change to every
 *     repository in the application — to buy isolation the ownership boundary already gives.
 *   - **A second authentication system.** The brief forbids it and it is right to: one session
 *     mechanism means one place expiry, rotation, `SameSite` and signout are implemented.
 *
 * ## What the demo layer actually adds
 *
 * Controlled access, an isolated identity, seeded state, a reset, a visible indicator, and a
 * feedback channel. That is the whole list. Anything else that wants to branch on `demo` is
 * a sign the demonstration is diverging from the product it exists to demonstrate.
 *
 * ## The reverse direction is where the work is
 *
 * Demo rows are real rows, so they *would* appear in the owner's own surfaces — the console
 * lists, the inbox, the digest. That is a small, enumerable list rather than a filter on every
 * read, and it is handled at those three places explicitly.
 * ============================================================================
 */

/**
 * The demonstration account's address. A constant, and the request cannot influence it.
 *
 * `.test` is reserved by RFC 2606 and can never be a real domain, so nothing here can
 * collide with a customer and no mail sent to it can reach a person.
 */
export const DEMO_EMAIL = 'dana@example.test';

export const DEMO_NAME = 'Dana Whitfield';

/** The invented business every demo screen is about. No real trade name, deliberately. */
export const DEMO_BUSINESS = 'Cascade Heating & Air';

export const DEMO_FEEDBACK_CATEGORIES = [
  'bug',
  'confusing',
  'missing',
  'ux',
  'question',
  'general',
] as const;

export type DemoFeedbackCategory = (typeof DEMO_FEEDBACK_CATEGORIES)[number];

export const DEMO_FEEDBACK_LIMITS = {
  body: 4000,
  route: 200,
} as const;

export interface NewDemoFeedbackRecord {
  readonly body: string;
  readonly category: DemoFeedbackCategory;
  /** Which screen they were on. The single most useful field on the record. */
  readonly route: string;
}

export interface StoredDemoFeedback extends NewDemoFeedbackRecord {
  readonly id: string;
  readonly createdAt: Date;
}

export interface DemoFeedbackView {
  readonly id: string;
  readonly body: string;
  readonly category: DemoFeedbackCategory;
  readonly route: string;
  readonly at: string;
}

export function toDemoFeedbackView(feedback: StoredDemoFeedback): DemoFeedbackView {
  return {
    id: feedback.id,
    body: feedback.body,
    category: feedback.category,
    route: feedback.route,
    at: feedback.createdAt.toISOString(),
  };
}
