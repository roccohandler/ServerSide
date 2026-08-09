import { Router, type RequestHandler } from 'express';
import { success } from '../lib/apiResponse.js';
import { createLeadRouter } from '../features/leads/lead.routes.js';
import type { LeadService } from '../features/leads/lead.service.js';

export interface ApiRouterDependencies {
  readonly leadService: LeadService;
  readonly leadRateLimiter?: RequestHandler | undefined;
  readonly isProduction: boolean;
  readonly databaseConfigured: boolean;
  readonly emailConfigured: boolean;
}

/**
 * Everything under `/api`. Kept separate from app assembly so the route table can be
 * read in one screen, and so adding a second feature is a one-line change.
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

  router.use(
    '/leads',
    createLeadRouter({
      leadService: dependencies.leadService,
      rateLimiter: dependencies.leadRateLimiter,
    }),
  );

  return router;
}
