import cors from 'cors';
import express, { type Express, type RequestHandler } from 'express';
import helmet from 'helmet';
import { getServerConfig, type ServerConfig } from '../config/env.js';
import { createLeadService, type LeadService } from '../features/leads/lead.service.js';
import { createMongoLeadRepository } from '../features/leads/lead.repository.js';
import {
  createSubscriberService,
  type SubscriberService,
} from '../features/subscribers/subscriber.service.js';
import { createMongoSubscriberRepository } from '../features/subscribers/subscriber.repository.js';
import { PLAYBOOK_CONSENT_TEXT } from '../features/subscribers/subscriber.types.js';
import {
  createOnboardingService,
  type OnboardingService,
} from '../features/onboarding/onboarding.service.js';
import { createMongoOnboardingRepository } from '../features/onboarding/onboarding.repository.js';
import { amountLabel } from '../features/billing/billing.amounts.js';
import { createBillingService, type BillingService } from '../features/billing/billing.service.js';
import { createMongoBillingRepository } from '../features/billing/billing.repository.js';
import { createStripeClient, type StripeClient } from '../features/billing/stripe.client.js';
import { createStripeWebhookHandler } from '../features/billing/billing.webhook.js';
import {
  createAttachUser,
  createAuthService,
  createGoogleVerifier,
  createMongoAuthRepository,
  type AuthRepository,
  type AuthService,
} from '../features/auth/index.js';
import {
  createAssessmentService,
  createMongoAssessmentRepository,
  type AssessmentService,
} from '../features/assessments/index.js';
import {
  createProjectService,
  createMongoProjectRepository,
  type ProjectService,
} from '../features/projects/index.js';
import {
  createReportService,
  createMongoReportRepository,
  type ReportService,
} from '../features/reports/index.js';
import {
  createDemoService,
  createMongoDemoRepository,
  DEMO_EMAIL,
  type DemoService,
} from '../features/demo/index.js';
import {
  createActivityService,
  createMongoActivityRepository,
  type ActivityService,
} from '../features/activity/index.js';
import {
  createDigestService,
  createNotifier,
  type DigestService,
} from '../features/notifications/index.js';
import {
  createFileService,
  createMongoFileRepository,
  createVercelBlobStore,
  type FileService,
} from '../features/files/index.js';
import {
  createMongoTaskRepository,
  createTaskService,
  type TaskService,
} from '../features/tasks/index.js';
import {
  createFeedbackService,
  createMongoFeedbackRepository,
  type FeedbackService,
} from '../features/feedback/index.js';
import {
  createConversationService,
  type ConversationService,
} from '../features/conversations/index.js';
import {
  createDeploymentService,
  createDeploymentWebhookHandler,
  createMongoDeploymentRepository,
  createVercelProvider,
  type DeploymentProvider,
  type DeploymentService,
} from '../features/deployments/index.js';
import { createBillingFulfillment } from '../features/billing/billing.fulfillment.js';
import { createMongoConnection } from '../infrastructure/database/mongoose.js';
import { createLogEmailService, type EmailService } from '../infrastructure/email/email.service.js';
import { createResendEmailService } from '../infrastructure/email/resend.email.service.js';
import { AppError } from '../lib/appError.js';
import { createLogger, type Logger } from '../lib/logger.js';
import { createCsrfGuard } from '../middleware/csrf.js';
import { createErrorHandler } from '../middleware/errorHandler.js';
import { notFoundHandler } from '../middleware/notFound.js';
import {
  createAuthRateLimiter,
  createLeadRateLimiter,
  createPasswordResetRateLimiter,
} from '../middleware/rateLimit.js';
import { createRequestContext } from '../middleware/requestContext.js';
import { createApiRouter } from './routes.js';

/** 16 KB is far more than the contact form needs and far less than a useful payload attack. */
const JSON_BODY_LIMIT = '16kb';

/**
 * Every service the application is assembled from.
 *
 * One interface rather than a growing tuple, because both the composition root and the
 * test-injection options need exactly this list and letting the two drift is how a
 * service ends up wired in production and stubbed nowhere.
 */
