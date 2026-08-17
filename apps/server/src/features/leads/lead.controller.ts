import type { RequestHandler } from 'express';
import { parseLeadRequest } from './lead.schema.js';
import type { LeadService } from './lead.service.js';

export interface LeadSubmissionResponse {
  readonly submittedAt: string;
}

export interface LeadControllerDependencies {
  readonly leadService: LeadService;
}

/**
 * HTTP concerns only: read the body, hand it to the domain, shape a response.
 *
 * Errors are thrown rather than handled here. Express 5 forwards rejected promises to
 * the central error handler, which owns the mapping from error to status code — so
 * there is exactly one place that decides what a visitor is allowed to see.
 */
export function createLeadController(dependencies: LeadControllerDependencies): {
  submit: RequestHandler;
} {
  const { leadService } = dependencies;

  return {
    submit: async (request, response) => {
      const input = parseLeadRequest(request.body);
      const outcome = await leadService.submit(input);

      /*
       * Every accepted submission gets the same 202 and the same body.
       *
       * A caught bot and a duplicate must be indistinguishable from a stored lead,
       * otherwise the response itself tells a spammer which of their tricks worked.
       * 202 rather than 201 because notification delivery is not guaranteed by the
       * time we answer — see the tradeoff documented in lead.service.ts.
       */
      const submittedAt = outcome.kind === 'discarded' ? new Date() : outcome.lead.createdAt;

      response.status(202).json({
        success: true,
        data: { submittedAt: submittedAt.toISOString() } satisfies LeadSubmissionResponse,
      });
    },
  };
}
