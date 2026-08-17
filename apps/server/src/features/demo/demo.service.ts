import { timingSafeEqual } from 'node:crypto';
import { AppError } from '../../lib/appError.js';
import type { Logger } from '../../lib/logger.js';
import type { AuthRepository, AuthService, AuthSession, StoredUser } from '../auth/index.js';
import type { ProjectRepository } from '../projects/project.repository.js';
import { seedDemoData, type DemoSeedDependencies } from './demo.seed.js';
import type { DemoRepository } from './demo.repository.js';
import {
  DEMO_BUSINESS,
  DEMO_EMAIL,
  DEMO_NAME,
  type NewDemoFeedbackRecord,
  type StoredDemoFeedback,
} from './demo.types.js';

/**
 * Constant-time comparison that does not leak the configured length either.
 *
 * `timingSafeEqual` throws on differing lengths, so the naive wrapper answers instantly for a
 * wrong-length guess and slowly for a right-length one — which tells an attacker the length in
 * one request. Hashing both sides to a fixed width first removes that: every comparison is over
 * 32 bytes whatever was sent.
 *
 * This is belt-and-braces on top of the rate limiter, which is the control that actually makes
 * guessing hopeless. It costs three lines.
 */
function matches(supplied: string, configured: string): boolean {
  const a = Buffer.from(supplied);
  const b = Buffer.from(configured);
  if (a.length !== b.length) {
    /* Still do the work, so the answer takes the same shape of time. */
    timingSafeEqual(b, b);
    return false;
  }
  return timingSafeEqual(a, b);
}

export interface DemoService {
  /**
   * Checks the passcode and mints a short session for the demonstration account, seeding it
   * on first use.
   *
   * One method rather than an authenticate-then-enter pair, so there is no intermediate state
   * where the passcode has been accepted and nothing has happened yet.
   */
  enter(passcode: string): Promise<AuthSession>;
  /** Deletes everything the demo account owns and writes the dataset again. */
  reset(user: StoredUser): Promise<void>;
  /**
   * Applies the state change a payment would, on a demo-owned project, without Stripe.
   *
   * ==========================================================================
   * THE INVARIANT THIS DOES NOT BREAK
   * ==========================================================================
   *
   * The strongest rule in this codebase is that payment state is advanced by verified
   * webhooks and by nothing else — a browser reaching a success page proves only that a
   * browser reached a success page. A demo that "simulated a payment" by posting to the
   * webhook path, or by adding a flag to the fulfilment code, would put a second door on
   * that rule, and the second door is the one that gets used by accident.
   *
   * So this does not go near `handleWebhookEvent`. It is a separate operation, reachable
   * only with a demo session, that refuses any project it does not own. The invariant is
   * restated rather than weakened: *payment state moves on a verified webhook, or on an
   * explicitly demo-scoped simulation against a demo-owned project.* One extra door, named,
   * and unreachable without the passcode.
   * ==========================================================================
   */
  simulatePayment(params: {
    readonly user: StoredUser;
    readonly stage: 'deposit' | 'final';
  }): Promise<void>;
  recordFeedback(record: NewDemoFeedbackRecord): Promise<StoredDemoFeedback>;
  listFeedback(limit: number): Promise<readonly StoredDemoFeedback[]>;
}

export interface DemoServiceDependencies extends DemoSeedDependencies {
  readonly repository: DemoRepository;
  readonly authRepository: AuthRepository;
  readonly authService: AuthService;
  readonly projectRepository: ProjectRepository;
  /** The configured passcode. The router is only mounted when there is one. */
  readonly passcode: string;
  readonly sessionTtlMs: number;
  readonly logger: Logger;
  readonly now?: () => Date;
}