export interface PlatformServices {
  readonly leadService: LeadService;
  readonly subscriberService: SubscriberService;
  readonly onboardingService: OnboardingService;
  readonly billingService: BillingService;
  readonly authService: AuthService;
  /**
   * Injected alongside the service because the admin accounts list needs storage and
   * nothing else does. Kept on the seam so a test can supply an in-memory one.
   */
  readonly authRepository: AuthRepository;
  readonly assessmentService: AssessmentService;
  readonly reportService: ReportService;
  /**
   * Demo Mode, or `undefined` when `DEMO_PASSCODE` is unset.
   *
   * The second service here that can legitimately be absent in production, and unlike the
   * file store its absence removes a whole surface rather than degrading one: `routes.ts`
   * does not mount `/api/demo` at all, so the endpoints answer a genuine 404.
   */
  readonly demoService: DemoService | undefined;
  readonly projectService: ProjectService;
  readonly taskService: TaskService;
  readonly feedbackService: FeedbackService;
  readonly deploymentService: DeploymentService;
  readonly activityService: ActivityService;
  readonly conversationService: ConversationService;
  /**
   * The owner's daily summary — both halves of it.
   *
   * On the seam like everything else here so a test can supply an in-memory one, and because the
   * scheduled route needs to read the same queue the notifier writes to. One service with two
   * verbs rather than a writer and a reader, so the two cannot disagree about which collection
   * they mean.
   */
  readonly digestService: DigestService;
  /**
   * Undefined when no blob store is configured, and that is a supported state.
   *
   * The one service here that can legitimately be absent in production: everything else in
   * this list either works without configuration or refuses at its own endpoint. A missing
   * store makes the file routes answer 503 with an instruction and leaves every other surface
   * untouched — including the project page, which renders an empty file list rather than
   * failing to load.
   */
  readonly fileService: FileService | undefined;
  readonly stripeClient: StripeClient | undefined;
  readonly deploymentProvider: DeploymentProvider | undefined;
}

export interface CreateAppOptions extends Partial<PlatformServices> {
  readonly config?: ServerConfig;
  readonly logger?: Logger;
  /** Defaults to enabled. Tests turn it off except where the limit is what is under test. */
  readonly rateLimitEnabled?: boolean;
  /**
   * Defaults to enabled, and should stay that way outside a test that is specifically
   * about the guard. It only ever inspects cookie-bearing state-changing requests —
   * see `middleware/csrf.ts` for why that scoping is the whole design.
   */
  readonly csrfEnabled?: boolean;
}

function createEmailService(config: ServerConfig, logger: Logger): EmailService {
  if (config.email.apiKey && config.email.from) {
    return createResendEmailService({ apiKey: config.email.apiKey, from: config.email.from });
  }

  logger.warn('email.provider_not_configured', {
    detail: 'Set RESEND_API_KEY and RESEND_FROM_EMAIL to deliver lead notifications.',
  });
  return createLogEmailService(logger);
}

/**
 * One connection, shared by both features.
 *
 * Built once per app rather than once per feature: the Mongoose connection is cached
 * globally anyway, and two `createMongoConnection` calls would mean two sets of
 * connection logs saying the same thing.
 *
 * When no URI is configured this returns a function that rejects with a message the
 * visitor can act on. Refusing loudly beats accepting something we cannot store — telling
 * somebody to call instead is a working fallback; a silent success is a lost customer.
 *
 * ============================================================================
 * THE MESSAGE HAS TO FIT EVERY CALLER, NOT JUST THE CONTACT FORM
 * ============================================================================
 *
 * It used to read "We could not save your request right now. Please call or email us and
 * we will pick it up straight away." That is a good sentence for a visitor submitting the
 * contact form, and it was written when that was the only thing storage was for.
 *
 * Storage now backs signing in. So somebody typing a correct password into the owner
 * console with no `MONGODB_URI` set was told their *request could not be saved* and
 * invited to call about it — a sentence that describes a lead, on a screen where nothing
 * was being submitted, in answer to a problem the person reading it usually caused and
 * can fix in one line of `.env`.
 *
 * The wording below is true of every caller: nothing here was stored, nothing was lost,
 * and trying again shortly is the right next move. The lead-specific "call us instead"
 * belongs at the lead endpoint, which is the one place it is actually the better path.
 * ============================================================================
 */
