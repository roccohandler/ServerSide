import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  createPlatformHarness,
  sessionCookieFrom,
  TEST_ORIGIN,
  type PlatformHarness,
} from '../../testing/platformApp.js';
import { buildGoogleIdentity } from '../../testing/authFakes.js';

/*
 * The authentication endpoints, end to end through the real HTTP pipeline.
 *
 * What this covers that `auth.service.test.ts` cannot: the cookie and its flags, the
 * CSRF guard, the shape of the response body, and the fact that a protected route is
 * actually protected rather than merely intending to be.
 */

const PASSWORD = 'a-long-enough-passphrase';

const SIGNUP = {
  email: 'dana@cascadeheating.example',
  name: 'Dana Reyes',
  password: PASSWORD,
};

describe('the authentication API', () => {
  let harness: PlatformHarness;

  beforeEach(() => {
    harness = createPlatformHarness();
  });

  const post = (path: string) => request(harness.app).post(path).set('Origin', TEST_ORIGIN);

  describe('POST /api/auth/signup', () => {
    it('creates an account and returns the public user', async () => {
      const response = await post('/api/auth/signup').send(SIGNUP);

      expect(response.status).toBe(201);
      expect(response.body.data.user).toMatchObject({
        email: 'dana@cascadeheating.example',
        name: 'Dana Reyes',
        role: 'customer',
        emailVerified: false,
      });
      expect(response.body.data.user.capabilities).toContain('project:read:own');
    });

    /*
     * The response is what a browser sees. A hash, an identity list or a Stripe id
     * reaching it would be a leak that no amount of care in the UI could undo.
     */
    it('never returns the password hash or any internal field', async () => {
      const response = await post('/api/auth/signup').send(SIGNUP);
      const serialised = JSON.stringify(response.body);

      expect(serialised).not.toContain('passwordHash');
      expect(serialised).not.toContain('scrypt$');
      expect(serialised).not.toContain('stripeCustomerId');
      expect(serialised).not.toContain('identities');
    });

    it('sets an HttpOnly, SameSite=Lax session cookie', async () => {
      const response = await post('/api/auth/signup').send(SIGNUP);
      const cookie = (response.headers['set-cookie'] as unknown as string[])[0] ?? '';

      expect(cookie).toMatch(/^jobforge_session=/);
      expect(cookie).toMatch(/HttpOnly/i);
      expect(cookie).toMatch(/SameSite=Lax/i);
      expect(cookie).toMatch(/Path=\//i);
    });

    it('rejects a password that is too short, against the field', async () => {
      const response = await post('/api/auth/signup').send({ ...SIGNUP, password: 'short' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.fields.password).toMatch(/at least/i);
    });

    /*
     * ======================================================================
     * A SIGNUP MAY NOT NAME ITS OWN ROLE
     * ======================================================================
     *
     * The schema is strict, so this is MALFORMED_REQUEST rather than a 201 with the
     * field quietly dropped. The dropped version is safe today and becomes a privilege
     * escalation the first time somebody spreads the parsed body into the create call.
     * ======================================================================
     */
    it('refuses a body that tries to set a role', async () => {
      const response = await post('/api/auth/signup').send({ ...SIGNUP, role: 'admin' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('MALFORMED_REQUEST');
      expect(harness.auth.users).toHaveLength(0);
    });

    it('refuses a body that tries to mark itself verified', async () => {
      const response = await post('/api/auth/signup').send({ ...SIGNUP, emailVerified: true });
      expect(response.status).toBe(400);
    });

    it('answers 409 when the address is taken', async () => {
      await post('/api/auth/signup').send(SIGNUP);
      const response = await post('/api/auth/signup').send(SIGNUP);

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('CONFLICT');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await post('/api/auth/signup').send(SIGNUP);
    });

    it('signs in and sets a cookie', async () => {
      const response = await post('/api/auth/login').send({
        email: SIGNUP.email,
        password: PASSWORD,
      });

      expect(response.status).toBe(200);
      expect(sessionCookieFrom(response.headers)).toMatch(/^jobforge_session=/);
    });

    it('answers 401 for a wrong password', async () => {
      const response = await post('/api/auth/login').send({
        email: SIGNUP.email,
        password: 'wrong',
      });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('answers identically for an address that has no account', async () => {
      const missing = await post('/api/auth/login').send({
        email: 'nobody@example.com',
        password: PASSWORD,
      });
      const wrong = await post('/api/auth/login').send({
        email: SIGNUP.email,
        password: 'wrong',
      });

      expect(missing.status).toBe(wrong.status);
      expect(missing.body.error.message).toBe(wrong.body.error.message);
    });
  });

  describe('GET /api/auth/me', () => {
    it('is null with no cookie', async () => {
      const response = await request(harness.app).get('/api/auth/me');

      expect(response.status).toBe(200);
      expect(response.body.data.user).toBeNull();
    });

    it('returns the account for a valid cookie', async () => {
      const signup = await post('/api/auth/signup').send(SIGNUP);
      const cookie = sessionCookieFrom(signup.headers);

      const response = await request(harness.app).get('/api/auth/me').set('Cookie', cookie);
      expect(response.body.data.user.email).toBe(SIGNUP.email);
    });

    it('is null again after signing out', async () => {
      const signup = await post('/api/auth/signup').send(SIGNUP);
      const cookie = sessionCookieFrom(signup.headers);

      await post('/api/auth/logout').set('Cookie', cookie);

      const response = await request(harness.app).get('/api/auth/me').set('Cookie', cookie);
      expect(response.body.data.user).toBeNull();
    });

    it('is null for a forged cookie', async () => {
      const response = await request(harness.app)
        .get('/api/auth/me')
        .set('Cookie', 'jobforge_session=made-up-token');

      expect(response.body.data.user).toBeNull();
    });
  });

  describe('protected routes', () => {
    it('answer 401 with no session', async () => {
      const response = await request(harness.app).get('/api/app/dashboard');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('answer 401 for a session that has been signed out', async () => {
      const signup = await post('/api/auth/signup').send(SIGNUP);
      const cookie = sessionCookieFrom(signup.headers);
      await post('/api/auth/logout').set('Cookie', cookie);

      const response = await request(harness.app).get('/api/app/dashboard').set('Cookie', cookie);
      expect(response.status).toBe(401);
    });

    it('work with a valid session', async () => {
      const signup = await post('/api/auth/signup').send(SIGNUP);
      const cookie = sessionCookieFrom(signup.headers);

      const response = await request(harness.app).get('/api/app/dashboard').set('Cookie', cookie);
      expect(response.status).toBe(200);
    });
  });

  /*
   * ==========================================================================
   * THE CSRF GUARD
   * ==========================================================================
   *
   * It only inspects requests that carry a session cookie — see `middleware/csrf.ts`
   * for why that scoping is the design rather than a shortcut. Both halves of that are
   * asserted here.
   * ==========================================================================
   */
  describe('cross-site request forgery', () => {
    it('rejects an authenticated write from another origin', async () => {
      const signup = await post('/api/auth/signup').send(SIGNUP);
      const cookie = sessionCookieFrom(signup.headers);

      const response = await request(harness.app)
        .patch('/api/auth/profile')
        .set('Cookie', cookie)
        .set('Origin', 'https://evil.example')
        .send({ name: 'Taken Over' });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects an authenticated write with no Origin at all', async () => {
      const signup = await post('/api/auth/signup').send(SIGNUP);
      const cookie = sessionCookieFrom(signup.headers);

      const response = await request(harness.app)
        .patch('/api/auth/profile')
        .set('Cookie', cookie)
        .send({ name: 'Taken Over' });

      expect(response.status).toBe(403);
    });

    it('allows an authenticated write from this site', async () => {
      const signup = await post('/api/auth/signup').send(SIGNUP);
      const cookie = sessionCookieFrom(signup.headers);

      const response = await request(harness.app)
        .patch('/api/auth/profile')
        .set('Cookie', cookie)
        .set('Origin', TEST_ORIGIN)
        .send({ name: 'Dana R.' });

      expect(response.status).toBe(200);
      expect(response.body.data.user.name).toBe('Dana R.');
    });

    /*
     * The public forms carry no cookie and are reached by curl and by servers. Making
     * them demand an Origin would break real callers to defend against an attack that
     * cannot apply to them.
     */
    it('leaves unauthenticated public writes alone', async () => {
      const response = await request(harness.app).post('/api/auth/signup').send(SIGNUP);
      expect(response.status).toBe(201);
    });

    it('never blocks a read', async () => {
      const signup = await post('/api/auth/signup').send(SIGNUP);
      const cookie = sessionCookieFrom(signup.headers);

      const response = await request(harness.app)
        .get('/api/app/dashboard')
        .set('Cookie', cookie)
        .set('Origin', 'https://evil.example');

      // A cross-origin read is what CORS is for, and CORS denies the *response*.
      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/auth/config', () => {
    it('reports Google as enabled and names the public client id', async () => {
      const response = await request(harness.app).get('/api/auth/config');

      expect(response.body.data.googleEnabled).toBe(true);
      expect(response.body.data.googleClientId).toBe('test-client-id.apps.googleusercontent.com');
    });

    /*
     * The development case the brief is specific about: no credentials configured, and
     * the endpoint still answers cleanly so the sign-in page can render its button and
     * explain itself rather than throwing.
     */
    it('reports Google as disabled without failing when nothing is configured', async () => {
      const unconfigured = createPlatformHarness({ googleClientId: undefined });
      const response = await request(unconfigured.app).get('/api/auth/config');

      expect(response.status).toBe(200);
      expect(response.body.data.googleEnabled).toBe(false);
      expect(response.body.data.googleClientId).toBeNull();
    });
  });

  describe('POST /api/auth/google', () => {
    it('signs somebody in and sets the same kind of cookie as a password login', async () => {
      harness.identityVerifier.setIdentity(buildGoogleIdentity());

      const response = await post('/api/auth/google').send({ credential: 'a-google-id-token' });

      expect(response.status).toBe(200);
      expect(response.body.data.user.email).toBe('dana@cascadeheating.example');
      expect(response.body.data.user.emailVerified).toBe(true);
      expect(sessionCookieFrom(response.headers)).toMatch(/^jobforge_session=/);
    });

    it('produces a session that works on protected routes', async () => {
      harness.identityVerifier.setIdentity(buildGoogleIdentity());
      const signin = await post('/api/auth/google').send({ credential: 'a-google-id-token' });

      const response = await request(harness.app)
        .get('/api/app/dashboard')
        .set('Cookie', sessionCookieFrom(signin.headers));

      expect(response.status).toBe(200);
    });

    /*
     * ======================================================================
     * NOTHING ABOUT THE IDENTITY MAY COME FROM THE BODY
     * ======================================================================
     *
     * The schema is strict and has exactly one field. A body offering an email, a
     * subject id or `emailVerified` is a body offering to tell us who it is, and it is
     * rejected as unreadable rather than half-read.
     * ======================================================================
     */
    it('refuses a body that supplies its own identity claims', async () => {
      harness.identityVerifier.setIdentity(buildGoogleIdentity());

      for (const extra of [
        { email: 'admin@jobforge.example' },
        { emailVerified: true },
        { subject: 'anything' },
        { role: 'admin' },
      ]) {
        const response = await post('/api/auth/google').send({
          credential: 'a-google-id-token',
          ...extra,
        });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('MALFORMED_REQUEST');
      }

      expect(harness.auth.users).toHaveLength(0);
    });

    it('answers 401 for a credential that does not verify', async () => {
      harness.identityVerifier.setFailure('bad-signature');

      const response = await post('/api/auth/google').send({ credential: 'forged' });

      expect(response.status).toBe(401);
      // No internal detail about which check failed.
      expect(response.body.error.message).not.toMatch(/signature|audience|issuer|jwks/i);
    });

    it('answers 403 when Google will not vouch for the address', async () => {
      harness.identityVerifier.setIdentity(buildGoogleIdentity({ emailVerified: false }));

      const response = await post('/api/auth/google').send({ credential: 'a-google-id-token' });

      expect(response.status).toBe(403);
      expect(harness.auth.users).toHaveLength(0);
    });

    /*
     * The development state the brief requires: the button is rendered, clicking it
     * produces a clear message, and nothing crashes.
     */
    it('answers 503 with an instruction when Google is not configured', async () => {
      const unconfigured = createPlatformHarness({ googleClientId: undefined });

      const response = await request(unconfigured.app)
        .post('/api/auth/google')
        .set('Origin', TEST_ORIGIN)
        .send({ credential: 'a-google-id-token' });

      expect(response.status).toBe(503);
      expect(response.body.error.message).toMatch(/not configured/i);
      expect(response.body.error.message).toMatch(/email address and password/i);
    });

    it('never leaks a stack trace or a secret in any failure', async () => {
      harness.identityVerifier.setFailure('wrong-audience');
      const response = await post('/api/auth/google').send({ credential: 'forged' });

      const serialised = JSON.stringify(response.body);
      expect(serialised).not.toMatch(/at .*\.ts:\d+/);
      expect(serialised).not.toContain('client_secret');
      expect(serialised).not.toContain('test-client-id');
    });
  });

  describe('email verification over HTTP', () => {
    it('verifies with the token from the email', async () => {
      const signup = await post('/api/auth/signup').send(SIGNUP);
      const cookie = sessionCookieFrom(signup.headers);

      const message = harness.email.sent.find((m) => m.subject === 'Confirm your email address');
      const token = decodeURIComponent(/token=([^\s&]+)/.exec(message?.text ?? '')?.[1] ?? '');

      const response = await post('/api/auth/verify-email').send({ token });
      expect(response.status).toBe(200);
      expect(response.body.data.user.emailVerified).toBe(true);

      const me = await request(harness.app).get('/api/auth/me').set('Cookie', cookie);
      expect(me.body.data.user.emailVerified).toBe(true);
    });

    it('answers 400 for a token that is not real', async () => {
      const response = await post('/api/auth/verify-email').send({ token: 'not-a-token' });
      expect(response.status).toBe(400);
    });
  });

  describe('password reset over HTTP', () => {
    it('answers 202 whether or not the address exists', async () => {
      await post('/api/auth/signup').send(SIGNUP);

      const known = await post('/api/auth/password-reset').send({ email: SIGNUP.email });
      const unknown = await post('/api/auth/password-reset').send({
        email: 'nobody@example.com',
      });

      expect(known.status).toBe(202);
      expect(unknown.status).toBe(202);
      expect(known.body.data.message).toBe(unknown.body.data.message);
    });

    /*
     * ======================================================================
     * THE PER-ADDRESS BUDGET
     * ======================================================================
     *
     * The per-IP limiter stops one connection making a hundred requests. It does nothing
     * about a hundred connections making one each for the same address, and the product
     * of *that* is a hundred reset emails in somebody's inbox — a real harm even though
     * nothing is breached, because the genuine link is then lost among the decoys.
     *
     * Two things are pinned here: the emails stop, and the *answer* does not change. A
     * 429 on this endpoint would tell an attacker that the address they are hammering is
     * worth hammering, which is the one thing the whole flow refuses to say.
     */
    it('stops flooding one address with reset emails, without saying so', async () => {
      const limited = createPlatformHarness({
        rateLimitEnabled: true,
        env: { PASSWORD_RESET_RATE_LIMIT_MAX: '2' },
      });
      const send = (email: string) =>
        request(limited.app)
          .post('/api/auth/password-reset')
          .set('Origin', TEST_ORIGIN)
          .send({ email });

      await request(limited.app).post('/api/auth/signup').set('Origin', TEST_ORIGIN).send(SIGNUP);

      const countResets = () =>
        limited.email.sent.filter((m) => m.subject === 'Reset your password').length;

      await send(SIGNUP.email);
      await send(SIGNUP.email);
      expect(countResets()).toBe(2);

      const blocked = await send(SIGNUP.email);

      // Same status and same sentence as a request that went through.
      expect(blocked.status).toBe(202);
      expect(blocked.body.data.message).toContain('If that address has an account');
      // And no third email.
      expect(countResets()).toBe(2);
    });

    /* The budget is per address, so one flooded mailbox cannot lock everybody else out. */
    it('does not let one address exhaust the budget for another', async () => {
      const limited = createPlatformHarness({
        rateLimitEnabled: true,
        env: { PASSWORD_RESET_RATE_LIMIT_MAX: '1' },
      });
      const send = (email: string) =>
        request(limited.app)
          .post('/api/auth/password-reset')
          .set('Origin', TEST_ORIGIN)
          .send({ email });

      for (const email of ['dana@cascadeheating.example', 'sam@example.com']) {
        await request(limited.app)
          .post('/api/auth/signup')
          .set('Origin', TEST_ORIGIN)
          .send({ ...SIGNUP, email });
      }

      await send('dana@cascadeheating.example');
      await send('dana@cascadeheating.example');
      await send('sam@example.com');

      const to = (address: string) =>
        limited.email.sent.filter((m) => m.subject === 'Reset your password' && m.to === address)
          .length;

      expect(to('dana@cascadeheating.example')).toBe(1);
      expect(to('sam@example.com')).toBe(1);
    });

    /* Same address, different capitalisation, same bucket — or the limit is decorative. */
    it('counts one address however it is capitalised', async () => {
      const limited = createPlatformHarness({
        rateLimitEnabled: true,
        env: { PASSWORD_RESET_RATE_LIMIT_MAX: '1' },
      });
      const send = (email: string) =>
        request(limited.app)
          .post('/api/auth/password-reset')
          .set('Origin', TEST_ORIGIN)
          .send({ email });

      await request(limited.app).post('/api/auth/signup').set('Origin', TEST_ORIGIN).send(SIGNUP);

      await send('dana@cascadeheating.example');
      await send('DANA@CascadeHeating.Example');

      expect(limited.email.sent.filter((m) => m.subject === 'Reset your password').length).toBe(1);
    });

    it('does not sign anybody in on a completed reset', async () => {
      await post('/api/auth/signup').send(SIGNUP);
      await post('/api/auth/password-reset').send({ email: SIGNUP.email });

      const message = harness.email.sent.find((m) => m.subject === 'Reset your password');
      const token = decodeURIComponent(/token=([^\s&]+)/.exec(message?.text ?? '')?.[1] ?? '');

      const response = await post('/api/auth/password-reset/confirm').send({
        token,
        password: 'a-completely-different-passphrase',
      });

      expect(response.status).toBe(200);
      // A reset link is not a credential. They sign in with the new password.
      const setCookie = (response.headers['set-cookie'] as unknown as string[] | undefined) ?? [];
      expect(setCookie.some((c) => /jobforge_session=[^;]+/.test(c) && !/=;/.test(c))).toBe(false);
    });
  });
});
