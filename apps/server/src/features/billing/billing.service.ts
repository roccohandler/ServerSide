import { AppError } from '../../lib/appError.js';
import { describeError, redactEmail, type Logger } from '../../lib/logger.js';
import type { EmailService } from '../../infrastructure/email/email.service.js';
import { noopNotifier, type Notifier } from '../notifications/index.js';
import { amountLabel, BILLING_CURRENCY, EXPECTED_AMOUNT_CENTS } from './billing.amounts.js';
import type { buildPaymentReceivedEmail } from './billing.email.js';
import type { BillingRepository } from './billing.repository.js';
import { noopBillingFulfillment, type BillingFulfillment } from './billing.fulfillment.js';
import { interpretWebhookEvent } from './billing.webhooks.js';
import type { StripeClient } from './stripe.client.js';
import {
  checkoutModeFor,
  type BillingProduct,
  type GuaranteeRemedy,
  type NewProjectInput,
  type ProjectStatus,
  type StoredGuaranteeCredit,
  type StoredProject,
  type VerifiedStripeEvent,
} from './billing.types.js';

/**
 * Stripe Price IDs, one per product, straight from the dashboard via environment
 * variables. Undefined means "not configured yet" — asking for a link to an
 * unconfigured product is a clear 503, never a guessed amount.
 */
export type BillingPriceIds = Readonly<Record<BillingProduct, string | undefined>>;

/** The account a self-serve checkout is being created for. Never taken from a body. */
export interface CheckoutCustomer {
  readonly id: string;
  readonly email: string;
  readonly stripeCustomerId?: string | undefined;
  /**
   * True on the demonstration account. Checked here, in the service, and not in the route.
   *
   * The brief that commissioned Demo Mode is explicit that a frontend check is not a control,
   * and `CLAUDE.md` rule 2 says the same about anything above the domain layer. A route-level
   * refusal would be one route away from being forgotten; this one is on the path every
   * self-serve purchase in the application takes.
   */
  readonly demo?: boolean | undefined;
}

export interface BillingService {
  createProject(input: NewProjectInput): Promise<StoredProject>;
  /**
   * A Checkout session an authenticated customer starts themselves.
   *
   * Differs from `createCheckoutSession` in what it is anchored to: that one is the
   * owner sending a link for an agreed project, this one is a customer buying before a
   * project exists. The project is created by the *webhook* — see `billing.fulfillment`
   * — so nothing is fulfilled by a browser reaching a success page.
   */
  createCustomerCheckoutSession(params: {
    readonly customer: CheckoutCustomer;
    readonly product: BillingProduct;
  }): Promise<{ readonly url: string; readonly product: BillingProduct }>;
  /** The Stripe-hosted portal for a customer's own invoices and payment methods. */
  createCustomerPortalSession(params: {
    readonly customer: CheckoutCustomer;
  }): Promise<{ readonly url: string }>;
  getProject(id: string): Promise<StoredProject>;
  /** Most recent first — the owner's reconciliation view when a project id is mislaid. */
  listProjects(limit: number): Promise<readonly StoredProject[]>;
  setProjectStatus(id: string, status: ProjectStatus): Promise<StoredProject>;
  /**
   * Creates a Stripe Checkout session for one product and returns its hosted URL for
   * the owner to send to the client. Never called from public UI.
   *
   * `notifyCustomer` is what makes this usable from the console rather than from curl. The
   * owner's actual job here is *ask this client for money*, and until now the application did
   * half of it: minted a URL and left the operator to paste it into a mail client, where the
   * message it arrived in was different every time and traceable nowhere. It defaults to false
   * so the token surface — which is used for reconciliation as much as for asking — behaves
   * exactly as it did.
   *
   * The returned `emailedTo` records the address a message was *built for*, not delivery. The
   * `Notifier` contract never throws and never reports, deliberately, so nothing here can
   * honestly claim more than that. See the note on `Notifier`.
   */
  createCheckoutSession(params: {
    readonly projectId: string;
    readonly product: BillingProduct;
    readonly notifyCustomer?: boolean | undefined;
  }): Promise<{
    readonly url: string;
    readonly product: BillingProduct;
    readonly emailedTo: string | undefined;
  }>;
  /**
   * A Stripe customer-portal link for a project's client, so they can see invoices
   * and manage their payment method on Stripe's hosted page. Requires the project to
   * have a Stripe customer, which exists once any payment has completed.
   */
  createPortalSession(params: { readonly projectId: string }): Promise<{ readonly url: string }>;
  /**
   * Records one missed response-guarantee month and applies the remedy: a Stripe
   * customer-balance credit the next invoice absorbs, or — when the client is
   * leaving and no next invoice exists — a refund of the month. Idempotent per
   * project-month; owner-only (the transport sits behind the admin token, so a
   * browser can never award itself a credit).
   */
  recordGuaranteeCredit(params: {
    readonly projectId: string;
    readonly month: string;
    readonly remedy?: GuaranteeRemedy | undefined;
  }): Promise<StoredGuaranteeCredit>;
  /**
   * Interprets one verified webhook event. Idempotent under Stripe's retries.
   * Signature verification happens in the transport layer, which owns the raw body.
   */
  handleWebhookEvent(event: VerifiedStripeEvent): Promise<void>;
}

