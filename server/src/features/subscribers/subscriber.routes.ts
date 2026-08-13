import { Router, type RequestHandler } from 'express';
import { createSubscriberController } from './subscriber.controller.js';
import type { SubscriberService } from './subscriber.service.js';

export interface SubscriberRoutesDependencies {
  readonly subscriberService: SubscriberService;
  /** True when `PLAYBOOK_PDF_URL` is configured. Decides which confirmation the client shows. */
  readonly autoSendEnabled: boolean;
  /** Applied to POST only, so a future GET is not silently rate limited too. */
  readonly rateLimiter?: RequestHandler | undefined;
}

export function createSubscriberRouter(dependencies: SubscriberRoutesDependencies): Router {
  const router = Router();
  const controller = createSubscriberController({
    subscriberService: dependencies.subscriberService,
    autoSendEnabled: dependencies.autoSendEnabled,
  });

  const middleware = dependencies.rateLimiter ? [dependencies.rateLimiter] : [];

  router.post('/', ...middleware, controller.subscribe);

  return router;
}
