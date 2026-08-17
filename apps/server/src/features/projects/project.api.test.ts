import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  createPlatformHarness,
  makeAdmin,
  sessionCookieFrom,
  TEST_ORIGIN,
  type PlatformHarness,
} from '../../testing/platformApp.js';
import { EXPECTED_AMOUNT_CENTS } from '../billing/index.js';

/*
 * ============================================================================
 * TWO CUSTOMERS, ONE API
 * ============================================================================
 *
 * The tests the whole authorization design exists for.
 *
 * Every one of them uses a **valid** id belonging to somebody else. That is the shape
 * of the real attack: not a malformed request, not a made-up id, but a customer who
 * noticed that their project id appears in a URL and tried the one next to it. A route
 * that checks "is this a real project" rather than "is this *their* project" passes
 * every other test in this repository and fails these.
 *
 * The expected answer is 404 rather than 403 throughout, and that is deliberate: an API
 * that distinguishes "not yours" from "does not exist" has told an attacker which ids
 * are real, which is most of what they were trying to find out.
 * ============================================================================
 */

interface Customer {
  readonly cookie: string;
  /** The account address, which is also half of the display name the harness gives them. */
  readonly email: string;
  readonly userId: string;
  readonly projectId: string;
}

describe('project access between customers', () => {
  let harness: PlatformHarness;

  beforeEach(() => {
    harness = createPlatformHarness();
  });

  const post = (path: string) => request(harness.app).post(path).set('Origin', TEST_ORIGIN);

  /** Signs somebody up and gives them a project with a task, a comment and a preview. */
  async function createCustomer(email: string): Promise<Customer> {
    const signup = await post('/api/auth/signup').send({
      email,
      name: `Owner of ${email}`,
      password: 'a-long-enough-passphrase',
    });

    const cookie = sessionCookieFrom(signup.headers);
    const userId = signup.body.data.user.id as string;

    const project = await harness.repositories.projects.create({
      businessName: `Business of ${email}`,
      contactName: 'Owner',
      email,
      ownerUserId: userId,
      status: 'deposit-paid',
      milestone: 'review',
      approval: 'ready_for_review',
      depositStatus: 'paid',
      finalStatus: 'pending',
      subscriptionStatus: 'none',
    });

    await harness.repositories.projects.update(project.id, {
      previewUrl: `https://preview-${project.id}.example`,
    });

    await harness.repositories.tasks.create({
      projectId: project.id,
      userId,
      kind: 'upload-logo',
      title: 'Send us your logo',
      description: 'The best version you have.',
      status: 'open',
    });

    await harness.repositories.feedback.create({
      projectId: project.id,
      authorUserId: userId,
      authorName: 'Owner',
      authorRole: 'customer',
      body: 'Replace the photo in the services section.',
    });

    return { cookie, email, userId, projectId: project.id };
  }

  let alice: Customer;
  let bob: Customer;

  beforeEach(async () => {
    alice = await createCustomer('alice@example.com');
    bob = await createCustomer('bob@example.com');
  });

  it('gives each customer only their own projects', async () => {
    const response = await request(harness.app)
      .get('/api/app/projects')
      .set('Cookie', alice.cookie);

    expect(response.status).toBe(200);
    expect(response.body.data.projects).toHaveLength(1);
    expect(response.body.data.projects[0].id).toBe(alice.projectId);
  });

  it('lets a customer read their own project', async () => {
    const response = await request(harness.app)
      .get(`/api/app/projects/${alice.projectId}`)
      .set('Cookie', alice.cookie);

    expect(response.status).toBe(200);
    expect(response.body.data.project.id).toBe(alice.projectId);
  });

  /* ------------------------------------------------------------ the attacks */

  it("refuses to read another customer's project", async () => {
    const response = await request(harness.app)
      .get(`/api/app/projects/${bob.projectId}`)
      .set('Cookie', alice.cookie);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('answers a real-but-not-yours id exactly as it answers a made-up one', async () => {
    const notYours = await request(harness.app)
      .get(`/api/app/projects/${bob.projectId}`)
      .set('Cookie', alice.cookie);

    const doesNotExist = await request(harness.app)
      .get('/api/app/projects/project-does-not-exist')
      .set('Cookie', alice.cookie);

    expect(notYours.status).toBe(doesNotExist.status);
    expect(notYours.body.error.code).toBe(doesNotExist.body.error.code);
    expect(notYours.body.error.message).toBe(doesNotExist.body.error.message);
  });

  it.each([
    ['overview', 'get', '/overview'],
    ['tasks', 'get', '/tasks'],
    ['feedback', 'get', '/feedback'],
    ['deployments', 'get', '/deployments'],
  ])("refuses to read another customer's %s", async (_name, _method, suffix) => {
    const response = await request(harness.app)
      .get(`/api/app/projects/${bob.projectId}${suffix}`)
      .set('Cookie', alice.cookie);

    expect(response.status).toBe(404);
  });

  it("refuses to approve another customer's website", async () => {
    const response = await post(`/api/app/projects/${bob.projectId}/approve`).set(
      'Cookie',
      alice.cookie,
    );

    expect(response.status).toBe(404);

    const bobsProject = await harness.repositories.projects.findById(bob.projectId);
    expect(bobsProject?.approval).toBe('ready_for_review');
  });

  it("refuses to request changes on another customer's website", async () => {
    const response = await post(`/api/app/projects/${bob.projectId}/request-changes`).set(
      'Cookie',
      alice.cookie,
    );

    expect(response.status).toBe(404);
  });

  it("refuses to comment on another customer's project", async () => {
    const response = await post(`/api/app/projects/${bob.projectId}/feedback`)
      .set('Cookie', alice.cookie)
      .send({ body: 'I should not be able to write this.' });

    expect(response.status).toBe(404);

    const comments = await harness.repositories.feedback.listForProject(bob.projectId);
    expect(comments).toHaveLength(1);
  });

  /*
   * The nested-id attack. The project in the URL is Alice's own, so the project check
   * passes — and the *task* id belongs to Bob. A route that trusts the task id on its
   * own completes somebody else's task.
   */
  it("refuses to complete another customer's task through their own project", async () => {
    const bobsTasks = await harness.repositories.tasks.listForProject(bob.projectId);
    const bobsTaskId = bobsTasks[0]?.id as string;

    const response = await post(
      `/api/app/projects/${alice.projectId}/tasks/${bobsTaskId}/complete`,
    ).set('Cookie', alice.cookie);

    expect(response.status).toBe(404);

    const stillOpen = await harness.repositories.tasks.findById(bobsTaskId);
    expect(stillOpen?.status).toBe('open');
  });

  /*
   * The same shape one level down: a reply whose parent belongs to another project
   * would otherwise be readable in that project's thread.
   */
  it("refuses to reply to a comment on another customer's project", async () => {
    const bobsComments = await harness.repositories.feedback.listForProject(bob.projectId);
    const bobsCommentId = bobsComments[0]?.id as string;

    const response = await post(`/api/app/projects/${alice.projectId}/feedback`)
      .set('Cookie', alice.cookie)
      .send({ body: 'Sneaking in.', parentId: bobsCommentId });

    expect(response.status).toBe(404);
  });

  it("never returns another customer's activity in a dashboard", async () => {
    await harness.repositories.activity.record({
      type: 'project.created',
      summary: "Bob's private note",
      audience: 'customer',
      projectId: bob.projectId,
      userId: bob.userId,
    });

    const response = await request(harness.app)
      .get('/api/app/dashboard')
      .set('Cookie', alice.cookie);

    expect(JSON.stringify(response.body)).not.toContain("Bob's private note");
  });

  /* ---------------------------------------------------- what leaves the API */

  /*
   * The customer view is an allow-list. These fields exist on the same document and
   * have no business in a browser — see `toCustomerProjectView`.
   */
  it('never sends internal billing identifiers to a customer', async () => {
    await harness.repositories.projects.update(alice.projectId, {
      stripeCustomerId: 'cus_secret',
      subscriptionId: 'sub_secret',
      depositPaymentIntentId: 'pi_secret',
      depositSessionId: 'cs_secret',
    });

    const response = await request(harness.app)
      .get(`/api/app/projects/${alice.projectId}/overview`)
      .set('Cookie', alice.cookie);

    const serialised = JSON.stringify(response.body);
    expect(serialised).not.toContain('cus_secret');
    expect(serialised).not.toContain('sub_secret');
    expect(serialised).not.toContain('pi_secret');
    expect(serialised).not.toContain('cs_secret');
    expect(serialised).not.toContain('ownerUserId');
  });

  it('never shows a customer an internal activity entry', async () => {
    await harness.repositories.activity.record({
      type: 'deployment.failed',
      summary: 'Build failed: exit code 1 in webpack',
      audience: 'internal',
      projectId: alice.projectId,
      userId: alice.userId,
    });

    const response = await request(harness.app)
      .get(`/api/app/projects/${alice.projectId}/overview`)
      .set('Cookie', alice.cookie);

    expect(JSON.stringify(response.body)).not.toContain('webpack');
  });

  /* --------------------------------------------------------------- the admin */

  describe('the admin surface', () => {
    it('is invisible to a customer', async () => {
      const response = await request(harness.app)
        .get('/api/admin/projects')
        .set('Cookie', alice.cookie);

      // NOT_FOUND rather than FORBIDDEN: a customer should not learn there is an admin.
      expect(response.status).toBe(404);
    });

    it('is invisible to somebody with no session at all', async () => {
      /*
       * **This asserted 401 and the test's own name said "invisible".** A 401 is not invisible:
       * it confirms the path is real and that a credential is the thing standing in the way,
       * which is the most useful answer an unauthenticated scanner could get and the exact fact
       * the 404 for customers exists to withhold.
       *
       * `requireAdmin` now answers NOT_FOUND for a missing session as well as for a customer
       * one, so all three cases are indistinguishable. See the note in `auth.middleware.ts` and
       * the fuller set of probes in `admin.api.test.ts`.
       */
      const response = await request(harness.app).get('/api/admin/projects');
      expect(response.status).toBe(404);
    });

    it('lets staff see every project', async () => {
      makeAdmin(harness, alice.userId);

      const response = await request(harness.app)
        .get('/api/admin/projects')
        .set('Cookie', alice.cookie);

      expect(response.status).toBe(200);
      expect(response.body.data.projects).toHaveLength(2);
    });

    it('lets staff open a project that is not theirs, through the capability', async () => {
      makeAdmin(harness, alice.userId);

      const response = await request(harness.app)
        .get(`/api/admin/projects/${bob.projectId}`)
        .set('Cookie', alice.cookie);

      expect(response.status).toBe(200);
      expect(response.body.data.project.id).toBe(bob.projectId);
    });

    it('lets staff move a milestone, and the customer sees the new label', async () => {
      makeAdmin(harness, alice.userId);

      const changed = await request(harness.app)
        .patch(`/api/admin/projects/${bob.projectId}/milestone`)
        .set('Cookie', alice.cookie)
        .set('Origin', TEST_ORIGIN)
        .send({ milestone: 'building' });

      expect(changed.status).toBe(200);

      const asBob = await request(harness.app)
        .get(`/api/app/projects/${bob.projectId}`)
        .set('Cookie', bob.cookie);

      expect(asBob.body.data.project.milestone).toBe('building');
      expect(asBob.body.data.project.milestoneLabel).toBe('Your website is being built');
      expect(asBob.body.data.project.waitingOnCustomer).toBe(false);
    });

    /*
     * ======================================================================
     * PUTTING A MILESTONE BACK
     * ======================================================================
     *
     * The console's milestone control is a `<select>`, and a scroll wheel over a focused one
     * is enough to change what a customer's dashboard says. It gained a confirmation step;
     * this is for the case an operator confirms and *then* realises they were on the wrong
     * project tab.
     * ======================================================================
     */
    it('lets staff put a milestone back within the window', async () => {
      makeAdmin(harness, alice.userId);

      const changedAt = new Date();

      await request(harness.app)
        .patch(`/api/admin/projects/${bob.projectId}/milestone`)
        .set('Cookie', alice.cookie)
        .set('Origin', TEST_ORIGIN)
        .send({ milestone: 'launching' });

      const undone = await request(harness.app)
        .patch(`/api/admin/projects/${bob.projectId}/milestone/undo`)
        .set('Cookie', alice.cookie)
        .set('Origin', TEST_ORIGIN)
        .send({ milestone: 'onboarding', changedAt: changedAt.toISOString() });

      expect(undone.status).toBe(200);
      expect(undone.body.data.project.milestone).toBe('onboarding');
    });

    /*
     * The customer's own history must not narrate an operator's mistake. They see the stage
     * they are at; a pair of entries saying it moved forward and then back within a minute is
     * something that did not happen to them.
     */
    it('records the undo as internal, so the customer never reads it', async () => {
      makeAdmin(harness, alice.userId);

      const changedAt = new Date();

      await request(harness.app)
        .patch(`/api/admin/projects/${bob.projectId}/milestone`)
        .set('Cookie', alice.cookie)
        .set('Origin', TEST_ORIGIN)
        .send({ milestone: 'launching' });

      await request(harness.app)
        .patch(`/api/admin/projects/${bob.projectId}/milestone/undo`)
        .set('Cookie', alice.cookie)
        .set('Origin', TEST_ORIGIN)
        .send({ milestone: 'onboarding', changedAt: changedAt.toISOString() });

      /*
       * `/overview` rather than the detail route: that is the one the customer's project page
       * reads, and the only customer response carrying activity at all. It filters to
       * `customerVisibleOnly`, which is the filter this assertion is about.
       */
      const asBob = await request(harness.app)
        .get(`/api/app/projects/${bob.projectId}/overview`)
        .set('Cookie', bob.cookie);

      const summaries = (asBob.body.data.activity as { summary: string }[]).map(
        (entry) => entry.summary,
      );
      expect(summaries.some((summary) => summary.includes('undone'))).toBe(false);

      /* Staff still have it — that is what an audit trail is for. */
      const asStaff = await request(harness.app)
        .get(`/api/admin/projects/${bob.projectId}`)
        .set('Cookie', alice.cookie);

      const staffSummaries = (asStaff.body.data.activity as { summary: string }[]).map(
        (entry) => entry.summary,
      );
      expect(staffSummaries.some((summary) => summary.includes('undone'))).toBe(true);
    });

    /*
     * Refused rather than silently ignored: past the window the customer has almost certainly
     * seen the change, so putting it back is a second change and should be made deliberately.
     */
    it('refuses an undo of a change that is too old', async () => {
      makeAdmin(harness, alice.userId);

      await request(harness.app)
        .patch(`/api/admin/projects/${bob.projectId}/milestone`)
        .set('Cookie', alice.cookie)
        .set('Origin', TEST_ORIGIN)
        .send({ milestone: 'launching' });

      const anHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      const response = await request(harness.app)
        .patch(`/api/admin/projects/${bob.projectId}/milestone/undo`)
        .set('Cookie', alice.cookie)
        .set('Origin', TEST_ORIGIN)
        .send({ milestone: 'onboarding', changedAt: anHourAgo.toISOString() });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('too old to undo');
    });

    it('does not let a customer undo their own milestone', async () => {
      const response = await request(harness.app)
        .patch(`/api/admin/projects/${bob.projectId}/milestone/undo`)
        .set('Cookie', bob.cookie)
        .set('Origin', TEST_ORIGIN)
        .send({ milestone: 'onboarding', changedAt: new Date().toISOString() });

      /* NOT_FOUND, like everything else behind `requireAdmin`. */
      expect(response.status).toBe(404);
    });

    it('refuses a milestone that is not one of the defined ones', async () => {
      makeAdmin(harness, alice.userId);

      const response = await request(harness.app)
        .patch(`/api/admin/projects/${alice.projectId}/milestone`)
        .set('Cookie', alice.cookie)
        .set('Origin', TEST_ORIGIN)
        .send({ milestone: 'whatever-i-like' });

      expect(response.status).toBe(400);
    });

    /* ------------------------------------------------------- checkout links */

    /*
     * ======================================================================
     * ASKING A CLIENT FOR MONEY, FROM THE CONSOLE
     * ======================================================================
     *
     * The route exists so the last manual step of the sale — mint a link with curl, paste it
     * into a mail client — stops being manual. What is asserted here is the part that could
     * not be asserted at the service level: that it is behind the same guard as everything
     * else on this surface, and that the entry it writes names the person who pressed it.
     *
     * DECISION 019's whole argument is that a money operation should be attributable. The
     * token surface gets that from a log line; this one gets it from an activity entry a human
     * can read on the project a month later.
     * ======================================================================
     */
    it('mints a checkout link and records who asked for it', async () => {
      makeAdmin(harness, alice.userId);
      harness.stripe.setPriceAmount('price_deposit', EXPECTED_AMOUNT_CENTS['build-deposit']);

      const response = await request(harness.app)
        .post(`/api/admin/projects/${bob.projectId}/checkout-link`)
        .set('Cookie', alice.cookie)
        .set('Origin', TEST_ORIGIN)
        .send({ product: 'build-deposit' });

      expect(response.status).toBe(201);
      expect(response.body.data.url).toMatch(/^https:\/\//);
      /* Not asked for, so not claimed. */
      expect(response.body.data.emailedTo).toBeNull();

      const entry = harness.repositories.activity.entries.find(
        (candidate) => candidate.type === 'billing.checkout_started',
      );

      /*
       * Internal, and named. A customer's own timeline should not gain a line every time an
       * operator generates a link — they hear about it from the email, if one was sent, and
       * from Stripe when they pay.
       */
      expect(entry?.audience).toBe('internal');
      expect(entry?.summary).toContain('deposit');
      expect(entry?.summary).toContain(`Owner of ${alice.email}`);
    });

    it('is invisible to a customer, like every other operation here', async () => {
      const response = await request(harness.app)
        .post(`/api/admin/projects/${bob.projectId}/checkout-link`)
        .set('Cookie', alice.cookie)
        .set('Origin', TEST_ORIGIN)
        .send({ product: 'build-deposit' });

      expect(response.status).toBe(404);
      expect(harness.stripe.checkoutRequests).toHaveLength(0);
    });

    /*
     * The console may ask for two things and only two. A subscription link emailed to
     * somebody who never chose Growth Partner is not what the published terms describe, and
     * the enum is what makes that a rejected request rather than a policy somebody remembers.
     */
    it('refuses to mint a subscription link', async () => {
      makeAdmin(harness, alice.userId);

      const response = await request(harness.app)
        .post(`/api/admin/projects/${bob.projectId}/checkout-link`)
        .set('Cookie', alice.cookie)
        .set('Origin', TEST_ORIGIN)
        .send({ product: 'growth-partner-monthly' });

      expect(response.status).toBe(400);
      expect(harness.stripe.checkoutRequests).toHaveLength(0);
    });
  });

  /* --------------------------------------------------------------- approval */

  describe('approval', () => {
    it('records an explicit approval and moves the project to launching', async () => {
      const response = await post(`/api/app/projects/${alice.projectId}/approve`).set(
        'Cookie',
        alice.cookie,
      );

      expect(response.status).toBe(200);
      expect(response.body.data.project.approval).toBe('approved');
      expect(response.body.data.project.approvedAt).toBeTruthy();
      expect(response.body.data.project.milestone).toBe('launching');
    });

    it('is idempotent, keeping the first timestamp', async () => {
      const first = await post(`/api/app/projects/${alice.projectId}/approve`).set(
        'Cookie',
        alice.cookie,
      );
      const second = await post(`/api/app/projects/${alice.projectId}/approve`).set(
        'Cookie',
        alice.cookie,
      );

      expect(second.body.data.project.approvedAt).toBe(first.body.data.project.approvedAt);
    });

    /*
     * A comment is not an approval. This is the property the brief is explicit about,
     * and it is the one a "looks good" would otherwise quietly satisfy.
     */
    it('is not granted by a comment saying it looks good', async () => {
      await post(`/api/app/projects/${alice.projectId}/feedback`)
        .set('Cookie', alice.cookie)
        .send({ body: 'looks good to me, ship it' });

      const project = await harness.repositories.projects.findById(alice.projectId);
      expect(project?.approval).toBe('ready_for_review');
      expect(project?.approvedAt).toBeUndefined();
    });

    it('refuses to approve a project with no preview to approve', async () => {
      const bare = await harness.repositories.projects.create({
        businessName: 'No preview yet',
        contactName: 'Owner',
        email: 'alice@example.com',
        ownerUserId: alice.userId,
        status: 'deposit-paid',
        milestone: 'building',
        approval: 'not_ready',
        depositStatus: 'paid',
        finalStatus: 'pending',
        subscriptionStatus: 'none',
      });

      const response = await post(`/api/app/projects/${bare.id}/approve`).set(
        'Cookie',
        alice.cookie,
      );

      expect(response.status).toBe(400);
    });

    it('withdraws an approval when changes are requested afterwards', async () => {
      await post(`/api/app/projects/${alice.projectId}/approve`).set('Cookie', alice.cookie);

      const response = await post(`/api/app/projects/${alice.projectId}/request-changes`).set(
        'Cookie',
        alice.cookie,
      );

      expect(response.body.data.project.approval).toBe('changes_requested');
      expect(response.body.data.project.approvedAt).toBeUndefined();
      expect(response.body.data.project.milestone).toBe('revisions');
    });
  });
});
