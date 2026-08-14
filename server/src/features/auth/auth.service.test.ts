import { beforeEach, describe, expect, it } from 'vitest';
import { silentLogger } from '../../lib/logger.js';
import { isAppError } from '../../lib/appError.js';
import {
  buildGoogleIdentity,
  createInMemoryAuthRepository,
  createStubIdentityVerifier,
  type InMemoryAuthRepository,
  type StubIdentityVerifier,
} from '../../testing/authFakes.js';
import { createRecordingEmailService, type RecordingEmailService } from '../../testing/fakes.js';
import { createAuthService, type AuthService } from './auth.service.js';
import { hashToken } from './tokens.js';
import { SESSION_TTL_MS } from './auth.types.js';

/*
 * The authentication rules, against the repository interface. No MongoDB, no Google.
 *
 * The Google half stubs the *verifier* rather than the transport: `google.verifier.test.ts`
 * feeds the real one real tokens. Everything here is entitled to assume an identity has
 * already been proven, which is what lets the account-linking policy — the part that
 * actually gets applications compromised — be tested exhaustively.
 */

const PASSWORD = 'a-long-enough-passphrase';

describe('the auth service', () => {
  let repository: InMemoryAuthRepository;
  let emailService: RecordingEmailService;
  let verifier: StubIdentityVerifier;
  let service: AuthService;
  let clock: Date;

  beforeEach(() => {
    repository = createInMemoryAuthRepository({ now: () => clock });
    emailService = createRecordingEmailService();
    verifier = createStubIdentityVerifier();
    clock = new Date('2026-08-13T12:00:00.000Z');

    service = createAuthService({
      repository,
      identityVerifier: verifier,
      emailService,
      siteUrl: 'https://jobforge.example',
      logger: silentLogger,
      now: () => clock,
    });
  });

  async function signup(email = 'dana@cascadeheating.example') {
    return service.signup({ email, name: 'Dana Reyes', password: PASSWORD });
  }

  /** The raw token out of the most recent email of a given kind. */
  function tokenFromEmail(subjectMatch: RegExp): string {
    const message = [...emailService.sent]
      .reverse()
      .find((sent) => subjectMatch.test(sent.subject));
    expect(message, `no email matching ${subjectMatch}`).toBeDefined();
    const found = /token=([^\s&]+)/.exec(message?.text ?? '')?.[1];
    expect(found, 'no token in the email body').toBeTruthy();
    return decodeURIComponent(found as string);
  }

  describe('signup', () => {
    it('creates a customer, a session, and never an admin', async () => {
      const session = await signup();

      expect(session.user.email).toBe('dana@cascadeheating.example');
      // The only role signup can produce. There is no field for a body to smuggle one in.
      expect(session.user.role).toBe('customer');
      expect(session.user.emailVerified).toBe(false);
      expect(session.token).toHaveLength(43);
      expect(session.expiresAt.getTime()).toBe(clock.getTime() + SESSION_TTL_MS);
    });

    it('lowercases the address, so one person cannot hold two accounts by casing', async () => {
      await service.signup({
        email: 'Dana@Cascadeheating.Example',
        name: 'Dana',
        password: PASSWORD,
      });

      await expect(signup()).rejects.toSatisfy(
        (error: unknown) => isAppError(error) && error.code === 'CONFLICT',
      );
    });

    it('never stores the password itself', async () => {
      await signup();
      const stored = repository.users[0];

      expect(stored?.passwordHash).toBeDefined();
      expect(stored?.passwordHash).not.toContain(PASSWORD);
      expect(stored?.passwordHash).toMatch(/^scrypt\$/);
    });

    it('sends a verification email and a welcome email', async () => {
      await signup();
      const subjects = emailService.sent.map((message) => message.subject);

      expect(subjects).toContain('Confirm your email address');
      expect(subjects).toContain('Your JobForge account is ready');
    });

    it('refuses a second account on the same address', async () => {
      await signup();
      await expect(signup()).rejects.toThrow(/already exists/i);
    });
  });

  describe('login', () => {
    it('accepts the right password', async () => {
      await signup();
      const session = await service.login({
        email: 'dana@cascadeheating.example',
        password: PASSWORD,
      });

      expect(session.user.email).toBe('dana@cascadeheating.example');
      expect(session.token).toBeTruthy();
    });

    it('rejects the wrong password', async () => {
      await signup();
      await expect(
        service.login({ email: 'dana@cascadeheating.example', password: 'not-the-password' }),
      ).rejects.toThrow(/do not match an account/i);
    });

    /*
     * The enumeration guard. Both answers have to be the same sentence, or the login
     * form becomes a way to ask whether an address is registered here.
     */
    it('answers a missing account exactly as it answers a wrong password', async () => {
      await signup();

      const wrongPassword = await service
        .login({ email: 'dana@cascadeheating.example', password: 'wrong' })
        .catch((error: unknown) => error);
      const noSuchAccount = await service
        .login({ email: 'nobody@example.com', password: PASSWORD })
        .catch((error: unknown) => error);

      expect((wrongPassword as Error).message).toBe((noSuchAccount as Error).message);
      expect(isAppError(wrongPassword) && wrongPassword.code).toBe('UNAUTHENTICATED');
      expect(isAppError(noSuchAccount) && noSuchAccount.code).toBe('UNAUTHENTICATED');
    });

    /*
     * A Google-only account has no password. Saying "wrong password" is the correct
     * answer: saying "this account uses Google" would confirm the address is registered.
     */
    it('answers the same for an account that has only ever used Google', async () => {
      verifier.setIdentity(buildGoogleIdentity());
      await service.continueWithProvider('credential');

      await expect(
        service.login({ email: 'dana@cascadeheating.example', password: PASSWORD }),
      ).rejects.toThrow(/do not match an account/i);
    });
  });

  describe('sessions', () => {
    it('resolves a valid token to its account', async () => {
      const { token, user } = await signup();
      const resolved = await service.resolveSession(token);

      expect(resolved?.id).toBe(user.id);
    });

    it('refuses a token that was never issued', async () => {
      await signup();
      expect(await service.resolveSession('not-a-real-token')).toBeNull();
    });

    it('refuses an expired session, and deletes it', async () => {
      const { token } = await signup();

      clock = new Date(clock.getTime() + SESSION_TTL_MS + 1000);

      expect(await service.resolveSession(token)).toBeNull();
      expect(repository.sessions.has(hashToken(token))).toBe(false);
    });

    it('extends a rolling session once it is older than the touch interval', async () => {
      const { token } = await signup();
      const before = repository.sessions.get(hashToken(token))?.expiresAt.getTime();

      clock = new Date(clock.getTime() + 2 * 60 * 60 * 1000);
      await service.resolveSession(token);

      const after = repository.sessions.get(hashToken(token))?.expiresAt.getTime();
      expect(after).toBeGreaterThan(before ?? 0);
    });

    it('signs out, and the token stops working', async () => {
      const { token } = await signup();
      await service.logout(token);

      expect(await service.resolveSession(token)).toBeNull();
    });

    it('signs out twice without complaining', async () => {
      const { token } = await signup();
      await service.logout(token);
      await expect(service.logout(token)).resolves.toBeUndefined();
    });

    it('stores only a digest of the token, never the token', async () => {
      const { token } = await signup();

      expect(repository.sessions.has(token)).toBe(false);
      expect(repository.sessions.has(hashToken(token))).toBe(true);
    });
  });

  describe('continuing with Google', () => {
    it('creates an account for somebody new, already verified', async () => {
      verifier.setIdentity(buildGoogleIdentity());
      const session = await service.continueWithProvider('credential');

      expect(session.user.email).toBe('dana@cascadeheating.example');
      expect(session.user.emailVerified).toBe(true);
      expect(session.user.role).toBe('customer');
      expect(session.user.passwordHash).toBeUndefined();
      expect(repository.users).toHaveLength(1);
    });

    it('signs a returning Google user in without creating a second account', async () => {
      verifier.setIdentity(buildGoogleIdentity());
      await service.continueWithProvider('credential');
      await service.continueWithProvider('credential');

      expect(repository.users).toHaveLength(1);
    });

    /*
     * Matching on the subject id rather than the email is what makes this correct.
     * Addresses get reassigned inside a Workspace domain; subject ids do not.
     */
    it('follows the subject id when the Google account changes its address', async () => {
      verifier.setIdentity(buildGoogleIdentity());
      const first = await service.continueWithProvider('credential');

      verifier.setIdentity(buildGoogleIdentity({ email: 'dana@newdomain.example' }));
      const second = await service.continueWithProvider('credential');

      expect(second.user.id).toBe(first.user.id);
      expect(repository.users).toHaveLength(1);
    });

    it('refuses an identity Google will not vouch for', async () => {
      verifier.setIdentity(buildGoogleIdentity({ emailVerified: false }));

      const error = await service.continueWithProvider('credential').catch((e: unknown) => e);
      expect(isAppError(error) && error.code).toBe('FORBIDDEN');
      expect(repository.users).toHaveLength(0);
    });

    it('turns a rejected credential into one safe sentence', async () => {
      verifier.setFailure('bad-signature');

      const error = await service.continueWithProvider('credential').catch((e: unknown) => e);
      expect(isAppError(error) && error.code).toBe('UNAUTHENTICATED');
      // Which claim failed is useful to us and is an oracle to anybody feeding us tokens.
      expect((error as Error).message).not.toMatch(/signature|audience|issuer/i);
    });

    it('says so plainly when Google is not configured', async () => {
      const unconfigured = createAuthService({
        repository,
        identityVerifier: undefined,
        emailService,
        siteUrl: 'https://jobforge.example',
        logger: silentLogger,
        now: () => clock,
      });

      const error = await unconfigured.continueWithProvider('credential').catch((e: unknown) => e);
      expect(isAppError(error) && error.code).toBe('SERVICE_UNAVAILABLE');
      expect((error as Error).message).toMatch(/not configured/i);
    });
  });

  /*
   * ==========================================================================
   * ACCOUNT LINKING
   * ==========================================================================
   *
   * The three cases documented above `createAuthService`, and the middle one is the
   * pre-hijack attack: somebody registers the victim's address with a password, waits,
   * and the real owner later arrives through Google.
   * ==========================================================================
   */
  describe('account linking', () => {
    it('links Google to a verified existing account and signs them in', async () => {
      const { user } = await signup();
      await service.verifyEmail(tokenFromEmail(/confirm your email/i));

      verifier.setIdentity(buildGoogleIdentity());
      const session = await service.continueWithProvider('credential');

      expect(session.user.id).toBe(user.id);
      expect(repository.users).toHaveLength(1);
      expect(session.user.identities).toHaveLength(1);
      // The password still works: this is one person with two ways in.
      expect(session.user.passwordHash).toBeDefined();
    });

    it('never creates a second account for an address that already has one', async () => {
      await signup();

      verifier.setIdentity(buildGoogleIdentity());
      await service.continueWithProvider('credential');

      expect(repository.users).toHaveLength(1);
    });

    it('clears the password on an unverified account Google proves belongs to somebody', async () => {
      // The attacker registers the victim's address and never verifies it.
      const attacker = await signup();
      expect(attacker.user.emailVerified).toBe(false);

      // The real owner arrives through Google.
      verifier.setIdentity(buildGoogleIdentity());
      const session = await service.continueWithProvider('credential');

      expect(session.user.id).toBe(attacker.user.id);
      expect(session.user.emailVerified).toBe(true);
      // The credential the attacker set is gone.
      expect(repository.users[0]?.passwordHash).toBeUndefined();
    });

    it("revokes the attacker's sessions when it does", async () => {
      const attacker = await signup();
      expect(await service.resolveSession(attacker.token)).not.toBeNull();

      verifier.setIdentity(buildGoogleIdentity());
      await service.continueWithProvider('credential');

      // The cookie the attacker was holding no longer resolves to anything.
      expect(await service.resolveSession(attacker.token)).toBeNull();
    });

    it('leaves the rightful owner able to sign in with Google afterwards', async () => {
      await signup();
      verifier.setIdentity(buildGoogleIdentity());

      const first = await service.continueWithProvider('credential');
      const second = await service.continueWithProvider('credential');

      expect(second.user.id).toBe(first.user.id);
      expect(await service.resolveSession(second.token)).not.toBeNull();
    });
  });

  describe('email verification', () => {
    it('marks the address verified', async () => {
      const { user } = await signup();
      const verified = await service.verifyEmail(tokenFromEmail(/confirm your email/i));

      expect(verified.id).toBe(user.id);
      expect(verified.emailVerified).toBe(true);
    });

    it('refuses a token that has already been used', async () => {
      await signup();
      const token = tokenFromEmail(/confirm your email/i);
      await service.verifyEmail(token);

      await expect(service.verifyEmail(token)).rejects.toThrow(/expired or has already been used/i);
    });

    it('refuses an expired token', async () => {
      await signup();
      const token = tokenFromEmail(/confirm your email/i);

      clock = new Date(clock.getTime() + 25 * 60 * 60 * 1000);
      await expect(service.verifyEmail(token)).rejects.toThrow(/expired/i);
    });
  });

  describe('password reset', () => {
    it('emails a link to a registered address', async () => {
      await signup();
      emailService.sent.length = 0;

      await service.requestPasswordReset('dana@cascadeheating.example');
      expect(emailService.sent.map((m) => m.subject)).toContain('Reset your password');
    });

    /*
     * The membership oracle. A reset form that behaves differently for an unregistered
     * address is a way to ask whether somebody has an account here.
     */
    it('resolves silently for an address with no account', async () => {
      await expect(service.requestPasswordReset('nobody@example.com')).resolves.toBeUndefined();
      expect(emailService.sent).toHaveLength(0);
    });

    it('sets the new password and marks the address verified', async () => {
      await signup();
      await service.requestPasswordReset('dana@cascadeheating.example');

      await service.resetPassword({
        token: tokenFromEmail(/reset your password/i),
        password: 'a-completely-different-passphrase',
      });

      const session = await service.login({
        email: 'dana@cascadeheating.example',
        password: 'a-completely-different-passphrase',
      });
      expect(session.user.emailVerified).toBe(true);
    });

    it('ends every other session, so a stolen cookie stops working', async () => {
      const stolen = await signup();
      await service.requestPasswordReset('dana@cascadeheating.example');

      await service.resetPassword({
        token: tokenFromEmail(/reset your password/i),
        password: 'a-completely-different-passphrase',
      });

      expect(await service.resolveSession(stolen.token)).toBeNull();
    });

    it('refuses a reset link twice', async () => {
      await signup();
      await service.requestPasswordReset('dana@cascadeheating.example');
      const token = tokenFromEmail(/reset your password/i);

      await service.resetPassword({ token, password: 'a-completely-different-passphrase' });
      await expect(
        service.resetPassword({ token, password: 'another-passphrase-entirely' }),
      ).rejects.toThrow(/expired or has already been used/i);
    });

    it('invalidates an earlier link when a second is requested', async () => {
      await signup();
      await service.requestPasswordReset('dana@cascadeheating.example');
      const first = tokenFromEmail(/reset your password/i);

      await service.requestPasswordReset('dana@cascadeheating.example');

      await expect(
        service.resetPassword({ token: first, password: 'a-completely-different-passphrase' }),
      ).rejects.toThrow(/expired or has already been used/i);
    });

    it('refuses an expired link', async () => {
      await signup();
      await service.requestPasswordReset('dana@cascadeheating.example');
      const token = tokenFromEmail(/reset your password/i);

      clock = new Date(clock.getTime() + 2 * 60 * 60 * 1000);
      await expect(
        service.resetPassword({ token, password: 'a-completely-different-passphrase' }),
      ).rejects.toThrow(/expired/i);
    });
  });

  describe('changing a password', () => {
    it('requires the current one', async () => {
      const { user } = await signup();

      await expect(
        service.changePassword({
          userId: user.id,
          currentPassword: 'not-it',
          newPassword: 'a-completely-different-passphrase',
        }),
      ).rejects.toThrow(/not right/i);
    });

    it('ends every session and issues a fresh one', async () => {
      const original = await signup();

      const replacement = await service.changePassword({
        userId: original.user.id,
        currentPassword: PASSWORD,
        newPassword: 'a-completely-different-passphrase',
      });

      expect(await service.resolveSession(original.token)).toBeNull();
      expect(await service.resolveSession(replacement.token)).not.toBeNull();
    });

    it('sends a Google-only account to the reset flow instead', async () => {
      verifier.setIdentity(buildGoogleIdentity());
      const { user } = await service.continueWithProvider('credential');

      await expect(
        service.changePassword({
          userId: user.id,
          currentPassword: 'anything',
          newPassword: 'a-completely-different-passphrase',
        }),
      ).rejects.toThrow(/Forgot password/i);
    });
  });

  describe('authorization is not affected by how somebody signed in', () => {
    it('gives a Google account exactly the customer capabilities', async () => {
      verifier.setIdentity(buildGoogleIdentity());
      const google = await service.continueWithProvider('credential');

      const password = await signup('other@example.com');

      expect(google.user.role).toBe(password.user.role);
    });

    it('never infers staff from an email address', async () => {
      verifier.setIdentity(
        buildGoogleIdentity({ email: 'admin@jobforge.example', subject: 'google-admin' }),
      );
      const session = await service.continueWithProvider('credential');

      expect(session.user.role).toBe('customer');
    });
  });
});
