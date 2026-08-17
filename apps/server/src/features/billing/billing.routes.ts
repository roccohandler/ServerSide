import { timingSafeEqual } from 'node:crypto';
import { Router, type RequestHandler } from 'express';
import { AppError } from '../../lib/appError.js';
import { success } from '../../lib/apiResponse.js';
import { redactEmail, type Logger } from '../../lib/logger.js';
import { requireAdmin, requireRequestAuth } from '../auth/index.js';
import type { BillingService } from './billing.service.js';
import {
  parseCreateCheckoutSession,
  parseCreatePortalSession,
  parseCreateProject,
  parseListProjectsQuery,
  parseRecordGuaranteeCredit,
  parseSetProjectStatus,
} from './billing.schema.js';

export interface BillingRoutesDependencies {
  readonly billingService: BillingService;
  /**
   * The owner's token, from `BILLING_ADMIN_TOKEN`. Undefined means the owner-facing
   * endpoints are switched off entirely — they 503 with an instruction rather than
   * silently accepting unauthenticated requests.
   */
  readonly adminToken: string | undefined;
  /** Where the attribution line is written. See `createAttribution`. */
  readonly logger: Logger;
}

/** Constant-time comparison, so the token cannot be guessed byte by byte. */
function tokensMatch(candidate: string, expected: string): boolean {
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function createAdminAuth(adminToken: string | undefined): RequestHandler {
  return (request, _response, next) => {
    if (!adminToken) {
      next(
        new AppError(
          'SERVICE_UNAVAILABLE',
          'Billing administration is not configured. Set BILLING_ADMIN_TOKEN.',
        ),
      );
      return;
    }

    const header = request.header('authorization') ?? '';
    const candidate = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';

    if (!candidate || !tokensMatch(candidate, adminToken)) {
      /*
       * NOT_FOUND rather than a 401: these endpoints exist for one person, and an
       * unauthenticated probe learns nothing — not even that there is something here
       * to authenticate against.
       */
      next(new AppError('NOT_FOUND', 'Not found.'));
      return;
    }

    next();
  };
}

/**
 * Who did it.
 *
 * The half of DECISION 019 that the session actually buys. A token authorises a *request*;
 * a session identifies a *person*, and these are the endpoints where the difference matters —
 * every one of them below moves money or the record of it.
 *
 * State-changing methods only. A `GET /projects` is somebody reconciling, and an attribution
 * line per read would bury the five that are about money under a stream that is not.
 *
 * The line goes to the log rather than to the activity stream, and that is not a shortcut:
 * a project reached through this surface may have no `ownerUserId` at all — it predates the
 * account it will eventually belong to — and an activity entry with no account behind it is
 * one nobody can ever be shown. The console's checkout links write activity as well, because
 * there the project is resolved and its stream exists.
 */
function createAttribution(logger: Logger): RequestHandler {
  return (request, _response, next) => {
    if (request.method === 'GET') {
      next();
      return;
    }

    const auth = requireRequestAuth(request);

    logger.info('billing.admin_operation', {
      actorId: auth.user.id,
      actorEmail: redactEmail(auth.user.email),
      method: request.method,
      path: `${request.baseUrl}${request.path}`,
    });

    next();
  };
}

/**
 * The owner-facing billing endpoints. A staff **session** and the admin **token**, both.
 *
 * ## Two guards, and the order is load-bearing — DECISION 019, option B
 *
 * The token used to be the only thing standing here. It authorises the request and identifies
 * nobody, which made the most consequential endpoints in the application the least attributable
 * ones: an action taken through them could not be traced to a person, and a leaked token was
 * indistinguishable from the owner. `requireAdmin` alongside it fixes that at the cost of one
 * cookie on a curl command.
 *
 * `requireAdmin` runs **first**, deliberately. It answers NOT_FOUND to everybody who is not
 * staff, so the token comparison and — more importantly — the "set BILLING_ADMIN_TOKEN" 503
 * are both reached only by somebody already signed in. Ordered the other way, an anonymous
 * prober on an unconfigured deployment would be told there is a billing surface here and what
 * it is waiting for.
 *
 * The Stripe webhook is deliberately NOT here — it needs the raw request body for signature
 * verification, so it is wired in `app.ts` before the JSON body parser, and it authenticates
 * by signature rather than by either of these.
 */
export function createBillingRouter(dependencies: BillingRoutesDependencies): Router {
  const { billingService, adminToken, logger } = dependencies;
  const router = Router();

  router.use(requireAdmin, createAdminAuth(adminToken), createAttribution(logger));

  router.post('/projects', async (request, response) => {
    const input = parseCreateProject(request.body);
    const project = await billingService.createProject(input);
    response.status(201).json(success({ project }));
  });

  // Recent first. Exists so a mislaid project id never requires opening the database.
  router.get('/projects', async (request, response) => {
    const { limit } = parseListProjectsQuery(request.query);
    const projects = await billingService.listProjects(limit);
    response.json(success({ projects }));
  });

  router.get('/projects/:id', async (request, response) => {
    const project = await billingService.getProject(request.params.id ?? '');
    response.json(success({ project }));
  });

  router.patch('/projects/:id', async (request, response) => {
    const { status } = parseSetProjectStatus(request.body);
    const project = await billingService.setProjectStatus(request.params.id ?? '', status);
    response.json(success({ project }));
  });

  router.post('/checkout-sessions', async (request, response) => {
    const input = parseCreateCheckoutSession(request.body);
    const session = await billingService.createCheckoutSession(input);
    response.status(201).json(success(session));
  });

  /*
   * A Stripe customer-portal link for a project's client — invoices, payment methods
   * and subscription management on Stripe's hosted page, so none of it has to be built
   * (or secured) here. The owner requests the link and sends it to the client.
   */
  router.post('/portal-sessions', async (request, response) => {
    const input = parseCreatePortalSession(request.body);
    const session = await billingService.createPortalSession(input);
    response.status(201).json(success(session));
  });

  /*
   * The response-guarantee remedy: the owner records a missed month and Stripe
   * credits (or, for a leaving client, refunds) that month's fee. Owner-only like
   * everything else here — a client browser can never award itself a credit.
   */
  router.post('/guarantee-credits', async (request, response) => {
    const input = parseRecordGuaranteeCredit(request.body);
    const credit = await billingService.recordGuaranteeCredit(input);
    response.status(201).json(success({ credit }));
  });

  return router;
}
