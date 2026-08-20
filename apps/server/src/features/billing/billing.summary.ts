import type { StoredUser } from '../auth/index.js';
import {
  milestoneIndex,
  scopeAllowsSelfServeDeposit,
  type StoredProject,
} from '../projects/index.js';
import { BUILD_PRICE_CENTS } from './billing.amounts.js';

/*
 * ============================================================================
 * WHAT A CUSTOMER IS TOLD ABOUT THEIR OWN BILLING
 * ============================================================================
 *
 * An allow-list, built field by field. That is the point of the file, and it is worth
 * defending, because the tempting version is `{ ...project }` minus a few keys.
 *
 * The project document holds `stripeCustomerId`, `subscriptionId`, two Checkout session
 * ids and two PaymentIntent ids. None of them are secrets exactly — they are not
 * credentials — but every one of them is an internal handle that a browser has no use
 * for, that shows up in support screenshots, and that turns into a phishing detail in
 * the wrong email. The subtractive version leaks whichever one somebody adds next.
 *
 * So the rule is: a field appears here because somebody decided a customer should see
 * it. Adding a column to the project does nothing at all until this file changes.
 * ============================================================================
 */

export interface CustomerBillingSummary {
  /** True once any payment has completed — what gates the "manage billing" button. */
  readonly hasBillingAccount: boolean;
  /** Plain-language state of the one-off build payments. */
  readonly build: {
    readonly deposit: PaymentSummary;
    readonly final: PaymentSummary;
  };
  readonly subscription: {
    readonly status: 'none' | 'active' | 'past_due' | 'canceled' | 'incomplete';
    readonly label: string;
    /** True when there is something Stripe's portal can usefully manage. */
    readonly manageable: boolean;
  };
  /** What the customer can buy right now, and nothing they cannot. */
  readonly available: {
    readonly deposit: boolean;
    /** The second half of the build. Gated hard — see the note on the field below. */
    readonly final: boolean;
    readonly plan: boolean;
  };
}

export interface PaymentSummary {
  readonly status: 'pending' | 'paid' | 'failed' | 'refunded';
  readonly label: string;
}

const PAYMENT_LABELS: Readonly<Record<PaymentSummary['status'], string>> = {
  pending: 'Not paid yet',
  paid: 'Paid',
  failed: 'The last attempt did not go through',
  refunded: 'Refunded',
};

/*
 * ============================================================================
 * FIVE STATUS LABELS, NONE OF WHICH NAMES THE PRODUCT
 * ============================================================================
 *
 * Every one of these is rendered as the value of a term that already says "Growth Partner" —
 * a `<dt>` on the billing page and another on the dashboard's billing card. So the label's
 * job is to say what the *state* is, and nothing else.
 *
 * `none` used to read "You are not on a care plan", which was two defects in one string: the
 * wrong product name, and a whole sentence where a state belongs. Renaming it to "You are not
 * on Growth Partner" fixed the first and made the second worse — under a `<dt>Growth
 * Partner</dt>` it renders as *"Growth Partner / You are not on Growth Partner"*.
 *
 * The coupling is worth knowing about: the day these are rendered anywhere that does not name
 * the product beside them, all five stop being readable and all five need rewriting together.
 * ============================================================================
 */
const SUBSCRIPTION_LABELS: Readonly<
  Record<CustomerBillingSummary['subscription']['status'], string>
> = {
  none: 'Not started',
  active: 'Active',
  past_due: 'A payment did not go through',
  canceled: 'Cancelled',
  incomplete: 'Waiting on a payment to complete',
};

/**
 * Folds a customer's projects into one billing picture.
 *
 * Most customers have one project. Where there are several, the build payments come
 * from the most recent — it is the one being paid for — and the subscription is the
 * strongest state across all of them, because a person with one active plan and one
 * cancelled plan is a person with a plan.
 */
