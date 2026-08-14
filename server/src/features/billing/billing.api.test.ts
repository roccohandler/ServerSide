import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../app/app.js';
import { loadServerConfig } from '../../config/env.js';
import { silentLogger } from '../../lib/logger.js';
import {
  createFakeStripeClient,
  createInMemoryBillingRepository,
  createRecordingEmailService,
  type FakeStripeClient,
  type InMemoryBillingRepository,
  type RecordingEmailService,
} from '../../testing/fakes.js';
import { EXPECTED_AMOUNT_CENTS } from './billing.amounts.js';
import { createBillingService, type BillingPriceIds } from './billing.service.js';
import type { VerifiedStripeEvent } from './billing.types.js';

/*
 * The billing HTTP surface, end to end through the real pipeline: the admin bearer
 * token, the strict schemas, and — most load-bearing — the webhook transport, whose
 * raw-body wiring in app.ts cannot be exercised by service-level tests.
 */

const ADMIN_TOKEN = 'test-admin-token-0123456789abcdef';

const configWithAdminToken = loadServerConfig({
  NODE_ENV: 'development',
  LOG_LEVEL: 'silent',
  BILLING_ADMIN_TOKEN: ADMIN_TOKEN,
});

const configWithoutAdminToken = loadServerConfig({
  NODE_ENV: 'development',
  LOG_LEVEL: 'silent',
});

const PRICE_IDS: BillingPriceIds = {
  'build-deposit': 'price_deposit',
  'build-final': 'price_final',
  'growth-partner-monthly': 'price_monthly',
  'growth-partner-annual': 'price_annual',
};

interface Harness {
  readonly app: ReturnType<typeof createApp>;
  readonly repository: InMemoryBillingRepository;
  readonly stripe: FakeStripeClient;
  readonly emailService: RecordingEmailService;
  readonly service: ReturnType<typeof createBillingService>;
}

function buildHarness(
  options: { adminTokenConfigured?: boolean; stripeConfigured?: boolean } = {},
): Harness {
  const repository = createInMemoryBillingRepository();
  const emailService = createRecordingEmailService();
  const stripe = createFakeStripeClient();
  stripe.setPriceAmount('price_deposit', EXPECTED_AMOUNT_CENTS['build-deposit']);
  stripe.setPriceAmount('price_final', EXPECTED_AMOUNT_CENTS['build-final']);
  stripe.setPriceAmount('price_monthly', EXPECTED_AMOUNT_CENTS['growth-partner-monthly']);
  stripe.setPriceAmount('price_annual', EXPECTED_AMOUNT_CENTS['growth-partner-annual']);

  const stripeConfigured = options.stripeConfigured ?? true;

  const service = createBillingService({
    repository,
    stripe: stripeConfigured ? stripe : undefined,
    priceIds: PRICE_IDS,
    siteUrl: 'https://www.example.com',
    emailService,
    notificationRecipient: 'owner@example.com',
    logger: silentLogger,
  });

  const app = createApp({
    config: options.adminTokenConfigured === false ? configWithoutAdminToken : configWithAdminToken,
    logger: silentLogger,
    rateLimitEnabled: false,
    billingService: service,
    ...(stripeConfigured ? { stripeClient: stripe } : {}),
  });

  return { app, repository, stripe, emailService, service };
}

function validProjectBody(): Record<string, unknown> {
  return {
    businessName: 'Cascade Heating & Air',
    contactName: 'Dana Reyes',
    email: 'dana@cascadeheating.example',
  };
}

function depositPaidEvent(projectId: string, eventId = 'evt_http_1'): VerifiedStripeEvent {
  return {
    id: eventId,
    type: 'checkout.session.completed',
    data: {
      object: {
        customer: 'cus_123',
        payment_status: 'paid',
        metadata: { projectId, product: 'build-deposit' },
      },
    },
  };
}

function postWebhook(app: ReturnType<typeof createApp>, withSignature = true) {
  const post = request(app).post('/api/billing/webhook').set('Content-Type', 'application/json');
  return (withSignature ? post.set('stripe-signature', 't=1,v1=test') : post).send('{}');
}

