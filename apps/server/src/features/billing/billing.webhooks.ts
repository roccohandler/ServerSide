import type { Logger } from '../../lib/logger.js';
import {
  buildPaymentFailedEmail,
  buildPaymentReceivedEmail,
  buildPaymentRefundedEmail,
  describeBillingProduct,
} from './billing.email.js';
import type { BillingRepository } from './billing.repository.js';
import type { BillingFulfillment } from './billing.fulfillment.js';
import {
  BILLING_PRODUCTS,
  type BillingProduct,
  type ProjectUpdate,
  type SubscriptionStatus,
  type VerifiedStripeEvent,
} from './billing.types.js';

/*
 * ============================================================================
 * WHAT EACH STRIPE EVENT MEANS
 * ============================================================================
 *
 * One named handler per event, and a switch that does nothing but choose between them.
 *
 * These were nine cases inside a 713-line closure in `billing.service.ts`, and the cost
 * was not the length — it was that the question "what happens when a subscription
 * invoice fails?" could only be answered by reading past everything that happens when a
 * checkout session completes. Each handler is now a named function whose whole body is
 * one event's meaning, and the switch reads as a table of contents.
 *
 * ## Why they take a context rather than closing over the service
 *
 * A module-level function cannot close over `createBillingService`'s locals, and making
 * these methods of the service is what produced the 713 lines in the first place. The
 * context names exactly what interpreting an event is allowed to touch — a repository,
 * a fulfilment port, a logger and a way to email the owner — which is a much smaller
 * surface than the service, and it means a handler can be read without knowing anything
 * about checkout links, price verification or guarantee credits.
 *
 * ## What has deliberately not changed
 *
 * The switch stays a switch. Replacing it with a lookup table would hide that
 * `checkout.session.completed` and `checkout.session.async_payment_succeeded` share a
 * handler on purpose, and that three subscription events do too. The `default` still logs
 * rather than throws: unhandled event types are normal, because Stripe's dashboard
 * configuration is not under this repository's control.
 *
 * Idempotency is *not* here. Claiming an event, marking it processed and releasing it on
 * failure stay in `handleWebhookEvent`, because they are true of every event and have
 * nothing to do with what any one of them means.
 * ============================================================================
 */

export interface WebhookContext {
  readonly repository: BillingRepository;
  readonly fulfillment: BillingFulfillment;
  /** Undefined when no notification address is configured; state still advances. */
  readonly notificationRecipient: string | undefined;
  /** Emails the owner. Never throws — a lost notification is recoverable from Stripe. */
  notify(message: ReturnType<typeof buildPaymentReceivedEmail>): Promise<void>;
  readonly logger: Logger;
}

/* ------------------------------------------------- reading Stripe's untyped objects */

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

/* ----------------------------------------------------------------- the handlers */

/**
 * A `checkout.session.completed` or `checkout.session.async_payment_succeeded` event.
 *
 * The two share this logic because an asynchronous payment method completes the session
 * first and lands the money later — payment state may only advance when `payment_status`
 * says the money actually arrived.
 */