function createDatabaseConnect(config: ServerConfig, logger: Logger): () => Promise<void> {
  const { uri, dbName } = config.database;

  if (uri) {
    const connection = createMongoConnection({ uri, dbName, logger });
    return () => connection.connect();
  }

  logger.warn('database.not_configured', {
    detail:
      'Set MONGODB_URI. Without it nothing can be stored and nobody can sign in — every ' +
      'database-backed endpoint answers 503.',
  });

  return () =>
    Promise.reject(
      new AppError(
        'SERVICE_UNAVAILABLE',
        'We cannot reach our records right now, so nothing was saved and nothing was lost. Please try again in a few minutes.',
      ),
    );
}

/**
 * Stripe is optional infrastructure: without both secrets the client is undefined,
 * checkout creation answers 503 with an instruction, and the webhook rejects.
 */
function createConfiguredStripeClient(
  config: ServerConfig,
  logger: Logger,
): StripeClient | undefined {
  const { stripeSecretKey, webhookSecret } = config.billing;

  if (stripeSecretKey && webhookSecret) {
    return createStripeClient({ secretKey: stripeSecretKey, webhookSecret });
  }

  logger.warn('billing.not_configured', {
    detail: 'Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET to enable payment links.',
  });
  return undefined;
}

/**
 * Composition root: the one place that knows which concrete repositories and transport
 * are in use. Everything below here depends on interfaces.
 */
