import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  createPlatformHarness,
  sessionCookieFrom,
  TEST_ORIGIN,
  type PlatformHarness,
} from '../../testing/platformApp.js';
import { CAPABILITIES } from '../auth/auth.types.js';

/*
 * ============================================================================
 * THE ADMIN SURFACE, ATTACKED
 * ============================================================================
 *
 * The brief this was built against asked for one thing above all others: **test unauthorized
 * access explicitly.** So the majority of this file is requests that should fail, and every
 * assertion is about what an attacker gets rather than about what an operator gets.
 *
 * ## The three layers, tested separately
 *
 * Authorization here is not one check, and testing it as one would hide two of them:
 *
 *   1. **Authentication** — is there a session at all. An anonymous request must not reach any
 *      admin route, and must not be told why.
 *   2. **Role** — is the session's user staff. A perfectly valid customer session must be
 *      answered exactly as an anonymous one is, because a customer learning that `/api/admin`
 *      exists is a customer who now knows what to attack.
 *   3. **Resource** — may this staff member touch this record. Admin crosses customer
 *      boundaries by design, which is precisely why the id in the URL still has to resolve to
 *      a real project rather than being trusted.
 *
 * ## Why NOT_FOUND rather than FORBIDDEN
 *
 * `requireAdmin` answers 404. That is deliberate and it is asserted below: a 403 confirms the
 * endpoint exists and that the caller is simply not allowed, which is a free reconnaissance
 * answer. 404 says nothing. The consequence is that "not signed in", "signed in as a customer"
 * and "no such route" are indistinguishable from outside, which is the point.
 * ============================================================================
 */

const PASSWORD = 'a-long-enough-passphrase';

/** Every path under `/api/admin`, so a new route cannot be added without an access test. */
const ADMIN_GETS = [
  '/api/admin/projects',
  '/api/admin/accounts',
  '/api/admin/conversations',
] as const;

