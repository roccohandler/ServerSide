import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../app/app.js';
import { loadServerConfig } from '../../config/env.js';
import { silentLogger } from '../../lib/logger.js';
import { createAuthService } from '../auth/index.js';
import {
  createInMemoryAuthRepository,
  type InMemoryAuthRepository,
} from '../../testing/authFakes.js';
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
 * token, the staff session beside it, the strict schemas, and — most load-bearing — the
 * webhook transport, whose raw-body wiring in app.ts cannot be exercised by service-level
 * tests.
 *
 * ============================================================================
 * WHY THIS FILE GREW AN ACCOUNT
 * ============================================================================
 *
 * DECISION 019, option B: these endpoints now require `requireAdmin` **as well as** the
 * token. That is one line in `billing.routes.ts` and a whole harness here, because a file
 * that had never needed an identity now needs a real one — signed up over HTTP and promoted
 * through the repository, which is the only thing in the application that can grant a role.
 *
 * The cost is worth stating: every request below carries a cookie, a bearer token and an
 * Origin, and all three are load-bearing. A test that quietly dropped the cookie would still
 * pass against a deployment that had lost the session requirement, because the answer to both
 * is 404.  That is what `describe('billing admin authorization')` exists to pin.
 * ============================================================================
 */

const ADMIN_TOKEN = 'test-admin-token-0123456789abcdef';
const PASSWORD = 'a-long-enough-passphrase';

/** The default `PUBLIC_SITE_URL`, and so the origin the CSRF guard accepts. */
const ORIGIN = 'http://localhost:5173';

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

type Method = 'get' | 'post' | 'patch';

interface Harness {
  readonly app: ReturnType<typeof createApp>;
  readonly repository: InMemoryBillingRepository;
  readonly stripe: FakeStripeClient;
  readonly emailService: RecordingEmailService;
  readonly service: ReturnType<typeof createBillingService>;
  readonly auth: InMemoryAuthRepository;
  /** A staff session cookie, minted in `buildHarness`. */
  readonly staffCookie: string;
  /** Everything a real owner request carries: session, token, origin. */
  readonly asOwner: (method: Method, path: string) => request.Test;
  /** The same request with the session left off, to prove the session is doing work. */
  readonly withTokenOnly: (method: Method, path: string) => request.Test;
}

/** Pulls the session cookie out of a `set-cookie` header. */
function sessionCookieFrom(headers: Record<string, unknown>): string {
  const raw = headers['set-cookie'];
  const values = Array.isArray(raw) ? raw : typeof raw === 'string' ? [raw] : [];
  const cookie = values.find((value) => value.startsWith('jobforge_session='));

  if (!cookie) throw new Error('No session cookie was set.');
  return cookie.split(';')[0] ?? '';
}

