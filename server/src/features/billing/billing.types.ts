/*
 * ============================================================================
 * BILLING — PROJECTS, PAYMENTS AND THE OPTIONAL SUBSCRIPTION
 * ============================================================================
 *
 * The commercial model this feature serves, stated once (and authoritatively in
 * `docs/business-offer.md`):
 *
 *   - The build is a one-time project, paid half to begin and half on launch day.
 *   - Growth Partner is an optional monthly (or annual) subscription that starts on
 *     launch day only if the client chose it.
 *
 * What this feature deliberately is NOT:
 *
 *   - a public checkout. Nothing on the marketing site sells directly; scope is agreed
 *     in writing first, then the owner sends a payment link. Every mutating endpoint
 *     except the Stripe webhook requires the owner's admin token.
 *   - the source of prices. Public prices live in `client/src/config/pricing.ts`;
 *     Stripe Prices are created in the dashboard and mapped here by ID via environment
 *     variables, so an amount is never typed into application logic.
 *
 * Payment state is only ever advanced by verified Stripe webhooks — never by a browser
 * returning to a success page, which proves nothing.
 * ============================================================================
 */

/*
 * ## Where the project domain lives
 *
 * It used to live in this file. It now lives in `features/projects/project.types.ts`,
 * and is re-exported here rather than copied: billing's own contract legitimately talks
 * about projects — a payment is a payment *for* one — but fulfilment is not a billing
 * concern and the definition should not sit under a folder called `billing`.
 *
 * One definition, two features reading it. Nothing below redeclares any of it.
 */
export {
  PAYMENT_STATUSES,
  PROJECT_FIELD_LIMITS,
  PROJECT_STATUSES,
  SUBSCRIPTION_STATUSES,
} from '../projects/project.types.js';

export type {
  NewProjectInput,
  NewProjectRecord,
  PaymentStatus,
  ProjectStatus,
  ProjectUpdate,
  StoredProject,
  SubscriptionStatus,
  VerifiedStripeEvent,
} from '../projects/project.types.js';

/** What a Stripe payment link can be issued for. Maps 1:1 to configured price IDs. */
export const BILLING_PRODUCTS = [
  'build-deposit',
  'build-final',
  'growth-partner-monthly',
  'growth-partner-annual',
] as const;

export type BillingProduct = (typeof BILLING_PRODUCTS)[number];

/** One-time payments use Checkout's payment mode; the plan uses subscription mode. */
export function checkoutModeFor(product: BillingProduct): 'payment' | 'subscription' {
  return product === 'build-deposit' || product === 'build-final' ? 'payment' : 'subscription';
}

/*
 * The response-guarantee remedy: a reply within 24 business hours or that month's fee
 * is waived. The owner records the miss; the normal remedy is a Stripe customer-balance
 * credit that the next invoice absorbs, and a refund only when the client is leaving
 * and no next invoice exists. Never a coupon, never client-triggered.
 */
export const GUARANTEE_REMEDIES = ['credit', 'refund'] as const;

export type GuaranteeRemedy = (typeof GUARANTEE_REMEDIES)[number];

/** One waived month, recorded exactly once per project and calendar month. */
export interface StoredGuaranteeCredit {
  readonly projectId: string;
  /** The affected calendar month, as YYYY-MM. */
  readonly month: string;
  readonly remedy: GuaranteeRemedy;
  readonly amountCents: number;
  /** The Stripe balance-transaction or refund id, once applied. */
  readonly stripeReference?: string | undefined;
  readonly createdAt: Date;
}
