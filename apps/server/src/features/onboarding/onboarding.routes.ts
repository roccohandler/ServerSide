import { Router, type RequestHandler } from 'express';
import { success } from '../../lib/apiResponse.js';
import { parseOnboardingRequest } from './onboarding.schema.js';
import type { OnboardingService } from './onboarding.service.js';

export interface OnboardingRoutesDependencies {
  readonly onboardingService: OnboardingService;
  /** Shared with the lead endpoint: it is another unauthenticated public POST. */
  readonly rateLimiter?: RequestHandler | undefined;
}

export function createOnboardingRouter(dependencies: OnboardingRoutesDependencies): Router {
  const router = Router();
  const middleware = dependencies.rateLimiter ? [dependencies.rateLimiter] : [];

  router.post('/', ...middleware, async (request, response) => {
    const input = parseOnboardingRequest(request.body);
    const outcome = await dependencies.onboardingService.submit(input);

    /*
     * One response for both outcomes. A caught bot and a stored submission are
     * indistinguishable from outside, for the same reason as the other public POSTs.
     */
    const receivedAt = outcome.kind === 'created' ? outcome.onboarding.createdAt : new Date();

    response.status(202).json(success({ receivedAt: receivedAt.toISOString() }));
  });

  return router;
}