export interface BillingServiceDependencies {
  readonly repository: BillingRepository;
  /** Undefined when Stripe is not configured; payment-link creation then 503s. */
  readonly stripe: StripeClient | undefined;
  readonly priceIds: BillingPriceIds;
  /** Public origin for Checkout redirect URLs, e.g. `https://www.example.com`. */
  readonly siteUrl: string;
  readonly emailService: EmailService;
  /** Undefined when no notification address is configured; state still advances. */
  readonly notificationRecipient: string | undefined;
  /**
   * What happens after a verified payment: link the account, create the project, seed
   * the onboarding tasks. Behind a port so this service stays testable without any of
   * them — see `billing.fulfillment.ts`.
   *
   * Optional, defaulting to a no-op. The tests that predate the customer platform are
   * about payment *state* and have no accounts to fulfil against; requiring the port
   * would have meant editing every one of them to pass a stub, which is churn rather
   * than coverage. The activation path has tests of its own.
   */
  readonly fulfillment?: BillingFulfillment | undefined;
  /**
   * How a client is told a payment link exists. Optional and defaulting to the no-op, for the
   * same reason `fulfillment` above is: the tests that predate the notification spine are about
   * payment *state*, and requiring a stub in each would be churn rather than coverage.
   *
   * Only one path uses it — an owner-created checkout link with `notifyCustomer`. Everything
   * else a customer is told about money is told by Stripe, which sends the receipt, or by the
   * fulfilment port, which owns what happens after a payment lands.
   */
  readonly notifier?: Notifier | undefined;
  readonly logger: Logger;
}

const NOT_CONFIGURED =
  'Billing is not configured on this deployment. Set the Stripe environment variables described in README.md.';

/**
 * Business rules for money.
 *
 * ## Payment state is advanced by webhooks, never by redirects
 *
 * A browser landing on the success page proves the browser navigated; it does not prove
 * anybody paid. Every state change here happens inside `handleWebhookEvent`, after the
 * transport has verified Stripe's signature, and every event is recorded exactly once so
 * Stripe's retries cannot double-apply anything (or double-email the owner).
 *
 * ## Notify-after-persist, same trade as the lead service
 *
 * The project record is updated before the owner is emailed, and a failed email never
 * fails the webhook — Stripe would retry, and the retry would be deduplicated anyway.
 */
