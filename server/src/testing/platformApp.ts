import type { Express } from 'express';
import { createApp } from '../app/app.js';
import { loadServerConfig, type ServerConfig } from '../config/env.js';
import { silentLogger } from '../lib/logger.js';
import { createActivityService } from '../features/activity/index.js';
import { createAssessmentService } from '../features/assessments/index.js';
import { createAuthService } from '../features/auth/index.js';
import { createBillingService } from '../features/billing/billing.service.js';
import { createBillingFulfillment } from '../features/billing/billing.fulfillment.js';
import { createDeploymentService } from '../features/deployments/index.js';
import { createFeedbackService } from '../features/feedback/index.js';
import { createProjectService } from '../features/projects/index.js';
import { createTaskService } from '../features/tasks/index.js';
import {
  createInMemoryActivityRepository,
  createInMemoryAssessmentRepository,
  createInMemoryAuthRepository,
  createInMemoryDeploymentRepository,
  createInMemoryFeedbackRepository,
  createInMemoryProjectRepository,
  createInMemoryTaskRepository,
  createStubIdentityVerifier,
  type InMemoryAuthRepository,
  type StubIdentityVerifier,
} from './authFakes.js';
import {
  createFakeStripeClient,
  createInMemoryBillingRepository,
  createRecordingEmailService,
  type FakeStripeClient,
  type InMemoryBillingRepository,
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
  readonly repositories: {
    readonly projects: ReturnType<typeof createInMemoryProjectRepository>;
    readonly tasks: ReturnType<typeof createInMemoryTaskRepository>;
    readonly feedback: ReturnType<typeof createInMemoryFeedbackRepository>;
    readonly deployments: ReturnType<typeof createInMemoryDeploymentRepository>;
    readonly activity: ReturnType<typeof createInMemoryActivityRepository>;
    readonly assessments: ReturnType<typeof createInMemoryAssessmentRepository>;
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
  const billingRepository = createInMemoryBillingRepository();
  const projects = createInMemoryProjectRepository();
  const tasks = createInMemoryTaskRepository();
  const feedback = createInMemoryFeedbackRepository();
  const deployments = createInMemoryDeploymentRepository();
  const activity = createInMemoryActivityRepository();
  const assessments = createInMemoryAssessmentRepository();

  const activityService = createActivityService({ repository: activity, logger: silentLogger });

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
    logger: silentLogger,
  });

  const assessmentService = createAssessmentService({
    repository: assessments,
    activity: activityService,
    emailService: email,
    notificationRecipient: 'owner@example.com',
    logger: silentLogger,
  });

  const projectService = createProjectService({
    repository: projects,
    tasks: taskService,
    activity: activityService,
    logger: silentLogger,
  });

  const deploymentService = createDeploymentService({
    repository: deployments,
    projects,
    activity: activityService,
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
    assessmentService,
    projectService,
    taskService,
    feedbackService,
    deploymentService,
    activityService,
    billingService,
    stripeClient: stripe,
    deploymentProvider: createVercelProvider({
      webhookSecret: VERCEL_WEBHOOK_SECRET,
      logger: silentLogger,
    }),
    // The three marketing services are not part of any assertion here; the app
    // resolves its own, which builds them without connecting to anything.
  });

  return {
    app,
    config,
    auth: authRepository,
    billing: billingRepository,
    stripe,
    email,
    identityVerifier,
    repositories: { projects, tasks, feedback, deployments, activity, assessments },
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
