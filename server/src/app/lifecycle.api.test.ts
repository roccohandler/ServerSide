import { createHmac } from 'node:crypto';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  createPlatformHarness,
  sessionCookieFrom,
  TEST_ORIGIN,
  VERCEL_WEBHOOK_SECRET,
  type PlatformHarness,
} from '../testing/platformApp.js';
import { EXPECTED_AMOUNT_CENTS } from '../features/billing/billing.amounts.js';

/*
 * ============================================================================
 * THE WHOLE LIFECYCLE, IN ORDER
 * ============================================================================
 *
 * Visitor → assessment → account → payment → project → onboarding → preview →
 * feedback → approval → production → live.
 *
 * Written as one narrative rather than as isolated unit tests because the failures this
 * catches are all at the seams: a payment that creates a project but no tasks, a
 * deployment that sets a URL but does not move the milestone, an approval that changes
 * a state the dashboard does not read. Each half is fine on its own and the customer
 * still ends up looking at a page that says nothing is happening.
 *
 * Every state change here goes through the real HTTP pipeline or a real webhook. None
 * of it is triggered by a browser reaching a success page.
 * ============================================================================
 */

const PASSWORD = 'a-long-enough-passphrase';

const ANSWERS = [
  { questionId: 'speed-1', category: 'speed' as const, value: 1 },
  { questionId: 'speed-2', category: 'speed' as const, value: 0 },
  { questionId: 'mobile-1', category: 'mobile' as const, value: 2 },
  { questionId: 'clarity-1', category: 'clarity' as const, value: 4 },
  { questionId: 'trust-1', category: 'trust' as const, value: 3 },
];