export function createBillingService(dependencies: BillingServiceDependencies): BillingService {
  const { repository, stripe, priceIds, siteUrl, emailService, notificationRecipient, logger } =
    dependencies;
  const fulfillment = dependencies.fulfillment ?? noopBillingFulfillment;
  const notifier = dependencies.notifier ?? noopNotifier;

  /**
   * Resolves the configured Price for a product and refuses if the dashboard disagrees
   * with the published price.
   *
   * Shared by both checkout paths. It is the reason an amount is never accepted from a
   * request: the only number this application will charge is the one the Stripe Price
   * says, checked against the one the website publishes.
   */
  async function requireVerifiedPrice(product: BillingProduct): Promise<string> {
    if (!stripe) {
      throw new AppError('SERVICE_UNAVAILABLE', NOT_CONFIGURED);
    }

    const priceId = priceIds[product];
    if (!priceId) {
      throw new AppError(
        'SERVICE_UNAVAILABLE',
        `No Stripe price is configured for "${product}". Set its environment variable and redeploy.`,
      );
    }

    const amount = await stripe.getPriceAmount(priceId);
    const expected = EXPECTED_AMOUNT_CENTS[product];

    if (amount.unitAmountCents !== expected || amount.currency !== BILLING_CURRENCY) {
      const found =
        amount.unitAmountCents === null
          ? 'no fixed amount'
          : `${amount.unitAmountCents} ${amount.currency} cents`;
      throw new AppError(
        'SERVICE_UNAVAILABLE',
        `The Stripe Price for "${product}" charges ${found}, but the published price requires ${expected} ${BILLING_CURRENCY} cents. Fix the Price in the Stripe dashboard (or the env mapping) before sending a link.`,
      );
    }

    return priceId;
  }

  async function notify(message: ReturnType<typeof buildPaymentReceivedEmail>): Promise<void> {
    if (!notificationRecipient) return;
    try {
      await emailService.send(message);
    } catch (error) {
      // The state is already saved; a lost notification is recoverable from Stripe.
      logger.error('billing.notification_failed', describeError(error));
    }
  }

  async function requireProject(id: string): Promise<StoredProject> {
    const project = await repository.findProjectById(id);
    if (!project) {
      throw new AppError('NOT_FOUND', 'No project with that id.');
    }
    return project;
  }

  return {
    async createProject(input) {
      const project = await repository.createProject({
        ...input,
        status: 'agreed',
        /*
         * A project starts in onboarding regardless of what has been paid: the first
         * thing any build needs is the client's materials. Payment moves `status`, not
         * `milestone` — see the note at the top of `projects/project.types.ts`.
         */
        milestone: 'onboarding',
        approval: 'not_ready',
        depositStatus: 'pending',
        finalStatus: 'pending',
        subscriptionStatus: 'none',
      });

      logger.info('billing.project_created', {
        projectId: project.id,
        email: redactEmail(project.email),
      });

      return project;
    },

    getProject: requireProject,

    async listProjects(limit) {
      return repository.listProjects(limit);
    },

    async setProjectStatus(id, status) {
      const project = await repository.updateProject(id, { status });
      if (!project) throw new AppError('NOT_FOUND', 'No project with that id.');

      logger.info('billing.project_status_set', { projectId: id, status });
      return project;
    },

    async createCheckoutSession({ projectId, product, notifyCustomer }) {
      /*
       * The published price is the authority, never the dashboard. Before any link is
       * created, the configured Stripe Price is retrieved and compared against the
       * expected amount — so a mistyped Price produces a loud 503 for the owner rather
       * than a wrong charge for a client. No amount is ever accepted from a request.
       */
      const priceId = await requireVerifiedPrice(product);
      if (!stripe) throw new AppError('SERVICE_UNAVAILABLE', NOT_CONFIGURED);

      const project = await requireProject(projectId);

      const session = await stripe.createCheckoutSession({
        mode: checkoutModeFor(product),
        priceId,
        customerEmail: project.email,
        metadata: { projectId: project.id, product },
        successUrl: `${siteUrl}/welcome?paid=${product}`,
        cancelUrl: `${siteUrl}/contact`,
      });

      if (!session.url) {
        throw new AppError('INTERNAL_ERROR', 'Stripe returned a session without a URL.');
      }

      // Remember which session belongs to which half, for reconciliation.
      await repository.updateProject(project.id, {
        ...(product === 'build-deposit' ? { depositSessionId: session.id } : {}),
        ...(product === 'build-final' ? { finalSessionId: session.id } : {}),
      });

      logger.info('billing.checkout_session_created', { projectId: project.id, product });

      /*
       * The link, in the client's inbox, in a message the same every time.
       *
       * Only the two build payments. A subscription link asked for from the console would be
       * the owner selling somebody Growth Partner by email, and the published terms say the
       * plan starts on launch day only if the client chooses it — an unsolicited "pay for this
       * monthly service" message is not that, whatever the button says.
       */
      const emailedTo =
        notifyCustomer && (product === 'build-deposit' || product === 'build-final')
          ? project.email
          : undefined;

      if (emailedTo) {
        await notifier.paymentDue({
          to: { email: project.email, name: project.contactName },
          businessName: project.businessName,
          stage: product === 'build-deposit' ? 'deposit' : 'final',
          amountLabel: amountLabel(product),
          /* The Stripe URL itself: this client may have no account to sign in to yet. */
          payUrl: session.url,
        });
      }

      /*
       * Deliberately no `billing.checkout_started` entry on this path, unlike the customer
       * one below. This link is created by the owner for an agreed project and sent to an
       * email address; the project may have no `ownerUserId` at all, and an activity entry
       * with no account behind it is one nobody can ever be shown. The console route that
       * calls this writes one, because there the project is already resolved.
       */
      return { url: session.url, product, emailedTo };
    },

    async createCustomerCheckoutSession({ customer, product }) {
      /*
       * ======================================================================
       * THE DEMONSTRATION ACCOUNT CANNOT REACH STRIPE
       * ======================================================================
       *
       * First line of the method, before the Price is looked up and before the client is
       * touched, so **Stripe is contacted zero times on the demo path**. That ordering is
       * what makes "no live charge is possible" provable by a test rather than argued from
       * configuration: the fake client records no calls, and there is nothing to record.
       *
       * Production holds live keys. A test-mode path in the same process would mean a second
       * client and a second set of Price ids, and getting that wrong charges somebody — so
       * there is deliberately no Stripe test mode here. The demo simulates the state change
       * instead, through `DemoService`, against a demo-owned project only.
       *
       * The message is written for the person reading it on screen, because they are a
       * prospective customer being shown the product rather than an attacker.
       * ======================================================================
       */
      if (customer.demo) {
        throw new AppError(
          'VALIDATION_ERROR',
          'This is a demonstration account, so no real payment can be taken. Use the simulated payment button instead.',
        );
      }

      const priceId = await requireVerifiedPrice(product);
      if (!stripe) throw new AppError('SERVICE_UNAVAILABLE', NOT_CONFIGURED);

      const session = await stripe.createCheckoutSession({
        mode: checkoutModeFor(product),
        priceId,
        /*
         * The address comes from the session, never from the request. A body-supplied
         * email would let somebody create a Checkout that bills a card and attaches the
         * resulting Stripe customer to an address they do not own.
         */
        customerEmail: customer.email,
        /*
         * `userId` is what the webhook uses to find the account to activate. It is set
         * here, server-side, from the authenticated session — a client cannot influence
         * which account a payment fulfils.
         */
        metadata: { userId: customer.id, product },
        successUrl: `${siteUrl}/app/billing?paid=${product}`,
        cancelUrl: `${siteUrl}/app/billing?checkout=cancelled`,
      });

      if (!session.url) {
        throw new AppError('INTERNAL_ERROR', 'Stripe returned a session without a URL.');
      }

      logger.info('billing.customer_checkout_created', { userId: customer.id, product });

      /*
       * Recorded at the point of intent, and only here, where there is an account for it
       * to belong to.
       *
       * It says a checkout was started, which is deliberately weaker than saying anything
       * happened to any money: a customer who reaches Stripe and closes the tab leaves
       * this entry and nothing else, and that is the case it earns its place in. Payment
       * is still only ever recorded from a verified webhook.
       */
      await fulfillment.onCheckoutStarted({ userId: customer.id, product });

      return { url: session.url, product };
    },

    async createCustomerPortalSession({ customer }) {
      /*
       * Before the client, for the reason spelled out on `createCustomerCheckoutSession`:
       * Stripe is contacted zero times on the demo path. The demo account has no Stripe
       * customer so the check below would refuse it anyway — but "it happens to fail" is a
       * different property from "it cannot be reached", and only the second one survives
       * somebody later giving the demo project a Stripe id to make a screen look complete.
       */
      if (customer.demo) {
        throw new AppError(
          'VALIDATION_ERROR',
          'This is a demonstration account, so there is no real billing to manage.',
        );
      }

      if (!stripe) {
        throw new AppError('SERVICE_UNAVAILABLE', NOT_CONFIGURED);
      }

      /*
       * A Stripe customer only exists once a payment has completed. Saying so plainly
       * beats sending somebody to a portal that would 404 at Stripe.
       */
      if (!customer.stripeCustomerId) {
        throw new AppError(
          'VALIDATION_ERROR',
          'There is nothing to manage yet — your billing portal opens once your first payment has gone through.',
        );
      }

      const session = await stripe.createBillingPortalSession({
        customerId: customer.stripeCustomerId,
        returnUrl: `${siteUrl}/app/billing`,
      });

      logger.info('billing.customer_portal_created', { userId: customer.id });
      return { url: session.url };
    },

    async createPortalSession({ projectId }) {
      if (!stripe) {
        throw new AppError('SERVICE_UNAVAILABLE', NOT_CONFIGURED);
      }

      const project = await requireProject(projectId);
      if (!project.stripeCustomerId) {
        throw new AppError(
          'VALIDATION_ERROR',
          'This project has no Stripe customer yet — a payment has to complete before a billing portal exists for it.',
        );
      }

      const session = await stripe.createBillingPortalSession({
        customerId: project.stripeCustomerId,
        returnUrl: siteUrl,
      });

      logger.info('billing.portal_session_created', { projectId: project.id });
      return { url: session.url };
    },

    async recordGuaranteeCredit({ projectId, month, remedy }) {
      if (!stripe) {
        throw new AppError('SERVICE_UNAVAILABLE', NOT_CONFIGURED);
      }

      const project = await requireProject(projectId);
      if (!project.subscriptionId || project.subscriptionStatus === 'none') {
        throw new AppError(
          'VALIDATION_ERROR',
          'This project has no Growth Partner subscription — the response guarantee only applies to subscribed clients.',
        );
      }

      /*
       * The remedy defaults from the subscription's state: an active client gets a
       * balance credit the next invoice absorbs; a client whose subscription is
       * already over gets the month refunded. The owner can override for the
       * cancel-at-period-end case the stored status cannot see.
       */
      const chosen: GuaranteeRemedy =
        remedy ?? (project.subscriptionStatus === 'canceled' ? 'refund' : 'credit');

      if (chosen === 'credit' && !project.stripeCustomerId) {
        throw new AppError(
          'VALIDATION_ERROR',
          'This project has no Stripe customer to credit — use the refund remedy or wait for the first payment to complete.',
        );
      }

      const amountCents = EXPECTED_AMOUNT_CENTS['growth-partner-monthly'];

      const claimed = await repository.claimGuaranteeCredit({
        projectId: project.id,
        month,
        remedy: chosen,
        amountCents,
      });
      if (!claimed) {
        throw new AppError(
          'VALIDATION_ERROR',
          `The response guarantee for ${month} is already recorded on this project.`,
        );
      }

      try {
        const reference =
          chosen === 'credit'
            ? await stripe.createCustomerBalanceCredit({
                customerId: project.stripeCustomerId as string,
                amountCents,
                currency: BILLING_CURRENCY,
                description: `Response guarantee: ${month} Growth Partner fee waived`,
              })
            : await stripe.refundSubscriptionCharge({
                subscriptionId: project.subscriptionId,
                amountCents,
              });

        await repository.completeGuaranteeCredit(project.id, month, reference.id);

        logger.info('billing.guarantee_credit_recorded', {
          projectId: project.id,
          month,
          remedy: chosen,
        });

        const stored = await repository.findGuaranteeCredit(project.id, month);
        if (!stored) {
          throw new AppError(
            'INTERNAL_ERROR',
            'The recorded guarantee credit could not be read back.',
          );
        }
        return stored;
      } catch (error) {
        // Hand the month back so the owner's retry can apply the remedy cleanly.
        try {
          await repository.releaseGuaranteeCredit(project.id, month);
        } catch (releaseError) {
          logger.error('billing.guarantee_release_failed', {
            projectId: project.id,
            month,
            ...describeError(releaseError),
          });
        }
        throw error;
      }
    },

    async handleWebhookEvent(event) {
      const claimed = await repository.claimEvent(event.id, event.type);
      if (!claimed) {
        logger.info('billing.webhook_duplicate_ignored', { eventId: event.id });
        return;
      }

      /*
       * Claim, interpret, then mark processed — and release the claim when
       * interpretation fails. Recording the event id up front alone would be
       * at-most-once: a transient database failure mid-interpretation would leave the
       * id recorded, Stripe's retry would be "deduplicated", and a real payment would
       * silently never be marked paid. Releasing on failure hands the event back to
       * Stripe's retry schedule; the interpretation itself is idempotent `$set`s, so
       * running it a second time converges instead of double-applying.
       */
      try {
        await interpretWebhookEvent(event, {
          repository,
          fulfillment,
          notificationRecipient,
          notify,
          logger,
        });
        await repository.markEventProcessed(event.id);
      } catch (error) {
        try {
          await repository.releaseEvent(event.id);
        } catch (releaseError) {
          // Both interpretation and release failed. The stale-claim window in
          // `claimEvent` is what eventually lets a later retry pick this event up.
          logger.error('billing.webhook_release_failed', {
            eventId: event.id,
            ...describeError(releaseError),
          });
        }
        throw error;
      }
    },
  };
}
