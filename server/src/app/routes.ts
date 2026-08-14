import { Router, type RequestHandler } from 'express';
import { success } from '../lib/apiResponse.js';
import { createLeadRouter } from '../features/leads/lead.routes.js';
import type { LeadService } from '../features/leads/lead.service.js';
import { createSubscriberRouter } from '../features/subscribers/subscriber.routes.js';
import type { SubscriberService } from '../features/subscribers/subscriber.service.js';
import { createOnboardingRouter } from '../features/onboarding/onboarding.routes.js';
import type { OnboardingService } from '../features/onboarding/onboarding.service.js';
import { createBillingRouter } from '../features/billing/billing.routes.js';
import { createCustomerBillingRouter } from '../features/billing/billing.customer.routes.js';
import type { BillingService } from '../features/billing/billing.service.js';
import {
  createAuthRouter,
  requireAuth,
  type AuthRepository,
  type AuthService,
  type CookieOptions,
} from '../features/auth/index.js';
import { createAssessmentRouter, type AssessmentService } from '../features/assessments/index.js';
import { createProjectRouter, type ProjectService } from '../features/projects/index.js';
import { createDashboardRouter } from '../features/dashboard/index.js';
import { createAdminRouter } from '../features/admin/admin.routes.js';
import type { TaskService } from '../features/tasks/index.js';
import type { FeedbackService } from '../features/feedback/index.js';
import type { DeploymentService } from '../features/deployments/index.js';
import type { ActivityService } from '../features/activity/index.js';

export interface ApiRouterDependencies {
  readonly leadService: LeadService;
  readonly subscriberService: SubscriberService;
  readonly onboardingService: OnboardingService;
  readonly billingService: BillingService;
  readonly authService: AuthService;
  /**
   * Only the admin accounts list uses this. The repository rather than the service, so an
   * admin route cannot reach the credential operations — see `AdminRoutesDependencies`.
   */
  readonly authRepository: AuthRepository;
  readonly assessmentService: AssessmentService;
  readonly projectService: ProjectService;
  readonly taskService: TaskService;
  readonly feedbackService: FeedbackService;
  readonly deploymentService: DeploymentService;
  readonly activityService: ActivityService;
  /** Bearer token for the owner-only billing endpoints. Undefined switches them off. */
  readonly billingAdminToken: string | undefined;
  /** True when the workbook is hosted and can be emailed automatically. */
  readonly playbookAutoSendEnabled: boolean;
  /** Shared with the lead endpoint. Both are unauthenticated public POSTs. */
  readonly leadRateLimiter?: RequestHandler | undefined;
  /** Tighter budget for the credential endpoints. */
  readonly authRateLimiter?: RequestHandler | undefined;
  /** Password resets only, keyed on the address. See `createPasswordResetRateLimiter`. */
  readonly passwordResetRateLimiter?: RequestHandler | undefined;
  /** Public OAuth client id, served to the browser so one build fits every environment. */
  readonly googleClientId: string | undefined;
  readonly cookieOptions: CookieOptions;
  readonly isProduction: boolean;
  readonly databaseConfigured: boolean;
  readonly emailConfigured: boolean;
}

/**
 * Everything under `/api`, in one screen.
 *
 * ============================================================================
 * THE THREE SURFACES
 * ============================================================================
 *
 * The mount points are the architecture, and they are worth reading as a group:
 *
 *   **Public** — `/leads`, `/subscribers`, `/onboarding`, `/auth`, `/health`.
 *   Anonymous by design. `/auth` is here because signing in is something you do when
 *   you have no session.
 *
 *   **Private** — everything under `/app`. One `requireAuth` on the mount, so a route
 *   added inside it is protected before it is written. Authorization beyond "is
 *   somebody here" is per-route and per-resource: see the capability checks in each
 *   feature's router and the ownership checks in each service.
 *
 *   **Admin** — `/admin`, behind `requireAdmin`, and `/billing`, behind the owner's
 *   bearer token. Two mechanisms because they are two things: `/billing` predates
 *   accounts and is operated with curl, `/admin` is operated by a signed-in staff
 *   account. Both cross customer boundaries and neither is reachable by a customer.
 *
 * The two provider webhooks are deliberately NOT here — both need the raw request body
 * for signature verification, so they are wired in `app.ts` before the JSON parser.
 * ============================================================================
 */
