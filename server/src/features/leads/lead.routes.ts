import { Router, type RequestHandler } from 'express';
import { createLeadController } from './lead.controller.js';
import type { LeadService } from './lead.service.js';

export interface LeadRoutesDependencies {
  readonly leadService: LeadService;
  /** Applied to POST only, so a future GET is not silently rate limited too. */
  readonly rateLimiter?: RequestHandler | undefined;
}

export function createLeadRouter(dependencies: LeadRoutesDependencies): Router {
  const router = Router();
  const controller = createLeadController({ leadService: dependencies.leadService });

  const middleware = dependencies.rateLimiter ? [dependencies.rateLimiter] : [];

  router.post('/', ...middleware, controller.submit);

  return router;
}
