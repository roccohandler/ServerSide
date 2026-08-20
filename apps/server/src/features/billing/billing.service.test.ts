import { describe, expect, it } from 'vitest';
import { AppError } from '../../lib/appError.js';
import { silentLogger } from '../../lib/logger.js';
import {
  createFakeStripeClient,
  createInMemoryBillingRepository,
  createRecordingEmailService,
} from '../../testing/fakes.js';
import { EXPECTED_AMOUNT_CENTS } from './billing.amounts.js';
import { parseCreateCheckoutSession } from './billing.schema.js';
import { createBillingService, type BillingPriceIds } from './billing.service.js';
import type { StoredProject, VerifiedStripeEvent } from './billing.types.js';

/*
 * The billing rules, exercised without MongoDB or a Stripe account. What these protect:
 *
 *   - payment state advances only through webhooks, idempotently under retries;
 *   - a checkout link is only ever created for a configured product on a real project;
 *   - an unconfigured deployment answers with an instruction, never a guess.
 */

const PRICE_IDS: BillingPriceIds = {
  'build-deposit': 'price_deposit',
  'build-final': 'price_final',
  'growth-partner-monthly': 'price_monthly',
  'growth-partner-annual': 'price_annual',
};

/** A fake whose dashboard amounts match the published prices — the configured-right case. */
function createConfiguredStripe() {
  const stripe = createFakeStripeClient();
  stripe.setPriceAmount('price_deposit', EXPECTED_AMOUNT_CENTS['build-deposit']);
  stripe.setPriceAmount('price_final', EXPECTED_AMOUNT_CENTS['build-final']);
  stripe.setPriceAmount('price_monthly', EXPECTED_AMOUNT_CENTS['growth-partner-monthly']);
  stripe.setPriceAmount('price_annual', EXPECTED_AMOUNT_CENTS['growth-partner-annual']);
  return stripe;
}

function buildService(overrides: Parameters<typeof partialDeps>[0] = {}) {
  return createBillingService(partialDeps(overrides));
}

function partialDeps(
  overrides: Partial<Parameters<typeof createBillingService>[0]> = {},
): Parameters<typeof createBillingService>[0] {
  return {
    repository: createInMemoryBillingRepository(),
    stripe: createConfiguredStripe(),
    priceIds: PRICE_IDS,
    siteUrl: 'https://www.example.com',
    emailService: createRecordingEmailService(),
    notificationRecipient: 'owner@example.com',
    logger: silentLogger,
    ...overrides,
  };
}

async function createAgreedProject(
  service: ReturnType<typeof createBillingService>,
): Promise<StoredProject> {
  return service.createProject({
    businessName: 'Cascade Heating & Air',
    contactName: 'Dana Reyes',
    email: 'dana@cascadeheating.example',
    phone: '(206) 555-0134',
  });
}

function checkoutCompletedEvent(overrides: {
  readonly id?: string;
  readonly type?: string;
  readonly projectId: string;
  readonly product: string;
  readonly subscription?: string;
  readonly paymentIntent?: string;
  readonly paymentStatus?: string;
}): VerifiedStripeEvent {
  return {
    id: overrides.id ?? 'evt_1',
    type: overrides.type ?? 'checkout.session.completed',
    data: {
      object: {
        customer: 'cus_123',
        payment_status: overrides.paymentStatus ?? 'paid',
        ...(overrides.paymentIntent ? { payment_intent: overrides.paymentIntent } : {}),
        ...(overrides.subscription ? { subscription: overrides.subscription } : {}),
        metadata: { projectId: overrides.projectId, product: overrides.product },
      },
    },
  };
}

