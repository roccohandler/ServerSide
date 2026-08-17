import { httpGet } from '../../../lib/http';
import type { ApiResult, ReportView } from '@jobforge/shared';

/*
 * One endpoint, and there is deliberately no second one.
 *
 * A report is a paragraph and three short lists — the whole thing arrives in the list
 * response, so a `GET /reports/:id` would be a round trip for text the browser already has.
 * If they ever grow attachments, that is the moment for one.
 */
export function fetchReports(
  signal?: AbortSignal,
): Promise<ApiResult<{ readonly reports: readonly ReportView[] }>> {
  return httpGet('/api/app/reports', signal);
}