async function applyCheckoutSession(
  event: VerifiedStripeEvent,
  ctx: WebhookContext,
): Promise<void> {
  const { repository, fulfillment, notificationRecipient, notify, logger } = ctx;
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
   * `userId` — a customer bought it themselves from their dashboard. No project exists
   * yet, and creating one is what fulfilment does.
   *
   * Both are set server-side when the session is created. Neither can be influenced by
   * the browser, which is what makes trusting them here sound.
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
      /*
       * Passed through for the same reason the `projectId` branch below records it on the
       * project: it is how a later refund finds what it is refunding. On this path the
       * fulfilment port is the only side that can resolve which project it belongs to.
       */
      paymentIntentId: idOf(object['payment_intent']),
      /*
       * The subscription the session created, on the two Growth Partner products. Same
       * argument as the PaymentIntent above: this side names an account, so the fulfilment
       * port is the only place that can resolve which project the plan belongs to.
       */
      subscriptionId: idOf(object['subscription']),
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

  // Worth remembering whatever the payment outcome: which customer, which subscription,
  // and which PaymentIntent (how a later refund finds its project).
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

/**
 * A `checkout.session.async_payment_failed` event.
 *
 * Definitive: the asynchronous payment will not arrive. Unlike a card decline inside an
 * open Checkout page, there is no customer still there to retry.
 */
async function applyAsyncPaymentFailed(
  event: VerifiedStripeEvent,
  ctx: WebhookContext,
): Promise<void> {
  const { repository, notificationRecipient, notify, logger } = ctx;
  const metadata = metadataOf(event.data.object);
  const projectId = metadata['projectId'];
  const product = metadata['product'];

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

  /*
   * ==========================================================================
   * THE CUSTOMER IS TOLD TOO, AND UNTIL NOW THEY WERE NOT
   * ==========================================================================
   *
   * This wrote `failed` into the project and emailed the *owner*. The customer — the person
   * whose payment did not arrive, who has no way of knowing, and who is the only one who can
   * do anything about it — got nothing at all: no entry in their own history, no email, and a
   * billing page that simply went on offering the button.
   *
   * The asymmetry with a subscription failure was the tell. `applySubscriptionPaymentFailed`
   * has always written a customer activity entry and sent them a message, on the grounds that
   * a failed card is the one billing event a customer has to *act* on. That reasoning applies
   * here with more force, not less: a subscription retries itself and this does not.
   *
   * ## Why the entry says what it says
   *
   * Not "your payment failed" — an async payment (a bank debit, most often) failing is
   * usually a bank's decision rather than anything the customer did wrong, and the useful
   * sentence is what happens next rather than what went wrong. The button is still on their
   * billing page, which is what the entry points at.
   *
   * `fulfillment.onBuildPaymentFailed` rather than a `notify` from here, for the reason the
   * whole fulfilment port exists: this module knows Stripe's event shapes and nothing about
   * what a customer's history looks like.
   * ==========================================================================
   */
  await ctx.fulfillment.onBuildPaymentFailed({
    projectId,
    product,
    ...(project.ownerUserId ? { userId: project.ownerUserId } : {}),
    to: { email: project.email, name: project.contactName },
  });

  if (notificationRecipient) {
    await notify(
      buildPaymentFailedEmail({
        projectId,
        detail: `The asynchronous payment for "${describeBillingProduct(product)}" failed to arrive. Send a fresh payment link.`,
        recipient: notificationRecipient,
      }),
    );
  }
}

/** An `invoice.paid` event — a Growth Partner month collected. */
async function applyInvoicePaid(event: VerifiedStripeEvent, ctx: WebhookContext): Promise<void> {
  const { repository, notificationRecipient, notify, logger } = ctx;
  const object = event.data.object;
  const subscriptionId = invoiceSubscriptionId(object);

  /*
   * ==========================================================================
   * TWO KINDS OF INVOICE ARRIVE HERE, AND ONLY ONE USED TO BE HANDLED
   * ==========================================================================
   *
   * A subscription invoice is raised by Stripe on Growth Partner's schedule and carries a
   * subscription id. A **one-off build invoice** is raised by the owner (DECISION 041) and
   * carries none — it carries `metadata.projectId` and `metadata.product`, exactly as an
   * owner-sent Checkout session does.
   *
   * This method returned early on the missing subscription id, so a paid build invoice
   * settled nothing: the money cleared at Stripe, the project stayed `pending`, the portal
   * went on offering the button and the console went on showing an unpaid build. The only
   * place the payment existed would have been Stripe's dashboard.
   *
   * The field writes below are `applyCheckoutSession`'s, deliberately identical — the two
   * paths are two ways of asking for the same money and must leave the same state. What is
   * *not* copied is the "which session" bookkeeping: an invoice is its own record.
   * ==========================================================================
   */
  if (!subscriptionId) {
    const metadata = metadataOf(object);
    const projectId = metadata['projectId'];
    const product = metadata['product'];

    if (!projectId || !isBillingProduct(product)) {
      logger.warn('billing.webhook_missing_metadata', { eventId: event.id });
      return;
    }

    const project = await repository.findProjectById(projectId);
    if (!project) {
      logger.warn('billing.webhook_unknown_project', { eventId: event.id, projectId });
      return;
    }

    /*
     * Idempotent. Stripe delivers at least once and an invoice can be marked paid more than
     * once in a reconciliation; a project already settled is left exactly as it is, and no
     * second receipt goes out.
     */
    const settled =
      product === 'build-deposit'
        ? project.depositStatus === 'paid'
        : project.finalStatus === 'paid';

    if (settled) {
      logger.info('billing.invoice_paid_already_settled', { projectId, product });
      return;
    }

    const customerId = idOf(object['customer']);

    const updated = await repository.updateProject(projectId, {
      ...(customerId ? { stripeCustomerId: customerId } : {}),
      ...(product === 'build-deposit'
        ? {
            depositStatus: 'paid' as const,
            /* The deposit is what puts a project on the schedule. */
            ...(project.status === 'agreed' ? { status: 'deposit-paid' as const } : {}),
          }
        : {}),
      ...(product === 'build-final' ? { finalStatus: 'paid' as const } : {}),
    });

    logger.info('billing.invoice_payment_recorded', { projectId, product });

    if (updated && notificationRecipient) {
      await notify(
        buildPaymentReceivedEmail({
          project: updated,
          product,
          recipient: notificationRecipient,
        }),
      );
    }

    return;
  }

  const project = await repository.findProjectBySubscriptionId(subscriptionId);
  if (!project) return;

  await repository.updateProject(project.id, { subscriptionStatus: 'active' });
  logger.info('billing.subscription_invoice_paid', { projectId: project.id });
}

/**
 * An `invoice.payment_failed` event.
 *
 * ====================================================================
 * THE ONE FAILURE THE CUSTOMER IS TOLD ABOUT
 * ====================================================================
 *
 * Three events in this module are payment failures and only this one writes a
 * `billing.payment_failed` entry to the customer's history. That is a decision about the
 * customer's history rather than about which event matters most:
 *
 *   - `payment_intent.payment_failed` fires for the *same declined card* as this event
 *     does. Recording both would show one decline twice, on two lines, at two timestamps —
 *     which reads as two separate failures and prompts a support conversation about money
 *     that was never taken twice.
 *   - `checkout.session.async_payment_failed` is a build payment that will not arrive. It
 *     is real, and the remedy is not the customer's: the owner sends a fresh link and says
 *     so in person. Nothing the customer could do with the entry is available to them from
 *     their dashboard.
 *
 * This one is the failure that changes what they see — the dashboard switches to "a
 * payment did not go through" — and the only one whose fix is theirs: a new card. A
 * project with no account behind it has nobody to tell, and the owner has the email below
 * either way.
 * ====================================================================
 */
async function applyInvoicePaymentFailed(
  event: VerifiedStripeEvent,
  ctx: WebhookContext,
): Promise<void> {
  const { repository, fulfillment, notificationRecipient, notify, logger } = ctx;
  const subscriptionId = invoiceSubscriptionId(event.data.object);
  const project = subscriptionId
    ? await repository.findProjectBySubscriptionId(subscriptionId)
    : null;

  if (project) {
    await repository.updateProject(project.id, { subscriptionStatus: 'past_due' });
  }

  logger.warn('billing.subscription_payment_failed', { projectId: project?.id ?? 'unknown' });

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
}

/**
 * A `customer.subscription.created`, `.updated` or `.deleted` event.
 *
 * All three share this handler because all three mean the same thing to this application:
 * the stored status may no longer match Stripe's.
 */
async function applySubscriptionChange(
  event: VerifiedStripeEvent,
  ctx: WebhookContext,
): Promise<void> {
  const { repository, fulfillment, logger } = ctx;
  const object = event.data.object;
  const metadataProjectId = metadataOf(object)['projectId'];
  const subscriptionId = stringField(object, 'id');
  if (!subscriptionId) return;

  const project =
    (await repository.findProjectBySubscriptionId(subscriptionId)) ??
    (metadataProjectId ? await repository.findProjectById(metadataProjectId) : null);
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

  await repository.updateProject(project.id, { subscriptionId, subscriptionStatus: status });

  logger.info('billing.subscription_status_synced', { projectId: project.id, status });

  /*
   * Only on an actual move. Stripe sends `customer.subscription.updated` for a great many
   * changes that are not the status — a new payment method, a renewal date, a quantity, a
   * plan's metadata — and every one of them arrives here. Recording each would fill a
   * customer's history with "Growth Partner is active on your account" eleven times over,
   * which is a history nobody scrolls, containing the one entry that mattered.
   *
   * A project with no `ownerUserId` is an owner-created one with no account attached, so
   * there is nobody for the entry to be shown to.
   */
  if (moved && project.ownerUserId) {
    await fulfillment.onSubscriptionStatusChanged({
      userId: project.ownerUserId,
      projectId: project.id,
      status,
    });
  }
}

/**
 * A `payment_intent.payment_failed` event.
 *
 * A decline during an open Checkout page — the customer is usually still there trying
 * another card, so this only tells the owner; it marks nothing failed. The definitive
 * failure signal for money that will never arrive is `checkout.session.async_payment_failed`.
 */
async function applyPaymentIntentFailed(
  event: VerifiedStripeEvent,
  ctx: WebhookContext,
): Promise<void> {
  const { notificationRecipient, notify, logger } = ctx;
  const projectId = metadataOf(event.data.object)['projectId'];

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
}

/** A `charge.refunded` event. */
async function applyChargeRefunded(event: VerifiedStripeEvent, ctx: WebhookContext): Promise<void> {
  const { repository, notificationRecipient, notify, logger } = ctx;
  const object = event.data.object;
  const paymentIntentId = idOf(object['payment_intent']);
  const fullyRefunded = object['refunded'] === true;

  const project = paymentIntentId
    ? await repository.findProjectByPaymentIntentId(paymentIntentId)
    : null;

  /*
   * Only a FULL refund of a known build payment flips its status; a partial refund leaves
   * 'paid' standing, because the project remains materially paid for. Unmatched refunds (a
   * subscription invoice's charge, per the owner's chosen guarantee mechanism) still
   * notify, so nothing happens silently.
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
}

/**
 * A `charge.dispute.created` event — somebody has charged back a payment.
 *
 * ============================================================================
 * WHY THIS MARKS NOTHING AND ONLY SHOUTS
 * ============================================================================
 *
 * A dispute is not a refund and not a failure: the money is pulled immediately, but the
 * issuing bank decides the outcome weeks later and either half can win. Writing
 * `refunded` here would be recording an outcome nobody has reached yet, and writing
 * nothing at all — which is what happened before this handler existed — left a build
 * proceeding on a payment that had been taken back, with the only trace in a Stripe
 * dashboard nobody had open.
 *
 * So: the project keeps its honest state, and the owner is told loudly enough to go and
 * respond inside the network's window. Evidence lives in the portal — the approval
 * record, the message threads, the accepted scope — which is the reason those are
 * recorded there rather than in somebody's inbox.
 * ============================================================================
 */
async function applyDisputeOpened(event: VerifiedStripeEvent, ctx: WebhookContext): Promise<void> {
  const { repository, notificationRecipient, notify, logger } = ctx;
  const object = event.data.object;
  const paymentIntentId = idOf(object['payment_intent']);

  const project = paymentIntentId
    ? await repository.findProjectByPaymentIntentId(paymentIntentId)
    : null;

  logger.error('billing.dispute_opened', {
    eventId: event.id,
    projectId: project?.id ?? 'unknown',
  });

  if (notificationRecipient) {
    await notify(
      buildPaymentFailedEmail({
        projectId: project?.id,
        detail:
          'A payment has been disputed with the card issuer. The funds have already been withdrawn. Respond in the Stripe dashboard before the deadline it states — the approval record, the accepted scope and the message threads in the portal are the evidence.',
        recipient: notificationRecipient,
      }),
    );
  }
}

/**
 * A `checkout.session.expired` event — a Checkout page was opened and never paid.
 *
 * Marks nothing, because nothing happened: no money moved and no state is wrong. It is
 * recorded so that "I tried to pay and something went odd" has an answer, and so the
 * abandoned-checkout entry in a customer's history has a visible end rather than sitting
 * open forever.
 */
async function applyCheckoutExpired(
  event: VerifiedStripeEvent,
  ctx: WebhookContext,
): Promise<void> {
  const metadata = metadataOf(event.data.object);

  ctx.logger.info('billing.checkout_expired', {
    eventId: event.id,
    projectId: metadata['projectId'] ?? 'none',
    product: metadata['product'] ?? 'unknown',
  });
}

/**
 * Chooses the handler for one verified event, and nothing else.
 *
 * Deduplication is the caller's job — see `handleWebhookEvent` in `billing.service.ts`.
 */
export async function interpretWebhookEvent(
  event: VerifiedStripeEvent,
  ctx: WebhookContext,
): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded':
      return applyCheckoutSession(event, ctx);

    case 'checkout.session.async_payment_failed':
      return applyAsyncPaymentFailed(event, ctx);

    case 'invoice.paid':
      return applyInvoicePaid(event, ctx);

    case 'invoice.payment_failed':
      return applyInvoicePaymentFailed(event, ctx);

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      return applySubscriptionChange(event, ctx);

    case 'payment_intent.payment_failed':
      return applyPaymentIntentFailed(event, ctx);

    case 'charge.refunded':
      return applyChargeRefunded(event, ctx);

    case 'charge.dispute.created':
      return applyDisputeOpened(event, ctx);

    case 'checkout.session.expired':
      return applyCheckoutExpired(event, ctx);

    default:
      // Unhandled event types are normal — the endpoint subscribes narrowly, but
      // Stripe's dashboard configuration is not under this repository's control.
      ctx.logger.info('billing.webhook_ignored', { eventId: event.id, type: event.type });
  }
}
