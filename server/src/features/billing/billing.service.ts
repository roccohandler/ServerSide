import { AppError } from '../../lib/appError.js';
import { describeError, redactEmail, type Logger } from '../../lib/logger.js';
import type { EmailService } from '../../infrastructure/email/email.service.js';
import { BILLING_CURRENCY, EXPECTED_AMOUNT_CENTS } from './billing.amounts.js';
import {
  buildPaymentFailedEmail,
  buildPaymentReceivedEmail,
  buildPaymentRefundedEmail,
  describeBillingProduct,
} from './billing.email.js';
import type { BillingRepository } from './billing.repository.js';
import { noopBillingFulfillment, type BillingFulfillment } from './billing.fulfillment.js';
import type { StripeClient } from './stripe.client.js';
import {
  BILLING_PRODUCTS,
  checkoutModeFor,
  type BillingProduct,
  type GuaranteeRemedy,
  type NewProjectInput,
  type ProjectStatus,
  type ProjectUpdate,
  type StoredGuaranteeCredit,
  type StoredProject,
  type SubscriptionStatus,
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
   */
  createCheckoutSession(params: {
    readonly projectId: string;
    readonly product: BillingProduct;
  }): Promise<{ readonly url: string; readonly product: BillingProduct }>;
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
  readonly logger: Logger;
}

const NOT_CONFIGURED =
  'Billing is not configured on this deployment. Set the Stripe environment variables described in README.md.';

/** Narrows an unknown webhook object field to a string, or nothing. */
function stringField(object: Record<string, unknown>, key: string): string | undefined {
  const value = object[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function metadataOf(object: Record<string, unknown>): Record<string, string> {
  const raw = object['metadata'];
  if (typeof raw !== 'object' || raw === null) return {};

  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'string') result[key] = value;
  }
  return result;
}

function isBillingProduct(value: string | undefined): value is BillingProduct {
  return BILLING_PRODUCTS.includes(value as BillingProduct);
}

/** A Stripe id, whether the field holds the id itself or the expanded object. */
function idOf(value: unknown): string | undefined {
  if (typeof value === 'string' && value.length > 0) return value;
  if (typeof value === 'object' && value !== null) {
    const id = (value as Record<string, unknown>)['id'];
    if (typeof id === 'string' && id.length > 0) return id;
  }
  return undefined;
}

/**
 * The subscription an invoice belongs to. Top-level `subscription` on API versions
 * before 2025-03-31 (Basil); under `parent.subscription_details` from Basil onward.
 * Both shapes are read so the handler keeps working whichever version the webhook
 * endpoint was created on.
 */
function invoiceSubscriptionId(object: Record<string, unknown>): string | undefined {
  const direct = idOf(object['subscription']);
  if (direct) return direct;
  return idOf(invoiceSubscriptionDetails(object)?.['subscription']);
}

function invoiceSubscriptionDetails(
  object: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const parent = object['parent'];
  if (typeof parent !== 'object' || parent === null) return undefined;
  const details = (parent as Record<string, unknown>)['subscription_details'];
  if (typeof details !== 'object' || details === null) return undefined;
  return details as Record<string, unknown>;
}

/**
 * Whether a completed Checkout Session has actually been paid. `unpaid` happens with
 * asynchronous payment methods: the session completes, the money arrives (or fails)
 * days later, announced by the `async_payment_*` events.
 */
function sessionIsPaid(object: Record<string, unknown>): boolean {
  const status = stringField(object, 'payment_status');
  return status === 'paid' || status === 'no_payment_required';
}

