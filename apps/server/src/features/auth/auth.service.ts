import { AppError } from '../../lib/appError.js';
import { describeError, redactEmail, type Logger } from '../../lib/logger.js';
import type { EmailService } from '../../infrastructure/email/email.service.js';
import { noopActivityRecorder, type ActivityRecorder } from '../activity/index.js';
import {
  buildNewAccountEmail,
  buildPasswordResetEmail,
  buildVerifyEmailEmail,
  buildWelcomeEmail,
} from './auth.email.js';
import type { AuthRepository } from './auth.repository.js';
import {
  hashPassword,
  needsRehash,
  simulateVerification,
  verifyPassword,
} from './auth.password.js';
import { createToken, hashToken } from './auth.tokens.js';
import {
  SESSION_TOUCH_INTERVAL_MS,
  SESSION_TTL_MS,
  TOKEN_TTL_MS,
  type StoredUser,
  type TokenPurpose,
} from './auth.types.js';
import type { IdentityVerifier, VerifiedIdentity } from './providers/identity.provider.js';
import { IdentityVerificationError } from './providers/identity.provider.js';

/**
 * What a successful authentication produces: the account, and the raw session token
 * that the transport turns into a cookie. The token exists only in this return value
 * and in the browser — storage holds a digest of it.
 */
export interface AuthSession {
  readonly user: StoredUser;
  readonly token: string;
  readonly expiresAt: Date;
}

export interface SignupInput {
  readonly email: string;
  readonly name: string;
  readonly password: string;
  readonly businessName?: string | undefined;
}

export interface AuthService {
  signup(input: SignupInput): Promise<AuthSession>;
  login(input: { readonly email: string; readonly password: string }): Promise<AuthSession>;
  /**
   * Exchanges a provider credential for a session, creating or linking an account as
   * the linking policy allows. The credential is verified here; nothing about the
   * identity is ever taken from the request body.
   */
  continueWithProvider(credential: string): Promise<AuthSession>;
  logout(token: string): Promise<void>;
  /** Resolves a cookie to its account, extending the rolling window. Null when invalid. */
  resolveSession(token: string): Promise<StoredUser | null>;
  /** Always resolves, whether or not the address is registered. See the implementation. */
  requestPasswordReset(email: string): Promise<void>;
  resetPassword(input: { readonly token: string; readonly password: string }): Promise<void>;
  requestEmailVerification(user: StoredUser): Promise<void>;
  verifyEmail(token: string): Promise<StoredUser>;
  updateProfile(
    userId: string,
    input: { readonly name?: string; readonly businessName?: string },
  ): Promise<StoredUser>;
  /**
   * Ends every session, including the one that made the request, and returns a fresh
   * one. Revoking everything is the point of a password change; signing the person who
   * just did it out of their own browser is not, so they get a new cookie.
   */
  changePassword(input: {
    readonly userId: string;
    readonly currentPassword: string;
    readonly newPassword: string;
  }): Promise<AuthSession>;
}

export interface AuthServiceDependencies {
  readonly repository: AuthRepository;
  /** Undefined when no provider is configured; the Google route then answers 503. */
  readonly identityVerifier: IdentityVerifier | undefined;
  readonly emailService: EmailService;
  /** Public origin, for the links inside verification and reset emails. */
  readonly siteUrl: string;
  /**
   * Where `account.created` is written — the first entry in every customer's history.
   *
   * Optional, defaulting to a recorder that does nothing, for the same reason billing's
   * fulfilment port is optional: this service's own tests are about sessions, hashes and
   * the account-linking rules, and requiring the dependency would have meant editing every
   * one of them to hand over a stub they never assert on.
   *
   * The cost of that default is worth stating plainly, because it is the failure mode: a
   * composition root that forgets to pass the real recorder produces no error, no warning
   * and no missing feature anybody notices — just a history whose first line is whatever
   * the customer did second.
   */
  readonly activity?: ActivityRecorder | undefined;
  /**
   * Where the owner is told a new account exists. `CONTACT_NOTIFICATION_EMAIL`.
   *
   * Undefined switches the notification off silently, exactly as it does for leads and
   * assessments — an account is still created and nothing fails. The cost of that default is
   * the same as the one the activity recorder's note warns about, so it is stated here too:
   * a deployment with no notification address captures prospects nobody is told about, and
   * the only trace is a `warn` at boot. See `createEmailService` in `app/app.ts`.
   */
  readonly notificationRecipient?: string | undefined;
  readonly logger: Logger;
  /** Injected by tests. */
  readonly now?: () => Date;
}