describe('billing admin authorization', () => {
  it('answers 404 — not 401 — without a token', async () => {
    const { app } = buildHarness();

    const response = await request(app).post('/api/billing/projects').send(validProjectBody());

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('answers 404 for a wrong token', async () => {
    const { app } = buildHarness();

    const response = await request(app)
      .post('/api/billing/projects')
      .set('Authorization', 'Bearer wrong-token')
      .send(validProjectBody());

    expect(response.status).toBe(404);
  });

  it('answers 503 with an instruction when no admin token is configured', async () => {
    const { app } = buildHarness({ adminTokenConfigured: false });

    const response = await request(app)
      .post('/api/billing/projects')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send(validProjectBody());

    expect(response.status).toBe(503);
    expect(response.body.error.message).toContain('BILLING_ADMIN_TOKEN');
  });

  it('creates a project for the owner', async () => {
    const { app, repository } = buildHarness();

    const response = await request(app)
      .post('/api/billing/projects')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send(validProjectBody());

    expect(response.status).toBe(201);
    expect(response.body.data.project).toMatchObject({
      status: 'agreed',
      depositStatus: 'pending',
    });
    expect(repository.projects).toHaveLength(1);
  });
});

describe('billing input validation', () => {
  it('returns per-field messages for a project missing required values', async () => {
    const { app } = buildHarness();

    const response = await request(app)
      .post('/api/billing/projects')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ businessName: 'Cascade Heating & Air' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(Object.keys(response.body.error.fields)).toEqual(
      expect.arrayContaining(['contactName', 'email']),
    );
  });

  it('rejects a checkout request that smuggles its own amount', async () => {
    const { app, service } = buildHarness();
    const project = await service.createProject({
      businessName: 'Cascade Heating & Air',
      contactName: 'Dana Reyes',
      email: 'dana@cascadeheating.example',
    });

    const response = await request(app)
      .post('/api/billing/checkout-sessions')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ projectId: project.id, product: 'build-deposit', amount: 1 });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('MALFORMED_REQUEST');
  });
});

describe('checkout sessions and project listing over HTTP', () => {
  it('creates a checkout session and returns its hosted URL', async () => {
    const { app, service, stripe } = buildHarness();
    const project = await service.createProject({
      businessName: 'Cascade Heating & Air',
      contactName: 'Dana Reyes',
      email: 'dana@cascadeheating.example',
    });

    const response = await request(app)
      .post('/api/billing/checkout-sessions')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ projectId: project.id, product: 'build-deposit' });

    expect(response.status).toBe(201);
    expect(response.body.data.url).toMatch(/^https:\/\//);
    expect(stripe.checkoutRequests).toHaveLength(1);
  });

  it('answers 503 with an instruction when Stripe is not configured', async () => {
    const { app, service } = buildHarness({ stripeConfigured: false });
    const project = await service.createProject({
      businessName: 'Cascade Heating & Air',
      contactName: 'Dana Reyes',
      email: 'dana@cascadeheating.example',
    });

    const response = await request(app)
      .post('/api/billing/checkout-sessions')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ projectId: project.id, product: 'build-deposit' });

    expect(response.status).toBe(503);
  });

  it('lists projects for the owner, most recent first', async () => {
    const { app, service } = buildHarness();
    await service.createProject({
      businessName: 'Cascade Heating & Air',
      contactName: 'Dana Reyes',
      email: 'dana@cascadeheating.example',
    });

    const response = await request(app)
      .get('/api/billing/projects')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

    expect(response.status).toBe(200);
    expect(response.body.data.projects).toHaveLength(1);
  });
});

