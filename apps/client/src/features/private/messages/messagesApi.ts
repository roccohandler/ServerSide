import { httpGet, httpPost } from '../../../lib/http';
import type { ApiResult, CommentThreadView } from '@jobforge/shared';

/**
 * Both endpoints return the whole thread list, and that is deliberate.
 *
 * A send could return only the message it wrote and the screen could splice it in — which is
 * one fewer field on the wire and one more list the browser is maintaining a private opinion
 * about. The same contract as `/projects/:id/feedback`, because it is the same object.
 */
export interface MessagesResponse {
  readonly messages: readonly CommentThreadView[];
}

export function fetchMessages(signal?: AbortSignal): Promise<ApiResult<MessagesResponse>> {
  return httpGet('/api/app/messages', signal);
}

/**
 * No id in the path and no account in the body. The scope is the session — see the header of
 * `message.routes.ts` for why that is a stronger property than an ownership check.
 */
export function sendMessage(body: string, parentId?: string): Promise<ApiResult<MessagesResponse>> {
  return httpPost('/api/app/messages', parentId ? { body, parentId } : { body });
}
