import { describeError, type Logger } from '../../lib/logger.js';
import type { ActivityRecorder } from '../activity/index.js';
import type { AssessmentService } from '../assessments/index.js';
import type { AuthRepository } from '../auth/index.js';
import type { ProjectService } from '../projects/index.js';
import type { BillingProduct, SubscriptionStatus } from './billing.types.js';

/*
 * ============================================================================
 * PAYMENT → PROJECT
 * ============================================================================
 *
 * The single most important sequence in the application, and the one place the
 * commercial half meets the fulfilment half:
 *
 *     verified Stripe webhook
 *       → billing state updated        (billing.service.ts)
 *       → THIS: account linked to its Stripe customer
 *       → project created
 *       → onboarding tasks seeded
 *       → activity written
 *       → the dashboard now shows a project
 *
 * ## Why it is an interface rather than a direct call
 *
 * `billing.service.ts` must be testable without projects, tasks, assessments or
 * accounts, and it already is — the whole webhook suite runs against an in-memory
 * repository and a fake Stripe. Giving it a `BillingFulfillment` port keeps that true
 * and keeps the dependency pointing one way: billing knows there is *something* to
 * activate, not what activation involves.
 *
 * ## Why it never throws
 *
 * A failure here must not fail the webhook. The payment is real and is already
 * recorded; a Stripe retry would re-run the whole handler, and while activation is
 * idempotent and safe to repeat, the state that matters — the money — is already
 * durable. Losing the retry over a project-creation blip would be worse than a project
 * that has to be created by hand, and the error is logged loudly enough to notice.
 *
 * ## The browser is not involved
 *
 * None of this depends on the customer's tab staying open, on `success_url`, or on any
 * request from the client. Somebody can pay and close their laptop mid-redirect, and
 * their dashboard is correct when they come back.
 *
 * ## Why the three small money events came through here as well
 *
 * A checkout started, a subscription invoice that failed, a subscription status that moved:
 * three things that write nothing but a line in somebody's history. The obvious home for
 * them is an `ActivityRecorder` injected straight into the billing service — and this is
 * the same dependency in one fewer place, because this port is already the only edge
 * billing has to the rest of the platform and both composition roots already hand it the
 * real recorder. A second optional dependency would have been a second thing to remember
 * to wire, and the symptom of forgetting it is not an error: it is a customer history that
 * is quietly missing entries, on an installation that otherwise looks fine.
 *
 * The naming rule for the wording in this file: every summary is a sentence the customer
 * would recognise about their own account. The owner's version of the same events is the
 * log line and the notification email, and neither of those is written here.
 * ============================================================================
 */

export interface BillingFulfillment {
  /**
   * Called once per verified, successful payment that names an account.
   *
   * Idempotent, because Stripe delivers at least once and because the billing feature's
   * own event claim can be released and retried.
   */
  onPaymentSucceeded(params: {
    readonly userId: string;
    readonly product: BillingProduct;
    readonly stripeCustomerId?: string | undefined;
  }): Promise<void>;
  /**
   * A signed-in customer sent themselves to Stripe Checkout. **Not evidence of a
   * payment** — most abandoned checkouts produce one of these and nothing else, which is
   * exactly what makes it worth having when somebody says they tried to pay.
   */
  onCheckoutStarted(params: {
    readonly userId: string;
    readonly product: BillingProduct;
  }): Promise<void>;
  /**
   * A Growth Partner invoice failed to collect. One method rather than a general
   * `onPaymentFailed`, because the billing service handles three distinct Stripe failure
   * events and only this one is the customer's to act on — see the note at its call site.
   */
  onSubscriptionPaymentFailed(params: {
    readonly userId: string;
    readonly projectId: string;
  }): Promise<void>;
  /** The subscription moved to a different state. Only ever called on an actual move. */
  onSubscriptionStatusChanged(params: {
    readonly userId: string;
    readonly projectId: string;
    readonly status: SubscriptionStatus;
  }): Promise<void>;
}

export interface BillingFulfillmentDependencies {
  readonly authRepository: AuthRepository;
  readonly projectService: ProjectService;
  readonly assessmentService: AssessmentService;
  readonly activity: ActivityRecorder;
  readonly logger: Logger;
}

/** Does nothing. Used by tests that are about payment state rather than fulfilment. */
export const noopBillingFulfillment: BillingFulfillment = {
  async onPaymentSucceeded() {
    /* intentionally nothing */
  },
  async onCheckoutStarted() {
    /* intentionally nothing */
  },
  async onSubscriptionPaymentFailed() {
    /* intentionally nothing */
  },
  async onSubscriptionStatusChanged() {
    /* intentionally nothing */
  },
};

/**
 * What a customer is told when they send themselves to Checkout.
 *
 * Written out per product rather than assembled from one sentence and a product label. The
 * labels that already exist — `describeBillingProduct` — are for the owner's notification
 * email ("Build deposit (half of the project price)"), and a customer reading their own
 * history is not the audience for a parenthetical about which half of the fee this is.
 */