describe('the customer portal and guarantee credits over HTTP', () => {
  async function subscribedProject(harness: Harness) {
    const project = await harness.service.createProject({
      businessName: 'Cascade Heating & Air',
      contactName: 'Dana Reyes',
      email: 'dana@cascadeheating.example',
    });
    harness.stripe.nextEvent = {
      id: 'evt_sub',
      type: 'checkout.session.completed',
      data: {
        object: {
          customer: 'cus_123',
          payment_status: 'paid',
          subscription: 'sub_42',
          metadata: { projectId: project.id, product: 'growth-partner-monthly' },
        },
      },
    };
    await postWebhook(harness.app);
    return project;
  }

  it('issues a portal session to the owner and to nobody else', async () => {
    const harness = buildHarness();
    const project = await subscribedProject(harness);

    const anonymous = await request(harness.app)
      .post('/api/billing/portal-sessions')
      .send({ projectId: project.id });
    expect(anonymous.status).toBe(404);

    const owner = await request(harness.app)
      .post('/api/billing/portal-sessions')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ projectId: project.id });
    expect(owner.status).toBe(201);
    expect(owner.body.data.url).toMatch(/^https:\/\//);
  });

  it('lets only the owner record a guarantee credit — a browser cannot self-award one', async () => {
    const harness = buildHarness();
    const project = await subscribedProject(harness);

    const selfAward = await request(harness.app)
      .post('/api/billing/guarantee-credits')
      .send({ projectId: project.id, month: '2026-08' });
    expect(selfAward.status).toBe(404);
    expect(harness.stripe.balanceCredits).toHaveLength(0);

    const owner = await request(harness.app)
      .post('/api/billing/guarantee-credits')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ projectId: project.id, month: '2026-08' });
    expect(owner.status).toBe(201);
    expect(owner.body.data.credit).toMatchObject({ month: '2026-08', remedy: 'credit' });
    expect(harness.stripe.balanceCredits).toHaveLength(1);

    const duplicate = await request(harness.app)
      .post('/api/billing/guarantee-credits')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ projectId: project.id, month: '2026-08' });
    expect(duplicate.status).toBe(400);
    expect(harness.stripe.balanceCredits).toHaveLength(1);
  });

  it('rejects a malformed guarantee month', async () => {
    const harness = buildHarness();
    const project = await subscribedProject(harness);

    const response = await request(harness.app)
      .post('/api/billing/guarantee-credits')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ projectId: project.id, month: 'August 2026' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('the Stripe webhook endpoint', () => {
  it('rejects a request without a signature header', async () => {
    const { app } = buildHarness();

    const response = await postWebhook(app, false);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('MALFORMED_REQUEST');
  });

  it('rejects a request whose signature does not verify', async () => {
    const { app, stripe } = buildHarness();
    stripe.failNextVerification();

    const response = await postWebhook(app);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('MALFORMED_REQUEST');
  });

  it('answers 503 when Stripe is not configured', async () => {
    const { app } = buildHarness({ stripeConfigured: false });

    const response = await postWebhook(app);

    expect(response.status).toBe(503);
  });

  it('applies a verified event and acknowledges it', async () => {
    const { app, service, stripe, repository } = buildHarness();
    const project = await service.createProject({
      businessName: 'Cascade Heating & Air',
      contactName: 'Dana Reyes',
      email: 'dana@cascadeheating.example',
    });
    stripe.nextEvent = depositPaidEvent(project.id);

    const response = await postWebhook(app);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, data: { received: true } });
    expect(repository.projects[0]?.depositStatus).toBe('paid');
  });

  it('applies a redelivered event exactly once', async () => {
    const { app, service, stripe, repository, emailService } = buildHarness();
    const project = await service.createProject({
      businessName: 'Cascade Heating & Air',
      contactName: 'Dana Reyes',
      email: 'dana@cascadeheating.example',
    });
    stripe.nextEvent = depositPaidEvent(project.id);

    const first = await postWebhook(app);
    const second = await postWebhook(app);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(emailService.sent).toHaveLength(1);
    expect(repository.recordedEventIds).toHaveLength(1);
  });

  /*
   * The mandatory redirect-trust test: a customer's browser coming back from
   * Checkout — to /welcome or anywhere else — must be able to change nothing.
   * Server-side there is exactly one door to payment state, and it demands a
   * valid Stripe signature.
   */
  it('changes no payment state for anything short of a verified webhook', async () => {
    const { app, service, stripe, repository } = buildHarness();
    const project = await service.createProject({
      businessName: 'Cascade Heating & Air',
      contactName: 'Dana Reyes',
      email: 'dana@cascadeheating.example',
    });
    stripe.nextEvent = depositPaidEvent(project.id);

    // The "success redirect": no server request at all can stand in for payment —
    // an unsigned webhook post is the closest thing to a forged confirmation.
    const unsigned = await postWebhook(app, false);
    expect(unsigned.status).toBe(400);

    stripe.failNextVerification();
    const badSignature = await postWebhook(app);
    expect(badSignature.status).toBe(400);

    expect(repository.projects[0]?.depositStatus).toBe('pending');
    expect(repository.projects[0]?.status).toBe('agreed');

    // Only the genuine article moves it.
    const verified = await postWebhook(app);
    expect(verified.status).toBe(200);
    expect(repository.projects[0]?.depositStatus).toBe('paid');
  });

  it('answers 500 on a processing failure and applies the retry cleanly', async () => {
    const { app, service, stripe, repository, emailService } = buildHarness();
    const project = await service.createProject({
      businessName: 'Cascade Heating & Air',
      contactName: 'Dana Reyes',
      email: 'dana@cascadeheating.example',
    });
    stripe.nextEvent = depositPaidEvent(project.id);

    repository.failNextUpdate(new Error('transient database failure'));
    const failed = await postWebhook(app);
    expect(failed.status).toBe(500);
    expect(repository.projects[0]?.depositStatus).toBe('pending');

    // Stripe retries what it got a 500 for; the retry must land, exactly once.
    const retried = await postWebhook(app);
    expect(retried.status).toBe(200);
    expect(repository.projects[0]?.depositStatus).toBe('paid');
    expect(emailService.sent).toHaveLength(1);
  });
});
