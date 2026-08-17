import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import { AppError } from '../../lib/appError.js';
import { success } from '../../lib/apiResponse.js';
import { parseBody } from '../../lib/requestSchema.js';
import { setSessionCookie, type CookieOptions } from '../auth/auth.cookies.js';
import { requireAuth, requireRequestAuth, toPublicUser } from '../auth/index.js';
import type { DemoService } from './demo.service.js';
import { DEMO_FEEDBACK_CATEGORIES, DEMO_FEEDBACK_LIMITS } from './demo.types.js';

/*
 * ============================================================================
 * `/api/demo`
 * ============================================================================
 *
 * Three routes, and the mount itself is the first control: `app/routes.ts` registers this
 * router **only when `DEMO_PASSCODE` is set**. An unconfigured deployment therefore has a
 * genuine 404 here rather than an endpoint that answers "not configured", which is the same
 * shape `/api/cron` uses and for the same reason — the feature cannot be half-on, and an
 * attacker cannot learn from the response that a demo exists somewhere.
 *
 * ## Two of the three are behind `requireAuth`
 *
 * `enter` is public by definition: its whole job is to hand a session to somebody who has
 * none. `reset` and `feedback` are behind the same `requireAuth` every customer route uses,
 * and `reset` is additionally refused in the *service* for any account without `demo` — the
 * route guard says who may call it, the service guard says what it may touch, and neither is
 * sufficient alone.
 *
 * ## There is no `/api/demo/exit`
 *
 * Signing out is `POST /api/auth/signout`. A demo session is an ordinary session, so a
 * demo-specific logout would be a second implementation of the one thing this feature most
 * needs to get right.
 * ============================================================================
 */

const enterSchema = z.strictObject({
  /* Bounded so a paste accident cannot reach the comparison with a megabyte. */
  passcode: z.string().min(1).max(200),
});

const simulatePaymentSchema = z.strictObject({
  /*
   * Which half, and nothing else. No amount and no project id: the amount is the published
   * one and the project is resolved from the session, exactly as the real self-serve path
   * does it. A body that could name either would be a demo endpoint with a laxer rule than
   * the thing it demonstrates.
   */
  stage: z.enum(['deposit', 'final']),
});

const feedbackSchema = z.strictObject({
  body: z.string().trim().min(1).max(DEMO_FEEDBACK_LIMITS.body),
  category: z.enum(DEMO_FEEDBACK_CATEGORIES),
  route: z.string().trim().min(1).max(DEMO_FEEDBACK_LIMITS.route),
});

export interface DemoRoutesDependencies {
  readonly demoService: DemoService;
  readonly cookieOptions: CookieOptions;
  /**
   * The credential budget, not the lead one.
   *
   * `authRateLimiter`'s comment says every endpoint it covers is an attempt to guess a
   * secret, and this is exactly that. The brief asks for rate limiting and failed-attempt
   * throttling; this is both, on a limiter that already exists and is already tested.
   */
  readonly rateLimiter?: RequestHandler | undefined;
}

export function createDemoRouter(dependencies: DemoRoutesDependencies): Router {
  const { demoService, cookieOptions, rateLimiter } = dependencies;
  const router = Router();

  router.post('/enter', ...(rateLimiter ? [rateLimiter] : []), async (request, response) => {
    const { passcode } = parseBody(enterSchema, request.body);
    const session = await demoService.enter(passcode);

    /*
     * The same cookie the customer application uses, set the same way, with a shorter
     * expiry. `setSessionCookie` takes the session's own `expiresAt`, so the browser
     * forgets it at the same moment the server does.
     */
    setSessionCookie(response, session.token, {
      ...cookieOptions,
      expiresAt: session.expiresAt,
    });

    response.json(success({ user: toPublicUser(session.user) }));
  });

  const authed = Router();
  authed.use(requireAuth);

  authed.post('/reset', async (request, response) => {
    const auth = requireRequestAuth(request);
    await demoService.reset(auth.user);
    response.status(204).end();
  });

  /*
   * The simulated payment. Stripe is contacted zero times on this path, by construction —
   * see `DemoService.simulatePayment` for the invariant it deliberately does not weaken.
   */
  authed.post('/payments', async (request, response) => {
    const auth = requireRequestAuth(request);
    const { stage } = parseBody(simulatePaymentSchema, request.body);

    await demoService.simulatePayment({ user: auth.user, stage });
    response.status(204).end();
  });

  /*
   * Feedback survives a reset, and that is deliberate — see the note on `DemoRepository`.
   * A reset that threw away the bug report somebody had just filed would be the worst
   * possible behaviour for the feature whose entire purpose is collecting them.
   */
  authed.post('/feedback', async (request, response) => {
    const auth = requireRequestAuth(request);

    /*
     * The same service-level check `reset` makes. A real customer reaching this endpoint
     * would be filing tester notes into a list the owner reads as demo feedback, which is
     * confusing rather than dangerous — but the rule is that a demo-scoped operation checks
     * the flag on the server, and a rule with an exception is not a rule.
     */
    if (!auth.user.demo) throw new AppError('NOT_FOUND', 'No such operation.');

    const input = parseBody(feedbackSchema, request.body);
    const feedback = await demoService.recordFeedback(input);

    response.status(201).json(success({ id: feedback.id }));
  });

  router.use(authed);

  return router;
}