describe('the customer lifecycle', () => {
  let harness: PlatformHarness;
  let cookie: string;
  let userId: string;

  const post = (path: string) => request(harness.app).post(path).set('Origin', TEST_ORIGIN);

  beforeEach(async () => {
    harness = createPlatformHarness();

    /*
     * The fake dashboard is set to exactly what the published prices require. Derived
     * rather than typed, so a price change does not silently make this suite the one
     * place that still believes the old figure — which is the failure
     * `billing.amounts.ts` exists to prevent.
     */
    harness.stripe.setPriceAmount('price_deposit', EXPECTED_AMOUNT_CENTS['build-deposit']);
    harness.stripe.setPriceAmount('price_final', EXPECTED_AMOUNT_CENTS['build-final']);
    harness.stripe.setPriceAmount('price_monthly', EXPECTED_AMOUNT_CENTS['growth-partner-monthly']);
    harness.stripe.setPriceAmount('price_annual', EXPECTED_AMOUNT_CENTS['growth-partner-annual']);

    const signup = await post('/api/auth/signup').send({
      email: 'dana@cascadeheating.example',
      name: 'Dana Reyes',
      password: PASSWORD,
    });

    cookie = sessionCookieFrom(signup.headers);
    userId = signup.body.data.user.id as string;
  });

  const authed = (method: 'get' | 'post' | 'patch', path: string) =>
    (method === 'get'
      ? request(harness.app).get(path)
      : method === 'post'
        ? request(harness.app).post(path).set('Origin', TEST_ORIGIN)
        : request(harness.app).patch(path).set('Origin', TEST_ORIGIN)
    ).set('Cookie', cookie);

  /** The webhook a real Stripe delivery would produce for a customer-started checkout. */
  async function deliverStripeEvent(event: {
    id: string;
    type: string;
    object: Record<string, unknown>;
  }) {
    harness.stripe.nextEvent = {
      id: event.id,
      type: event.type,
      data: { object: event.object },
    };

    return request(harness.app)
      .post('/api/billing/webhook')
      .set('stripe-signature', 'test-signature')
      .set('Content-Type', 'application/json')
      .send(Buffer.from('{}'));
  }

  /**
   * A signed Vercel delivery. The signature is real HMAC-SHA1 over the exact bytes.
   *
   * The body is sent as a *string*, not a Buffer: superagent runs its JSON serialiser
   * over anything sent with an `application/json` content type, which would turn a
   * Buffer into `{"type":"Buffer","data":[…]}` and sign bytes that are not the ones
   * arriving. A string passes through untouched, so the signature is over what the
   * server actually reads.
   */
  async function deliverVercelEvent(payload: unknown, secret = VERCEL_WEBHOOK_SECRET) {
    const body = JSON.stringify(payload);
    const signature = createHmac('sha1', secret).update(Buffer.from(body)).digest('hex');

    return request(harness.app)
      .post('/api/deployments/webhook')
      .set('x-vercel-signature', signature)
      .set('Content-Type', 'application/json')
      .send(body);
  }

  function deploymentPayload(params: {
    readonly type: string;
    readonly id: string;
    readonly projectId: string;
    readonly target?: string;
    readonly url?: string;
  }) {
    return {
      type: params.type,
      createdAt: Date.parse('2026-08-13T13:00:00.000Z'),
      payload: {
        deployment: {
          id: params.id,
          url: params.url ?? 'preview-abc123.vercel.app',
          target: params.target ?? null,
          meta: { jobforgeProjectId: params.projectId },
        },
      },
    };
  }

  it('runs from assessment to live website', async () => {
    /* -------------------------------------------------- 1. the assessment */

    const submitted = await authed('post', '/api/app/assessments').send({
      businessName: 'Cascade Heating & Air',
      websiteUrl: 'cascadeheating.example',
      trade: 'hvac',
      answers: ANSWERS,
    });

    expect(submitted.status).toBe(201);
    // Scored on the server. The browser sent answers, not a score.
    expect(submitted.body.data.assessment.score).toBe(50);
    expect(submitted.body.data.assessment.band).toBe('workable');
    expect(submitted.body.data.assessment.weakestCategories).toContain('speed');

    const dashboardAfterAssessment = await authed('get', '/api/app/dashboard');
    expect(dashboardAfterAssessment.body.data.assessment.score).toBe(50);
    // No project yet, so the next move is buying the build.
    expect(dashboardAfterAssessment.body.data.currentAction.kind).toBe('pay-deposit');
    expect(dashboardAfterAssessment.body.data.project).toBeNull();

    /* ----------------------------------------------------- 2. the payment */

    const checkout = await authed('post', '/api/app/billing/checkout').send({
      product: 'build-deposit',
    });

    expect(checkout.status).toBe(201);
    expect(checkout.body.data.url).toMatch(/^https:\/\/checkout\.stripe\.example/);

    // The account is on the session, not in the body — this is what the webhook uses.
    const stripeRequest = harness.stripe.checkoutRequests[0];
    expect(stripeRequest?.metadata).toEqual({ userId, product: 'build-deposit' });
    expect(stripeRequest?.customerEmail).toBe('dana@cascadeheating.example');

    // Nothing has been fulfilled by the browser reaching Stripe.
    expect(harness.repositories.projects.projects).toHaveLength(0);

    /* ----------------------------------- 3. the webhook, which is the truth */

    const delivered = await deliverStripeEvent({
      id: 'evt_deposit_paid',
      type: 'checkout.session.completed',
      object: {
        payment_status: 'paid',
        customer: 'cus_test_1',
        metadata: { userId, product: 'build-deposit' },
      },
    });

    expect(delivered.status).toBe(200);

    const projects = harness.repositories.projects.projects;
    expect(projects).toHaveLength(1);

    const project = projects[0];
    expect(project?.ownerUserId).toBe(userId);
    // The business name came from the assessment, not from the card.
    expect(project?.businessName).toBe('Cascade Heating & Air');
    expect(project?.milestone).toBe('onboarding');
    expect(project?.depositStatus).toBe('paid');

    // One account, one Stripe customer.
    expect(harness.auth.users[0]?.stripeCustomerId).toBe('cus_test_1');

    // And the onboarding tasks exist.
    const tasks = await harness.repositories.tasks.listForProject(project?.id ?? '');
    expect(tasks.length).toBeGreaterThanOrEqual(5);
    expect(tasks.every((task) => task.status === 'open')).toBe(true);

    const projectId = project?.id as string;

    /* ------------------------------------------------- 4. the dashboard now */

    const afterPayment = await authed('get', '/api/app/dashboard');
    expect(afterPayment.body.data.project.id).toBe(projectId);
    expect(afterPayment.body.data.currentAction.kind).toBe('complete-tasks');
    expect(afterPayment.body.data.currentAction.waitingOnCustomer).toBe(true);
    expect(afterPayment.body.data.tasks.length).toBeGreaterThanOrEqual(5);

    /*
     * Growth Partner is NOT purchasable yet, and this is the assertion that pins it.
     *
     * The deposit has cleared and the build has not started. The published terms say the plan
     * "starts on launch day only if you choose it", and the three-month minimum is measured
     * from launch — so offering it here would sell a month of measuring a website that does
     * not exist, against terms the customer has already been shown.
     *
     * `buildCustomerBillingSummary` used to allow exactly that: the rule was
     * `depositPaid && subscriptionStatus !== 'active'`, while the comment directly above it
     * said the plan starts at launch. The comment was right and untested. Step 12 below
     * asserts the other half — that it *does* become available once the site is live.
     */
    expect(
      afterPayment.body.data.billing.available.plan,
      'Growth Partner was offered before the website existed',
    ).toBe(false);

    /* ------------------------------------------------- 5. onboarding tasks */

    for (const task of tasks) {
      const completed = await authed(
        'post',
        `/api/app/projects/${projectId}/tasks/${task.id}/complete`,
      );
      expect(completed.status).toBe(200);
      expect(completed.body.data.task.status).toBe('completed');
    }

    /*
     * With no tasks outstanding, the lowest-priority customer action is what surfaces:
     * confirming the address. It sits below everything about the build on purpose —
     * it is real, and it is not worth interrupting a website for.
     */
    const nagged = await authed('get', '/api/app/dashboard');
    expect(nagged.body.data.currentAction.kind).toBe('verify-email');
    expect(nagged.body.data.tasks).toHaveLength(0);

    const verification = harness.email.sent.find(
      (message) => message.subject === 'Confirm your email address',
    );
    await post('/api/auth/verify-email').send({
      token: decodeURIComponent(/token=([^\s&]+)/.exec(verification?.text ?? '')?.[1] ?? ''),
    });

    const afterOnboarding = await authed('get', '/api/app/dashboard');
    // Nothing outstanding at all now, so the dashboard says what *we* are doing.
    expect(afterOnboarding.body.data.currentAction.waitingOnCustomer).toBe(false);
    // And completing the last onboarding task moved the build on by itself.
    expect(afterOnboarding.body.data.project.milestone).toBe('planning');

    /* ------------------------------------------------- 6. the build starts */

    await harness.repositories.projects.update(projectId, { milestone: 'building' });

    /* ------------------------------------------- 7. the preview deployment */

    const previewDelivered = await deliverVercelEvent(
      deploymentPayload({
        type: 'deployment.succeeded',
        id: 'dpl_preview_1',
        projectId,
        url: 'cascade-heating-abc123.vercel.app',
      }),
    );

    expect(previewDelivered.status).toBe(200);
    expect(previewDelivered.body.data.applied).toBe(true);

    const withPreview = await authed('get', `/api/app/projects/${projectId}`);
    // The URL is data. Nothing about it was written in frontend code.
    expect(withPreview.body.data.project.previewUrl).toBe(
      'https://cascade-heating-abc123.vercel.app',
    );
    expect(withPreview.body.data.project.milestone).toBe('review');
    expect(withPreview.body.data.project.waitingOnCustomer).toBe(true);

    const readyToReview = await authed('get', '/api/app/dashboard');
    expect(readyToReview.body.data.currentAction.kind).toBe('review-preview');

    /* ---------------------------------------------------- 8. the feedback */

    const commented = await authed('post', `/api/app/projects/${projectId}/feedback`).send({
      body: 'Replace the photo in the services section.',
    });

    expect(commented.status).toBe(201);
    expect(commented.body.data.feedback).toHaveLength(1);
    expect(commented.body.data.feedback[0].resolved).toBe(false);

    const requested = await authed('post', `/api/app/projects/${projectId}/request-changes`);
    expect(requested.body.data.project.milestone).toBe('revisions');
    expect(requested.body.data.project.approval).toBe('changes_requested');

    /* --------------------------------------------------- 9. the revisions */

    await harness.repositories.projects.update(projectId, {
      milestone: 'approval',
      approval: 'ready_for_review',
    });

    const readyToApprove = await authed('get', '/api/app/dashboard');
    expect(readyToApprove.body.data.currentAction.kind).toBe('approve-website');

    /* -------------------------------------------------- 10. the approval */

    const approved = await authed('post', `/api/app/projects/${projectId}/approve`);

    expect(approved.status).toBe(200);
    expect(approved.body.data.project.approval).toBe('approved');
    expect(approved.body.data.project.approvedAt).toBeTruthy();
    expect(approved.body.data.project.milestone).toBe('launching');

    /* --------------------------------------------------- 11. the launch */

    const productionDelivered = await deliverVercelEvent(
      deploymentPayload({
        type: 'deployment.succeeded',
        id: 'dpl_production_1',
        projectId,
        target: 'production',
        url: 'cascadeheating.com',
      }),
    );

    expect(productionDelivered.status).toBe(200);

    const live = await authed('get', `/api/app/projects/${projectId}`);
    expect(live.body.data.project.productionUrl).toBe('https://cascadeheating.com');
    expect(live.body.data.project.milestone).toBe('live');
    expect(live.body.data.project.milestoneLabel).toBe('Your website is live');

    /* ------------------------------------------- 12. the recurring service */

    const finalDashboard = await authed('get', '/api/app/dashboard');
    expect(finalDashboard.body.data.currentAction.kind).toBe('choose-plan');
    expect(finalDashboard.body.data.billing.available.plan).toBe(true);
    expect(finalDashboard.body.data.billing.build.deposit.status).toBe('paid');

    /*
     * The dashboard shows the most recent slice; the whole story is in the stream. Both
     * are checked, because "the newest thing that happened" and "everything that
     * happened" are two different questions and the page only answers the first.
     */
    const recent = (finalDashboard.body.data.activity as { summary: string }[]).map(
      (entry) => entry.summary,
    );
    expect(recent.join(' ')).toMatch(/live/i);

    const everything = harness.repositories.activity.entries.map((entry) => entry.type);
    expect(everything).toContain('assessment.submitted');
    /*
     * The first entry in the customer's own history is the account, and it is asserted here
     * rather than left to the auth tests for a specific reason: the recorder is an *optional*
     * dependency of the auth service, so a composition root that forgets to pass it loses the
     * entry silently and every auth unit test still passes. This assertion runs against the
     * harness that mirrors `app.ts`, which is the only place that omission shows up.
     */
    expect(everything).toContain('account.created');
    /*
     * The intent and the money are two entries, in that order. The checkout one is written
     * from the request that created the Stripe session; the payment one only from the
     * verified webhook, which is the distinction the whole billing feature is built on.
     */
    expect(everything).toContain('billing.checkout_started');
    expect(everything).toContain('billing.payment_succeeded');
    expect(everything).toContain('project.created');
    expect(everything).toContain('task.completed');
    expect(everything).toContain('deployment.preview_ready');
    expect(everything).toContain('feedback.created');
    expect(everything).toContain('project.changes_requested');
    expect(everything).toContain('project.approved');
    expect(everything).toContain('project.launched');
  });

  /* ====================================================================== */

  describe('payment edge cases', () => {
    it('creates exactly one project when Stripe delivers the same event twice', async () => {
      const event = {
        id: 'evt_duplicate',
        type: 'checkout.session.completed',
        object: {
          payment_status: 'paid',
          customer: 'cus_test_1',
          metadata: { userId, product: 'build-deposit' },
        },
      };

      await deliverStripeEvent(event);
      await deliverStripeEvent(event);

      expect(harness.repositories.projects.projects).toHaveLength(1);
    });

    /*
     * Two *different* events for the same account — an at-least-once delivery that got
     * a new event id, or a customer who somehow paid twice. Activation is idempotent
     * per account, so the second one adopts the existing project.
     */
    it('creates exactly one project for two distinct paid events', async () => {
      await deliverStripeEvent({
        id: 'evt_one',
        type: 'checkout.session.completed',
        object: {
          payment_status: 'paid',
          customer: 'cus_test_1',
          metadata: { userId, product: 'build-deposit' },
        },
      });
      await deliverStripeEvent({
        id: 'evt_two',
        type: 'checkout.session.completed',
        object: {
          payment_status: 'paid',
          customer: 'cus_test_1',
          metadata: { userId, product: 'build-deposit' },
        },
      });

      expect(harness.repositories.projects.projects).toHaveLength(1);

      const tasks = await harness.repositories.tasks.listForProject(
        harness.repositories.projects.projects[0]?.id ?? '',
      );
      // Five onboarding tasks, not ten.
      expect(tasks).toHaveLength(5);
    });

    it('does not activate anything for a session that completed unpaid', async () => {
      await deliverStripeEvent({
        id: 'evt_unpaid',
        type: 'checkout.session.completed',
        object: {
          payment_status: 'unpaid',
          customer: 'cus_test_1',
          metadata: { userId, product: 'build-deposit' },
        },
      });

      expect(harness.repositories.projects.projects).toHaveLength(0);
    });

    it('does not start a build for a subscription payment', async () => {
      await deliverStripeEvent({
        id: 'evt_subscription',
        type: 'checkout.session.completed',
        object: {
          payment_status: 'paid',
          customer: 'cus_test_1',
          subscription: 'sub_test_1',
          metadata: { userId, product: 'growth-partner-monthly' },
        },
      });

      // The plan is bought against a project that already exists. It never makes one.
      expect(harness.repositories.projects.projects).toHaveLength(0);
      expect(harness.auth.users[0]?.stripeCustomerId).toBe('cus_test_1');
    });

    it('rejects a webhook whose signature does not verify', async () => {
      harness.stripe.failNextVerification();

      const response = await request(harness.app)
        .post('/api/billing/webhook')
        .set('stripe-signature', 'wrong')
        .set('Content-Type', 'application/json')
        .send(Buffer.from('{}'));

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(harness.repositories.projects.projects).toHaveLength(0);
    });

    /*
     * Payment succeeds while the browser is closed. Nothing in the flow depends on the
     * tab: the customer's dashboard is correct the next time they open it.
     */
    it('completes fulfilment with no browser involved at all', async () => {
      await deliverStripeEvent({
        id: 'evt_closed_browser',
        type: 'checkout.session.completed',
        object: {
          payment_status: 'paid',
          customer: 'cus_test_1',
          metadata: { userId, product: 'build-deposit' },
        },
      });

      const dashboard = await authed('get', '/api/app/dashboard');
      expect(dashboard.body.data.project).not.toBeNull();
      expect(dashboard.body.data.currentAction.kind).toBe('complete-tasks');
    });

    it('refuses to sell a customer a product they may not buy directly', async () => {
      const response = await authed('post', '/api/app/billing/checkout').send({
        product: 'build-final',
      });

      expect(response.status).toBe(400);
    });

    it('refuses a checkout with no session', async () => {
      const response = await post('/api/app/billing/checkout').send({ product: 'build-deposit' });
      expect(response.status).toBe(401);
    });

    it('offers no billing portal before there is a Stripe customer', async () => {
      const response = await authed('post', '/api/app/billing/portal');
      expect(response.status).toBe(400);
      expect(response.body.error.message).toMatch(/first payment/i);
    });

    /*
     * ==================================================================
     * WHAT THE SUBSCRIPTION PUTS IN SOMEBODY'S HISTORY
     * ==================================================================
     *
     * Both events below are keyed on the project the *billing* repository holds. In a
     * deployment that is the same collection the projects feature reads; in this harness
     * they are two separate in-memory doubles, so the subscribed project is created
     * straight against the billing one. The seam under test is billing → activity, and
     * arriving at it through a payment would mostly be testing the fakes agree.
     */
    async function subscribedProject(subscriptionId: string, status: 'none' | 'active') {
      const project = await harness.billing.createProject({
        businessName: 'Cascade Heating & Air',
        contactName: 'Dana Reyes',
        email: 'dana@cascadeheating.example',
        ownerUserId: userId,
        status: 'launched',
        milestone: 'live',
        approval: 'approved',
        depositStatus: 'paid',
        finalStatus: 'paid',
        subscriptionStatus: status,
      });

      await harness.billing.updateProject(project.id, { subscriptionId });
      return project;
    }

    it('tells the customer about a failed Growth Partner payment exactly once', async () => {
      const project = await subscribedProject('sub_test_1', 'active');

      await deliverStripeEvent({
        id: 'evt_invoice_failed',
        type: 'invoice.payment_failed',
        object: { subscription: 'sub_test_1' },
      });

      /*
       * The same declined card, announced a second way — Stripe sends both for one failed
       * subscription charge. Recording this one as well is what would show a customer two
       * failures where there was one, so it is deliberately owner-only.
       */
      await deliverStripeEvent({
        id: 'evt_intent_failed',
        type: 'payment_intent.payment_failed',
        object: { metadata: { projectId: project.id } },
      });

      const failures = harness.repositories.activity.entries.filter(
        (entry) => entry.type === 'billing.payment_failed',
      );

      expect(failures).toHaveLength(1);
      expect(failures[0]?.userId).toBe(userId);
      expect(failures[0]?.audience).toBe('customer');
      expect(failures[0]?.summary).toContain('Growth Partner');
    });

    it('records a subscription change on the move, and not on a sync that moved nothing', async () => {
      await subscribedProject('sub_test_2', 'none');

      await deliverStripeEvent({
        id: 'evt_sub_created',
        type: 'customer.subscription.created',
        object: { id: 'sub_test_2', status: 'active' },
      });

      // A second delivery for the same state: a renewal date, a card, a quantity. Stripe
      // sends `customer.subscription.updated` for all of them.
      await deliverStripeEvent({
        id: 'evt_sub_updated',
        type: 'customer.subscription.updated',
        object: { id: 'sub_test_2', status: 'active' },
      });

      const changes = harness.repositories.activity.entries.filter(
        (entry) => entry.type === 'billing.subscription_changed',
      );

      expect(changes).toHaveLength(1);
      expect(changes[0]?.userId).toBe(userId);
      expect(changes[0]?.audience).toBe('customer');
      expect(changes[0]?.summary).toContain('Growth Partner');
    });
  });

  /* ====================================================================== */

  describe('deployment webhooks', () => {
    let projectId: string;

    beforeEach(async () => {
      await deliverStripeEvent({
        id: 'evt_setup',
        type: 'checkout.session.completed',
        object: {
          payment_status: 'paid',
          customer: 'cus_test_1',
          metadata: { userId, product: 'build-deposit' },
        },
      });

      projectId = harness.repositories.projects.projects[0]?.id as string;
      await harness.repositories.projects.update(projectId, { milestone: 'building' });
    });

    it('rejects an unsigned delivery', async () => {
      const response = await request(harness.app)
        .post('/api/deployments/webhook')
        .set('Content-Type', 'application/json')
        .send(
          JSON.stringify(
            deploymentPayload({ type: 'deployment.succeeded', id: 'dpl_forged', projectId }),
          ),
        );

      expect(response.status).toBe(403);
      const project = await harness.repositories.projects.findById(projectId);
      expect(project?.previewUrl).toBeUndefined();
    });

    /*
     * The attack this endpoint exists to resist: setting the URL a customer is told is
     * their website. An unauthenticated version of it is a phishing primitive wearing
     * our branding.
     */
    it('rejects a delivery signed with the wrong secret', async () => {
      const response = await deliverVercelEvent(
        deploymentPayload({ type: 'deployment.succeeded', id: 'dpl_forged', projectId }),
        'not-the-secret',
      );

      expect(response.status).toBe(403);

      const project = await harness.repositories.projects.findById(projectId);
      expect(project?.previewUrl).toBeUndefined();
    });

    it('ignores a deployment that names no JobForge project', async () => {
      const body = {
        type: 'deployment.succeeded',
        createdAt: Date.now(),
        payload: { deployment: { id: 'dpl_orphan', url: 'x.vercel.app', meta: {} } },
      };

      const response = await deliverVercelEvent(body);

      expect(response.status).toBe(200);
      expect(response.body.data.applied).toBe(false);
    });

    it('ignores an event type it does not track', async () => {
      const response = await deliverVercelEvent({
        type: 'project.created',
        createdAt: Date.now(),
        payload: {},
      });

      expect(response.status).toBe(200);
      expect(response.body.data.applied).toBe(false);
    });

    it('records a failure for us without telling the customer about it', async () => {
      await deliverVercelEvent(
        deploymentPayload({ type: 'deployment.error', id: 'dpl_failed', projectId }),
      );

      const overview = await authed('get', `/api/app/projects/${projectId}/overview`);
      const activity = overview.body.data.activity as { type: string }[];

      expect(activity.some((entry) => entry.type === 'deployment.failed')).toBe(false);
      expect(
        harness.repositories.activity.entries.some((e) => e.type === 'deployment.failed'),
      ).toBe(true);
    });

    it('hands out no URL for a deployment that is still building', async () => {
      await deliverVercelEvent(
        deploymentPayload({ type: 'deployment.building', id: 'dpl_building', projectId }),
      );

      const overview = await authed('get', `/api/app/projects/${projectId}/overview`);
      const deployments = overview.body.data.deployments as { state: string; url?: string }[];

      expect(deployments[0]?.state).toBe('building');
      expect(deployments[0]?.url).toBeUndefined();
    });

    it('writes one activity entry however many times the same event is delivered', async () => {
      const payload = deploymentPayload({
        type: 'deployment.succeeded',
        id: 'dpl_repeat',
        projectId,
      });

      await deliverVercelEvent(payload);
      await deliverVercelEvent(payload);
      await deliverVercelEvent(payload);

      const readyEntries = harness.repositories.activity.entries.filter(
        (entry) => entry.type === 'deployment.preview_ready',
      );
      expect(readyEntries).toHaveLength(1);
    });

    /*
     * A routine rebuild after the customer has approved must not drag them back to
     * "please review this", which would look like the approval had been lost.
     */
    it('never drags an approved project backwards into review', async () => {
      await harness.repositories.projects.update(projectId, {
        milestone: 'launching',
        approval: 'approved',
      });

      await deliverVercelEvent(
        deploymentPayload({ type: 'deployment.succeeded', id: 'dpl_rebuild', projectId }),
      );

      const project = await harness.repositories.projects.findById(projectId);
      expect(project?.milestone).toBe('launching');
      expect(project?.approval).toBe('approved');
      // The URL still updates — it is the current preview.
      expect(project?.previewUrl).toBeTruthy();
    });
  });

  /* ====================================================================== */

  describe('assessment edge cases', () => {
    it('refuses an assessment from somebody with no account', async () => {
      const response = await post('/api/app/assessments').send({
        businessName: 'Cascade Heating & Air',
        answers: ANSWERS,
      });

      expect(response.status).toBe(401);
      expect(harness.repositories.assessments.assessments).toHaveLength(0);
    });

    it('collapses a double submission rather than storing two', async () => {
      const body = { businessName: 'Cascade Heating & Air', answers: ANSWERS };

      const first = await authed('post', '/api/app/assessments').send(body);
      const second = await authed('post', '/api/app/assessments').send(body);

      expect(first.status).toBe(201);
      expect(second.status).toBe(200);
      expect(second.body.data.duplicate).toBe(true);
      expect(second.body.data.assessment.id).toBe(first.body.data.assessment.id);
      expect(harness.repositories.assessments.assessments).toHaveLength(1);
    });

    it('ignores a score supplied by the browser', async () => {
      const response = await authed('post', '/api/app/assessments').send({
        businessName: 'Cascade Heating & Air',
        answers: ANSWERS,
        score: 100,
      });

      // Strict schema: a body offering a score is unreadable, not partly honoured.
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('MALFORMED_REQUEST');
    });

    it('refuses an answer outside the scale', async () => {
      const response = await authed('post', '/api/app/assessments').send({
        businessName: 'Cascade Heating & Air',
        answers: [{ questionId: 'speed-1', category: 'speed', value: 99 }],
      });

      expect(response.status).toBe(400);
    });

    it('normalises a website typed without a scheme', async () => {
      const response = await authed('post', '/api/app/assessments').send({
        businessName: 'Cascade Heating & Air',
        websiteUrl: 'cascadeheating.example',
        answers: ANSWERS,
      });

      expect(response.body.data.assessment.websiteUrl).toBe('https://cascadeheating.example');
    });
  });
});
