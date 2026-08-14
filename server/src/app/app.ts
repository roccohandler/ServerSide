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
  createActivityService,
  createMongoActivityRepository,
  type ActivityService,
} from '../features/activity/index.js';
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
  readonly projectService: ProjectService;
  readonly taskService: TaskService;
  readonly feedbackService: FeedbackService;
  readonly deploymentService: DeploymentService;
  readonly activityService: ActivityService;
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
 */
function createDatabaseConnect(config: ServerConfig, logger: Logger): () => Promise<void> {
  const { uri, dbName } = config.database;

  if (uri) {
    const connection = createMongoConnection({ uri, dbName, logger });
    return () => connection.connect();
  }

  logger.warn('database.not_configured', {
    detail: 'Set MONGODB_URI to accept lead submissions.',
  });

  return () =>
    Promise.reject(
      new AppError(
        'SERVICE_UNAVAILABLE',
        'We could not save your request right now. Please call or email us and we will pick it up straight away.',
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
   *   billing             (needs everything, through the fulfilment port)
   *
   * Nothing is circular, which is what makes each feature testable on its own.
   */
  const activityService = createActivityService({
    repository: createMongoActivityRepository({ connect }),
    logger,
  });

  const authRepository = createMongoAuthRepository({ connect });

  const authService = createAuthService({
    repository: authRepository,
    identityVerifier: config.auth.googleEnabled
      ? createGoogleVerifier({ clientId: config.auth.googleClientId })
      : undefined,
    emailService,
    siteUrl: config.billing.siteUrl,
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

  const taskService = createTaskService({
    repository: createMongoTaskRepository({ connect }),
    activity: activityService,
    logger,
  });

  const feedbackService = createFeedbackService({
    repository: createMongoFeedbackRepository({ connect }),
    activity: activityService,
    logger,
  });

  const assessmentService = createAssessmentService({
    repository: createMongoAssessmentRepository({ connect }),
    activity: activityService,
    emailService,
    notificationRecipient,
    logger,
  });

  const projectRepository = createMongoProjectRepository({ connect });

  const projectService = createProjectService({
    repository: projectRepository,
    tasks: taskService,
    activity: activityService,
    logger,
  });

  const deploymentService = createDeploymentService({
    repository: createMongoDeploymentRepository({ connect }),
    projects: projectRepository,
    activity: activityService,
    logger,
  });

  return {
    leadService: createLeadService({
      repository: createMongoLeadRepository({ connect }),
      emailService,
      notificationRecipient,
      logger,
    }),
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
        logger,
      }),
      logger,
    }),
    authService,
    authRepository,
    assessmentService,
    projectService,
    taskService,
    feedbackService,
    deploymentService,
    activityService,
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
  const projectService = options.projectService ?? resolveDefaults().projectService;
  const taskService = options.taskService ?? resolveDefaults().taskService;
  const feedbackService = options.feedbackService ?? resolveDefaults().feedbackService;
  const deploymentService = options.deploymentService ?? resolveDefaults().deploymentService;
  const activityService = options.activityService ?? resolveDefaults().activityService;
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
      methods: ['GET', 'POST', 'OPTIONS'],
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
      projectService,
      taskService,
      feedbackService,
      deploymentService,
      activityService,
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