/** Stripe's subscription statuses, folded onto the ones this application tracks. */
function toSubscriptionStatus(raw: string | undefined): SubscriptionStatus {
  switch (raw) {
    case 'active':
    case 'trialing':
      return 'active';
    case 'past_due':
    case 'unpaid':
      return 'past_due';
    case 'canceled':
      return 'canceled';
    case 'incomplete':
    case 'incomplete_expired':
      return 'incomplete';
    default:
      return 'none';
  }
}

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

    async createCheckoutSession({ projectId, product }) {
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
       * Deliberately no `billing.checkout_started` entry on this path, unlike the customer
       * one below. This link is created by the owner for an agreed project and sent to an
       * email address; the project may have no `ownerUserId` at all, and an activity entry
       * with no account behind it is one nobody can ever be shown.
       */
      return { url: session.url, product };
    },

    async createCustomerCheckoutSession({ customer, product }) {
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
        await interpretEvent(event);
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

  /**
   * Applies a `checkout.session.completed` or `checkout.session.async_payment_succeeded`
   * event. The two share this logic because an asynchronous payment method completes the
   * session first and lands the money later — payment state may only advance when
   * `payment_status` says the money actually arrived.
   */
  async function applyCheckoutSession(event: VerifiedStripeEvent): Promise<void> {
    const object = event.data.object;
    const metadata = metadataOf(object);
    const projectId = metadata['projectId'];
    const userId = metadata['userId'];
    const product = metadata['product'];

    if (!isBillingProduct(product)) {
      logger.warn('billing.webhook_missing_metadata', { eventId: event.id });
      return;
    }

    /*
     * ====================================================================
     * TWO KINDS OF CHECKOUT
     * ====================================================================
     *
     * `projectId` — the owner sent a link for an agreed project. The project already
     * exists and this advances its payment state.
     *
     * `userId` — a customer bought it themselves from their dashboard. No project
     * exists yet, and creating one is what fulfilment does.
     *
     * Both are set server-side when the session is created. Neither can be influenced
     * by the browser, which is what makes trusting them here sound.
     * ====================================================================
     */
    if (!projectId && userId) {
      if (!sessionIsPaid(object)) {
        logger.info('billing.customer_checkout_unpaid', { eventId: event.id, product });
        return;
      }

      logger.info('billing.customer_payment_recorded', { product });

      await fulfillment.onPaymentSucceeded({
        userId,
        product,
        stripeCustomerId: idOf(object['customer']),
      });

      if (notificationRecipient) {
        await notify(
          buildPaymentReceivedEmail({
            project: undefined,
            product,
            recipient: notificationRecipient,
          }),
        );
      }
      return;
    }

    if (!projectId) {
      logger.warn('billing.webhook_missing_metadata', { eventId: event.id });
      return;
    }

    const project = await repository.findProjectById(projectId);
    if (!project) {
      logger.warn('billing.webhook_unknown_project', { eventId: event.id, projectId });
      return;
    }

    const customerId = idOf(object['customer']);
    const subscriptionId = idOf(object['subscription']);
    const paymentIntentId = idOf(object['payment_intent']);

    // Worth remembering whatever the payment outcome: which customer, which
    // subscription, and which PaymentIntent (how a later refund finds its project).
    const identifiers: ProjectUpdate = {
      ...(customerId ? { stripeCustomerId: customerId } : {}),
      ...(subscriptionId ? { subscriptionId } : {}),
      ...(product === 'build-deposit' && paymentIntentId
        ? { depositPaymentIntentId: paymentIntentId }
        : {}),
      ...(product === 'build-final' && paymentIntentId
        ? { finalPaymentIntentId: paymentIntentId }
        : {}),
    };

    if (!sessionIsPaid(object)) {
      await repository.updateProject(projectId, identifiers);
      logger.info('billing.checkout_completed_unpaid', { projectId, product });
      return;
    }

    const updated = await repository.updateProject(projectId, {
      ...identifiers,
      ...(product === 'build-deposit'
        ? {
            depositStatus: 'paid' as const,
            // The deposit is what puts a project on the schedule.
            ...(project.status === 'agreed' ? { status: 'deposit-paid' as const } : {}),
          }
        : {}),
      ...(product === 'build-final' ? { finalStatus: 'paid' as const } : {}),
      ...(subscriptionId ? { subscriptionStatus: 'active' as const } : {}),
    });

    logger.info('billing.payment_recorded', { projectId, product });

    if (updated) {
      await notify(
        buildPaymentReceivedEmail({
          project: updated,
          product,
          recipient: notificationRecipient ?? '',
        }),
      );
    }
  }

  async function interpretEvent(event: VerifiedStripeEvent): Promise<void> {
    const object = event.data.object;
    const metadata = metadataOf(object);
    const projectId = metadata['projectId'];
    const product = metadata['product'];

    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
        return applyCheckoutSession(event);

      case 'checkout.session.async_payment_failed': {
        // Definitive: the asynchronous payment will not arrive. Unlike a card decline
        // inside an open Checkout page, there is no customer still there to retry.
        if (!projectId || !isBillingProduct(product)) {
          logger.warn('billing.webhook_missing_metadata', { eventId: event.id });
          return;
        }

        const project = await repository.findProjectById(projectId);
        if (!project) {
          logger.warn('billing.webhook_unknown_project', { eventId: event.id, projectId });
          return;
        }

        await repository.updateProject(projectId, {
          ...(product === 'build-deposit' ? { depositStatus: 'failed' as const } : {}),
          ...(product === 'build-final' ? { finalStatus: 'failed' as const } : {}),
        });

        logger.warn('billing.async_payment_failed', { projectId, product });

        if (notificationRecipient) {
          await notify(
            buildPaymentFailedEmail({
              projectId,
              detail: `The asynchronous payment for "${describeBillingProduct(product)}" failed to arrive. Send a fresh payment link.`,
              recipient: notificationRecipient,
            }),
          );
        }
        return;
      }

      case 'invoice.paid': {
        const subscriptionId = invoiceSubscriptionId(object);
        if (!subscriptionId) return;

        const project = await repository.findProjectBySubscriptionId(subscriptionId);
        if (!project) return;

        await repository.updateProject(project.id, { subscriptionStatus: 'active' });
        logger.info('billing.subscription_invoice_paid', { projectId: project.id });
        return;
      }

      case 'invoice.payment_failed': {
        const subscriptionId = invoiceSubscriptionId(object);
        const project = subscriptionId
          ? await repository.findProjectBySubscriptionId(subscriptionId)
          : null;

        if (project) {
          await repository.updateProject(project.id, { subscriptionStatus: 'past_due' });
        }

        logger.warn('billing.subscription_payment_failed', {
          projectId: project?.id ?? 'unknown',
        });

        /*
         * ====================================================================
         * THE ONE FAILURE THE CUSTOMER IS TOLD ABOUT
         * ====================================================================
         *
         * This switch handles three failure events and only this one writes a
         * `billing.payment_failed` entry. That is a decision about the customer's history
         * rather than about which event matters most:
         *
         *   - `payment_intent.payment_failed` fires for the *same declined card* as this
         *     event does. Recording both would show one decline twice, on two lines, at
         *     two timestamps — which reads as two separate failures and prompts a support
         *     conversation about money that was never taken twice.
         *   - `checkout.session.async_payment_failed` is a build payment that will not
         *     arrive. It is real, and the remedy is not the customer's: the owner sends a
         *     fresh link and says so in person. Nothing the customer could do with the
         *     entry is available to them from their dashboard.
         *
         * This one is the failure that changes what they see — the dashboard switches to
         * "a payment did not go through" — and the only one whose fix is theirs: a new
         * card. A project with no account behind it has nobody to tell, and the owner has
         * the email below either way.
         * ====================================================================
         */
        if (project?.ownerUserId) {
          await fulfillment.onSubscriptionPaymentFailed({
            userId: project.ownerUserId,
            projectId: project.id,
          });
        }

        if (notificationRecipient) {
          await notify(
            buildPaymentFailedEmail({
              projectId: project?.id,
              detail: 'A Growth Partner invoice failed to collect.',
              recipient: notificationRecipient,
            }),
          );
        }
        return;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscriptionId = stringField(object, 'id');
        if (!subscriptionId) return;

        const project =
          (await repository.findProjectBySubscriptionId(subscriptionId)) ??
          (projectId ? await repository.findProjectById(projectId) : null);
        if (!project) {
          logger.warn('billing.webhook_unknown_subscription', { eventId: event.id });
          return;
        }

        const status =
          event.type === 'customer.subscription.deleted'
            ? 'canceled'
            : toSubscriptionStatus(stringField(object, 'status'));

        /* Against the snapshot read above. Re-reading after the write always agrees. */
        const moved = project.subscriptionStatus !== status;

        await repository.updateProject(project.id, {
          subscriptionId,
          subscriptionStatus: status,
        });

        logger.info('billing.subscription_status_synced', { projectId: project.id, status });

        /*
         * Only on an actual move. Stripe sends `customer.subscription.updated` for a great
         * many changes that are not the status — a new payment method, a renewal date, a
         * quantity, a plan's metadata — and every one of them arrives here. Recording each
         * would fill a customer's history with "Growth Partner is active on your account"
         * eleven times over, which is a history nobody scrolls, containing the one entry
         * that mattered.
         *
         * A project with no `ownerUserId` is an owner-created one with no account attached,
         * so there is nobody for the entry to be shown to.
         */
        if (moved && project.ownerUserId) {
          await fulfillment.onSubscriptionStatusChanged({
            userId: project.ownerUserId,
            projectId: project.id,
            status,
          });
        }
        return;
      }

      case 'payment_intent.payment_failed': {
        /*
         * A decline during an open Checkout page — the customer is usually still there
         * trying another card, so this only tells the owner; it marks nothing failed.
         * The definitive failure signal for money that will never arrive is
         * `checkout.session.async_payment_failed`, handled above.
         */
        logger.warn('billing.payment_intent_failed', { eventId: event.id });
        if (notificationRecipient) {
          await notify(
            buildPaymentFailedEmail({
              projectId,
              detail: 'A one-time payment attempt failed.',
              recipient: notificationRecipient,
            }),
          );
        }
        return;
      }

      case 'charge.refunded': {
        const paymentIntentId = idOf(object['payment_intent']);
        const fullyRefunded = object['refunded'] === true;

        const project = paymentIntentId
          ? await repository.findProjectByPaymentIntentId(paymentIntentId)
          : null;

        /*
         * Only a FULL refund of a known build payment flips its status; a partial
         * refund leaves 'paid' standing, because the project remains materially paid
         * for. Unmatched refunds (a subscription invoice's charge, per the owner's
         * chosen guarantee mechanism) still notify, so nothing happens silently.
         */
        const refundedProduct: BillingProduct | undefined =
          project && paymentIntentId
            ? project.depositPaymentIntentId === paymentIntentId
              ? 'build-deposit'
              : 'build-final'
            : undefined;

        if (project && refundedProduct && fullyRefunded) {
          await repository.updateProject(project.id, {
            ...(refundedProduct === 'build-deposit'
              ? { depositStatus: 'refunded' as const }
              : { finalStatus: 'refunded' as const }),
          });
        }

        logger.warn('billing.payment_refunded', {
          eventId: event.id,
          projectId: project?.id ?? 'unknown',
          fullyRefunded,
        });

        if (notificationRecipient) {
          await notify(
            buildPaymentRefundedEmail({
              projectId: project?.id,
              detail: refundedProduct
                ? `${fullyRefunded ? 'Fully refunded' : 'Partially refunded'}: ${describeBillingProduct(refundedProduct)}.`
                : 'The refunded charge does not map to a build payment — most likely a Growth Partner invoice.',
              recipient: notificationRecipient,
            }),
          );
        }
        return;
      }

      default:
        // Unhandled event types are normal — the endpoint subscribes narrowly, but
        // Stripe's dashboard configuration is not under this repository's control.
        logger.info('billing.webhook_ignored', { eventId: event.id, type: event.type });
    }
  }
}