function createDefaultServices(config: ServerConfig, logger: Logger): PlatformServices {
  const connect = createDatabaseConnect(config, logger);
  const emailService = createEmailService(config, logger);
  const notificationRecipient = config.email.notificationRecipient;
  const stripeClient = createConfiguredStripeClient(config, logger);

  /*
   * Built in dependency order, and the order is the architecture:
   *
   *   activity            (writes to nothing else)
   *   auth, tasks, feedback, assessments
   *   projects            (needs tasks + activity)
   *   deployments         (needs projects + activity)
   *   conversations       (reads leads + feedback + projects; owns nothing)
   *   billing             (needs everything, through the fulfilment port)
   *
   * Nothing is circular, which is what makes each feature testable on its own.
   */
  const activityRepository = createMongoActivityRepository({ connect });

  const activityService = createActivityService({
    repository: activityRepository,
    logger,
  });

  /*
   * ==========================================================================
   * THE NOTIFIER, BUILT SECOND AND FOR THE SAME REASON THE RECORDER IS BUILT FIRST
   * ==========================================================================
   *
   * Four services take it — projects, feedback, deployments and (through fulfilment) billing —
   * and none of them takes anything from another, so it sits beside `activityService` at the
   * top of the order rather than anywhere in the middle of it.
   *
   * The pairing is not a coincidence. `ActivityRecorder` answers "what happened", the `Notifier`
   * answers "who was told", and every place one is called the other usually is too. Keeping
   * them adjacent here is what makes a service that records without telling — which was the
   * state of four features before this — visible as an omission rather than as the default.
   *
   * `ownerAddress` is the same `CONTACT_NOTIFICATION_EMAIL` the lead, assessment and account
   * notifications already use. One address, deliberately: they are stages of one funnel and
   * splitting them across two inboxes is how the earliest stage stops being read.
   * ==========================================================================
   */
  /*
   * The queue is built first because the notifier takes it, and it is the same object the cron
   * route later reads from — one service, two verbs. Splitting "where a digest line is written"
   * from "where it is read" across two implementations is how the two stop agreeing about which
   * collection they mean.
   */
  const digestService = createDigestService({
    connect,
    emailService,
    ownerAddress: notificationRecipient,
    siteUrl: config.billing.siteUrl,
    logger,
  });

  const notifier = createNotifier({
    emailService,
    siteUrl: config.billing.siteUrl,
    ownerAddress: notificationRecipient,
    logger,
    queue: digestService,
  });

  const authRepository = createMongoAuthRepository({ connect });

  const authService = createAuthService({
    repository: authRepository,
    identityVerifier: config.auth.googleEnabled
      ? createGoogleVerifier({ clientId: config.auth.googleClientId })
      : undefined,
    emailService,
    siteUrl: config.billing.siteUrl,
    /*
     * Where the owner hears that somebody signed up — the same address the lead and
     * assessment notifications go to, deliberately, because they are three stages of one
     * funnel and splitting them across two inboxes is how the earliest stage stops being
     * read. See DECISION 028 and `buildNewAccountEmail`.
     */
    notificationRecipient,
    logger,
    /*
     * The recorder, so a new account appears in the customer's own history.
     *
     * `account.created` had been declared in `ACTIVITY_TYPES` since the activity feature was
     * written and nothing ever recorded it, which meant the first entry in every customer's
     * timeline was whatever happened *after* they signed up. The service defaults to the
     * no-op recorder, so forgetting this line does not break signup — it silently loses the
     * entry, which is precisely why it is worth a comment rather than a blank argument.
     */
    activity: activityService,
  });

  if (!config.auth.googleEnabled) {
    logger.warn('auth.google_not_configured', {
      detail:
        'Set GOOGLE_CLIENT_ID to enable Google sign-in. The button still renders and explains itself.',
    });
  }

  /*
   * Hoisted, because two things read each of them: the feature that owns it, and the demo
   * seeder — which writes a whole dataset through repositories rather than services, so that
   * seeding does not fire the emails and activity entries a real project would. See the
   * header of `features/demo/demo.seed.ts`.
   */
  const taskRepository = createMongoTaskRepository({ connect });
  const feedbackRepository = createMongoFeedbackRepository({ connect });
  const assessmentRepository = createMongoAssessmentRepository({ connect });
  const reportRepository = createMongoReportRepository({ connect });

  const taskService = createTaskService({
    repository: taskRepository,
    activity: activityService,
    logger,
  });

  const feedbackService = createFeedbackService({
    repository: feedbackRepository,
    activity: activityService,
    notifier,
    logger,
  });

  const assessmentService = createAssessmentService({
    repository: assessmentRepository,
    activity: activityService,
    emailService,
    notificationRecipient,
    /* How the customer hears their review is ready. Forgetting it loses the email silently. */
    notifier,
    logger,
  });

  const reportService = createReportService({
    repository: reportRepository,
    activity: activityService,
    notifier,
    logger,
  });

  const projectRepository = createMongoProjectRepository({ connect });

  const projectService = createProjectService({
    repository: projectRepository,
    tasks: taskService,
    activity: activityService,
    notifier,
    /*
     * The one place allowed to know both features. See the note on the dependency: an import in
     * that direction closes a projects → billing → projects cycle, so the figure is handed over
     * here instead. Forgetting this line loses the launch-payment email silently.
     */
    finalPaymentLabel: amountLabel('build-final'),
    logger,
  });

  const deploymentService = createDeploymentService({
    repository: createMongoDeploymentRepository({ connect }),
    projects: projectRepository,
    activity: activityService,
    notifier,
    logger,
  });

  /*
   * Hoisted rather than built inline, because two features read it: the public
   * submission path through `LeadService`, and the console inbox — which takes the
   * repository directly so it cannot reach the submission rules. See
   * `ConversationServiceDependencies`.
   */
  const leadRepository = createMongoLeadRepository({ connect });

  /*
   * Storage is optional infrastructure, like Stripe and the deployment provider above it. No
   * token means no service, which means the file routes answer 503 with an instruction rather
   * than the application accepting a file it has nowhere to put.
   */
  const fileService = config.files.blobToken
    ? createFileService({
        repository: createMongoFileRepository({ connect }),
        store: createVercelBlobStore({ token: config.files.blobToken, logger }),
        activity: activityService,
        notifier,
        logger,
      })
    : undefined;

  /*
   * ==========================================================================
   * DEMO MODE, OR NOTHING AT ALL
   * ==========================================================================
   *
   * No passcode, no service, and `routes.ts` then does not mount `/api/demo` — so the
   * endpoints answer a genuine 404 rather than "not configured". That ordering is the whole
   * safety property: the feature cannot be half-on, and a prober cannot learn from a response
   * that a demonstration exists somewhere behind a secret they have not guessed.
   *
   * It takes repositories for the seed and the two services it genuinely needs: `authService`
   * to mint the session (one method, documented at length on the interface) and
   * `authRepository` to find or create the one account.
   */
  const demoService = config.demo.passcode
    ? createDemoService({
        repository: createMongoDemoRepository({ connect }),
        authRepository,
        authService,
        projectRepository,
        projects: projectRepository,
        tasks: taskRepository,
        feedback: feedbackRepository,
        activity: activityRepository,
        assessments: assessmentRepository,
        reports: reportRepository,
        passcode: config.demo.passcode,
        sessionTtlMs: config.demo.sessionTtlMs,
        logger,
      })
    : undefined;

  if (!demoService) {
    logger.info('demo.not_configured', {
      detail:
        'Set DEMO_PASSCODE to open /promo. Unset, every /api/demo route is a genuine 404 and the page cannot be entered.',
    });
  }

  if (!fileService) {
    logger.warn('files.not_configured', {
      detail:
        'Set BLOB_READ_WRITE_TOKEN to accept uploads. Until then the two onboarding tasks ' +
        'that ask for files cannot be completed in the portal.',
    });
  }

  return {
    leadService: createLeadService({
      repository: leadRepository,
      emailService,
      notificationRecipient,
      logger,
    }),
    conversationService: createConversationService({
      leads: leadRepository,
      feedback: feedbackService,
      projects: projectService,
      emailService,
      ownerAddress: notificationRecipient,
      /*
       * A closure, and only when Demo Mode is configured. The inbox's promise is "everybody
       * waiting on a reply", and a tester poking at the demonstration project is not somebody
       * the owner owes an answer to — but the feature learns nothing about how a demo account
       * is found, exactly as `onboardingService` takes `findProjectIdByEmail`.
       */
      ...(demoService
        ? {
            findDemoOwnerId: async () => {
              const user = await authRepository.findUserByEmail(DEMO_EMAIL);
              return user?.demo ? user.id : undefined;
            },
          }
        : {}),
      logger,
    }),
    digestService,
    subscriberService: createSubscriberService({
      repository: createMongoSubscriberRepository({ connect }),
      emailService,
      notificationRecipient,
      consentText: PLAYBOOK_CONSENT_TEXT,
      pdfUrl: config.playbook.pdfUrl,
      logger,
    }),
    onboardingService: createOnboardingService({
      repository: createMongoOnboardingRepository({ connect }),
      emailService,
      notificationRecipient,
      /*
       * One id, and nothing else this feature could ask for.
       *
       * A closure rather than `ProjectService`, for the reason the conversation service takes
       * `LeadRepository` and not `LeadService`: onboarding has no business creating, moving or
       * reading a project, and the narrowest dependency that does the job is the one that
       * cannot be made to do another. What it buys is the link — a paying project and the
       * material it is built from, connected by the address both were typed with.
       */
      findProjectIdByEmail: async (email) => (await projectRepository.findByEmail(email))?.id,
      notifier,
      logger,
    }),
    billingService: createBillingService({
      repository: createMongoBillingRepository({ connect }),
      stripe: stripeClient,
      priceIds: config.billing.priceIds,
      siteUrl: config.billing.siteUrl,
      emailService,
      notificationRecipient,
      fulfillment: createBillingFulfillment({
        authRepository,
        projectService,
        assessmentService,
        activity: activityService,
        notifier,
        logger,
      }),
      /* Directly, as well as through fulfilment: an owner-created checkout link can be sent
         to the client, and that happens before any payment exists to fulfil. */
      notifier,
      logger,
    }),
    authService,
    authRepository,
    assessmentService,
    reportService,
    demoService,
    projectService,
    taskService,
    feedbackService,
    deploymentService,
    activityService,
    fileService,
    stripeClient,
    deploymentProvider: createVercelProvider({
      webhookSecret: config.deployments.vercelWebhookSecret,
      logger,
    }),
  };
}