/**
 * One sentence for every way a sign-in can fail.
 *
 * Wrong password, no such account, and an account that only has Google all answer this.
 * A message that distinguished them would be a working account-enumeration oracle, and
 * the person who genuinely mistyped their password is not helped by the difference.
 */
const SIGN_IN_FAILED = 'That email address and password do not match an account.';

const MONGO_DUPLICATE_KEY = 11000;

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: number }).code === MONGO_DUPLICATE_KEY
  );
}

/**
 * ============================================================================
 * ACCOUNT LINKING
 * ============================================================================
 *
 * Somebody signs in with Google and an account already exists for that address. Three
 * cases, and the middle one is the one that gets applications compromised.
 *
 * 1. **Google says the address is not verified.** Refused outright. An unverified
 *    provider email is an address the provider will not vouch for; accepting it would
 *    let anybody who can set an arbitrary email on a Google account claim any JobForge
 *    account by typing the address in.
 *
 * 2. **The existing account's own address is not verified.** This is the pre-hijack
 *    attack: somebody registers `victim@example.com` with a password, waits, and the
 *    real owner later arrives through Google. Linking naively would hand the attacker a
 *    live password into the victim's account.
 *
 *    So the link happens — Google has *proven* the address, and the person in front of
 *    us is its owner — but the password on that account is **removed** and every
 *    existing session is **revoked**. The attacker's credential stops working; the
 *    rightful owner keeps the account and can set a password through the reset flow if
 *    they want one. Nothing is silently trusted and nothing is destroyed.
 *
 * 3. **The existing account is verified.** Straightforward link: the same human has
 *    proven the same mailbox twice, by two mechanisms. Sign them in.
 *
 * The subject id is what a returning Google user is matched on, never the email —
 * addresses get reassigned inside Google Workspace domains, subject ids do not.
 * ============================================================================
 */
