import { Router } from 'express';
import { success } from '../../lib/apiResponse.js';
import { requireRequestAuth } from '../auth/index.js';
import { parseCustomerRequest } from './lead.schema.js';
import type { LeadService } from './lead.service.js';

export interface CustomerLeadRoutesDependencies {
  readonly leadService: LeadService;
}

/*
 * ============================================================================
 * `POST /api/app/assessment-request`
 * ============================================================================
 *
 * The second half of the account-first funnel. The account was created at
 * `/get-my-assessment`; this is where the rest of the request arrives. See
 * `docs/ACCOUNT-FIRST-CAPTURE.md` and DECISION 028.
 *
 * ## Why this is a second router rather than a flag on `/api/leads`
 *
 * Because the two endpoints answer to different rules, and the difference is the identity.
 *
 * `/api/leads` is anonymous, public, honeypotted and rate limited by IP, and everything it
 * knows about the sender is a claim in the body. Making it *also* accept an authenticated
 * submission would mean one handler where `name` and `email` are sometimes trusted from the
 * session and sometimes from the request — and the branch deciding which would be the most
 * security-relevant `if` in the codebase, sitting inside a handler nobody reads twice.
 *
 * Two routers means the trust rule is the mount rather than a conditional: this one is
 * inside `/app`, behind `requireAuth`, and the schema it parses has no identity fields in it
 * at all. `billing.customer.routes.ts` is the same shape for the same reason.
 *
 * ## Why there is no rate limiter here
 *
 * The public endpoint's limiter exists because anybody on the internet can POST to it. This
 * one costs an account first, the duplicate window in `LeadService` already collapses a
 * double-tap into one record, and a signed-in customer sending two genuine requests is
 * somebody with two questions rather than an attack. If that ever stops being true the
 * limiter goes here, keyed on the account rather than the connection.
 * ============================================================================
 */
export function createCustomerLeadRouter(dependencies: CustomerLeadRoutesDependencies): Router {
  const { leadService } = dependencies;
  const router = Router();

  router.post('/', async (request, response) => {
    const auth = requireRequestAuth(request);
    const input = parseCustomerRequest(request.body);

    const outcome = await leadService.submitForCustomer({ user: auth.user, input });

    /*
     * A duplicate answers exactly as a creation does, and the status code is the same.
     *
     * The alternative — a 409, or a different body — would put the customer in front of an
     * error for having pressed a button twice on a slow connection, about a request that is
     * safely stored. The public controller makes the same call for the same reason.
     */
    response.status(201).json(
      success({
        submittedAt: (outcome.kind === 'discarded'
          ? new Date()
          : outcome.lead.createdAt
        ).toISOString(),
      }),
    );
  });

  return router;
}
