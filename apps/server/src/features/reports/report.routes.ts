import { Router } from 'express';
import { success } from '../../lib/apiResponse.js';
import { requireRequestAuth } from '../auth/index.js';
import type { ReportService } from './report.service.js';
import { toReportView } from './report.types.js';

/**
 * How many months a customer's Reports screen goes back.
 *
 * Two years. These are permanent — DECISION 015 says the report is the customer's record of
 * what they bought — so the bound is a page size rather than a retention policy, and it is
 * generous enough that nobody on Growth Partner reaches the end of it.
 */
const REPORT_HISTORY = 24;

export interface ReportRoutesDependencies {
  readonly reportService: ReportService;
}

/*
 * `/api/app/reports`. Read-only, and scoped to the caller.
 *
 * There is no `:id` route. A report is a paragraph and three short lists — the whole thing
 * fits in the list response, and a detail endpoint would be a second query for text the
 * browser already has. If they ever grow attachments, that is the moment for one.
 */
export function createReportRouter(dependencies: ReportRoutesDependencies): Router {
  const { reportService } = dependencies;
  const router = Router();

  router.get('/', async (request, response) => {
    const auth = requireRequestAuth(request);
    const reports = await reportService.listPublishedForUser(auth.user.id, REPORT_HISTORY);

    /*
     * Filtered again here, not only in the query.
     *
     * `listPublishedForUser` already asks for published rows, so this narrowing is
     * belt-and-braces — but `toReportView` requires a `publishedAt` in its type, and the
     * filter is what makes that requirement true at the boundary rather than asserted with a
     * cast. A draft reaching a customer is the one failure this feature must not have.
     */
    response.json(
      success({
        reports: reports
          .filter(
            (report): report is typeof report & { publishedAt: Date } =>
              report.publishedAt !== undefined,
          )
          .map(toReportView),
      }),
    );
  });

  return router;
}