describe('creating projects and checkout links', () => {
  it('creates a project in the agreed state with nothing paid', async () => {
    const service = buildService();
    const project = await createAgreedProject(service);

    expect(project.status).toBe('agreed');
    expect(project.depositStatus).toBe('pending');
    expect(project.finalStatus).toBe('pending');
    expect(project.subscriptionStatus).toBe('none');
  });

  it('creates a deposit checkout session in payment mode, with the project in metadata', async () => {
    const stripe = createConfiguredStripe();
    const repository = createInMemoryBillingRepository();
    const service = buildService({ stripe, repository });
    const project = await createAgreedProject(service);

    const session = await service.createCheckoutSession({
      projectId: project.id,
      product: 'build-deposit',
    });

    expect(session.url).toMatch(/^https:\/\//);
    expect(stripe.checkoutRequests).toHaveLength(1);
    expect(stripe.checkoutRequests[0]).toMatchObject({
      mode: 'payment',
      priceId: 'price_deposit',
      customerEmail: project.email,
      metadata: { projectId: project.id, product: 'build-deposit' },
    });

    // The session lands on the welcome page, and the id is kept for reconciliation.
    expect(stripe.checkoutRequests[0]?.successUrl).toBe(
      'https://www.example.com/welcome?paid=build-deposit',
    );
    expect(repository.projects[0]?.depositSessionId).toBeTruthy();
  });

  it('creates the subscription in subscription mode', async () => {
    const stripe = createConfiguredStripe();
    const service = buildService({ stripe });
    const project = await createAgreedProject(service);

    await service.createCheckoutSession({
      projectId: project.id,
      product: 'growth-partner-monthly',
    });

    expect(stripe.checkoutRequests[0]?.mode).toBe('subscription');
    expect(stripe.checkoutRequests[0]?.priceId).toBe('price_monthly');
  });

  it('answers 503 with an instruction when Stripe is not configured', async () => {
    const service = buildService({ stripe: undefined });
    const project = await createAgreedProject(service);

    await expect(
      service.createCheckoutSession({ projectId: project.id, product: 'build-deposit' }),
    ).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE' });
  });

  it('answers 503 when the specific price is not configured', async () => {
    const service = buildService({
      priceIds: { ...PRICE_IDS, 'build-final': undefined },
    });
    const project = await createAgreedProject(service);

    await expect(
      service.createCheckoutSession({ projectId: project.id, product: 'build-final' }),
    ).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE' });
  });

  it('refuses a checkout link for a project that does not exist', async () => {
    const service = buildService();

    await expect(
      service.createCheckoutSession({ projectId: 'missing', product: 'build-deposit' }),
    ).rejects.toBeInstanceOf(AppError);
  });

  /*
   * The published price is the authority, never the dashboard. A Stripe Price whose
   * amount disagrees with the published figure must never produce a payment link — a
   * mistyped Price is a wrong charge waiting for a client to pay it.
   */
  it('refuses a checkout link when the Stripe Price disagrees with the published price', async () => {
    const stripe = createConfiguredStripe();
    stripe.setPriceAmount('price_deposit', EXPECTED_AMOUNT_CENTS['build-deposit'] + 100);
    const service = buildService({ stripe });
    const project = await createAgreedProject(service);

    await expect(
      service.createCheckoutSession({ projectId: project.id, product: 'build-deposit' }),
    ).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE' });

    expect(stripe.checkoutRequests).toHaveLength(0);
  });

  it('refuses a checkout link when the Stripe Price has no fixed amount', async () => {
    const stripe = createConfiguredStripe();
    stripe.setPriceAmount('price_monthly', null);
    const service = buildService({ stripe });
    const project = await createAgreedProject(service);

    await expect(
      service.createCheckoutSession({
        projectId: project.id,
        product: 'growth-partner-monthly',
      }),
    ).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE' });
  });

  /*
   * No amount can arrive from a request: the checkout schema is strict, so a body that
   * tries to smuggle a price in is malformed, not half-understood.
   */
  it('rejects any request that tries to supply its own amount', () => {
    expect(() =>
      parseCreateCheckoutSession({
        projectId: 'project-1',
        product: 'build-deposit',
        amount: 1,
      }),
    ).toThrowError(/could not be read/);
  });
});

describe('the billing portal', () => {
  it('creates a portal session for a project with a Stripe customer', async () => {
    const repository = createInMemoryBillingRepository();
    const stripe = createConfiguredStripe();
    const service = buildService({ repository, stripe });
    const project = await createAgreedProject(service);

    await service.handleWebhookEvent(
      checkoutCompletedEvent({ projectId: project.id, product: 'build-deposit' }),
    );

    const session = await service.createPortalSession({ projectId: project.id });

    expect(session.url).toMatch(/^https:\/\//);
    expect(stripe.portalRequests[0]?.customerId).toBe('cus_123');
  });

  it('refuses a portal session before any payment has completed', async () => {
    const service = buildService();
    const project = await createAgreedProject(service);

    await expect(service.createPortalSession({ projectId: project.id })).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
  });
});

describe('webhook interpretation', () => {
  it('marks the deposit paid, schedules the project, and notifies the owner', async () => {
    const repository = createInMemoryBillingRepository();
    const emailService = createRecordingEmailService();
    const service = buildService({ repository, emailService });
    const project = await createAgreedProject(service);

    await service.handleWebhookEvent(
      checkoutCompletedEvent({ projectId: project.id, product: 'build-deposit' }),
    );

    const updated = repository.projects[0];
    expect(updated?.depositStatus).toBe('paid');
    expect(updated?.status).toBe('deposit-paid');
    expect(updated?.stripeCustomerId).toBe('cus_123');

    expect(emailService.sent).toHaveLength(1);
    expect(emailService.sent[0]?.subject).toContain('Payment received');
  });

  it('marks the final payment paid without touching the deposit', async () => {
    const repository = createInMemoryBillingRepository();
    const service = buildService({ repository });
    const project = await createAgreedProject(service);

    await service.handleWebhookEvent(
      checkoutCompletedEvent({ projectId: project.id, product: 'build-final' }),
    );

    expect(repository.projects[0]?.finalStatus).toBe('paid');
    expect(repository.projects[0]?.depositStatus).toBe('pending');
  });

  it('activates the subscription when its checkout completes', async () => {
    const repository = createInMemoryBillingRepository();
    const service = buildService({ repository });
    const project = await createAgreedProject(service);

    await service.handleWebhookEvent(
      checkoutCompletedEvent({
        projectId: project.id,
        product: 'growth-partner-monthly',
        subscription: 'sub_42',
      }),
    );

    expect(repository.projects[0]?.subscriptionId).toBe('sub_42');
    expect(repository.projects[0]?.subscriptionStatus).toBe('active');
  });

  /*
   * Stripe retries deliveries. A retried "payment received" must not email the owner a
   * second time or re-apply anything — the event id is recorded exactly once.
   */
  it('applies a retried event exactly once', async () => {
    const repository = createInMemoryBillingRepository();
    const emailService = createRecordingEmailService();
    const service = buildService({ repository, emailService });
    const project = await createAgreedProject(service);

    const event = checkoutCompletedEvent({ projectId: project.id, product: 'build-deposit' });
    await service.handleWebhookEvent(event);
    await service.handleWebhookEvent(event);

    expect(emailService.sent).toHaveLength(1);
    expect(repository.recordedEventIds).toHaveLength(1);
  });

  it('moves a failing subscription to past_due and tells the owner', async () => {
    const repository = createInMemoryBillingRepository();
    const emailService = createRecordingEmailService();
    const service = buildService({ repository, emailService });
    const project = await createAgreedProject(service);

    await service.handleWebhookEvent(
      checkoutCompletedEvent({
        projectId: project.id,
        product: 'growth-partner-monthly',
        subscription: 'sub_42',
      }),
    );

    await service.handleWebhookEvent({
      id: 'evt_2',
      type: 'invoice.payment_failed',
      data: { object: { subscription: 'sub_42' } },
    });

    expect(repository.projects[0]?.subscriptionStatus).toBe('past_due');
    expect(emailService.sent.at(-1)?.subject).toContain('payment failed');
  });

  it('syncs a cancelled subscription', async () => {
    const repository = createInMemoryBillingRepository();
    const service = buildService({ repository });
    const project = await createAgreedProject(service);

    await service.handleWebhookEvent(
      checkoutCompletedEvent({
        projectId: project.id,
        product: 'growth-partner-monthly',
        subscription: 'sub_42',
      }),
    );

    await service.handleWebhookEvent({
      id: 'evt_3',
      type: 'customer.subscription.deleted',
      data: { object: { id: 'sub_42', status: 'canceled' } },
    });

    expect(repository.projects[0]?.subscriptionStatus).toBe('canceled');
  });

  it('ignores an event whose metadata names no known project', async () => {
    const repository = createInMemoryBillingRepository();
    const emailService = createRecordingEmailService();
    const service = buildService({ repository, emailService });

    await service.handleWebhookEvent(
      checkoutCompletedEvent({ projectId: 'missing', product: 'build-deposit' }),
    );

    expect(repository.projects).toHaveLength(0);
    expect(emailService.sent).toHaveLength(0);
  });

  it('never marks anything paid on a failed payment', async () => {
    const repository = createInMemoryBillingRepository();
    const service = buildService({ repository });
    const project = await createAgreedProject(service);

    await service.handleWebhookEvent({
      id: 'evt_fail',
      type: 'payment_intent.payment_failed',
      data: { object: { metadata: { projectId: project.id, product: 'build-deposit' } } },
    });

    expect(repository.projects[0]?.depositStatus).toBe('pending');
    expect(repository.projects[0]?.finalStatus).toBe('pending');
    expect(repository.projects[0]?.status).toBe('agreed');
  });

  it('never fails the webhook because the notification email failed', async () => {
    const repository = createInMemoryBillingRepository();
    const emailService = createRecordingEmailService();
    emailService.failWith(new Error('Resend is down'));
    const service = buildService({ repository, emailService });
    const project = await createAgreedProject(service);

    await expect(
      service.handleWebhookEvent(
        checkoutCompletedEvent({ projectId: project.id, product: 'build-deposit' }),
      ),
    ).resolves.toBeUndefined();

    // The state advanced even though the email did not.
    expect(repository.projects[0]?.depositStatus).toBe('paid');
  });
});

describe('payment status and asynchronous payment methods', () => {
  /*
   * A completed session is not a paid session. Asynchronous payment methods complete
   * the session first and land (or lose) the money days later — only `payment_status`
   * says which, and only the async events settle it.
   */
  it('records identifiers but marks nothing paid while a completed session is unpaid', async () => {
    const repository = createInMemoryBillingRepository();
    const emailService = createRecordingEmailService();
    const service = buildService({ repository, emailService });
    const project = await createAgreedProject(service);

    await service.handleWebhookEvent(
      checkoutCompletedEvent({
        projectId: project.id,
        product: 'build-deposit',
        paymentStatus: 'unpaid',
        paymentIntent: 'pi_dep',
      }),
    );

    const updated = repository.projects[0];
    expect(updated?.depositStatus).toBe('pending');
    expect(updated?.status).toBe('agreed');
    expect(updated?.stripeCustomerId).toBe('cus_123');
    expect(updated?.depositPaymentIntentId).toBe('pi_dep');
    expect(emailService.sent).toHaveLength(0);
  });

  it('marks the deposit paid when the asynchronous payment eventually succeeds', async () => {
    const repository = createInMemoryBillingRepository();
    const emailService = createRecordingEmailService();
    const service = buildService({ repository, emailService });
    const project = await createAgreedProject(service);

    await service.handleWebhookEvent(
      checkoutCompletedEvent({
        projectId: project.id,
        product: 'build-deposit',
        paymentStatus: 'unpaid',
      }),
    );
    await service.handleWebhookEvent(
      checkoutCompletedEvent({
        id: 'evt_async_ok',
        type: 'checkout.session.async_payment_succeeded',
        projectId: project.id,
        product: 'build-deposit',
      }),
    );

    expect(repository.projects[0]?.depositStatus).toBe('paid');
    expect(repository.projects[0]?.status).toBe('deposit-paid');
    expect(emailService.sent).toHaveLength(1);
  });

  it('marks the payment failed when the asynchronous payment definitively fails', async () => {
    const repository = createInMemoryBillingRepository();
    const emailService = createRecordingEmailService();
    const service = buildService({ repository, emailService });
    const project = await createAgreedProject(service);

    await service.handleWebhookEvent(
      checkoutCompletedEvent({
        id: 'evt_async_fail',
        type: 'checkout.session.async_payment_failed',
        projectId: project.id,
        product: 'build-deposit',
        paymentStatus: 'unpaid',
      }),
    );

    expect(repository.projects[0]?.depositStatus).toBe('failed');
    expect(emailService.sent.at(-1)?.subject).toContain('payment failed');
  });
});

describe('refunds', () => {
  async function payDeposit(
    service: ReturnType<typeof createBillingService>,
    projectId: string,
  ): Promise<void> {
    await service.handleWebhookEvent(
      checkoutCompletedEvent({ projectId, product: 'build-deposit', paymentIntent: 'pi_dep' }),
    );
  }

  it('marks a fully refunded deposit and tells the owner', async () => {
    const repository = createInMemoryBillingRepository();
    const emailService = createRecordingEmailService();
    const service = buildService({ repository, emailService });
    const project = await createAgreedProject(service);
    await payDeposit(service, project.id);

    await service.handleWebhookEvent({
      id: 'evt_refund',
      type: 'charge.refunded',
      data: { object: { payment_intent: 'pi_dep', refunded: true } },
    });

    expect(repository.projects[0]?.depositStatus).toBe('refunded');
    expect(emailService.sent.at(-1)?.subject).toContain('refunded');
  });

  it('leaves a partial refund marked paid but still tells the owner', async () => {
    const repository = createInMemoryBillingRepository();
    const emailService = createRecordingEmailService();
    const service = buildService({ repository, emailService });
    const project = await createAgreedProject(service);
    await payDeposit(service, project.id);

    await service.handleWebhookEvent({
      id: 'evt_partial_refund',
      type: 'charge.refunded',
      data: { object: { payment_intent: 'pi_dep', refunded: false } },
    });

    expect(repository.projects[0]?.depositStatus).toBe('paid');
    expect(emailService.sent.at(-1)?.subject).toContain('refunded');
  });

  it('notifies about a refund it cannot match to a build payment without touching state', async () => {
    const repository = createInMemoryBillingRepository();
    const emailService = createRecordingEmailService();
    const service = buildService({ repository, emailService });
    const project = await createAgreedProject(service);
    await payDeposit(service, project.id);

    await service.handleWebhookEvent({
      id: 'evt_stray_refund',
      type: 'charge.refunded',
      data: { object: { payment_intent: 'pi_subscription_invoice', refunded: true } },
    });

    expect(repository.projects[0]?.depositStatus).toBe('paid');
    expect(emailService.sent.at(-1)?.subject).toContain('refunded');
  });
});

describe('invoice events across Stripe API versions', () => {
  /*
   * Stripe moved the invoice's subscription reference from a top-level field to
   * `parent.subscription_details` in the 2025-03-31 (Basil) API version. A webhook
   * endpoint created today delivers the new shape; both must keep working.
   */
  it('reads the subscription from parent.subscription_details on newer API versions', async () => {
    const repository = createInMemoryBillingRepository();
    const service = buildService({ repository });
    const project = await createAgreedProject(service);

    await service.handleWebhookEvent(
      checkoutCompletedEvent({
        projectId: project.id,
        product: 'growth-partner-monthly',
        subscription: 'sub_42',
      }),
    );

    await service.handleWebhookEvent({
      id: 'evt_basil_failed',
      type: 'invoice.payment_failed',
      data: { object: { parent: { subscription_details: { subscription: 'sub_42' } } } },
    });
    expect(repository.projects[0]?.subscriptionStatus).toBe('past_due');

    await service.handleWebhookEvent({
      id: 'evt_basil_paid',
      type: 'invoice.paid',
      data: { object: { parent: { subscription_details: { subscription: 'sub_42' } } } },
    });
    expect(repository.projects[0]?.subscriptionStatus).toBe('active');
  });
});

describe('webhook retries and recovery', () => {
  /*
   * The reason claims are released on failure: Stripe retries a webhook the handler
   * answered 500 to, and that retry must be allowed to run the event again — a retry
   * "deduplicated" against a failed attempt would eat a real payment forever.
   */
  it('releases a failed event so the retry can apply it', async () => {
    const repository = createInMemoryBillingRepository();
    const emailService = createRecordingEmailService();
    const service = buildService({ repository, emailService });
    const project = await createAgreedProject(service);

    const event = checkoutCompletedEvent({ projectId: project.id, product: 'build-deposit' });

    repository.failNextUpdate(new Error('transient database failure'));
    await expect(service.handleWebhookEvent(event)).rejects.toThrow('transient database failure');

    // The claim is gone, nothing was applied, nobody was emailed.
    expect(repository.recordedEventIds).toHaveLength(0);
    expect(repository.projects[0]?.depositStatus).toBe('pending');
    expect(emailService.sent).toHaveLength(0);

    // Stripe retries; this time it lands, exactly once.
    await service.handleWebhookEvent(event);
    expect(repository.projects[0]?.depositStatus).toBe('paid');
    expect(emailService.sent).toHaveLength(1);
  });

  it('marks an applied event processed so replays stay silent', async () => {
    const repository = createInMemoryBillingRepository();
    const service = buildService({ repository });
    const project = await createAgreedProject(service);

    await service.handleWebhookEvent(
      checkoutCompletedEvent({ projectId: project.id, product: 'build-deposit' }),
    );

    expect(repository.processedEventIds).toEqual(['evt_1']);
  });
});

describe('listing projects', () => {
  it('lists the most recent projects first, respecting the limit', async () => {
    let tick = 0;
    const repository = createInMemoryBillingRepository({
      now: () => new Date(Date.UTC(2026, 0, 1, 0, 0, tick++)),
    });
    const service = buildService({ repository });

    await createAgreedProject(service);
    const second = await service.createProject({
      businessName: 'Sound Plumbing Co',
      contactName: 'Ari Chen',
      email: 'ari@soundplumbing.example',
    });

    const all = await service.listProjects(10);
    expect(all.map((project) => project.id)).toEqual([second.id, all[1]?.id]);
    expect(all).toHaveLength(2);

    const limited = await service.listProjects(1);
    expect(limited.map((project) => project.id)).toEqual([second.id]);
  });
});

describe('the response-guarantee remedy', () => {
  async function subscribedProject(
    service: ReturnType<typeof createBillingService>,
  ): Promise<StoredProject> {
    const project = await createAgreedProject(service);
    await service.handleWebhookEvent(
      checkoutCompletedEvent({
        projectId: project.id,
        product: 'growth-partner-monthly',
        subscription: 'sub_42',
      }),
    );
    return project;
  }

  it('credits the customer balance for a missed month and records it', async () => {
    const stripe = createConfiguredStripe();
    const repository = createInMemoryBillingRepository();
    const service = buildService({ stripe, repository });
    const project = await subscribedProject(service);

    const credit = await service.recordGuaranteeCredit({ projectId: project.id, month: '2026-08' });

    expect(credit).toMatchObject({
      projectId: project.id,
      month: '2026-08',
      remedy: 'credit',
      amountCents: EXPECTED_AMOUNT_CENTS['growth-partner-monthly'],
    });
    expect(credit.stripeReference).toBeTruthy();
    expect(stripe.balanceCredits).toHaveLength(1);
    expect(stripe.balanceCredits[0]).toMatchObject({
      customerId: 'cus_123',
      amountCents: EXPECTED_AMOUNT_CENTS['growth-partner-monthly'],
      currency: 'usd',
    });
    expect(repository.guaranteeCreditKeys).toEqual([`${project.id}:2026-08`]);
  });

  it('records each month at most once, no matter how often it is submitted', async () => {
    const stripe = createConfiguredStripe();
    const service = buildService({ stripe });
    const project = await subscribedProject(service);

    await service.recordGuaranteeCredit({ projectId: project.id, month: '2026-08' });

    await expect(
      service.recordGuaranteeCredit({ projectId: project.id, month: '2026-08' }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });

    expect(stripe.balanceCredits).toHaveLength(1);

    // A different month is a different miss and is allowed.
    await service.recordGuaranteeCredit({ projectId: project.id, month: '2026-09' });
    expect(stripe.balanceCredits).toHaveLength(2);
  });

  it('refunds the month instead when the subscription is already over', async () => {
    const stripe = createConfiguredStripe();
    const service = buildService({ stripe });
    const project = await subscribedProject(service);

    await service.handleWebhookEvent({
      id: 'evt_cancel',
      type: 'customer.subscription.deleted',
      data: { object: { id: 'sub_42', status: 'canceled' } },
    });

    const credit = await service.recordGuaranteeCredit({ projectId: project.id, month: '2026-08' });

    expect(credit.remedy).toBe('refund');
    expect(stripe.balanceCredits).toHaveLength(0);
    expect(stripe.subscriptionRefunds).toEqual([
      { subscriptionId: 'sub_42', amountCents: EXPECTED_AMOUNT_CENTS['growth-partner-monthly'] },
    ]);
  });

  it('lets the owner choose the refund remedy for a client who is leaving', async () => {
    const stripe = createConfiguredStripe();
    const service = buildService({ stripe });
    const project = await subscribedProject(service);

    const credit = await service.recordGuaranteeCredit({
      projectId: project.id,
      month: '2026-08',
      remedy: 'refund',
    });

    expect(credit.remedy).toBe('refund');
    expect(stripe.balanceCredits).toHaveLength(0);
    expect(stripe.subscriptionRefunds).toHaveLength(1);
  });

  it('refuses a guarantee credit for a project without a subscription', async () => {
    const service = buildService();
    const project = await createAgreedProject(service);

    await expect(
      service.recordGuaranteeCredit({ projectId: project.id, month: '2026-08' }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('releases a failed remedy so the owner can retry it', async () => {
    const stripe = createConfiguredStripe();
    const repository = createInMemoryBillingRepository();
    const service = buildService({ stripe, repository });
    const project = await subscribedProject(service);

    stripe.failNextBalanceCredit(new Error('Stripe is unreachable'));
    await expect(
      service.recordGuaranteeCredit({ projectId: project.id, month: '2026-08' }),
    ).rejects.toThrow('Stripe is unreachable');

    // The claim is gone; the retry applies the remedy exactly once.
    expect(repository.guaranteeCreditKeys).toHaveLength(0);
    await service.recordGuaranteeCredit({ projectId: project.id, month: '2026-08' });
    expect(stripe.balanceCredits).toHaveLength(1);
  });
});

describe('free founding projects', () => {
  it('fulfils a free project with no Stripe involvement at all', async () => {
    const stripe = createConfiguredStripe();
    const repository = createInMemoryBillingRepository();
    const service = buildService({ stripe, repository });
    const project = await createAgreedProject(service);

    await service.setProjectStatus(project.id, 'in-build');
    await service.setProjectStatus(project.id, 'launched');
    await service.setProjectStatus(project.id, 'complete');

    const finished = repository.projects[0];
    expect(finished?.status).toBe('complete');
    // No payment, no fake revenue, no Stripe customer, no sessions.
    expect(finished?.depositStatus).toBe('pending');
    expect(finished?.stripeCustomerId).toBeUndefined();
    expect(stripe.checkoutRequests).toHaveLength(0);
    expect(stripe.balanceCredits).toHaveLength(0);
  });

  it('lets a free client enter Growth Partner billing later, like anyone else', async () => {
    const stripe = createConfiguredStripe();
    const repository = createInMemoryBillingRepository();
    const service = buildService({ stripe, repository });
    const project = await createAgreedProject(service);
    await service.setProjectStatus(project.id, 'launched');

    const session = await service.createCheckoutSession({
      projectId: project.id,
      product: 'growth-partner-monthly',
    });
    expect(session.url).toMatch(/^https:\/\//);
    expect(stripe.checkoutRequests[0]?.mode).toBe('subscription');

    await service.handleWebhookEvent(
      checkoutCompletedEvent({
        projectId: project.id,
        product: 'growth-partner-monthly',
        subscription: 'sub_free_1',
      }),
    );

    expect(repository.projects[0]?.subscriptionStatus).toBe('active');
    expect(repository.projects[0]?.stripeCustomerId).toBe('cus_123');
    // The build itself remains honestly unpaid — it was free, not disguised revenue.
    expect(repository.projects[0]?.depositStatus).toBe('pending');
  });
});

describe('launch discipline', () => {
  it('never launches a project just because the final payment arrived', async () => {
    const repository = createInMemoryBillingRepository();
    const service = buildService({ repository });
    const project = await createAgreedProject(service);
    await service.setProjectStatus(project.id, 'in-build');

    await service.handleWebhookEvent(
      checkoutCompletedEvent({ projectId: project.id, product: 'build-final' }),
    );

    // Payment recorded; the launch transition stays the owner's explicit call.
    expect(repository.projects[0]?.finalStatus).toBe('paid');
    expect(repository.projects[0]?.status).toBe('in-build');
  });
});

describe('refund isolation', () => {
  it('a refund never touches any project other than its own', async () => {
    const repository = createInMemoryBillingRepository();
    const service = buildService({ repository });

    const first = await createAgreedProject(service);
    const second = await service.createProject({
      businessName: 'Sound Plumbing Co',
      contactName: 'Ari Chen',
      email: 'ari@soundplumbing.example',
    });

    await service.handleWebhookEvent(
      checkoutCompletedEvent({
        id: 'evt_a',
        projectId: first.id,
        product: 'build-deposit',
        paymentIntent: 'pi_first',
      }),
    );
    await service.handleWebhookEvent(
      checkoutCompletedEvent({
        id: 'evt_b',
        projectId: second.id,
        product: 'build-deposit',
        paymentIntent: 'pi_second',
      }),
    );

    await service.handleWebhookEvent({
      id: 'evt_refund_a',
      type: 'charge.refunded',
      data: { object: { payment_intent: 'pi_first', refunded: true } },
    });

    expect(repository.projects[0]?.depositStatus).toBe('refunded');
    // The refunded project's other fields are untouched...
    expect(repository.projects[0]?.finalStatus).toBe('pending');
    expect(repository.projects[0]?.status).toBe('deposit-paid');
    // ...and the unrelated project is exactly as it was.
    expect(repository.projects[1]?.depositStatus).toBe('paid');
    expect(repository.projects[1]?.status).toBe('deposit-paid');
  });
});

describe('Stripe API failure', () => {
  it('propagates a Stripe failure without recording a session id', async () => {
    const stripe = createConfiguredStripe();
    const repository = createInMemoryBillingRepository();
    const service = buildService({ stripe, repository });
    const project = await createAgreedProject(service);

    stripe.failNextCheckout(new Error('Stripe is unreachable'));

    await expect(
      service.createCheckoutSession({ projectId: project.id, product: 'build-deposit' }),
    ).rejects.toThrow('Stripe is unreachable');

    expect(repository.projects[0]?.depositSessionId).toBeUndefined();
  });
});

/*
 * ============================================================================
 * ONE ACCOUNT, ONE STRIPE CUSTOMER — ON THE WAY OUT AS WELL AS THE WAY IN
 * ============================================================================
 *
 * `onPaymentSucceeded` has always stored the first customer id and never overwritten it.
 * What was missing was the other half: sending it *back* to Stripe on the next checkout.
 * Without that, a payment-mode session carrying only an email lets Stripe create a fresh
 * guest customer each time, so the account's second payment belongs to a customer the
 * application has never heard of — and the portal, the invoices and any later
 * subscription all hang off the first one.
 *
 * The two assertions below are the whole property: the id is sent when it is known, and
 * the email is sent instead when it is not (Stripe refuses a session carrying both).
 * ============================================================================
 */
describe('Stripe customer continuity', () => {
  it('sends the stored customer id on a checkout for a project that has one', async () => {
    const stripe = createConfiguredStripe();
    const repository = createInMemoryBillingRepository();
    const service = buildService({ stripe, repository });
    const project = await createAgreedProject(service);

    // The deposit arrives and Stripe names the customer it created.
    await service.handleWebhookEvent(
      checkoutCompletedEvent({ projectId: project.id, product: 'build-deposit' }),
    );
    expect(repository.projects[0]?.stripeCustomerId).toBe('cus_123');

    await service.createCheckoutSession({ projectId: project.id, product: 'build-final' });

    const second = stripe.checkoutRequests.at(-1);
    expect(second?.customerId).toBe('cus_123');
  });

  it('falls back to the email on a first payment, when there is no customer yet', async () => {
    const stripe = createConfiguredStripe();
    const service = buildService({ stripe });
    const project = await createAgreedProject(service);

    await service.createCheckoutSession({ projectId: project.id, product: 'build-deposit' });

    const first = stripe.checkoutRequests[0];
    expect(first?.customerId).toBeUndefined();
    expect(first?.customerEmail).toBe(project.email);
  });
});

describe('disputes and expired sessions', () => {
  /*
   * A dispute is not a refund: the outcome is weeks away and either side can win. The
   * project keeps its honest state and the owner is told, because the alternative — which
   * is what happened before — is a build proceeding on money that has been taken back.
   */
  it('tells the owner about a dispute without inventing a payment outcome', async () => {
    const repository = createInMemoryBillingRepository();
    const emailService = createRecordingEmailService();
    const service = buildService({ repository, emailService });
    const project = await createAgreedProject(service);

    await service.handleWebhookEvent(
      checkoutCompletedEvent({
        projectId: project.id,
        product: 'build-deposit',
        paymentIntent: 'pi_disputed',
      }),
    );

    await service.handleWebhookEvent({
      id: 'evt_dispute',
      type: 'charge.dispute.created',
      data: { object: { payment_intent: 'pi_disputed' } },
    });

    // Still 'paid' — a dispute is a claim, not a resolution.
    expect(repository.projects[0]?.depositStatus).toBe('paid');
    const sent = emailService.sent.at(-1);
    expect(sent?.subject).toContain('failed');
    expect(sent?.text).toContain('disputed');
  });

  it('records an expired checkout and changes nothing', async () => {
    const repository = createInMemoryBillingRepository();
    const service = buildService({ repository });
    const project = await createAgreedProject(service);

    await service.handleWebhookEvent({
      id: 'evt_expired',
      type: 'checkout.session.expired',
      data: { object: { metadata: { projectId: project.id, product: 'build-deposit' } } },
    });

    expect(repository.projects[0]?.depositStatus).toBe('pending');
    expect(repository.projects[0]?.status).toBe('agreed');
  });
});
