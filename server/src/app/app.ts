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
import { createMongoConnection } from '../infrastructure/database/mongoose.js';
import { createLogEmailService, type EmailService } from '../infrastructure/email/email.service.js';
import { createResendEmailService } from '../infrastructure/email/resend.email.service.js';
import { AppError } from '../lib/appError.js';
import { createLogger, type Logger } from '../lib/logger.js';
import { createErrorHandler } from '../middleware/errorHandler.js';
import { notFoundHandler } from '../middleware/notFound.js';
import { createLeadRateLimiter } from '../middleware/rateLimit.js';
import { createRequestContext } from '../middleware/requestContext.js';
import { createApiRouter } from './routes.js';

/** 16 KB is far more than the contact form needs and far less than a useful payload attack. */
const JSON_BODY_LIMIT = '16kb';

export interface CreateAppOptions {
  readonly config?: ServerConfig;
  readonly logger?: Logger;
  /** Injected by tests to run the HTTP layer without MongoDB or Resend. */
  readonly leadService?: LeadService;
  readonly subscriberService?: SubscriberService;
  /** Defaults to enabled. Tests turn it off except where the limit is what is under test. */
  readonly rateLimitEnabled?: boolean;
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
 * Composition root: the one place that knows which concrete repositories and transport
 * are in use. Everything below here depends on interfaces.
 */
function createDefaultServices(
  config: ServerConfig,
  logger: Logger,
): { leadService: LeadService; subscriberService: SubscriberService } {
  const connect = createDatabaseConnect(config, logger);
  const emailService = createEmailService(config, logger);
  const notificationRecipient = config.email.notificationRecipient;

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
   * Built lazily so a test that injects both services never opens a database connection
   * or warns about an unconfigured one.
   */
  let defaults: { leadService: LeadService; subscriberService: SubscriberService } | undefined;
  const resolveDefaults = () => (defaults ??= createDefaultServices(config, logger));

  const leadService = options.leadService ?? resolveDefaults().leadService;
  const subscriberService = options.subscriberService ?? resolveDefaults().subscriberService;

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

  app.use(express.json({ limit: JSON_BODY_LIMIT }));

  const leadRateLimiter: RequestHandler | undefined =
    options.rateLimitEnabled === false
      ? undefined
      : createLeadRateLimiter({
          windowMs: config.rateLimit.windowMs,
          max: config.rateLimit.max,
          logger,
        });

  app.use(
    '/api',
    createApiRouter({
      leadService,
      subscriberService,
      playbookAutoSendEnabled: config.playbook.autoSendEnabled,
      leadRateLimiter,
      isProduction: config.isProduction,
      databaseConfigured: config.database.enabled,
      emailConfigured: config.email.enabled,
    }),
  );

  app.use(notFoundHandler);
  app.use(createErrorHandler({ logger, isProduction: config.isProduction }));

  return app;
}
