import type { Express } from 'express';
import { createApp } from '../app/app.js';
import { loadServerConfig, type ServerConfig } from '../config/env.js';
import { silentLogger } from '../lib/logger.js';
import { createActivityService } from '../features/activity/index.js';
import { createAssessmentService } from '../features/assessments/index.js';
import { createAuthService } from '../features/auth/index.js';
import { createConversationService } from '../features/conversations/index.js';
import { createBillingService } from '../features/billing/billing.service.js';
import { createBillingFulfillment } from '../features/billing/billing.fulfillment.js';
import { createDeploymentService } from '../features/deployments/index.js';
import { createFeedbackService } from '../features/feedback/index.js';
import { createLeadService } from '../features/leads/index.js';
import { createOnboardingService } from '../features/onboarding/index.js';
import { createNotifier } from '../features/notifications/index.js';
import { createDemoService } from '../features/demo/index.js';
import { createProjectService } from '../features/projects/index.js';
import { createReportService } from '../features/reports/index.js';
import { createTaskService } from '../features/tasks/index.js';
import {
  createInMemoryActivityRepository,
  createInMemoryAssessmentRepository,
  createInMemoryAuthRepository,
  createInMemoryDeploymentRepository,
  createInMemoryFeedbackRepository,
  createInMemoryOnboardingRepository,
  createInMemoryDemoRepository,
  createInMemoryProjectRepository,
  createInMemoryReportRepository,
  createInMemoryTaskRepository,
  createStubIdentityVerifier,
  type InMemoryAuthRepository,
  type StubIdentityVerifier,
} from './authFakes.js';
import {
  createFakeStripeClient,
  createInMemoryBillingRepository,
  createInMemoryLeadRepository,
  createRecordingEmailService,
  type FakeStripeClient,
  type InMemoryBillingRepository,
  type InMemoryLeadRepository,
  type RecordingEmailService,
} from './fakes.js';
import { createVercelProvider } from '../features/deployments/providers/vercel.provider.js';

/*
 * The whole platform, wired the way `app.ts` wires it, with storage and the two vendors
 * replaced by in-memory doubles.
 *
 * Built once here rather than per test file because the interesting assertions are
 * cross-feature — a payment creating a project, a deployment moving a milestone,
 * customer A being unable to read customer B's anything — and each of those needs six
 * services agreeing with each other. A per-file rig would either duplicate this or test
 * a subset of it and miss exactly the seams that matter.
 */

export const VERCEL_WEBHOOK_SECRET = 'test-vercel-secret';
export const TEST_ORIGIN = 'http://localhost:5173';

export interface PlatformHarness {
  readonly app: Express;
  readonly config: ServerConfig;
  readonly auth: InMemoryAuthRepository;
  readonly billing: InMemoryBillingRepository;
  readonly stripe: FakeStripeClient;
  readonly email: RecordingEmailService;
  readonly identityVerifier: StubIdentityVerifier;
  /**
   * The services themselves, for the handful of assertions that are about a domain rule
   * rather than about an endpoint.
   *
   * Deliberately narrow: only where a guard lives *below* the route layer and the route is
   * unreachable in the state under test.  is here because Demo Mode refuses a
   * checkout in the service and the route refuses it earlier for an unrelated and equally
   * correct reason — so the endpoint cannot exercise the check the brief asks for.
   */
  readonly services: {
    readonly billing: ReturnType<typeof createBillingService>;
  };
  readonly repositories: {
    readonly projects: ReturnType<typeof createInMemoryProjectRepository>;
    readonly tasks: ReturnType<typeof createInMemoryTaskRepository>;
    readonly feedback: ReturnType<typeof createInMemoryFeedbackRepository>;
    readonly deployments: ReturnType<typeof createInMemoryDeploymentRepository>;
    readonly activity: ReturnType<typeof createInMemoryActivityRepository>;
    readonly assessments: ReturnType<typeof createInMemoryAssessmentRepository>;
    readonly reports: ReturnType<typeof createInMemoryReportRepository>;
    readonly demo: ReturnType<typeof createInMemoryDemoRepository>;
    /**
     * Wired here for the console inbox, which reads leads alongside feedback.
     *
     * The marketing services are still resolved by the app itself — see the note at the
     * bottom of this function — so this repository backs the *inbox*, not the contact
     * form. A lead reaches it by being pushed onto `leads` directly, which is also the
     * only way a test can control `createdAt` and assert the oldest-first ordering.
     */
    readonly leads: InMemoryLeadRepository;
    /**
     * The welcome-form submissions, backing two surfaces: the console's unmatched worklist,
     * and the panel on a project page that finally shows the brief the site is built from.
     */
    readonly onboarding: ReturnType<typeof createInMemoryOnboardingRepository>;
  };
}