export function createAuthService(dependencies: AuthServiceDependencies): AuthService {
  const { repository, identityVerifier, emailService, siteUrl, logger } = dependencies;
  const now = dependencies.now ?? (() => new Date());
  const activity = dependencies.activity ?? noopActivityRecorder;
  const notificationRecipient = dependencies.notificationRecipient;

  /** Notification failures never fail the operation that caused them. */
  async function send(message: Parameters<EmailService['send']>[0]): Promise<void> {
    try {
      await emailService.send(message);
    } catch (error) {
      logger.error('auth.email_failed', { subject: message.subject, ...describeError(error) });
    }
  }

  async function issueSession(user: StoredUser): Promise<AuthSession> {
    const token = createToken();
    const expiresAt = new Date(now().getTime() + SESSION_TTL_MS);

    await repository.createSession({ tokenHash: hashToken(token), userId: user.id, expiresAt });
    await repository.updateUser(user.id, { lastLoginAt: now() });

    return { user, token, expiresAt };
  }

  async function issueOneTimeToken(userId: string, purpose: TokenPurpose): Promise<string> {
    const token = createToken();
    await repository.createAuthToken({
      tokenHash: hashToken(token),
      userId,
      purpose,
      expiresAt: new Date(now().getTime() + TOKEN_TTL_MS[purpose]),
    });
    return token;
  }

  async function sendVerification(user: StoredUser): Promise<void> {
    if (user.emailVerified) return;
    const token = await issueOneTimeToken(user.id, 'email-verification');
    await send(buildVerifyEmailEmail({ user, token, siteUrl }));
  }

  /**
   * Tells the owner an account exists. Called from both branches that create one.
   *
   * Best-effort through `send`, so a Resend outage cannot fail a signup — the same trade
   * `lead.service.ts` makes and for the same reason: the record is the asset. The cost is
   * that a missed notification is silent to everybody, which is survivable here in a way it
   * is not for a lead, because the account is on the console's Accounts table either way.
   */
  async function notifyOwnerOfNewAccount(
    user: StoredUser,
    method: 'password' | 'Google',
  ): Promise<void> {
    if (!notificationRecipient) {
      logger.warn('auth.new_account_notification_skipped_no_recipient', { userId: user.id });
      return;
    }

    await send(buildNewAccountEmail({ user, recipient: notificationRecipient, method }));
  }

  return {
    async signup(input) {
      const email = input.email.trim().toLowerCase();
      const passwordHash = await hashPassword(input.password);

      let user: StoredUser;
      try {
        user = await repository.createUser({
          email,
          name: input.name,
          businessName: input.businessName,
          /*
           * Never from the request. There is no route that sets a role, and the signup
           * schema has no field for one to be stripped from — see `auth.schema.ts`.
           */
          role: 'customer',
          emailVerified: false,
          passwordHash,
          identities: [],
        });
      } catch (error) {
        if (isDuplicateKeyError(error)) {
          /*
           * The address is taken. This *is* an enumeration signal, and it is
           * unavoidable: a signup form has to tell somebody their address is already
           * registered or it cannot be used. The mitigation is that the message points
           * at signing in rather than confirming anything about the account, and that
           * the endpoint is rate limited.
           */
          throw new AppError(
            'CONFLICT',
            'An account already exists for that email address. Sign in instead, or reset your password.',
          );
        }
        throw error;
      }

      logger.info('auth.signup', { userId: user.id, email: redactEmail(user.email) });

      /*
       * Written before the two emails, and the order is the point: `record` cannot throw
       * and the emails are already best-effort, so putting the history entry first means
       * the stream is correct even for the customer whose welcome email bounced. There are
       * two ways an account comes into existence — this one and Google below — and both
       * write this entry, because a history that starts at the second thing somebody did
       * is a history that looks like it lost the first.
       */
      await activity.record({
        type: 'account.created',
        summary: 'You created your JobForge account.',
        audience: 'customer',
        userId: user.id,
      });

      await sendVerification(user);
      await send(buildWelcomeEmail({ user, siteUrl }));
      await notifyOwnerOfNewAccount(user, 'password');

      return issueSession(user);
    },

    async login({ email, password }) {
      const user = await repository.findUserByEmail(email);

      if (!user?.passwordHash) {
        /*
         * Either no such account, or a Google-only account with no password set. Both
         * burn the same CPU a real verification would, so the two cannot be told apart
         * by timing, and both answer the same sentence.
         */
        await simulateVerification(password);
        throw new AppError('UNAUTHENTICATED', SIGN_IN_FAILED);
      }

      if (!(await verifyPassword(password, user.passwordHash))) {
        logger.warn('auth.login_failed', { email: redactEmail(user.email) });
        throw new AppError('UNAUTHENTICATED', SIGN_IN_FAILED);
      }

      // Cost parameters can be raised later; this is where old hashes catch up, on the
      // one request that legitimately holds the plaintext.
      if (needsRehash(user.passwordHash)) {
        await repository.updateUser(user.id, { passwordHash: await hashPassword(password) });
      }

      logger.info('auth.login', { userId: user.id });
      return issueSession(user);
    },

    async continueWithProvider(credential) {
      if (!identityVerifier) {
        throw new AppError(
          'SERVICE_UNAVAILABLE',
          'Google sign-in is not configured on this deployment yet. Use your email address and password.',
        );
      }

      let identity: VerifiedIdentity;
      try {
        identity = await identityVerifier.verify(credential);
      } catch (error) {
        if (error instanceof IdentityVerificationError) {
          /*
           * The reason is logged and the visitor gets one sentence. Which claim failed
           * is useful to us and is a probing oracle to anybody feeding us tokens.
           */
          logger.warn('auth.provider_credential_rejected', { reason: error.reason });

          if (error.reason === 'not-configured') {
            throw new AppError(
              'SERVICE_UNAVAILABLE',
              'Google sign-in is not configured on this deployment yet. Use your email address and password.',
            );
          }
          if (error.reason === 'unavailable') {
            throw new AppError(
              'SERVICE_UNAVAILABLE',
              'We could not reach Google to check that sign-in. Please try again in a moment.',
            );
          }
          throw new AppError(
            'UNAUTHENTICATED',
            'We could not verify that Google sign-in. Please try again.',
          );
        }
        throw error;
      }

      /* ---- case 1: Google will not vouch for the address ---- */
      if (!identity.emailVerified) {
        logger.warn('auth.provider_email_unverified', { provider: identity.provider });
        throw new AppError(
          'FORBIDDEN',
          'Google has not verified the email address on that account, so it cannot be used to sign in here. Verify it with Google, or use your email address and password.',
        );
      }

      /* ---- a returning provider user, matched on the subject id ---- */
      const byIdentity = await repository.findUserByIdentity(identity.provider, identity.subject);
      if (byIdentity) {
        logger.info('auth.provider_login', { userId: byIdentity.id, provider: identity.provider });
        return issueSession(byIdentity);
      }

      const byEmail = await repository.findUserByEmail(identity.email);

      /* ---- cases 2 and 3: an account already exists for this address ---- */
      if (byEmail) {
        const linked = await repository.linkIdentity(byEmail.id, {
          provider: identity.provider,
          subject: identity.subject,
          email: identity.email,
          linkedAt: now(),
        });

        if (!linked) {
          throw new AppError('INTERNAL_ERROR', 'That account could not be linked.');
        }

        if (byEmail.emailVerified) {
          logger.info('auth.provider_linked', { userId: linked.id, provider: identity.provider });
          return issueSession(linked);
        }

        /*
         * Case 2. Google proved the mailbox; the existing account never did. The
         * password on it was set by somebody who may not be this person, so it goes,
         * along with every session it opened. See the block comment above.
         */
        const secured = await repository.updateUser(linked.id, {
          emailVerified: true,
          passwordHash: null,
        });
        await repository.deleteSessionsForUser(linked.id);

        logger.warn('auth.provider_linked_unverified_account', {
          userId: linked.id,
          provider: identity.provider,
          detail: 'password cleared and sessions revoked: the address was never verified locally',
        });

        return issueSession(secured ?? linked);
      }

      /* ---- a new person ---- */
      let created: StoredUser;
      try {
        created = await repository.createUser({
          email: identity.email,
          name: identity.name?.trim() || identity.email.split('@')[0] || 'there',
          role: 'customer',
          // Google verified it. That is exactly what `emailVerified` means.
          emailVerified: true,
          identities: [
            {
              provider: identity.provider,
              subject: identity.subject,
              email: identity.email,
              linkedAt: now(),
            },
          ],
        });
      } catch (error) {
        /*
         * Two simultaneous first-time Google sign-ins for one address. The unique index
         * refused the second; retry the lookup and use whichever won rather than
         * showing a duplicate-key error to somebody who did nothing wrong.
         */
        if (isDuplicateKeyError(error)) {
          const existing = await repository.findUserByIdentity(identity.provider, identity.subject);
          if (existing) return issueSession(existing);
        }
        throw error;
      }

      logger.info('auth.provider_signup', { userId: created.id, provider: identity.provider });

      /*
       * The same entry as `signup`, and only on this branch. The two linking cases above
       * return before here because linking Google to an account that already exists creates
       * nothing — writing "you created your account" for somebody's fourth sign-in would be
       * false, and it is the kind of false that only shows up months later in a support
       * conversation about which of two accounts is theirs.
       *
       * "Google" is written out rather than interpolated from `identity.provider`: that
       * field is a lowercase wire value with exactly one member today, and `google` in the
       * middle of a customer-facing sentence reads as a bug. A second provider means a
       * second sentence here, deliberately.
       */
      await activity.record({
        type: 'account.created',
        summary: 'You created your JobForge account with Google.',
        audience: 'customer',
        userId: created.id,
      });

      await send(buildWelcomeEmail({ user: created, siteUrl }));
      /* Only on this branch, for the same reason `account.created` is only on this branch:
       * the two linking cases above return before here because linking Google to an account
       * that already exists creates nothing to tell anybody about. */
      await notifyOwnerOfNewAccount(created, 'Google');

      return issueSession(created);
    },

    async logout(token) {
      // Idempotent: signing out twice, or with a token that already expired, is fine.
      await repository.deleteSession(hashToken(token));
    },

    async resolveSession(token) {
      if (!token) return null;

      const tokenHash = hashToken(token);
      const session = await repository.findSessionByTokenHash(tokenHash);
      if (!session) return null;

      const current = now();

      /*
       * Checked here as well as by the TTL index. The index sweeps roughly once a
       * minute, and "usually deleted by now" is not an authentication guarantee.
       */
      if (session.expiresAt.getTime() <= current.getTime()) {
        await repository.deleteSession(tokenHash);
        return null;
      }

      const user = await repository.findUserById(session.userId);
      if (!user) {
        // The account went away underneath the session. Take the session with it.
        await repository.deleteSession(tokenHash);
        return null;
      }

      /*
       * Rolling expiry, written at most once an hour per session. Without the interval
       * every authenticated request would be a database write; with it the window is
       * still accurate to within an hour, which is what a thirty-day session needs.
       */
      if (current.getTime() - session.lastUsedAt.getTime() > SESSION_TOUCH_INTERVAL_MS) {
        await repository.touchSession(tokenHash, new Date(current.getTime() + SESSION_TTL_MS));
      }

      return user;
    },

    async requestPasswordReset(email) {
      const user = await repository.findUserByEmail(email);

      /*
       * Resolves either way, and the route answers the same thing either way. A reset
       * form that says "no account with that address" is a membership oracle anybody
       * can query, and the person who mistyped their own address is not helped by it.
       */
      if (!user) {
        logger.info('auth.password_reset_unknown_address');
        return;
      }

      // One live link at a time: requesting a second invalidates the first.
      await repository.deleteAuthTokens(user.id, 'password-reset');
      const token = await issueOneTimeToken(user.id, 'password-reset');

      logger.info('auth.password_reset_requested', { userId: user.id });
      await send(buildPasswordResetEmail({ user, token, siteUrl }));
    },

    async resetPassword({ token, password }) {
      const record = await repository.consumeAuthToken(hashToken(token), 'password-reset');

      if (!record || record.expiresAt.getTime() <= now().getTime()) {
        throw new AppError(
          'VALIDATION_ERROR',
          'That reset link has expired or has already been used. Please request a new one.',
        );
      }

      await repository.updateUser(record.userId, {
        passwordHash: await hashPassword(password),
        /*
         * Completing a reset proves control of the mailbox, which is the same thing the
         * verification email proves. Not marking it verified here would leave somebody
         * who reset their password still nagged to verify an address they just used.
         */
        emailVerified: true,
      });

      /*
       * Every other session ends. A password reset is what somebody does when they
       * think their account is compromised, and leaving the attacker's cookie working
       * would make the reset theatre.
       */
      await repository.deleteSessionsForUser(record.userId);

      logger.info('auth.password_reset_completed', { userId: record.userId });
    },

    requestEmailVerification: sendVerification,

    async verifyEmail(token) {
      const record = await repository.consumeAuthToken(hashToken(token), 'email-verification');

      if (!record || record.expiresAt.getTime() <= now().getTime()) {
        throw new AppError(
          'VALIDATION_ERROR',
          'That verification link has expired or has already been used. Sign in and ask for a new one.',
        );
      }

      const user = await repository.updateUser(record.userId, { emailVerified: true });
      if (!user) throw new AppError('NOT_FOUND', 'That account no longer exists.');

      logger.info('auth.email_verified', { userId: user.id });
      return user;
    },

    async updateProfile(userId, input) {
      const user = await repository.updateUser(userId, {
        ...(input.name === undefined ? {} : { name: input.name }),
        ...(input.businessName === undefined ? {} : { businessName: input.businessName }),
      });
      if (!user) throw new AppError('NOT_FOUND', 'That account no longer exists.');
      return user;
    },

    async changePassword({ userId, currentPassword, newPassword }) {
      const user = await repository.findUserById(userId);
      if (!user) throw new AppError('NOT_FOUND', 'That account no longer exists.');

      /*
       * A Google-only account has no current password to check. Sending them through
       * the reset flow proves control of the mailbox before a password exists, which is
       * the same bar every other password on the system had to clear.
       */
      if (!user.passwordHash) {
        throw new AppError(
          'VALIDATION_ERROR',
          'This account signs in with Google and has no password yet. Use "Forgot password" to set one.',
        );
      }

      if (!(await verifyPassword(currentPassword, user.passwordHash))) {
        throw new AppError('UNAUTHENTICATED', 'That current password is not right.');
      }

      const updated = await repository.updateUser(userId, {
        passwordHash: await hashPassword(newPassword),
      });
      await repository.deleteSessionsForUser(userId);

      logger.info('auth.password_changed', { userId });

      return issueSession(updated ?? user);
    },
  };
}
