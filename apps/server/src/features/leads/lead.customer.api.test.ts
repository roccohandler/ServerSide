import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  createPlatformHarness,
  makeAdmin,
  sessionCookieFrom,
  TEST_ORIGIN,
  type PlatformHarness,
} from '../../testing/platformApp.js';

/*
 * ============================================================================
 * THE ACCOUNT-FIRST FUNNEL, END TO END
 * ============================================================================
 *
 * DECISION 028 moved the site's primary call to action from a seven-field form that stored
 * nothing until it was finished to two stages: an account, and then the rest of the request.
 * The whole point is what happens to somebody who does the first and not the second, so that
 * is what most of this file is about.
 *
 * Four properties, and each one is a way the change could be true on paper and useless in
 * practice:
 *
 *   1. The account alone reaches the owner. A capture nobody is told about is a row.
 *   2. The request attaches to the account. Otherwise the console cannot tell the people
 *      who asked for something from the people who did not.
 *   3. Identity comes from the session and cannot come from the body.
 *   4. The dashboard finishes the sentence the button started, for the person who stopped.
 * ============================================================================
 */

const PASSWORD = 'a-long-enough-passphrase';

const REQUEST = {
  businessName: 'Cascade Heating & Air',
  phone: '(206) 555-0142',
  website: 'cascadeheating.example',
  inquiryType: 'improve-website',
  message: 'Plenty of visitors, almost no calls.',
} as const;