export function createDemoService(dependencies: DemoServiceDependencies): DemoService {
  const { repository, authRepository, authService, passcode, sessionTtlMs, logger } = dependencies;
  const now = dependencies.now ?? (() => new Date());

  /**
   * The demonstration account, created on first use.
   *
   * There is no provisioning script, deliberately — a script is a thing somebody forgets to
   * run on a new deployment, and the failure would be a `/promo` that accepts the passcode and
   * then shows an empty portal. Entering *is* the provisioning.
   *
   * `markDemo` is a separate write from `createUser` because the flag is deliberately absent
   * from every general-purpose update path. See `AuthRepository.markDemo`.
   */
  async function resolveAccount(): Promise<{ user: StoredUser; created: boolean }> {
    const existing = await authRepository.findUserByEmail(DEMO_EMAIL);
    if (existing) return { user: existing, created: false };

    const created = await authRepository.createUser({
      email: DEMO_EMAIL,
      name: DEMO_NAME,
      businessName: DEMO_BUSINESS,
      /*
       * A customer, and this is the load-bearing line of the whole feature. Everything the
       * brief asks for about administrative access is true because of it — `requireAdmin`
       * answers NOT_FOUND to every customer, so there is nothing demo-specific to enforce.
       */
      role: 'customer',
      /*
       * Verified, because nothing can ever verify it: `.test` cannot receive mail. Leaving it
       * false would put a "confirm your address" prompt in front of every demonstration, for
       * a mailbox that does not exist.
       */
      emailVerified: true,
      /*
       * No password hash and no identity. The account is unreachable through `/login` and
       * through Google — the passcode is the only door, and there is no credential on it that
       * could be guessed, reset or phished.
       */
      identities: [],
    });

    const marked = await authRepository.markDemo(created.id);
    return { user: marked ?? created, created: true };
  }

  async function reseed(user: StoredUser): Promise<void> {
    await seedDemoData(dependencies, { userId: user.id, now: now() });
  }

  return {
    async enter(supplied) {
      if (!matches(supplied, passcode)) {
        /*
         * One message, and the route answers the same thing an unmounted deployment does.
         * Three distinguishable answers — wrong passcode, not configured, rate limited —
         * would be an oracle telling somebody which of the three they are up against.
         */
        logger.warn('demo.rejected', {});
        throw new AppError('UNAUTHENTICATED', 'That passcode is not right.');
      }

      const { user, created } = await resolveAccount();

      /* First entry ever: there is an account and no data behind it. */
      if (created) await reseed(user);

      const session = await authService.issueSessionFor({ user, ttlMs: sessionTtlMs });

      logger.info('demo.entered', { userId: user.id, seeded: created });
      return session;
    },

    async reset(user) {
      /*
       * Refused for anybody but the demonstration account, in the *service*.
       *
       * The route is already behind `requireAuth` and this check is what makes the guarantee
       * independent of it: a caller that reached this method with a real customer's session
       * — through a future route, a script, a mistake — deletes nothing. `CLAUDE.md` rule 2
       * and the brief say the same thing in different words: a frontend check is not a
       * control, and neither is a route-level one on an operation this destructive.
       */
      if (!user.demo) {
        throw new AppError('NOT_FOUND', 'No such operation.');
      }

      const deleted = await repository.purge(user.id);
      await reseed(user);

      logger.info('demo.reset', { userId: user.id, deleted });
    },

    async simulatePayment({ user, stage }) {
      if (!user.demo) throw new AppError('NOT_FOUND', 'No such operation.');

      /*
       * Their own newest project, resolved from the ownership filter. There is no project id
       * in the request: a browser naming the project a payment settles is the shape the real
       * checkout path refuses too, and the demo does not get a laxer version of a rule
       * because it is a demo.
       */
      const [project] = await dependencies.projectRepository.listByOwner(user.id, 1);
      if (!project) throw new AppError('NOT_FOUND', 'There is no project to pay for.');

      await dependencies.projects.update(project.id, {
        ...(stage === 'deposit'
          ? { depositStatus: 'paid' as const, status: 'deposit-paid' as const }
          : { finalStatus: 'paid' as const }),
      });

      await dependencies.activity.record({
        type: 'billing.payment_succeeded',
        summary:
          stage === 'deposit'
            ? 'We received your deposit. (Simulated — no card was charged.)'
            : 'We received your launch payment. (Simulated — no card was charged.)',
        audience: 'customer',
        projectId: project.id,
        userId: user.id,
      });

      logger.info('demo.payment_simulated', { userId: user.id, projectId: project.id, stage });
    },

    recordFeedback: (record) => repository.recordFeedback(record),
    listFeedback: (limit) => repository.listFeedback(limit),
  };
}
