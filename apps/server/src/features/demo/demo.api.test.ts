import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  createPlatformHarness,
  makeAdmin,
  sessionCookieFrom,
  TEST_ORIGIN,
  type PlatformHarness,
} from '../../testing/platformApp.js';
import { DEMO_EMAIL } from './demo.types.js';

/*
 * ============================================================================
 * WHAT AN ATTACKER, AND WHAT AN ACCIDENT, GETS
 * ============================================================================
 *
 * Every test here is about a boundary rather than a feature. Demo Mode hands a shared secret
 * to several people and points them at production; the thing that makes that safe is not the
 * obscurity of `/promo`, it is that the account behind it is an ordinary customer and the
 * ownership checks were already tested.
 *
 * The two most valuable tests in the file are the symmetric pair: a demo visitor cannot read
 * a real customer's records, **and** a real customer cannot read the demonstration account's.
 * A boundary that only holds in one direction is not a boundary.
 * ============================================================================
 */

const PASSCODE = 'a-long-enough-demo-passcode';

describe('demo mode', () => {
  let harness: PlatformHarness;

  beforeEach(() => {
    harness = createPlatformHarness({ env: { DEMO_PASSCODE: PASSCODE } });
  });

  const post = (path: string) => request(harness.app).post(path).set('Origin', TEST_ORIGIN);

  async function enter(): Promise<string> {
    const response = await post('/api/demo/enter').send({ passcode: PASSCODE });
    expect(response.status).toBe(200);
    return sessionCookieFrom(response.headers);
  }

  /** A real customer, with a project of their own, to test the boundary against. */
  async function createRealCustomer() {
    const signup = await post('/api/auth/signup').send({
      email: 'real@customer.example',
      name: 'A Real Customer',
      password: 'a-long-enough-passphrase',
    });

    const cookie = sessionCookieFrom(signup.headers);
    const userId = signup.body.data.user.id as string;

    const project = await harness.repositories.projects.create({
      businessName: 'A Real Business',
      contactName: 'A Real Customer',
      email: 'real@customer.example',
      ownerUserId: userId,
      status: 'deposit-paid',
      milestone: 'review',
      approval: 'ready_for_review',
      depositStatus: 'paid',
      finalStatus: 'pending',
      subscriptionStatus: 'none',
    });

    return { cookie, userId, projectId: project.id };
  }

  /* ------------------------------------------------------------------ access */

  it('answers the same thing to a wrong passcode as to no passcode at all', async () => {
    const wrong = await post('/api/demo/enter').send({ passcode: 'not-the-passcode' });
    expect(wrong.status).toBe(401);

    /*
     * The message must not say whether the passcode was wrong or the demo does not exist.
     * Two distinguishable answers is an oracle telling somebody which of the two they face.
     */
    expect(wrong.body.error.message).toMatch(/passcode is not right/i);
    expect(wrong.body.error.message).not.toMatch(/configur|disabled|unavailable/i);
  });

  it('is not mounted at all when no passcode is configured', async () => {
    const off = createPlatformHarness();

    const response = await request(off.app)
      .post('/api/demo/enter')
      .set('Origin', TEST_ORIGIN)
      .send({ passcode: PASSCODE });

    /* A genuine 404 rather than "not configured". The feature cannot be half-on. */
    expect(response.status).toBe(404);
  });

  it('mints a session for the demonstration account, and marks it', async () => {
    const cookie = await enter();

    const me = await request(harness.app).get('/api/auth/me').set('Cookie', cookie);

    expect(me.body.data.user.email).toBe(DEMO_EMAIL);
    expect(me.body.data.user.demo).toBe(true);
    /*
     * A customer, which is the load-bearing line of the whole feature: every administrative
     * restriction the brief asks for is true by construction because of it.
     */
    expect(me.body.data.user.role).toBe('customer');
  });

  it('gives the demo session a short life, not the standard thirty days', async () => {
    const response = await post('/api/demo/enter').send({ passcode: PASSCODE });

    const raw = response.headers['set-cookie'];
    const cookie = (Array.isArray(raw) ? raw : [raw]).find((value: string) =>
      value.startsWith('jobforge_session='),
    ) as string;

    const maxAge = Number(/Max-Age=(\d+)/i.exec(cookie)?.[1] ?? 0);

    /* Twelve hours by default. The assertion is "hours, not weeks", not the exact number. */
    expect(maxAge).toBeGreaterThan(0);
    expect(maxAge).toBeLessThan(3 * 24 * 60 * 60);
  });

  it('leaves through the ordinary signout, because there is no second session system', async () => {
    const cookie = await enter();

    await post('/api/auth/logout').set('Cookie', cookie).expect(200);

    const after = await request(harness.app).get('/api/auth/me').set('Cookie', cookie);
    expect(after.body.data.user).toBeNull();
  });

  /* --------------------------------------------------------------- isolation */

  it('seeds a dataset rich enough that the first screen explains the product', async () => {
    const cookie = await enter();

    const dashboard = await request(harness.app).get('/api/app/dashboard').set('Cookie', cookie);

    expect(dashboard.status).toBe(200);
    expect(dashboard.body.data.project).not.toBeNull();
    expect(dashboard.body.data.tasks.length).toBeGreaterThan(0);
    expect(dashboard.body.data.activity.length).toBeGreaterThan(0);

    /* The delivered review — the thing the front page actually promises. */
    const assessment = await request(harness.app)
      .get('/api/app/assessments/latest')
      .set('Cookie', cookie);

    expect(assessment.body.data.assessment.report.findings.length).toBeGreaterThan(0);

    /* And a published monthly report, so the Reports screen is not an empty state. */
    const reports = await request(harness.app).get('/api/app/reports').set('Cookie', cookie);
    expect(reports.body.data.reports.length).toBeGreaterThan(0);
  });

  it('is answered NOT_FOUND by every admin route', async () => {
    const cookie = await enter();

    for (const path of ['/api/admin/projects', '/api/admin/accounts', '/api/admin/conversations']) {
      await request(harness.app).get(path).set('Cookie', cookie).expect(404);
    }
  });

  it('cannot read a real customer’s project', async () => {
    const real = await createRealCustomer();
    const cookie = await enter();

    /*
     * A valid id belonging to somebody else — the shape of the real attack. 404 rather than
     * 403, so nothing is learned about which ids exist.
     */
    await request(harness.app)
      .get(`/api/app/projects/${real.projectId}`)
      .set('Cookie', cookie)
      .expect(404);
  });

  it('cannot be read by a real customer either — the boundary is symmetric', async () => {
    const cookie = await enter();
    const real = await createRealCustomer();

    const demoProjects = await request(harness.app).get('/api/app/projects').set('Cookie', cookie);

    const demoProjectId = demoProjects.body.data.projects[0].id as string;

    await request(harness.app)
      .get(`/api/app/projects/${demoProjectId}`)
      .set('Cookie', real.cookie)
      .expect(404);
  });

  /* --------------------------------------------------------------------- money */

  /*
   * ==========================================================================
   * WHY THIS TESTS THE PORTAL RATHER THAN CHECKOUT
   * ==========================================================================
   *
   * `POST /billing/checkout` never reaches the demo refusal, and that is not a gap — it is
   * two correct guards in the right order. Phase 4 widened the route's availability gate to
   * every product, and the seeded demonstration has its deposit paid and its build at
   * `review`, so *every* purchasable product is already unavailable to it. The request is
   * refused before the service is called at all.
   *
   * The portal has no such gate, so it is the endpoint that actually exercises the
   * demo-specific refusal end to end. The checkout path is covered by the service-level test
   * below, which is where the guarantee lives anyway: the brief and `CLAUDE.md` rule 2 both
   * say a route-level check is not the control.
   * ==========================================================================
   */
  it('refuses to open a real billing portal, and contacts Stripe zero times', async () => {
    const cookie = await enter();

    const before = harness.stripe.checkoutRequests.length;

    const response = await post('/api/app/billing/portal').set('Cookie', cookie).send({});

    expect(response.status).toBe(400);
    expect(response.body.error.message).toMatch(/demonstration/i);

    /*
     * The whole point. "No live charge is possible" is provable rather than configured only
     * if the client was never reached — a refusal *after* a Price lookup would still have
     * talked to Stripe with a live key.
     */
    expect(harness.stripe.checkoutRequests.length).toBe(before);
  });

  it('simulates a payment without going near Stripe or the webhook path', async () => {
    const cookie = await enter();
    const before = harness.stripe.checkoutRequests.length;

    await post('/api/demo/payments').set('Cookie', cookie).send({ stage: 'final' }).expect(204);

    const dashboard = await request(harness.app).get('/api/app/dashboard').set('Cookie', cookie);

    expect(dashboard.body.data.billing.build.final.status).toBe('paid');
    expect(harness.stripe.checkoutRequests.length).toBe(before);
  });

  /*
   * The service-level half, and the one that matters most: it is the check the brief demands
   * be below the route layer, on the path *every* self-serve purchase in the application
   * takes. It fires before the Price lookup and before the client is touched, which is what
   * makes "no live charge is possible" provable rather than configured.
   */
  it('refuses a customer checkout in the service, before Stripe is reached', async () => {
    const cookie = await enter();
    const me = await request(harness.app).get('/api/auth/me').set('Cookie', cookie);
    const demoUser = harness.auth.users.find((user) => user.id === me.body.data.user.id);

    const before = harness.stripe.checkoutRequests.length;

    await expect(
      harness.services.billing.createCustomerCheckoutSession({
        customer: {
          id: demoUser!.id,
          email: demoUser!.email,
          demo: demoUser!.demo,
        },
        product: 'build-deposit',
      }),
    ).rejects.toThrow(/demonstration/i);

    expect(harness.stripe.checkoutRequests.length).toBe(before);
  });

  /*
   * ==========================================================================
   * AND THE SAME REFUSAL ON THE PATH THAT ARRIVED LAST
   * ==========================================================================
   *
   * DECISION 041 added a third way to ask somebody for money — an owner-raised invoice — and
   * a third way to ask is a third way to charge the demonstration account. It refuses on the
   * first line, before the Price lookup and before the Stripe client is touched, exactly as
   * the two Checkout creators do.
   *
   * This test is the reason that ordering is worth being fussy about: an invoice is worse
   * than a link if it escapes, because it is a document with a number that has to be credited
   * rather than a URL nobody has to open.
   * ==========================================================================
   */
  it('refuses to invoice the demonstration project, before Stripe is reached', async () => {
    const cookie = await enter();
    await post('/api/demo/payments').set('Cookie', cookie).send({ stage: 'deposit' }).expect(204);

    const demoProject = harness.repositories.projects.projects.find(
      (project) => project.email === DEMO_EMAIL,
    );
    expect(demoProject, 'entering the demo produced no project to invoice').toBeDefined();

    const before = harness.stripe.invoiceRequests.length;

    await expect(
      harness.services.billing.createInvoice({
        projectId: demoProject!.id,
        product: 'build-deposit',
      }),
    ).rejects.toThrow(/demonstration/i);

    expect(harness.stripe.invoiceRequests.length).toBe(before);
  });

  it('refuses to simulate a payment for a real customer', async () => {
    const real = await createRealCustomer();

    await post('/api/demo/payments')
      .set('Cookie', real.cookie)
      .send({ stage: 'final' })
      .expect(404);
  });

  /* --------------------------------------------------------------------- reset */

  it('deletes the demonstration’s records and no others', async () => {
    const cookie = await enter();
    const real = await createRealCustomer();

    /* Something of the real customer's, in the same store, that must survive. */
    await harness.repositories.tasks.create({
      projectId: real.projectId,
      userId: real.userId,
      kind: 'upload-logo',
      title: 'Send us your logo',
      description: 'The best version you have.',
      status: 'open',
    });

    const realProjectsBefore = harness.repositories.projects.projects.filter(
      (project) => project.ownerUserId === real.userId,
    ).length;

    await post('/api/demo/reset').set('Cookie', cookie).expect(204);

    expect(
      harness.repositories.projects.projects.filter(
        (project) => project.ownerUserId === real.userId,
      ),
    ).toHaveLength(realProjectsBefore);

    expect(
      harness.repositories.tasks.tasks.filter((task) => task.userId === real.userId).length,
    ).toBeGreaterThan(0);

    /* And the demo is whole again rather than empty. */
    const dashboard = await request(harness.app).get('/api/app/dashboard').set('Cookie', cookie);

    expect(dashboard.body.data.project).not.toBeNull();
  });

  it('refuses a reset from a real customer', async () => {
    const real = await createRealCustomer();
    await post('/api/demo/reset').set('Cookie', real.cookie).expect(404);
  });

  /* ------------------------------------------------------- the owner's surfaces */

  it('keeps the demonstration out of the console’s picture of the business', async () => {
    await enter();

    const signup = await post('/api/auth/signup').send({
      email: 'staff@jobforge.test',
      name: 'Dana Reyes',
      password: 'a-long-enough-passphrase',
    });

    const staffCookie = sessionCookieFrom(signup.headers);
    makeAdmin(harness, signup.body.data.user.id as string);

    const projects = await request(harness.app)
      .get('/api/admin/projects')
      .set('Cookie', staffCookie);

    const accounts = await request(harness.app)
      .get('/api/admin/accounts')
      .set('Cookie', staffCookie);

    expect(
      projects.body.data.projects.some(
        (project: { businessName: string }) => project.businessName === 'Cascade Heating & Air',
      ),
    ).toBe(false);

    expect(
      accounts.body.data.accounts.some(
        (account: { email: string }) => account.email === DEMO_EMAIL,
      ),
    ).toBe(false);

    /* And back, for the afternoon somebody is debugging the demonstration. */
    const withDemo = await request(harness.app)
      .get('/api/admin/accounts?includeDemo=true')
      .set('Cookie', staffCookie);

    expect(
      withDemo.body.data.accounts.some(
        (account: { email: string }) => account.email === DEMO_EMAIL,
      ),
    ).toBe(true);
  });

  /* ------------------------------------------------------------------ feedback */

  it('records feedback with the screen it was sent from', async () => {
    const cookie = await enter();

    await post('/api/demo/feedback')
      .set('Cookie', cookie)
      .send({
        body: 'The approve button was hard to find.',
        category: 'confusing',
        route: '/app/projects/x',
      })
      .expect(201);

    await post('/api/demo/feedback')
      .set('Cookie', cookie)
      .send({ body: 'x', category: 'not-a-category', route: '/app' })
      .expect(400);
  });

  /* -------------------------------------------------------------- source sweeps */

  /*
   * The same shape as the role sweep in `admin.api.test.ts`, and for the same reason: the flag
   * that decides which records belong to the demonstration must have exactly one writer, and a
   * guard that says so is worth more than a convention everybody remembers until they do not.
   */
  it('has no route anywhere that can set the demo flag', () => {
    function sourceFiles(dir: string): string[] {
      return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) return sourceFiles(path);
        return /\.ts$/.test(entry.name) && !/\.test\.ts$/.test(entry.name) ? [path] : [];
      });
    }

    const mentions = sourceFiles(join(import.meta.dirname, '..', '..')).filter((file) =>
      /\bmarkDemo\b/.test(readFileSync(file, 'utf8')),
    );

    const names = [...new Set(mentions.map((file) => file.split(/[\\/]/).pop()))].sort();

    /*
     * Storage, its double, and the seeder's own service. No router, no controller, and
     * nothing reachable from a request body.
     */
    expect(names).toEqual(['auth.repository.ts', 'authFakes.ts', 'demo.service.ts']);
  });

  it('never ships the passcode to a browser', () => {
    /*
     * A source sweep rather than a bundle sweep, and deliberately: this runs on every commit,
     * where a bundle sweep needs a build first. What it catches is the failure that actually
     * happens — somebody adding a `VITE_`-prefixed copy so the client can "check it first".
     *
     * It looks for the passcode being **read**, not merely named. Two files in the client
     * mention `DEMO_PASSCODE` in prose — the route table and the entry page, both explaining
     * that the value never comes here — and a sweep that failed on those would be a sweep
     * somebody deletes the comments to satisfy.
     *
     * `import.meta.env` is how a Vite bundle reads configuration, and `VITE_DEMO_PASSCODE`
     * is the exact name a well-meaning shortcut would use. Either one is the bug.
     */
    function clientFiles(dir: string): string[] {
      return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) return clientFiles(path);
        return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
      });
    }

    const clientSrc = join(import.meta.dirname, '..', '..', '..', '..', 'client', 'src');
    const offenders = clientFiles(clientSrc)
      .filter((file) => {
        const source = readFileSync(file, 'utf8');
        return (
          /VITE_DEMO_PASSCODE/.test(source) ||
          /import\.meta\.env[^\n]*DEMO_PASSCODE/.test(source) ||
          /process\.env[^\n]*DEMO_PASSCODE/.test(source)
        );
      })
      .map((file) => file.split(/[\\/]/).pop());

    expect(offenders).toEqual([]);
  });
});