describe('the account-first assessment funnel', () => {
  let harness: PlatformHarness;
  let cookie: string;
  let userId: string;

  const post = (path: string) => request(harness.app).post(path).set('Origin', TEST_ORIGIN);

  const authed = (method: 'get' | 'post', path: string) =>
    (method === 'get'
      ? request(harness.app).get(path)
      : request(harness.app).post(path).set('Origin', TEST_ORIGIN)
    ).set('Cookie', cookie);

  beforeEach(async () => {
    harness = createPlatformHarness();

    const signup = await post('/api/auth/signup').send({
      email: 'dana@cascadeheating.example',
      name: 'Dana Reyes',
      password: PASSWORD,
    });

    cookie = sessionCookieFrom(signup.headers);
    userId = signup.body.data.user.id as string;
  });

  /* ------------------------------------------------------- 1. the capture */

  describe('the account on its own', () => {
    /*
     * The load-bearing test for the whole decision. Everything else here is about a
     * completed request; this is about the person who never sends one, who is the entire
     * reason the call to action was moved.
     */
    it('tells the owner about an account that has asked for nothing', () => {
      const notification = harness.email.sent.find((message) =>
        message.subject.startsWith('New account'),
      );

      expect(notification).toBeDefined();
      expect(notification?.to).toBe('owner@example.com');
      /* The address is in the subject so a phone inbox can be triaged without opening it. */
      expect(notification?.subject).toContain('dana@cascadeheating.example');
      expect(notification?.text).toContain('Dana Reyes');
      expect(notification?.text).toContain('They have not sent a request yet.');
      /* Replying goes to the prospect, not into the void. */
      expect(notification?.replyTo).toBe('dana@cascadeheating.example');
    });

    it('sends the customer their own welcome as well, not just the owner theirs', () => {
      const toCustomer = harness.email.sent.filter(
        (message) => message.to === 'dana@cascadeheating.example',
      );

      /* Verification and welcome. The owner's copy is a third message to a third address. */
      expect(toCustomer.length).toBeGreaterThanOrEqual(2);
    });

    it('leaves the account with no lead attached until one is sent', () => {
      expect(harness.repositories.leads.leads).toHaveLength(0);
    });
  });

  /* ------------------------------------------------------- 2. the request */

  describe('the request step', () => {
    it('files a lead against the account and tells the owner', async () => {
      const response = await authed('post', '/api/app/assessment-request').send(REQUEST);

      expect(response.status).toBe(201);
      expect(typeof response.body.data.submittedAt).toBe('string');

      const [lead] = harness.repositories.leads.leads;
      expect(lead).toBeDefined();
      expect(lead?.userId).toBe(userId);
      /* Provenance, so the owner can tell this from an anonymous contact-form submission. */
      expect(lead?.source).toBe('app-assessment-request');
      expect(lead?.status).toBe('new');

      /*
       * Name and address are the account's, and neither was in the request body. This is
       * the property that makes the endpoint safe to expose at all.
       */
      expect(lead?.name).toBe('Dana Reyes');
      expect(lead?.email).toBe('dana@cascadeheating.example');

      /* Normalised by the shared field rules rather than by a second opinion. */
      expect(lead?.website).toBe('https://cascadeheating.example');

      expect(
        harness.email.sent.some((message) =>
          message.subject.startsWith('New website inquiry — Cascade Heating & Air'),
        ),
      ).toBe(true);
    });

    it('refuses an unauthenticated request outright', async () => {
      const response = await post('/api/app/assessment-request').send(REQUEST);

      expect(response.status).toBe(401);
      expect(harness.repositories.leads.leads).toHaveLength(0);
    });

    /*
     * The one that matters most on this endpoint. A caller that could name its own sender
     * would be a caller that could file a lead as somebody else — so the schema does not
     * merely ignore an identity field, it refuses the whole submission.
     */
    it('refuses a body that tries to name its own sender', async () => {
      const response = await authed('post', '/api/app/assessment-request').send({
        ...REQUEST,
        name: 'Somebody Else',
        email: 'attacker@example.test',
      });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('MALFORMED_REQUEST');
      expect(harness.repositories.leads.leads).toHaveLength(0);
    });

    it('reports a bad phone number against the field rather than as a failure', async () => {
      const response = await authed('post', '/api/app/assessment-request').send({
        ...REQUEST,
        phone: '12',
      });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.fields.phone).toBeDefined();
    });

    /*
     * A double-tap on a phone is one request, not two. The window is the lead service's and
     * is deliberately shared with the anonymous path — a customer who used the contact form
     * ten minutes ago about the same thing is having one conversation, not two.
     */
    it('collapses a double submission into the lead that already landed', async () => {
      const first = await authed('post', '/api/app/assessment-request').send(REQUEST);
      const second = await authed('post', '/api/app/assessment-request').send(REQUEST);

      expect(first.status).toBe(201);
      expect(second.status).toBe(201);
      expect(harness.repositories.leads.leads).toHaveLength(1);
    });
  });

  /* --------------------------------------------- 3. what each surface says */

  describe('the dashboard', () => {
    it('asks somebody who stopped after the account to finish the request', async () => {
      const dashboard = await authed('get', '/api/app/dashboard');

      expect(dashboard.body.data.currentAction.kind).toBe('finish-request');
      expect(dashboard.body.data.currentAction.cta.href).toBe('/app/assessment/request');
      expect(dashboard.body.data.currentAction.waitingOnCustomer).toBe(true);
    });

    it('moves on to the assessment once the request has been sent', async () => {
      await authed('post', '/api/app/assessment-request').send(REQUEST);

      const dashboard = await authed('get', '/api/app/dashboard');
      expect(dashboard.body.data.currentAction.kind).toBe('start-assessment');
    });
  });

  describe('the console accounts table', () => {
    it('separates the accounts that have asked for something from the ones that have not', async () => {
      makeAdmin(harness, userId);

      const before = await authed('get', '/api/admin/accounts');
      const beforeRow = before.body.data.accounts.find(
        (account: { id: string }) => account.id === userId,
      );
      expect(beforeRow.hasRequested).toBe(false);

      await authed('post', '/api/app/assessment-request').send(REQUEST);

      const after = await authed('get', '/api/admin/accounts');
      const afterRow = after.body.data.accounts.find(
        (account: { id: string }) => account.id === userId,
      );
      expect(afterRow.hasRequested).toBe(true);

      /* Still no credential on the wire — the column is additive, not a new serialiser. */
      expect(afterRow.passwordHash).toBeUndefined();
    });
  });
});