export function buildCustomerBillingSummary(params: {
  readonly user: StoredUser;
  readonly projects: readonly StoredProject[];
}): CustomerBillingSummary {
  const { user, projects } = params;
  const newest = projects[0];

  const subscriptionStatus = projects.some((project) => project.subscriptionStatus === 'active')
    ? 'active'
    : (projects.find((project) => project.subscriptionStatus !== 'none')?.subscriptionStatus ??
      'none');

  const depositPaid = newest?.depositStatus === 'paid';

  /*
   * Any project of theirs being live is enough, not specifically the newest.
   *
   * A customer on their second build has a live site from the first one, and Growth Partner is
   * a relationship with the customer rather than with one project — refusing to offer it
   * because the *newest* project is mid-build would withhold it from exactly the client who
   * has already been through a launch.
   */
  const projectIsLive = projects.some((project) => project.milestone === 'live');

  return {
    hasBillingAccount: Boolean(user.stripeCustomerId),
    build: {
      deposit: {
        status: newest?.depositStatus ?? 'pending',
        label: PAYMENT_LABELS[newest?.depositStatus ?? 'pending'],
      },
      final: {
        status: newest?.finalStatus ?? 'pending',
        label: PAYMENT_LABELS[newest?.finalStatus ?? 'pending'],
      },
    },
    subscription: {
      status: subscriptionStatus,
      label: SUBSCRIPTION_LABELS[subscriptionStatus],
      manageable: Boolean(user.stripeCustomerId),
    },
    available: {
      /*
       * ======================================================================
       * THE DEPOSIT, AND THE THREE THINGS THAT HAVE TO BE TRUE
       * ======================================================================
       *
       * The deposit is offered until it is paid. Offering it afterwards would let
       * somebody buy the same build twice, which Stripe would happily take money for.
       *
       * A cancelled project is the other end of the same rule. It has an unpaid deposit
       * forever, so on the count alone the button would sit there indefinitely inviting
       * payment for work that has been called off — and taking it would be worse than
       * refusing it. Starting again is a new project, which the owner creates.
       *
       * **The third is the scope, and it is what makes rule #35 real.** `business-offer.md`
       * has always said the scope is agreed in writing before any payment, and this button
       * was the reason that was aspirational: a customer could pay $2,450 against nothing
       * written down by anybody. `scopeAllowsSelfServeDeposit` requires both an acceptance
       * *and* that the figure they accepted is the figure Stripe will charge — a bespoke
       * quote is a perfectly normal thing to send, and it is settled by an invoice rather
       * than by the standard Checkout price. See DECISION 040 and `scope.types.ts`.
       *
       * This is the payload rather than the client's decision. An unaccepted scope means the
       * button is *absent*, not hidden — and `billing.customer.routes.ts` re-checks the same
       * rule when a session is asked for, because a browser is never the thing that decides.
       * ======================================================================
       */
      deposit:
        !depositPaid &&
        newest?.status !== 'cancelled' &&
        scopeAllowsSelfServeDeposit(newest?.scope, BUILD_PRICE_CENTS),
      /*
       * ======================================================================
       * THE SECOND HALF, AND THE THREE CONDITIONS THAT ARE THE WHOLE SAFETY PROPERTY
       * ======================================================================
       *
       * `build-final` used to be excluded from what a customer could buy at all, and the
       * comment in `billing.customer.routes.ts` gave the right reason: "a customer paying the
       * second half before there is a first half is not a flow that means anything". That is
       * still true. What has changed is that the flow now *has* a first half to check for.
       *
       * All three conditions matter and none is redundant:
       *
       *   `depositPaid`      — there is a first half. Without it this sells the back end of a
       *                        build nobody has started.
       *   `finalStatus`      — it is not already settled. Stripe will cheerfully take the
       *                        money twice.
       *   at or past `launching` — the work is done. The published terms say half up front and
       *                        half on launch day; offering it during the build would be
       *                        collecting the second instalment for work not yet delivered.
       *
       * **`>=` rather than `=== 'launching'`, and that is a deliberate departure from the
       * plan.** A project's status may legitimately be `launched` with the final payment
       * outstanding — `PROJECT_STATUSES` says so in as many words, "site live; final payment
       * received *or due*" — so a site that has gone `live` unpaid is a real state, and it is
       * exactly the state where the customer most wants a button. Gating on equality would
       * make the button appear and then vanish on the day the site went up, leaving the owner
       * to chase an invoice the portal had just stopped offering to settle.
       *
       * The newest project, not any project, unlike `plan` below. A second build's deposit
       * does not settle the first one's balance.
       * ======================================================================
       */
      final:
        depositPaid &&
        newest !== undefined &&
        newest.finalStatus !== 'paid' &&
        milestoneIndex(newest.milestone) >= milestoneIndex('launching'),
      /*
       * ======================================================================
       * THE PLAN IS OFFERED AT LAUNCH, AND NOW THE CODE AGREES WITH THAT
       * ======================================================================
       *
       * The comment here already said the right thing — "the plan starts at launch; offering
       * it before there is a website is selling the maintenance of something that does not
       * exist" — and the condition underneath it did not implement it. It was
       * `depositPaid && subscriptionStatus !== 'active'`, which offers the plan from the
       * moment the deposit clears: three or four weeks before there is a website.
       *
       * That is not a cosmetic mismatch. The published terms say, in five places, that Growth
       * Partner "starts on launch day only if you choose it", and the site publishes a
       * three-month minimum measured *from launch*. A customer who accepted the button
       * mid-build would have been billed for a month or more of measuring a website that did
       * not exist yet — against terms they had been shown — and the dashboard's own
       * `choose-plan` action was already gated on `milestone === 'live'`, so the two surfaces
       * disagreed with each other as well.
       *
       * The offer redesign made the mismatch matter more rather than causing it: the billing
       * panel now names the monthly report and prints the price, so it is considerably more
       * likely to be acted on than the unpriced paragraph it replaced.
       *
       * `live` is the milestone, not `launched` the status: the status moves on the payment
       * and the milestone moves when the site is actually up, and it is the site being up
       * that the terms are about.
       * ======================================================================
       */
      plan: depositPaid && projectIsLive && subscriptionStatus !== 'active',
    },
  };
}