describe('the admin surface', () => {
  let harness: PlatformHarness;

  const post = (path: string) => request(harness.app).post(path).set('Origin', TEST_ORIGIN);
  const patch = (path: string) => request(harness.app).patch(path).set('Origin', TEST_ORIGIN);

  /** Signs a fresh customer up and returns their session cookie. */
  async function signUpCustomer(email: string): Promise<string> {
    const response = await post('/api/auth/signup').send({
      email,
      name: 'A Customer',
      password: PASSWORD,
    });

    expect(response.status).toBe(201);
    return sessionCookieFrom(response.headers);
  }

  /**
   * A staff session.
   *
   * Made by signing up and then promoting through the **repository**, which is the only thing
   * in the application that can change a role — there is deliberately no HTTP route for it, and
   * a test below asserts that. This is the same path `scripts/create-admin.ts` takes.
   */
  async function signInAdmin(email: string): Promise<string> {
    const cookie = await signUpCustomer(email);

    const user = await harness.auth.findUserByEmail(email);
    expect(user).not.toBeNull();
    await harness.auth.setRole(user!.id, 'admin');

    return cookie;
  }

  beforeEach(() => {
    harness = createPlatformHarness();
  });

  /* ================================================================ layer 1: anonymous */

  describe('to somebody with no session', () => {
    it('answers 404 to every admin route, revealing nothing', async () => {
      for (const path of ADMIN_GETS) {
        const response = await request(harness.app).get(path);

        expect(response.status, path).toBe(404);
        /*
         * Not 401. A 401 on `/api/admin/projects` tells an anonymous scanner that the path is
         * real and that a credential would help — which is exactly the fact `requireAdmin` is
         * written to withhold.
         */
        expect(response.body.error.code, path).toBe('NOT_FOUND');
      }
    });

    it('answers 404 to the write operations too', async () => {
      /* A read-only 404 with a writable POST would be the worst of both. */
      const milestone = await patch('/api/admin/projects/anything/milestone').send({
        milestone: 'live',
      });
      expect(milestone.status).toBe(404);

      const task = await post('/api/admin/projects/anything/tasks').send({
        kind: 'custom',
        title: 'Anything',
      });
      expect(task.status).toBe(404);
    });
  });

  /* ================================================================= layer 2: customer */

  describe('to a signed-in customer', () => {
    it('answers exactly as it does to a stranger', async () => {
      const cookie = await signUpCustomer('customer@example.com');

      for (const path of ADMIN_GETS) {
        const response = await request(harness.app).get(path).set('Cookie', cookie);

        expect(response.status, path).toBe(404);
        expect(response.body.error.code, path).toBe('NOT_FOUND');
        /*
         * The message must not differ either. "Your account does not have access" would be a
         * 404 that confirms the route exists, which defeats the status code.
         */
        expect(response.body.error.message, path).toBe('Not found.');
      }
    });

    it('refuses a customer trying to move their own project along', async () => {
      /*
       * The realistic attack, not a hypothetical one: a customer who has read the network tab
       * of their own dashboard, found the project id, and tried the admin verb with it. Their
       * session is valid and the id is genuinely theirs — role is the only thing stopping them.
       */
      const cookie = await signUpCustomer('impatient@example.com');
      const user = await harness.auth.findUserByEmail('impatient@example.com');
      const project = await harness.repositories.projects.create({
        businessName: 'Theirs',
        contactName: 'Theirs',
        email: 'impatient@example.com',
        ownerUserId: user!.id,
        status: 'agreed',
        milestone: 'onboarding',
        approval: 'not_ready',
        depositStatus: 'pending',
        finalStatus: 'pending',
        subscriptionStatus: 'none',
      });

      const response = await patch(`/api/admin/projects/${project.id}/milestone`)
        .set('Cookie', cookie)
        .send({ milestone: 'live' });

      expect(response.status).toBe(404);

      const stored = await harness.repositories.projects.findById(project.id);
      expect(stored?.milestone).not.toBe('live');
    });

    it('never sends a customer another account through the accounts list', async () => {
      const cookie = await signUpCustomer('one@example.com');
      await signUpCustomer('two@example.com');

      const response = await request(harness.app).get('/api/admin/accounts').set('Cookie', cookie);

      expect(response.status).toBe(404);
      expect(JSON.stringify(response.body)).not.toContain('two@example.com');
    });
  });

  /* ==================================================================== layer 3: staff */

  describe('to a staff session', () => {
    it('lists every project, across customers', async () => {
      const cookie = await signInAdmin('staff@example.com');

      await harness.repositories.projects.create({
        businessName: 'First',
        contactName: 'A',
        email: 'a@example.com',
        status: 'agreed',
        milestone: 'onboarding',
        approval: 'not_ready',
        depositStatus: 'pending',
        finalStatus: 'pending',
        subscriptionStatus: 'none',
      });
      await harness.repositories.projects.create({
        businessName: 'Second',
        contactName: 'B',
        email: 'b@example.com',
        status: 'agreed',
        milestone: 'onboarding',
        approval: 'not_ready',
        depositStatus: 'pending',
        finalStatus: 'pending',
        subscriptionStatus: 'none',
      });

      const response = await request(harness.app).get('/api/admin/projects').set('Cookie', cookie);

      expect(response.status).toBe(200);
      expect(response.body.data.projects).toHaveLength(2);
    });

    it('still answers 404 for a project id that does not exist', async () => {
      /*
       * Resource-level authorization, and the reason it is not made redundant by the role
       * check: staff crossing customer boundaries is the *point* of this surface, so the only
       * thing between a typo and an exception is that the id has to resolve.
       */
      const cookie = await signInAdmin('staff@example.com');

      const response = await request(harness.app)
        .get('/api/admin/projects/000000000000000000000000')
        .set('Cookie', cookie);

      expect(response.status).toBe(404);
    });

    it('lists accounts without ever sending a password hash', async () => {
      const cookie = await signInAdmin('staff@example.com');
      await signUpCustomer('customer@example.com');

      const response = await request(harness.app).get('/api/admin/accounts').set('Cookie', cookie);

      expect(response.status).toBe(200);

      const accounts = response.body.data.accounts as readonly Record<string, unknown>[];
      expect(accounts.length).toBeGreaterThanOrEqual(2);

      /*
       * The assertion that matters most on this route. `AdminAccountView` is built field by
       * field precisely so a hash cannot ride along, and this is the check that the mapper is
       * actually in the path — a `...user` spread would pass every other test in this file.
       */
      const raw = JSON.stringify(response.body);
      expect(raw).not.toContain('passwordHash');
      expect(raw).not.toContain('scrypt');
      expect(raw).not.toContain(PASSWORD);

      for (const account of accounts) {
        expect(Object.keys(account)).not.toContain('passwordHash');
        expect(Object.keys(account)).not.toContain('identities');
        expect(Object.keys(account)).not.toContain('stripeCustomerId');
      }
    });

    /*
     * The two lists that used to send a bounded page and say nothing about being bounded.
     *
     * `hasMore` is computed by fetching one row past the limit and dropping it, which answers
     * exactly rather than approximately — the console used to infer truncation from the row
     * count reaching the limit, which reads a complete list of fifty as "there are more".
     * Both boundaries are checked here because the off-by-one is the whole mechanism.
     */
    it('says whether a list of accounts was cut, and is exact at the boundary', async () => {
      const cookie = await signInAdmin('staff@example.com');
      await signUpCustomer('one@example.com');
      await signUpCustomer('two@example.com');

      const cut = await request(harness.app)
        .get('/api/admin/accounts?limit=1')
        .set('Cookie', cookie);

      expect(cut.status).toBe(200);
      expect(cut.body.data.accounts).toHaveLength(1);
      expect(cut.body.data.hasMore).toBe(true);

      const whole = await request(harness.app)
        .get('/api/admin/accounts?limit=200')
        .set('Cookie', cookie);

      expect(whole.body.data.hasMore).toBe(false);

      /* Exactly as many as were asked for, with nothing behind them: the case the old
         client-side inference got wrong in the other direction. */
      const count = (whole.body.data.accounts as unknown[]).length;
      const exact = await request(harness.app)
        .get(`/api/admin/accounts?limit=${count}`)
        .set('Cookie', cookie);

      expect(exact.body.data.accounts).toHaveLength(count);
      expect(exact.body.data.hasMore).toBe(false);
    });

    it('says whether a list of projects was cut', async () => {
      const cookie = await signInAdmin('staff@example.com');

      for (const name of ['One', 'Two']) {
        await harness.repositories.projects.create({
          businessName: name,
          contactName: 'Somebody',
          email: `${name.toLowerCase()}@example.com`,
          status: 'agreed',
          milestone: 'onboarding',
          approval: 'not_ready',
          depositStatus: 'pending',
          finalStatus: 'pending',
          subscriptionStatus: 'none',
        });
      }

      const cut = await request(harness.app)
        .get('/api/admin/projects?limit=1')
        .set('Cookie', cookie);

      expect(cut.body.data.projects).toHaveLength(1);
      expect(cut.body.data.hasMore).toBe(true);

      const whole = await request(harness.app)
        .get('/api/admin/projects?limit=200')
        .set('Cookie', cookie);

      expect(whole.body.data.hasMore).toBe(false);
    });

    /*
     * The console's "Show more" adds fifty a press, so a ceiling it can reach is a ceiling
     * that becomes the same dead end the control was built to remove. 500 is ten presses.
     */
    it('accepts a limit up to five hundred and refuses one beyond it', async () => {
      const cookie = await signInAdmin('staff@example.com');

      const allowed = await request(harness.app)
        .get('/api/admin/accounts?limit=500')
        .set('Cookie', cookie);
      expect(allowed.status).toBe(200);

      const refused = await request(harness.app)
        .get('/api/admin/accounts?limit=501')
        .set('Cookie', cookie);
      expect(refused.status).toBe(400);
    });

    it('reports whether somebody has paid without exposing the Stripe id', async () => {
      const cookie = await signInAdmin('staff@example.com');
      const response = await request(harness.app).get('/api/admin/accounts').set('Cookie', cookie);

      const accounts = response.body.data.accounts as readonly Record<string, unknown>[];
      for (const account of accounts) {
        expect(typeof account['hasStripeCustomer']).toBe('boolean');
      }
    });

    it('refuses a task on a project with no account attached, with a usable reason', async () => {
      const cookie = await signInAdmin('staff@example.com');

      const project = await harness.repositories.projects.create({
        businessName: 'Unlinked',
        contactName: 'Nobody',
        email: 'nobody@example.com',
        status: 'agreed',
        milestone: 'onboarding',
        approval: 'not_ready',
        depositStatus: 'pending',
        finalStatus: 'pending',
        subscriptionStatus: 'none',
      });

      const response = await post(`/api/admin/projects/${project.id}/tasks`)
        .set('Cookie', cookie)
        .send({
          kind: 'custom',
          title: 'Send us your logo',
          description: 'A square PNG if you have one.',
        });

      expect(response.status).toBe(400);
      /* The message the admin UI shows verbatim — the operator has to know the fix. */
      expect(response.body.error.message).toContain('no customer account attached');
    });
  });

  /* ============================================================ privilege escalation */

  /*
   * ==========================================================================
   * NO ROUTE MAY GRANT A ROLE
   * ==========================================================================
   *
   * `setRole` is the only write in the application that can grant privilege, and the security
   * property it depends on is that **an operator running a script is its only caller.** A route
   * that reached it — even one behind `requireAdmin` — would turn one compromised staff session
   * into permanent, self-granted access.
   *
   * A test that tried a few likely URLs would prove nothing about the ones nobody thought of.
   * This reads the source instead, which is the same trade `contract.sync.test.ts` makes and
   * for the same reason: the property is about the whole tree, not about a sample of it.
   * ==========================================================================
   */
  it('has no HTTP route anywhere that can change a role', () => {
    function sourceFiles(dir: string): string[] {
      return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) return sourceFiles(path);
        return /\.ts$/.test(entry.name) && !/\.test\.ts$/.test(entry.name) ? [path] : [];
      });
    }

    const root = join(import.meta.dirname, '..', '..');

    /*
     * `\bsetRole\b`, not `.setRole(`.
     *
     * The first version of this looked for a call shape and matched **nothing at all** — the
     * interface declares `setRole(id, role)` and the implementation writes `async setRole(...)`,
     * neither of which is a dotted call. It passed by finding zero files and comparing them to
     * an expectation of zero, which is a guard that would have sat there green while somebody
     * wired a role change into a router. Matching the identifier catches every mention:
     * declaration, implementation, and any call anybody adds.
     */
    const mentions = sourceFiles(root).filter((file) =>
      /\bsetRole\b/.test(readFileSync(file, 'utf8')),
    );

    /*
     * Exactly two permitted files, and every one of them is storage or a test double:
     *
     *   - `auth.repository.ts` — the interface and the Mongo implementation.
     *   - `authFakes.ts`       — the in-memory double, so tests can promote somebody.
     *
     * No router, no service, no controller. `scripts/create-admin.ts` is outside `src/` and
     * therefore outside this sweep, which is correct: it is not part of the running application,
     * and that is the entire point of it being a script.
     */
    const names = [...new Set(mentions.map((file) => file.split(/[\\/]/).pop()))].sort();
    expect(names).toEqual(['auth.repository.ts', 'authFakes.ts']);
  });

  it('never lets a signup choose its own role', async () => {
    /*
     * Mass assignment, tried directly. The signup schema is strict, so `role` is either
     * stripped or rejected — either is fine, and what must never happen is a stored admin.
     */
    const response = await post('/api/auth/signup').send({
      email: 'sneaky@example.com',
      name: 'Sneaky',
      password: PASSWORD,
      role: 'admin',
    });

    /* Whether it 201s having ignored the field or 400s having rejected it, the role is not admin. */
    if (response.status === 201) {
      const user = await harness.auth.findUserByEmail('sneaky@example.com');
      expect(user?.role).toBe('customer');
    } else {
      expect(response.status).toBe(400);
    }
  });

  /* ================================================================= the model itself */

  /*
   * ==========================================================================
   * WHICH CAPABILITIES ARE ACTUALLY ENFORCED
   * ==========================================================================
   *
   * `CAPABILITIES` reads like fine-grained authorization. Six of the nine are checked nowhere,
   * and that is not currently a vulnerability — an admin holds all of them and `requireAdmin`
   * is the operative check — but it is a model that promises least privilege without delivering
   * it, and the day a narrower staff role is added, an unenforced capability grants everything
   * silently.
   *
   * So the gap is recorded rather than left to be rediscovered. Adding a capability without
   * enforcing it fails this test until somebody either wires it up or writes down why not,
   * which is the same bargain the "no orphan routes" guard on the client makes.
   * ==========================================================================
   */
  it('enforces every capability somewhere, or records why it does not', () => {
    const UNENFORCED = new Map<string, string>([
      [
        'task:write:any',
        'redundant by construction: the admin task route is behind createProjectAccess(write), which already requires project:write:any',
      ],
      /*
       * `feedback:write:any` was here, exempted as "redundant by construction". It is not
       * exempt any more: `POST /api/admin/conversations/:id/replies` checks it explicitly,
       * because that route reaches a comment by its own id rather than through
       * `createProjectAccess`, so nothing else on the path consults a capability at all.
       * The stale-exemption check below is what forced this line to be deleted.
       */
      [
        'billing:read:any',
        'the owner-only billing endpoints authenticate with BILLING_ADMIN_TOKEN rather than a session, so no role is consulted — see DECISION 019',
      ],
      [
        'billing:write:any',
        'same as billing:read:any — token-authenticated, not role-authenticated',
      ],
      [
        'deployment:write:any',
        'deployments are written by the provider webhook, which is signature-authenticated and has no user',
      ],
    ]);

    function sourceFiles(dir: string): string[] {
      return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) return sourceFiles(path);
        return /\.ts$/.test(entry.name) && !/\.test\.ts$/.test(entry.name) ? [path] : [];
      });
    }

    const root = join(import.meta.dirname, '..', '..');
    const source = sourceFiles(root)
      /* The declaration itself is not a use. */
      .filter((file) => !file.endsWith('auth.types.ts'))
      .map((file) => readFileSync(file, 'utf8'))
      .join('\n');

    const unexplained = CAPABILITIES.filter(
      (capability) => !source.includes(`'${capability}'`) && !UNENFORCED.has(capability),
    );

    expect(
      unexplained,
      'A capability nothing checks looks like a permission and is not one. Enforce it, or add ' +
        'it to UNENFORCED above with the reason.',
    ).toEqual([]);

    /* And in the other direction: an entry that became enforced should leave the list. */
    const staleExemptions = [...UNENFORCED.keys()].filter((capability) =>
      source.includes(`'${capability}'`),
    );

    expect(staleExemptions, 'These are enforced now — remove them from UNENFORCED.').toEqual([]);
  });
});