/**
 * Builds the Express application.
 *
 * Deliberately does not listen, connect to anything, or read `process.env` directly:
 * the same function backs the local server, the Vercel handler and the test suite.
 */
export function createApp(options: CreateAppOptions = {}): Express {
  const config = options.config ?? getServerConfig();
  const logger =
    options.logger ??
    createLogger({
      level: config.logLevel,
      format: config.isProduction ? 'json' : 'pretty',
    });

  /*
   * Built lazily so a test that injects every service never opens a database connection.
   * (A test that injects only some of them resolves the defaults for the rest, which
   * builds connect functions without connecting and logs configuration warnings to the
   * injected — usually silent — logger.)
   */
  let defaults: PlatformServices | undefined;
  const resolveDefaults = () => (defaults ??= createDefaultServices(config, logger));

  const leadService = options.leadService ?? resolveDefaults().leadService;
  const subscriberService = options.subscriberService ?? resolveDefaults().subscriberService;
  const onboardingService = options.onboardingService ?? resolveDefaults().onboardingService;
  const billingService = options.billingService ?? resolveDefaults().billingService;
  const stripeClient = options.stripeClient ?? resolveDefaults().stripeClient;
  const authService = options.authService ?? resolveDefaults().authService;
  const authRepository = options.authRepository ?? resolveDefaults().authRepository;
  const assessmentService = options.assessmentService ?? resolveDefaults().assessmentService;
  const reportService = options.reportService ?? resolveDefaults().reportService;
  /* `??` and not `?? undefined`: the default is legitimately absent. See `fileService`. */
  const demoService = options.demoService ?? resolveDefaults().demoService;
  const projectService = options.projectService ?? resolveDefaults().projectService;
  const taskService = options.taskService ?? resolveDefaults().taskService;
  const feedbackService = options.feedbackService ?? resolveDefaults().feedbackService;
  const deploymentService = options.deploymentService ?? resolveDefaults().deploymentService;
  const activityService = options.activityService ?? resolveDefaults().activityService;
  const conversationService = options.conversationService ?? resolveDefaults().conversationService;
  const digestService = options.digestService ?? resolveDefaults().digestService;
  /*
   * `??` and not `?? undefined`, which reads the same and is not: the default is legitimately
   * `undefined`, so this resolves the defaults exactly when a test did not inject one — the
   * same shape `stripeClient` and `deploymentProvider` use for the same reason.
   */
  const fileService = options.fileService ?? resolveDefaults().fileService;
  const deploymentProvider = options.deploymentProvider ?? resolveDefaults().deploymentProvider;

  const app = express();

  // Exactly the number of proxies in front of us — never `true`, which would let a
  // client spoof its own IP through X-Forwarded-For and defeat rate limiting.
  app.set('trust proxy', config.trustProxyHops);
  app.disable('x-powered-by');

  app.use(createRequestContext(logger));

  app.use(
    helmet({
      // This app only ever returns JSON, so nothing may be loaded, framed or posted.
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          'default-src': ["'none'"],
          'frame-ancestors': ["'none'"],
          'base-uri': ["'none'"],
          'form-action': ["'none'"],
        },
      },
      crossOriginResourcePolicy: {
        policy: config.cors.allowedOrigins.length > 0 ? 'cross-origin' : 'same-site',
      },
      referrerPolicy: { policy: 'no-referrer' },
    }),
  );

  app.use(
    cors({
      origin(origin, callback) {
        // No Origin header: same-origin navigation, curl, or a server-to-server call.
        if (!origin) {
          callback(null, true);
          return;
        }
        // Unknown origins get no CORS headers rather than an error response, so the
        // browser blocks the read without us returning a 500.
        callback(null, config.cors.allowedOrigins.includes(origin.replace(/\/$/, '')));
      },
      /*
       * PATCH is here because the owner console is a *cross-origin* browser application
       * and two of its operations are PATCHes — a project's milestone and its URLs.
       *
       * While the console lived inside the customer bundle those requests were
       * same-origin and CORS never saw them, so this list was correct by accident. The
       * day the console moved to its own origin, omitting PATCH would have made both
       * controls fail at the preflight with a browser console message and a perfectly
       * healthy server.
       *
       * DELETE joined them when files arrived, and it is the first verb in this application
       * that removes anything. Still nothing speculative: the console genuinely deletes a
       * file from a project across origins, and a method no route answers would be a
       * preflight promise nothing keeps.
       *
       * PUT joined them for the monthly report, which is the one write in this application
       * addressed by what it *is* — `{ project, month }` — rather than by an id. Same rule as
       * the other three: one route answers it, and it is reached from a second origin.
       */
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type'],
      maxAge: 86_400,
    }),
  );

  /*
   * Both provider webhooks are registered BEFORE the JSON body parser, each with a raw
   * parser of its own: signature verification needs the exact bytes the provider sent,
   * and a body that has been parsed and re-serialised fails verification even when
   * nothing is wrong.
   *
   * They also sit before `attachUser` and the CSRF guard. Neither is a browser request:
   * they carry no cookie and no Origin, and each authenticates by signature instead.
   */
  app.post(
    '/api/billing/webhook',
    express.raw({ type: 'application/json', limit: '256kb' }),
    createStripeWebhookHandler({ billingService, stripe: stripeClient, logger }),
  );

  app.post(
    '/api/deployments/webhook',
    express.raw({ type: 'application/json', limit: '256kb' }),
    createDeploymentWebhookHandler({ deploymentService, provider: deploymentProvider, logger }),
  );

  app.use(express.json({ limit: JSON_BODY_LIMIT }));

  /*
   * Resolve the session before the CSRF guard, so a rejected cross-site request is
   * still attributable in the logs, and before every router, so `request.auth` is
   * available to public endpoints that behave differently for a signed-in visitor.
   *
   * It never rejects — see `createAttachUser`.
   */
  app.use(createAttachUser({ authService, logger }));

  app.use(
    createCsrfGuard({
      /*
       * The application's own public origin plus anything CORS already trusts. Both are
       * needed: a same-origin fetch sends `Origin` on a POST, and the default
       * deployment has an empty `CLIENT_ORIGIN` because the API and the site share a
       * domain — so a list built only from CORS would reject every real request.
       */
      allowedOrigins: [config.billing.siteUrl, ...config.cors.allowedOrigins],
      enabled: options.csrfEnabled ?? true,
      logger,
    }),
  );

  const rateLimitingOn = options.rateLimitEnabled !== false;

  const leadRateLimiter: RequestHandler | undefined = rateLimitingOn
    ? createLeadRateLimiter({
        windowMs: config.rateLimit.windowMs,
        max: config.rateLimit.max,
        logger,
      })
    : undefined;

  /* Its own budget: every endpoint it covers is an attempt to guess a secret. */
  const authRateLimiter: RequestHandler | undefined = rateLimitingOn
    ? createAuthRateLimiter({
        windowMs: config.auth.rateLimit.windowMs,
        max: config.auth.rateLimit.max,
        logger,
      })
    : undefined;

  /*
   * A second counter for password resets, keyed on the address rather than the
   * connection. One hour, five requests — see `createPasswordResetRateLimiter`.
   */
  const passwordResetRateLimiter: RequestHandler | undefined = rateLimitingOn
    ? createPasswordResetRateLimiter({
        windowMs: config.auth.passwordResetRateLimit.windowMs,
        max: config.auth.passwordResetRateLimit.max,
        logger,
      })
    : undefined;

  app.use(
    '/api',
    createApiRouter({
      leadService,
      subscriberService,
      onboardingService,
      billingService,
      authService,
      /* Read by exactly one route: the admin accounts list. See `ApiRouterDependencies`. */
      authRepository,
      assessmentService,
      reportService,
      demoService,
      projectService,
      taskService,
      feedbackService,
      deploymentService,
      activityService,
      conversationService,
      digestService,
      fileService,
      cronSecret: config.cron.secret,
      logger,
      billingAdminToken: config.billing.adminToken,
      playbookAutoSendEnabled: config.playbook.autoSendEnabled,
      leadRateLimiter,
      authRateLimiter,
      passwordResetRateLimiter,
      googleClientId: config.auth.googleClientId,
      /*
       * Secure cookies everywhere but local development, where the site is served over
       * plain HTTP and a Secure cookie would simply never arrive.
       */
      cookieOptions: { secure: config.isProduction },
      isProduction: config.isProduction,
      databaseConfigured: config.database.enabled,
      emailConfigured: config.email.enabled,
    }),
  );

  app.use(notFoundHandler);
  app.use(createErrorHandler({ logger, isProduction: config.isProduction }));

  return app;
}
