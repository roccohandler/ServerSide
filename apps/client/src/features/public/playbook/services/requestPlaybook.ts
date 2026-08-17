import { httpPost } from '../../../../lib/http';
import type { ApiResult, SubscriberRequest, SubscriptionData } from '@jobforge/shared';

/**
 * Asks for the PlayBook workbook.
 *
 * The server stores the request and notifies the owner, who sends the workbook. Nothing is
 * auto-delivered, and the success copy on the page says so in those terms — a confirmation
 * implying an automatic email would be describing a feature that does not exist.
 */
export async function requestPlaybook(
  payload: SubscriberRequest,
): Promise<ApiResult<SubscriptionData>> {
  return httpPost<SubscriptionData>('/api/subscribers', payload);
}