export function createApiRouter(dependencies: ApiRouterDependencies): Router {
  const router = Router();

  router.get('/health', (_request, response) => {
    /*
     * Production reports liveness only. The configuration flags are genuinely useful
     * when verifying a deploy, but they describe the server's setup, so they are
     * withheld from the public production response.
     */
    response.json(
      success({
        status: 'ok',
        ...(dependencies.isProduction
          ? {}
          : {
              database: dependencies.databaseConfigured ? 'configured' : 'not-configured',
              email: dependencies.emailConfigured ? 'configured' : 'not-configured',
            }),
      }),
    );
  });

  /* ------------------------------------------------------------------ public */

  router.use(
    '/leads',
    createLeadRouter({
      leadService: dependencies.leadService,
      rateLimiter: dependencies.leadRateLimiter,
    }),
  );

  /*
   * PlayBook workbook requests. Rate limited on the same budget as leads — it is a
   * one-field public POST, which makes it the cheaper of the two to hammer.
   */
  router.use(
    '/subscribers',
    createSubscriberRouter({
      subscriberService: dependencies.subscriberService,
      autoSendEnabled: dependencies.playbookAutoSendEnabled,
      rateLimiter: dependencies.leadRateLimiter,
    }),
  );

  /*
   * New-client onboarding, submitted from /welcome after a deposit. Public POST on the
   * same rate-limit budget as the other two.
   */
  router.use(
    '/onboarding',
    createOnboardingRouter({
      onboardingService: dependencies.onboardingService,
      rateLimiter: dependencies.leadRateLimiter,
    }),
  );

  /* Sign up, sign in, sign out, Google, reset, verify. Public by definition. */
  router.use(
    '/auth',
    createAuthRouter({
      authService: dependencies.authService,
      cookieOptions: dependencies.cookieOptions,
      rateLimiter: dependencies.authRateLimiter,
      passwordResetRateLimiter: dependencies.passwordResetRateLimiter,
      googleClientId: dependencies.googleClientId,
    }),
  );

  /* ----------------------------------------------------------------- private */

  /*
   * The authenticated customer application. One `requireAuth` here rather than one per
   * route, so the guard cannot be the thing somebody forgets on the next endpoint.
   */
  const app = Router();
  app.use(requireAuth);

  app.use(
    '/dashboard',
    createDashboardRouter({
      projectService: dependencies.projectService,
      assessmentService: dependencies.assessmentService,
      taskService: dependencies.taskService,
      activityService: dependencies.activityService,
    }),
  );

  app.use(
    '/assessments',
    createAssessmentRouter({
      assessmentService: dependencies.assessmentService,
      rateLimiter: dependencies.leadRateLimiter,
    }),
  );

  app.use(
    '/projects',
    createProjectRouter({
      projectService: dependencies.projectService,
      taskService: dependencies.taskService,
      feedbackService: dependencies.feedbackService,
      deploymentService: dependencies.deploymentService,
      activityService: dependencies.activityService,
    }),
  );

  app.use(
    '/billing',
    createCustomerBillingRouter({
      billingService: dependencies.billingService,
      projectService: dependencies.projectService,
      rateLimiter: dependencies.leadRateLimiter,
    }),
  );

  router.use('/app', app);

  /* ------------------------------------------------------------------- admin */

  router.use(
    '/admin',
    createAdminRouter({
      projectService: dependencies.projectService,
      assessmentService: dependencies.assessmentService,
      taskService: dependencies.taskService,
      feedbackService: dependencies.feedbackService,
      deploymentService: dependencies.deploymentService,
      activityService: dependencies.activityService,
      authRepository: dependencies.authRepository,
    }),
  );

  /*
   * The owner-only billing endpoints: projects, statuses and Stripe checkout links.
   * All of them sit behind the admin token rather than a session — they predate
   * accounts and are operated with curl. The Stripe *webhook* is deliberately not
   * here — it needs the raw request body for signature verification, so it is wired in
   * `app.ts` before the JSON body parser.
   */
  router.use(
    '/billing',
    createBillingRouter({
      billingService: dependencies.billingService,
      adminToken: dependencies.billingAdminToken,
    }),
  );

  return router;
}