async function buildHarness(
  options: { adminTokenConfigured?: boolean; stripeConfigured?: boolean } = {},
): Promise<Harness> {
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

  /*
   * Real accounts, in memory. Left to the app's defaults these would be Mongo-backed and
   * every signup here would answer 503 — which, since `requireAdmin` also answers a
   * failure with 404, would look exactly like the guard working.
   */
  const authRepository = createInMemoryAuthRepository();
  const authService = createAuthService({
    repository: authRepository,
    identityVerifier: undefined,
    emailService,
    siteUrl: ORIGIN,
    logger: silentLogger,
  });

  const app = createApp({
    config: options.adminTokenConfigured === false ? configWithoutAdminToken : configWithAdminToken,
    logger: silentLogger,
    rateLimitEnabled: false,
    billingService: service,
    authService,
    authRepository,
    ...(stripeConfigured ? { stripeClient: stripe } : {}),
  });

  const signup = await request(app)
    .post('/api/auth/signup')
    .set('Origin', ORIGIN)
    .send({ email: 'owner@example.com', name: 'The Owner', password: PASSWORD });

  if (signup.status !== 201) throw new Error(`signup failed: ${signup.status}`);
  const staffCookie = sessionCookieFrom(signup.headers);

  const user = await authRepository.findUserByEmail('owner@example.com');
  if (!user) throw new Error('the account that was just created is missing');
  await authRepository.setRole(user.id, 'admin');

  const asOwner = (method: Method, path: string) => {
    /* Bound to a variable so the computed access cannot start a line — see `no-unexpected-multiline`. */
    const pending = request(app)[method](path);
    return pending
      .set('Cookie', staffCookie)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .set('Origin', ORIGIN);
  };

  const withTokenOnly = (method: Method, path: string) =>
    request(app)[method](path).set('Authorization', `Bearer ${ADMIN_TOKEN}`).set('Origin', ORIGIN);

  return {
    app,
    repository,
    stripe,
    emailService,
    service,
    auth: authRepository,
    staffCookie,
    asOwner,
    withTokenOnly,
  };
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
  it('answers 404 — not 401 — with neither credential', async () => {
    const { app } = await buildHarness();

    const response = await request(app).post('/api/billing/projects').send(validProjectBody());

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('answers 404 for a wrong token', async () => {
    const { app, staffCookie } = await buildHarness();

    const response = await request(app)
      .post('/api/billing/projects')
      .set('Cookie', staffCookie)
      .set('Authorization', 'Bearer wrong-token')
      .set('Origin', ORIGIN)
      .send(validProjectBody());

    expect(response.status).toBe(404);
  });

  /*
   * The half DECISION 019 added. A token that leaks — out of a shell history, a screenshot,
   * a CI log — used to be the whole credential. It is now half of one, and the failure is
   * indistinguishable from the path not existing.
   */
  it('answers 404 to a correct token with no session', async () => {
    const harness = await buildHarness();

    const response = await harness
      .withTokenOnly('post', '/api/billing/projects')
      .send(validProjectBody());

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
    expect(harness.repository.projects).toHaveLength(0);
  });

  /* And the other half: a stolen staff cookie is not enough either. */
  it('answers 404 to a staff session with no token', async () => {
    const { app, staffCookie, repository } = await buildHarness();

    const response = await request(app)
      .post('/api/billing/projects')
      .set('Cookie', staffCookie)
      .set('Origin', ORIGIN)
      .send(validProjectBody());

    expect(response.status).toBe(404);
    expect(repository.projects).toHaveLength(0);
  });

  /*
   * A customer with a perfectly valid session and — somehow — the token still gets nothing,
   * and gets it from `requireAdmin` before the token is ever compared.
   */
  it('answers 404 to a signed-in customer holding the token', async () => {
    const harness = await buildHarness();

    const signup = await request(harness.app)
      .post('/api/auth/signup')
      .set('Origin', ORIGIN)
      .send({ email: 'dana@cascadeheating.example', name: 'Dana Reyes', password: PASSWORD });
    const customerCookie = sessionCookieFrom(signup.headers);

    const response = await request(harness.app)
      .post('/api/billing/projects')
      .set('Cookie', customerCookie)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .set('Origin', ORIGIN)
      .send(validProjectBody());

    expect(response.status).toBe(404);
    expect(harness.repository.projects).toHaveLength(0);
  });

  /*
   * The 503 is an instruction to whoever deployed this, and it is now behind the session —
   * ordered the other way, an anonymous prober on an unconfigured deployment would be told
   * both that there is a billing surface here and what it is waiting for.
   */
  it('answers 503 with an instruction when no admin token is configured', async () => {
    const harness = await buildHarness({ adminTokenConfigured: false });

    const response = await harness
      .asOwner('post', '/api/billing/projects')
      .send(validProjectBody());

    expect(response.status).toBe(503);
    expect(response.body.error.message).toContain('BILLING_ADMIN_TOKEN');
  });

  it('says nothing about the configuration to somebody without a session', async () => {
    const harness = await buildHarness({ adminTokenConfigured: false });

    const response = await request(harness.app)
      .post('/api/billing/projects')
      .send(validProjectBody());

    expect(response.status).toBe(404);
    expect(JSON.stringify(response.body)).not.toContain('BILLING_ADMIN_TOKEN');
  });

  it('creates a project for the owner', async () => {
    const harness = await buildHarness();

    const response = await harness
      .asOwner('post', '/api/billing/projects')
      .send(validProjectBody());

    expect(response.status).toBe(201);
    expect(response.body.data.project).toMatchObject({
      status: 'agreed',
      depositStatus: 'pending',
    });
    expect(harness.repository.projects).toHaveLength(1);
  });
});

describe('billing input validation', () => {
  it('returns per-field messages for a project missing required values', async () => {
    const harness = await buildHarness();

    const response = await harness
      .asOwner('post', '/api/billing/projects')
      .send({ businessName: 'Cascade Heating & Air' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(Object.keys(response.body.error.fields)).toEqual(
      expect.arrayContaining(['contactName', 'email']),
    );
  });

  it('rejects a checkout request that smuggles its own amount', async () => {
    const harness = await buildHarness();
    const project = await harness.service.createProject({
      businessName: 'Cascade Heating & Air',
      contactName: 'Dana Reyes',
      email: 'dana@cascadeheating.example',
    });

    const response = await harness
      .asOwner('post', '/api/billing/checkout-sessions')
      .send({ projectId: project.id, product: 'build-deposit', amount: 1 });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('MALFORMED_REQUEST');
  });
});

describe('checkout sessions and project listing over HTTP', () => {
  it('creates a checkout session and returns its hosted URL', async () => {
    const harness = await buildHarness();
    const project = await harness.service.createProject({
      businessName: 'Cascade Heating & Air',
      contactName: 'Dana Reyes',
      email: 'dana@cascadeheating.example',
    });

    const response = await harness
      .asOwner('post', '/api/billing/checkout-sessions')
      .send({ projectId: project.id, product: 'build-deposit' });

    expect(response.status).toBe(201);
    expect(response.body.data.url).toMatch(/^https:\/\//);
    expect(harness.stripe.checkoutRequests).toHaveLength(1);
  });

  it('answers 503 with an instruction when Stripe is not configured', async () => {
    const harness = await buildHarness({ stripeConfigured: false });
    const project = await harness.service.createProject({
      businessName: 'Cascade Heating & Air',
      contactName: 'Dana Reyes',
      email: 'dana@cascadeheating.example',
    });

    const response = await harness
      .asOwner('post', '/api/billing/checkout-sessions')
      .send({ projectId: project.id, product: 'build-deposit' });

    expect(response.status).toBe(503);
  });

  it('lists projects for the owner, most recent first', async () => {
    const harness = await buildHarness();
    await harness.service.createProject({
      businessName: 'Cascade Heating & Air',
      contactName: 'Dana Reyes',
      email: 'dana@cascadeheating.example',
    });

    const response = await harness.asOwner('get', '/api/billing/projects');

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
    const harness = await buildHarness();
    const project = await subscribedProject(harness);

    const anonymous = await request(harness.app)
      .post('/api/billing/portal-sessions')
      .send({ projectId: project.id });
    expect(anonymous.status).toBe(404);

    const owner = await harness
      .asOwner('post', '/api/billing/portal-sessions')
      .send({ projectId: project.id });
    expect(owner.status).toBe(201);
    expect(owner.body.data.url).toMatch(/^https:\/\//);
  });

  it('lets only the owner record a guarantee credit — a browser cannot self-award one', async () => {
    const harness = await buildHarness();
    const project = await subscribedProject(harness);

    const selfAward = await request(harness.app)
      .post('/api/billing/guarantee-credits')
      .send({ projectId: project.id, month: '2026-08' });
    expect(selfAward.status).toBe(404);
    expect(harness.stripe.balanceCredits).toHaveLength(0);

    const owner = await harness
      .asOwner('post', '/api/billing/guarantee-credits')
      .send({ projectId: project.id, month: '2026-08' });
    expect(owner.status).toBe(201);
    expect(owner.body.data.credit).toMatchObject({ month: '2026-08', remedy: 'credit' });
    expect(harness.stripe.balanceCredits).toHaveLength(1);

    const duplicate = await harness
      .asOwner('post', '/api/billing/guarantee-credits')
      .send({ projectId: project.id, month: '2026-08' });
    expect(duplicate.status).toBe(400);
    expect(harness.stripe.balanceCredits).toHaveLength(1);
  });

  it('rejects a malformed guarantee month', async () => {
    const harness = await buildHarness();
    const project = await subscribedProject(harness);

    const response = await harness
      .asOwner('post', '/api/billing/guarantee-credits')
      .send({ projectId: project.id, month: 'August 2026' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('the Stripe webhook endpoint', () => {
  /*
   * Deliberately unaffected by DECISION 019, and the tests say so by carrying neither
   * credential. Stripe has no cookie and no bearer token; it authenticates by signing the
   * body, which is why this route is mounted before the session middleware entirely.
   */
  it('rejects a request without a signature header', async () => {
    const { app } = await buildHarness();

    const response = await postWebhook(app, false);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('MALFORMED_REQUEST');
  });

  it('rejects a request whose signature does not verify', async () => {
    const { app, stripe } = await buildHarness();
    stripe.failNextVerification();

    const response = await postWebhook(app);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('MALFORMED_REQUEST');
  });

  it('answers 503 when Stripe is not configured', async () => {
    const { app } = await buildHarness({ stripeConfigured: false });

    const response = await postWebhook(app);

    expect(response.status).toBe(503);
  });

  it('applies a verified event and acknowledges it', async () => {
    const { app, service, stripe, repository } = await buildHarness();
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
    const { app, service, stripe, repository, emailService } = await buildHarness();
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
    /*
     * One *payment* notification. The signup above sends its own new-account mail through the
     * same recording service, so this counts the payment ones rather than the whole outbox.
     */
    expect(emailService.sent.filter((message) => /payment/i.test(message.subject))).toHaveLength(1);
    expect(repository.recordedEventIds).toHaveLength(1);
  });

  /*
   * The mandatory redirect-trust test: a customer's browser coming back from
   * Checkout — to /welcome or anywhere else — must be able to change nothing.
   * Server-side there is exactly one door to payment state, and it demands a
   * valid Stripe signature.
   */
  it('changes no payment state for anything short of a verified webhook', async () => {
    const { app, service, stripe, repository } = await buildHarness();
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
    const { app, service, stripe, repository, emailService } = await buildHarness();
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
    expect(emailService.sent.filter((message) => /payment/i.test(message.subject))).toHaveLength(1);
  });
});