export interface PlatformHarnessOptions {
  /** Defaults to a configured Google client, so the button's happy path is testable. */
  readonly googleClientId?: string | undefined;
  readonly rateLimitEnabled?: boolean;
  /** On by default, matching a deployment. Individual tests send an Origin. */
  readonly csrfEnabled?: boolean;
  /**
   * Extra environment, merged over the defaults below.
   *
   * For the handful of tests that are *about* a configured limit rather than about the
   * behaviour it guards — a per-address reset budget of five is tedious to exhaust and
   * pointless to hard-code around.
   */
  readonly env?: Readonly<Record<string, string>>;
}

export function createPlatformHarness(options: PlatformHarnessOptions = {}): PlatformHarness {
  const config = loadServerConfig({
    NODE_ENV: 'development',
    LOG_LEVEL: 'silent',
    VITE_SITE_URL: TEST_ORIGIN,
    VERCEL_WEBHOOK_SECRET,
    ...('googleClientId' in options
      ? options.googleClientId === undefined
        ? {}
        : { GOOGLE_CLIENT_ID: options.googleClientId }
      : { GOOGLE_CLIENT_ID: 'test-client-id.apps.googleusercontent.com' }),
    ...options.env,
  });

  const email = createRecordingEmailService();
  const stripe = createFakeStripeClient();
  const identityVerifier = createStubIdentityVerifier();

  const authRepository = createInMemoryAuthRepository();
  const projects = createInMemoryProjectRepository();

  /*
   * One store, two interfaces — which is what production has. See the header on
   * `createInMemoryBillingRepository`: two private arrays behind two repositories that share a
   * MongoDB collection is a harness that disagrees with the deployment at exactly the seams
   * worth testing, and the console's checkout link is one of them.
   */
  const billingRepository = createInMemoryBillingRepository({ projects: projects.projects });
  const tasks = createInMemoryTaskRepository();
  const feedback = createInMemoryFeedbackRepository();
  const deployments = createInMemoryDeploymentRepository();
  const activity = createInMemoryActivityRepository();
  const assessments = createInMemoryAssessmentRepository();
  const reports = createInMemoryReportRepository();
  const demo = createInMemoryDemoRepository({
    projects,
    tasks,
    feedback,
    activity,
    assessments,
    reports,
  });
  const leads = createInMemoryLeadRepository();
  const onboarding = createInMemoryOnboardingRepository();

  const activityService = createActivityService({ repository: activity, logger: silentLogger });

  /*
   * The notification port, wired the way `app.ts` wires it.
   *
   * It was absent for a long time and its absence was invisible, which is the worst shape a
   * harness gap can have: every service takes the port optionally and defaults to a no-op, so
   * a rig without one is a rig where **no customer is ever told anything** — and every test
   * asserting domain state passes exactly as before. "We emailed them" was the single largest
   * untested claim in the application, and the deliverables of Phase 5 are the first feature
   * whose whole point is that somebody hears about it.
   *
   * No digest queue. Digest-tier owner mail is logged and dropped here, which is a state the
   * notifier documents as supported; the immediate half is what these tests are about.
   */
  const notifier = createNotifier({
    emailService: email,
    siteUrl: config.billing.siteUrl,
    ownerAddress: 'owner@example.com',
    logger: silentLogger,
  });

  const authService = createAuthService({
    repository: authRepository,
    /*
     * Only when a client id is configured, mirroring `app.ts` exactly. A harness that
     * always supplied a verifier would make the unconfigured case answer "we could not
     * verify that" instead of "Google sign-in is not set up here" — and the second is
     * the whole point of the development behaviour the brief asks for.
     */
    identityVerifier: config.auth.googleEnabled ? identityVerifier : undefined,
    emailService: email,
    siteUrl: config.billing.siteUrl,
    /* Mirrors `app.ts`. Without it the new-account notification is skipped, and the test
       asserting the owner hears about a prospect who never sends a request — the whole
       point of DECISION 028 — would be asserting against a service that cannot send it. */
    notificationRecipient: 'owner@example.com',
    logger: silentLogger,
    /* Mirrors `app.ts`: without it the harness cannot see `account.created` at all, so a
       test asserting the entry exists would pass against a deployment that never writes it. */
    activity: activityService,
  });

  const taskService = createTaskService({
    repository: tasks,
    activity: activityService,
    logger: silentLogger,
  });

  const feedbackService = createFeedbackService({
    repository: feedback,
    activity: activityService,
    notifier,
    logger: silentLogger,
  });

  const assessmentService = createAssessmentService({
    repository: assessments,
    activity: activityService,
    emailService: email,
    notificationRecipient: 'owner@example.com',
    notifier,
    logger: silentLogger,
  });

  const reportService = createReportService({
    repository: reports,
    activity: activityService,
    notifier,
    logger: silentLogger,
  });

  const projectService = createProjectService({
    repository: projects,
    tasks: taskService,
    activity: activityService,
    notifier,
    logger: silentLogger,
  });

  const deploymentService = createDeploymentService({
    repository: deployments,
    projects,
    activity: activityService,
    notifier,
    logger: silentLogger,
  });

  const billingService = createBillingService({
    repository: billingRepository,
    stripe,
    priceIds: {
      'build-deposit': 'price_deposit',
      'build-final': 'price_final',
      'growth-partner-monthly': 'price_monthly',
      'growth-partner-annual': 'price_annual',
    },
    siteUrl: config.billing.siteUrl,
    emailService: email,
    notificationRecipient: 'owner@example.com',
    fulfillment: createBillingFulfillment({
      authRepository,
      projectService,
      assessmentService,
      activity: activityService,
      logger: silentLogger,
    }),
    logger: silentLogger,
  });

  /*
   * The lead feature, on the in-memory repository.
   *
   * It used to be enough to let the app resolve its own — the harness only needed leads for
   * the console inbox, which was given the repository directly. That stopped being true with
   * DECISION 028: the dashboard now asks "has this account ever sent a request" on every
   * load, and the accounts table asks it of fifty accounts at once. Left to resolve itself,
   * the service would be built on a Mongo repository whose `connect` rejects, and both routes
   * would answer 503 — which is exactly what happened, in seven tests that were about
   * sessions and password hashes and had nothing to do with leads.
   */
  const leadService = createLeadService({
    repository: leads,
    emailService: email,
    notificationRecipient: 'owner@example.com',
    logger: silentLogger,
  });

  /*
   * Injected rather than left to the app's defaults, and the reason is a seam that moved: the
   * console's project page now shows the welcome-form answers beside the project they describe,
   * so a harness without this reaches for a database and answers 503 to a route that has
   * nothing to do with onboarding. The comment below used to say this was not part of any
   * assertion. It is now part of one that never mentions it.
   */
  const onboardingService = createOnboardingService({
    repository: onboarding,
    emailService: email,
    notificationRecipient: 'owner@example.com',
    findProjectIdByEmail: async (address) => (await projects.findByEmail(address))?.id,
    logger: silentLogger,
  });

  const conversationService = createConversationService({
    leads,
    feedback: feedbackService,
    projects: projectService,
    emailService: email,
    ownerAddress: 'owner@example.com',
    logger: silentLogger,
  });

  /*
   * Demo Mode, and only when a test asked for it.
   *
   * Mirrors `app.ts` exactly: no passcode, no service, and `routes.ts` then does not mount
   * `/api/demo` at all. A harness that always built one would make every existing test run
   * against a deployment shape that is not the default, and would hide the property the
   * unmounted case exists to give — a genuine 404.
   */
  const demoService = config.demo.passcode
    ? createDemoService({
        repository: demo,
        authRepository,
        authService,
        projectRepository: projects,
        projects,
        tasks,
        feedback,
        activity,
        assessments,
        reports,
        passcode: config.demo.passcode,
        sessionTtlMs: config.demo.sessionTtlMs,
        logger: silentLogger,
      })
    : undefined;

  const app = createApp({
    config,
    logger: silentLogger,
    rateLimitEnabled: options.rateLimitEnabled ?? false,
    csrfEnabled: options.csrfEnabled ?? true,
    authService,
    /*
     * The same in-memory repository the auth service is built on, injected separately because
     * the admin accounts route reads storage directly. Without this the app would resolve its
     * own default — a Mongo repository — and the accounts test would try to reach a database.
     */
    authRepository,
    /* See the note above: the dashboard and the accounts table both read it now. */
    leadService,
    assessmentService,
    reportService,
    demoService,
    projectService,
    taskService,
    feedbackService,
    deploymentService,
    activityService,
    conversationService,
    billingService,
    stripeClient: stripe,
    onboardingService,
    deploymentProvider: createVercelProvider({
      webhookSecret: VERCEL_WEBHOOK_SECRET,
      logger: silentLogger,
    }),
    // The subscriber service is not part of any assertion here; the app resolves its own,
    // which builds it without connecting to anything.
  });

  return {
    app,
    config,
    auth: authRepository,
    billing: billingRepository,
    stripe,
    email,
    identityVerifier,
    services: { billing: billingService },
    repositories: {
      projects,
      tasks,
      feedback,
      deployments,
      activity,
      assessments,
      reports,
      demo,
      leads,
      onboarding,
    },
  };
}

/** Pulls the session cookie out of a `set-cookie` header for reuse on later requests. */
export function sessionCookieFrom(headers: Record<string, unknown>): string {
  const raw = headers['set-cookie'];
  const values = Array.isArray(raw) ? raw : typeof raw === 'string' ? [raw] : [];
  const cookie = values.find((value) => value.startsWith('jobforge_session='));

  if (!cookie) throw new Error('No session cookie was set.');
  return cookie.split(';')[0] ?? '';
}

/** Promotes an account to staff, the way the owner would: directly, never over HTTP. */
export function makeAdmin(harness: PlatformHarness, userId: string): void {
  const index = harness.auth.users.findIndex((user) => user.id === userId);
  if (index < 0) throw new Error('No such user.');
  harness.auth.users[index] = { ...harness.auth.users[index]!, role: 'admin' };
}
