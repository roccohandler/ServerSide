import { Router, type RequestHandler } from 'express';
import { success } from '../../lib/apiResponse.js';
import { parseQuery, pathParam } from '../../lib/requestSchema.js';
import { z } from 'zod';
import { authorizeOwnership, requireCapability, requireRequestAuth } from '../auth/index.js';
import { parseSubmitAssessment } from './assessment.schema.js';
import type { AssessmentService } from './assessment.service.js';
import { toAssessmentView } from './assessment.types.js';

export interface AssessmentRoutesDependencies {
  readonly assessmentService: AssessmentService;
  readonly rateLimiter?: RequestHandler | undefined;
}

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

/**
 * `/api/app/assessments`.
 *
 * Every route here is authenticated. The anonymous half of the assessment happens
 * entirely in the browser — see the note at the top of `assessment.types.ts` — so there
 * is deliberately no public endpoint that accepts answers without an account.
 */
export function createAssessmentRouter(dependencies: AssessmentRoutesDependencies): Router {
  const { assessmentService, rateLimiter } = dependencies;
  const router = Router();

  const limited: RequestHandler[] = rateLimiter ? [rateLimiter] : [];

  router.post(
    '/',
    requireCapability('assessment:write:own'),
    ...limited,
    async (request, response) => {
      const auth = requireRequestAuth(request);
      const submission = parseSubmitAssessment(request.body);

      const { assessment, duplicate } = await assessmentService.submit({
        user: auth.user,
        submission,
      });

      /*
       * 200 rather than 201 for a duplicate, so a client that retried can tell the
       * difference without having to compare ids.
       */
      response
        .status(duplicate ? 200 : 201)
        .json(success({ assessment: toAssessmentView(assessment), duplicate }));
    },
  );

  router.get('/', requireCapability('assessment:read:own'), async (request, response) => {
    const auth = requireRequestAuth(request);
    const { limit } = parseQuery(listQuerySchema, request.query);

    /*
     * Scoped to the caller in the query itself, not filtered afterwards. There is no
     * parameter that widens it, so there is no version of this route that can return
     * somebody else's assessments.
     */
    const assessments = await assessmentService.listForUser(auth.user.id, limit);
    response.json(success({ assessments: assessments.map(toAssessmentView) }));
  });

  router.get('/latest', requireCapability('assessment:read:own'), async (request, response) => {
    const auth = requireRequestAuth(request);
    const assessment = await assessmentService.findLatestForUser(auth.user.id);
    response.json(success({ assessment: assessment ? toAssessmentView(assessment) : null }));
  });

  router.get('/:id', requireCapability('assessment:read:own'), async (request, response) => {
    const auth = requireRequestAuth(request);

    /*
     * The id-manipulation route. `authorizeOwnership` answers NOT_FOUND for both "no
     * such assessment" and "not yours", so a customer walking ids learns nothing about
     * which ones exist.
     */
    const assessment = authorizeOwnership({
      record: await assessmentService.findById(pathParam(request.params, 'id')),
      ownerId: (record) => record.userId,
      auth,
      overrideCapability: 'assessment:read:any',
      missingMessage: 'No assessment with that id.',
    });

    response.json(success({ assessment: toAssessmentView(assessment) }));
  });

  return router;
}
