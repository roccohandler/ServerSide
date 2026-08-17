import { Router, type RequestHandler } from 'express';
import { success } from '../lib/apiResponse.js';
import type { Logger } from '../lib/logger.js';
import { createLeadRouter } from '../features/leads/lead.routes.js';
import { createCustomerLeadRouter } from '../features/leads/lead.customer.routes.js';
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
import { createReportRouter, type ReportService } from '../features/reports/index.js';
import { createDemoRouter, type DemoService } from '../features/demo/index.js';
import { createDashboardRouter } from '../features/dashboard/index.js';
import { createAdminRouter } from '../features/admin/admin.routes.js';
import type { TaskService } from '../features/tasks/index.js';
import { createMessageRouter, type FeedbackService } from '../features/feedback/index.js';
import type { DeploymentService } from '../features/deployments/index.js';
import { createActivityRouter, type ActivityService } from '../features/activity/index.js';
import type { ConversationService } from '../features/conversations/index.js';
import type { FileService } from '../features/files/index.js';
import { createDigestRouter, type DigestService } from '../features/notifications/index.js';
import {
  createFollowUpCronRouter,
  createUnsubscribeRouter,
  type FollowUpService,
} from '../features/followup/index.js';

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
  /** Growth Partner's monthly deliverable. Read-only for a customer, composed in the console. */
  readonly reportService: ReportService;
  readonly projectService: ProjectService;
  readonly taskService: TaskService;
  readonly feedbackService: FeedbackService;
  readonly deploymentService: DeploymentService;
  readonly activityService: ActivityService;
  /** The console inbox. Admin-only, and the only service that reads across both sources. */
  readonly conversationService: ConversationService;
  /** Bearer token for the owner-only billing endpoints. Undefined switches them off. */
  readonly billingAdminToken: string | undefined;
  /** The owner's daily summary, and the scheduler that drains it. */
  readonly digestService: DigestService;
  /** Undefined when no blob store is configured. Every file route then answers 503. */
  readonly fileService: FileService | undefined;
  /** Vercel Cron's shared secret. Undefined leaves the scheduled route unmounted. */
  readonly cronSecret: string | undefined;
  /**
   * Follow-up nudges. Undefined leaves both `/api/unsubscribe` and `/api/cron/followup`
   * unmounted, which is what an unset `UNSUBSCRIBE_SECRET` produces.
   */
  readonly followUpService: FollowUpService | undefined;
  /**
   * Demo Mode. Undefined leaves every `/api/demo` route unmounted, which is what an unset
   * `DEMO_PASSCODE` produces — a genuine 404 rather than an open door.
   */
  readonly demoService: DemoService | undefined;
  /**
   * Passed for the scheduled route alone, which is the only one here that reports an outcome
   * nobody is waiting on. Every other route in this table answers a request; a cron run's only
   * reader is a log.
   */
  readonly logger: Logger;
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
 *   **Admin** — `/admin` and `/billing`, both behind `requireAdmin`, and `/billing`
 *   behind the owner's bearer token as well. Two mechanisms on one surface rather than
 *   two surfaces with one each: the token is what makes a money endpoint unreachable by
 *   anything holding only a stolen cookie, and the session is what makes the action
 *   attributable to a person. Both cross customer boundaries and neither is reachable by
 *   a customer. See DECISION 019.
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
      leadService: dependencies.leadService,
    }),
  );

  /*
   * Read state — two endpoints, no id on either. The shell asks `/unread` on every screen
   * so a customer sitting on Billing still learns something happened; the dashboard marks
   * `/read` because the dashboard is where they have actually seen it.
   *
   * `markRead` is closed over the repository here rather than the repository being handed
   * to the router, so the widest thing that router can do is move one timestamp.
   */
  app.use(
    '/activity',
    createActivityRouter({
      activityService: dependencies.activityService,
      markRead: async (userId, at) => {
        await dependencies.authRepository.updateUser(userId, { activityReadAt: at });
      },
      logger: dependencies.logger,
    }),
  );

  app.use(
    '/assessments',
    createAssessmentRouter({
      assessmentService: dependencies.assessmentService,
      rateLimiter: dependencies.leadRateLimiter,
    }),
  );

  /*
   * The signed-in half of the account-first funnel — the request a customer sends after
   * `/get-my-assessment` has created their account. Singular, because one account sends one
   * request; the anonymous many are at `/leads`. See DECISION 028.
   */
  app.use(
    '/assessment-request',
    createCustomerLeadRouter({ leadService: dependencies.leadService }),
  );

  app.use(
    '/projects',
    createProjectRouter({
      projectService: dependencies.projectService,
      taskService: dependencies.taskService,
      feedbackService: dependencies.feedbackService,
      deploymentService: dependencies.deploymentService,
      activityService: dependencies.activityService,
      fileService: dependencies.fileService,
    }),
  );

  /*
   * Account-scoped rather than project-scoped, deliberately.
   *
   * A report is *about* a project, but a customer on their second build wants one list of
   * every report they have ever been sent — not two lists behind two projects, one of which
   * they have to remember exists. `listPublishedForUser` is what makes that one query.
   */
  app.use('/reports', createReportRouter({ reportService: dependencies.reportService }));

  /*
   * Account-scoped for a stronger reason than reports are: a message with a project attached
   * is a change request and belongs on that project's feedback tab. What this route is for is
   * everybody who has no project open — signed up and not yet bought, or finished and thinking
   * about the next one — who until now could only reach the owner through the public contact
   * form, which files an existing client in a list of strangers.
   */
  app.use('/messages', createMessageRouter({ feedbackService: dependencies.feedbackService }));

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
      /* One method: the checkout link. See `AdminRoutesDependencies`. */
      billingService: dependencies.billingService,
      assessmentService: dependencies.assessmentService,
      reportService: dependencies.reportService,
      taskService: dependencies.taskService,
      feedbackService: dependencies.feedbackService,
      deploymentService: dependencies.deploymentService,
      activityService: dependencies.activityService,
      conversationService: dependencies.conversationService,
      fileService: dependencies.fileService,
      onboardingService: dependencies.onboardingService,
      authRepository: dependencies.authRepository,
      leadService: dependencies.leadService,
    }),
  );

  /*
   * The owner-only billing endpoints: projects, statuses and Stripe checkout links.
   *
   * A staff session **and** the admin token, both — DECISION 019, option B. The token alone
   * authorised the request and identified nobody, which left the endpoints that touch money as
   * the only unattributable privileged channel in the application. Curl still works; it now
   * carries a cookie as well. See the header of `billing.routes.ts` for why the two guards are
   * in the order they are.
   *
   * The Stripe *webhook* is deliberately not here — it needs the raw request body for signature
   * verification, so it is wired in `app.ts` before the JSON body parser.
   */
  router.use(
    '/billing',
    createBillingRouter({
      billingService: dependencies.billingService,
      adminToken: dependencies.billingAdminToken,
      logger: dependencies.logger,
    }),
  );

  /* ------------------------------------------------------------------ demo */

  /*
   * A fifth surface, and the only one whose caller is a stranger holding a shared secret.
   *
   * Mounted only when `DEMO_PASSCODE` is set — the `/api/cron` pattern, for the same reason:
   * an unconfigured deployment answers a genuine 404 rather than "not configured", so the
   * feature cannot be half-on and a prober learns nothing from the response.
   *
   * `POST /enter` is public because its whole job is to hand a session to somebody with none;
   * it is behind the credential rate limiter, whose own comment says every endpoint it covers
   * is an attempt to guess a secret. The other two routes are behind `requireAuth` **and** a
   * check in the service that the account carries `demo` — see `DemoService.reset`.
   *
   * There is no demo-specific signout. A demo session is an ordinary session.
   */
  if (dependencies.demoService) {
    router.use(
      '/demo',
      createDemoRouter({
        demoService: dependencies.demoService,
        cookieOptions: dependencies.cookieOptions,
        rateLimiter: dependencies.authRateLimiter,
      }),
    );
  }

  /* ------------------------------------------------------------- scheduled */

  /*
   * A fourth surface, and the first one whose caller is not a person.
   *
   * `/cron/digest` is invoked by Vercel Cron, which presents `Authorization: Bearer
   * $CRON_SECRET`. It is neither public (it sends email, and an open endpoint would let anybody
   * drain the owner's queue on demand) nor session-backed (there is no browser and nobody to
   * sign in), so it authenticates the *request* rather than a person — the same shape as
   * `/billing`'s token, for the same reason, and answering NOT_FOUND to everybody else exactly
   * as that one does.
   *
   * Mounted only when the secret exists. Unset leaves the path a genuine 404 rather than an
   * unguarded endpoint, which is the failure this ordering exists to make impossible.
   */
  if (dependencies.cronSecret) {
    router.use(
      '/cron',
      createDigestRouter({
        digestService: dependencies.digestService,
        cronSecret: dependencies.cronSecret,
        logger: dependencies.logger,
      }),
    );

    /*
     * A second router at the same mount rather than a second route on the one above, so the
     * two features import nothing from each other and each owns its own path. They share the
     * guard — `middleware/cronSecret.ts` — because a second copy of a credential comparison is
     * the copy that is still using `===` in two years.
     *
     * Both conditions have to hold: no scheduler secret means nothing invokes it, and no
     * unsubscribe secret means no service to invoke.
     */
    if (dependencies.followUpService) {
      router.use(
        '/cron',
        createFollowUpCronRouter({
          followUpService: dependencies.followUpService,
          cronSecret: dependencies.cronSecret,
          logger: dependencies.logger,
        }),
      );
    }
  }

  /* --------------------------------------------------------------- opting out */

  /*
   * The one public route that answers HTML, and the one state change reachable by GET.
   *
   * Outside `/app` and outside `/cron` because it is neither: the caller is a person who
   * clicked a link in an email, holds no session, and is authorised entirely by a signature in
   * the URL. `followup.routes.ts` argues both of those at length.
   *
   * Mounted only when the feature is configured, which is consistent rather than awkward: with
   * no follow-up service nothing has ever sent an unsubscribe link, so there is nothing for
   * this route to honour.
   */
  if (dependencies.followUpService) {
    router.use(
      '/unsubscribe',
      createUnsubscribeRouter({ followUpService: dependencies.followUpService }),
    );
  }

  return router;
}