const CHECKOUT_STARTED_SUMMARY: Readonly<Record<BillingProduct, string>> = {
  'build-deposit': 'You started checkout for the deposit on your Customer Conversion Build.',
  'build-final': 'You started checkout for the launch payment on your Customer Conversion Build.',
  'growth-partner-monthly': 'You started checkout for Growth Partner, billed monthly.',
  'growth-partner-annual': 'You started checkout for Growth Partner, billed annually.',
};

/**
 * Deliberately about the card rather than about the subscription's new state: the
 * subscription moving to `past_due` is recorded separately, by
 * `onSubscriptionStatusChanged`, and two entries that say the same sentence twice in one
 * history is the thing to avoid here.
 */
const SUBSCRIPTION_PAYMENT_FAILED_SUMMARY =
  'A Growth Partner payment did not go through. You can update your card on your billing page.';

/**
 * The four states worth telling a customer about, in their words.
 *
 * `none` is absent on purpose, and the absence is load-bearing. It is what this application
 * stores for any Stripe status it does not track — `paused` today, whatever Stripe adds
 * next — and "you are not subscribed" is not a true sentence to write into the history of
 * somebody who demonstrably was a moment ago. No entry beats a wrong one; the owner still
 * has the log line either way.
 */
const SUBSCRIPTION_CHANGED_SUMMARY: Readonly<Partial<Record<SubscriptionStatus, string>>> = {
  active: 'Growth Partner is active on your account.',
  past_due: 'Your Growth Partner subscription is waiting on a payment.',
  canceled: 'Your Growth Partner subscription has been cancelled.',
  incomplete: 'Your Growth Partner subscription is waiting on a payment to complete.',
};

export function createBillingFulfillment(
  dependencies: BillingFulfillmentDependencies,
): BillingFulfillment {
  const { authRepository, projectService, assessmentService, activity, logger } = dependencies;

  return {
    async onPaymentSucceeded({ userId, product, stripeCustomerId }) {
      try {
        const user = await authRepository.findUserById(userId);
        if (!user) {
          logger.error('billing.fulfillment_unknown_user', { userId, product });
          return;
        }

        /*
         * One account, one Stripe customer. Written on the first payment and never
         * overwritten: a second Stripe customer for the same person would split their
         * invoices across two portals, and the first one is the one Stripe already has
         * a payment method and a subscription against.
         */
        if (stripeCustomerId && !user.stripeCustomerId) {
          await authRepository.updateUser(user.id, { stripeCustomerId });
        }

        await activity.record({
          type: 'billing.payment_succeeded',
          summary: 'We received your payment. Thank you.',
          audience: 'customer',
          userId: user.id,
        });

        /*
         * Only the deposit starts a build. The final payment and the subscription are
         * both payments against a project that already exists, and treating either as
         * an activation would create a second project on launch day.
         */
        if (product !== 'build-deposit') return;

        /*
         * The assessment is what the business name comes from when there is one — it is
         * the name they typed about their own business, which beats the name on a card.
         */
        const assessment = await assessmentService.findLatestForUser(user.id);

        const { project, created } = await projectService.activateForCustomer({
          owner: { id: user.id, email: user.email, name: user.name },
          businessName: assessment?.businessName ?? user.businessName ?? user.name,
          assessmentId: assessment?.id,
        });

        logger.info('billing.fulfillment_completed', {
          userId: user.id,
          projectId: project.id,
          created,
        });
      } catch (error) {
        // Deliberately swallowed. See the note at the top of this file.
        logger.error('billing.fulfillment_failed', { userId, product, ...describeError(error) });
      }
    },

    /*
     * The three below hold the same never-throws property as the method above, and get it
     * for free rather than by catching anything: the only work each of them does is one
     * `ActivityRecorder.record`, which never throws by contract — it logs and returns. A
     * try/catch here would be theatre around a call that cannot fail, and it would hide the
     * day somebody adds a second statement to one of these that can.
     */

    async onCheckoutStarted({ userId, product }) {
      await activity.record({
        type: 'billing.checkout_started',
        summary: CHECKOUT_STARTED_SUMMARY[product],
        audience: 'customer',
        userId,
      });
    },

    async onSubscriptionPaymentFailed({ userId, projectId }) {
      await activity.record({
        type: 'billing.payment_failed',
        summary: SUBSCRIPTION_PAYMENT_FAILED_SUMMARY,
        audience: 'customer',
        projectId,
        userId,
      });
    },

    async onSubscriptionStatusChanged({ userId, projectId, status }) {
      const summary = SUBSCRIPTION_CHANGED_SUMMARY[status];
      if (!summary) return;

      await activity.record({
        type: 'billing.subscription_changed',
        summary,
        audience: 'customer',
        projectId,
        userId,
      });
    },
  };
}
