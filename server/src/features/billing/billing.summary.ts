import type { StoredUser } from '../auth/index.js';
import type { StoredProject } from '../projects/index.js';

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
       * The deposit is offered until it is paid. Offering it afterwards would let
       * somebody buy the same build twice, which Stripe would happily take money for.
       */
      deposit: !depositPaid,
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
