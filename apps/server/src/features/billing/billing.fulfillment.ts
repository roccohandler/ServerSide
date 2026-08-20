import { describeError, type Logger } from '../../lib/logger.js';
import type { ActivityRecorder } from '../activity/index.js';
import type { AssessmentService } from '../assessments/index.js';
import type { AuthRepository } from '../auth/index.js';
import { noopNotifier, type Notifier } from '../notifications/index.js';
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
    /** How a later refund finds its project. Present on the two one-off payments. */
    readonly paymentIntentId?: string | undefined;
    /** Present on the two Growth Partner products. How the plan finds its project. */
    readonly subscriptionId?: string | undefined;
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
  /**
   * A build payment that will not arrive — `checkout.session.async_payment_failed`.
   *
   * ## Why this is a second method rather than a branch on the one above
   *
   * The comment on `onSubscriptionPaymentFailed` says there is deliberately no general
   * `onPaymentFailed` because only one of Stripe's three failure events is the customer's to
   * act on. That was true of two of them and wrong about this one, which is the *most*
   * actionable failure this system has: an async payment is usually a bank debit, it does not
   * retry itself, and there is no customer sitting on a Checkout page to notice.
   *
   * They got nothing. The event wrote `failed` into the project and emailed the owner, and the
   * person whose payment had not arrived had no entry in their history, no message, and a
   * billing page that went on offering the button as though nothing had happened.
   *
   * So: a second method, because the two say genuinely different sentences to genuinely
   * different people. `payment_intent.payment_failed` still calls neither — a declined card
   * inside an open Checkout page is somebody about to try another one.
   *
   * `userId` is optional, unlike every sibling here: an owner-sent link can be paid by a
   * client who has no account yet, and there is no history to write into for somebody who has
   * none. The email still goes, because it is addressed to a person rather than to an account.
   */
  onBuildPaymentFailed(params: {
    readonly projectId: string;
    readonly product: BillingProduct;
    readonly userId?: string | undefined;
    readonly to: { readonly email: string; readonly name: string };
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
  /**
   * Optional and no-op by default, like every other consumer of this port.
   *
   * It arrives here rather than in `billing.service.ts` for the same reason the three small
   * money events did: this file is already billing's only edge to the rest of the platform, and
   * a second optional dependency on the service would be a second thing to remember to wire
   * whose symptom on being forgotten is silence rather than an error.
   */
  readonly notifier?: Notifier | undefined;
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
  async onBuildPaymentFailed() {
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
 * What a customer is told when a build payment does not arrive.
 *
 * Written as *what happens next* rather than as what went wrong. These are asynchronous
 * payments — a bank debit, almost always — and one failing is usually the bank's decision
 * rather than anything the customer did, so "your payment was declined" is both unhelpful and
 * often untrue. What they need to know is that nothing was taken and the button is still
 * there.
 *
 * Two strings rather than one interpolated, because the two instalments mean different things
 * to the person reading: one is the project not starting, and the other is a website not going
 * live. A single sentence covering both would have to be vague about which.
 */
const BUILD_PAYMENT_FAILED_SUMMARY: Readonly<Record<BillingProduct, string>> = {
  'build-deposit':
    'The deposit payment did not come through, so the build has not started yet. Nothing was taken — you can try again from your billing page.',
  'build-final':
    'The launch payment did not come through. Nothing was taken, and the site is held until it clears — you can try again from your billing page.',
  /*
   * Unreachable in practice: `checkout.session.async_payment_failed` is a one-off-payment
   * event and a subscription failure arrives as `invoice.payment_failed`, which has its own
   * handler and its own sentence above. Present because `Record` makes it a compile error to
   * omit, which is a better guard than a partial lookup that would silently write nothing.
   */
  'growth-partner-monthly': SUBSCRIPTION_PAYMENT_FAILED_SUMMARY,
  'growth-partner-annual': SUBSCRIPTION_PAYMENT_FAILED_SUMMARY,
};

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
  const notifier = dependencies.notifier ?? noopNotifier;

  return {
    async onPaymentSucceeded({
      userId,
      product,
      stripeCustomerId,
      paymentIntentId,
      subscriptionId,
    }) {
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
         * ================================================================
         * THE BALANCE, PAID BY THE CUSTOMER RATHER THAN AGAINST A LINK
         * ================================================================
         *
         * This branch is the whole reason self-serve final payment needed anything here at
         * all, and it is easy to miss why: `applyCheckoutSession` already marks
         * `finalStatus: 'paid'` — but only on the path where the Checkout metadata carries a
         * `projectId`, which is the owner having sent a link for a named project.
         *
         * A customer paying their own balance has no project id to send. The session is built
         * from their session, and the metadata carries `userId`, deliberately: a browser must
         * never be able to name the project a payment settles. So this side has to resolve the
         * account to a project, and `ProjectService` is what knows how.
         *
         * Without this the portal would take the money, record "we received your payment" in
         * the customer's history, and leave the project reading *Launch payment: Not paid yet*
         * forever — with the button still on the billing page offering to take it again.
         * ================================================================
         */
        if (product === 'build-final') {
          await projectService.settleFinalPayment({ ownerUserId: user.id, paymentIntentId });
          return;
        }

        /*
         * ================================================================
         * GROWTH PARTNER, BOUGHT BY THE CUSTOMER RATHER THAN AGAINST A LINK
         * ================================================================
         *
         * Same shape as the balance above, and it was missing for the same reason: the
         * owner-link path carries a `projectId` and `applyCheckoutSession` writes the
         * subscription onto the named project, while a customer subscribing from their own
         * billing page can only name an account.
         *
         * Left unattached, the plan is paid for and invisible: the project's
         * `subscriptionStatus` stays `none`, every later `customer.subscription.*` and
         * `invoice.*` event logs `billing.webhook_unknown_subscription` because nothing
         * maps the id to a project, and the billing page keeps offering a plan they hold —
         * so a second purchase is a click away.
         * ================================================================
         */
        if (product === 'growth-partner-monthly' || product === 'growth-partner-annual') {
          await projectService.attachSubscription({
            ownerUserId: user.id,
            subscriptionId,
            stripeCustomerId,
          });
          return;
        }

        /*
         * Only the deposit starts a build. Treating anything else as an activation would
         * create a second project on launch day.
         */
        if (product !== 'build-deposit') return;

        /*
         * The assessment is what the business name comes from when there is one — it is
         * the name they typed about their own business, which beats the name on a card.
         */
        const assessment = await assessmentService.findLatestForUser(user.id);

        const { project, created, duplicate } = await projectService.activateForCustomer({
          owner: { id: user.id, email: user.email, name: user.name },
          businessName: assessment?.businessName ?? user.businessName ?? user.name,
          assessmentId: assessment?.id,
          paymentIntentId,
        });

        logger.info('billing.fulfillment_completed', {
          userId: user.id,
          projectId: project.id,
          created,
        });

        /*
         * ==================================================================
         * A SECOND DEPOSIT ON A PROJECT ALREADY PAID FOR
         * ==================================================================
         *
         * `available.deposit` is checked when the Checkout session is *created*, so two tabs
         * opened before either is paid both get a valid session and both can complete. State
         * converges — the project ends up paid — and Stripe has taken the money twice with
         * nothing anywhere noticing.
         *
         * Immediate rather than digest, and it is the only owner alert in this file: money
         * that has to go back is time-sensitive in a way nothing else here is, and a customer
         * who spots the second charge before we do has a considerably worse morning than one
         * who gets an unprompted refund.
         *
         * **The refund is deliberately not automatic.** It is money moving, the shape that
         * produced it is close enough to a legitimate second purchase to be worth a look, and
         * an automated reversal of a real payment is a far worse failure than a delayed one.
         * The PaymentIntent is named so the owner can find it in Stripe in one search.
         * ==================================================================
         */
        if (duplicate) {
          logger.error('billing.duplicate_deposit', { userId: user.id, projectId: project.id });

          await notifier.owner({
            kind: 'owner.duplicate_payment',
            subject: `Charged twice — ${project.businessName}`,
            heading: 'A deposit was paid twice',
            lines: [
              `${project.businessName} has paid the deposit on a project that was already settled.`,
              paymentIntentId
                ? `The second charge is ${paymentIntentId}. Refund it in Stripe.`
                : 'Find the second charge in Stripe and refund it.',
              'This happens when two checkout tabs are opened before either is paid. Nothing is refunded automatically.',
            ],
            replyTo: project.email,
          });
        }
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

    async onBuildPaymentFailed({ projectId, product, userId, to }) {
      /*
       * The customer's own history first, because it is the durable half — an email is read
       * once and a billing page is read whenever they wonder.
       *
       * Skipped when there is no account, which is a real state: an owner-sent link can be
       * paid by somebody who has not signed up. There is nowhere to write a history for a
       * person who has none, and the email below still reaches them.
       */
      if (userId) {
        await activity.record({
          type: 'billing.payment_failed',
          summary: BUILD_PAYMENT_FAILED_SUMMARY[product],
          audience: 'customer',
          projectId,
          userId,
        });
      }

      /*
       * And the message. `paymentFailed` is the existing template and it fits without a
       * change: it says a payment did not go through and points at the billing page, which is
       * exactly the sentence here — the button is still there and pressing it again is the
       * whole remedy.
       *
       * It carries no business name, which is right for the same reason it is right on a
       * subscription failure: this is billed to a person.
       */
      await notifier.paymentFailed({ to });
    },

    async onSubscriptionPaymentFailed({ userId, projectId }) {
      await activity.record({
        type: 'billing.payment_failed',
        summary: SUBSCRIPTION_PAYMENT_FAILED_SUMMARY,
        audience: 'customer',
        projectId,
        userId,
      });

      /*
       * ======================================================================
       * THE ONE MONEY EMAIL WORTH SENDING, AND THE `try` AROUND THE LOOKUP
       * ======================================================================
       *
       * A failed card is the only billing event a customer has to *act* on. Stripe sends its own
       * dunning mail and it is about an invoice; this one is about their website, and it carries
       * the sentence that actually gets somebody to update a card — nothing has been switched
       * off — which is the same sentence `chooseCurrentAction` puts on their dashboard.
       *
       * The address needs a lookup, which is the only reason this method now has a `try` when
       * the comment above says the three small ones do not need one. `record` and the notifier
       * are both never-throws by contract; `findUserById` is a database read and is not, and
       * this file's whole promise is that a fulfilment failure never fails a webhook. Losing a
       * Stripe retry over a transient read would be a strictly worse outcome than a missing
       * email about a card that Stripe is going to retry anyway.
       * ======================================================================
       */
      try {
        const user = await authRepository.findUserById(userId);
        if (!user) {
          logger.error('billing.payment_failed_unknown_user', { userId, projectId });
          return;
        }

        await notifier.paymentFailed({ to: { email: user.email, name: user.name } });
      } catch (error) {
        logger.error('billing.payment_failed_notice_failed', {
          userId,
          projectId,
          ...describeError(error),
        });
      }
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
