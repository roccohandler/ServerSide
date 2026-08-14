import { httpGet, httpPatch, httpPost } from '../../../lib/http';
import type {
  AdminAccountView,
  AdminProjectDetail,
  AdminProjectView,
  ApiResult,
  CommentThreadView,
  ProjectMilestone,
  TaskView,
} from '../../../types/api';

/*
 * ============================================================================
 * THE ADMIN ENDPOINTS
 * ============================================================================
 *
 * Every path is under `/api/admin`, which is the mount carrying `requireAdmin`. That
 * middleware answers **NOT_FOUND** rather than FORBIDDEN to anybody who is not staff, so a
 * customer who guesses a URL learns only that it does not exist.
 *
 * ## What this module is not
 *
 * It is not the authorization boundary and it is not a permission check. Nothing here decides
 * whether the caller may do anything — every function is a fetch, and the server decides. If
 * somebody deleted this file and typed the requests by hand into a terminal, the answers would
 * be identical. That is the property that makes the surface safe, and it is why there is no
 * `isAdmin` helper anywhere in the client that gates a request.
 *
 * ## Why there is no Stripe function here
 *
 * The owner-only billing endpoints are behind a bearer token in `BILLING_ADMIN_TOKEN`, not
 * behind the session — so calling them from a browser would mean shipping that token to the
 * browser. They stay operated with curl, and nothing in this file reaches them. Refunds,
 * checkout links and subscription changes are Stripe's business logic and the server's; a
 * React component must not become a second place where a payment decision is made.
 * ============================================================================
 */

export function fetchAdminProjects(
  signal?: AbortSignal,
): Promise<ApiResult<{ readonly projects: readonly AdminProjectView[] }>> {
  return httpGet('/api/admin/projects', signal);
}

export function fetchAdminProject(
  projectId: string,
  signal?: AbortSignal,
): Promise<ApiResult<AdminProjectDetail>> {
  return httpGet<AdminProjectDetail>(
    `/api/admin/projects/${encodeURIComponent(projectId)}`,
    signal,
  );
}

export function fetchAdminAccounts(
  signal?: AbortSignal,
): Promise<ApiResult<{ readonly accounts: readonly AdminAccountView[] }>> {
  return httpGet('/api/admin/accounts', signal);
}

/**
 * Moves a project's milestone.
 *
 * The server owns what a milestone change *means* — which activity entries it writes, what it
 * tells the customer, whether it is even a legal transition. This sends the value and nothing
 * else; there is deliberately no client-side transition table, because two copies of the rules
 * is one copy too many and the browser's would be the one nobody could trust.
 */
export function setAdminMilestone(
  projectId: string,
  milestone: ProjectMilestone,
): Promise<ApiResult<{ readonly project: AdminProjectView }>> {
  return httpPatch(`/api/admin/projects/${encodeURIComponent(projectId)}/milestone`, {
    milestone,
  });
}

export function setAdminUrls(
  projectId: string,
  input: { readonly previewUrl?: string; readonly productionUrl?: string },
): Promise<ApiResult<{ readonly project: AdminProjectView }>> {
  return httpPatch(`/api/admin/projects/${encodeURIComponent(projectId)}/urls`, input);
}

export function addAdminTask(
  projectId: string,
  input: {
    readonly kind: string;
    readonly title: string;
    /** Required by `addTaskSchema` on the server, not optional. */
    readonly description: string;
    readonly dueAt?: string;
  },
): Promise<ApiResult<{ readonly task: TaskView }>> {
  return httpPost(`/api/admin/projects/${encodeURIComponent(projectId)}/tasks`, input);
}

export function addAdminReply(
  projectId: string,
  input: { readonly body: string; readonly parentId?: string },
): Promise<ApiResult<{ readonly feedback: readonly CommentThreadView[] }>> {
  return httpPost(`/api/admin/projects/${encodeURIComponent(projectId)}/feedback`, input);
}

export function resolveAdminComment(
  projectId: string,
  commentId: string,
): Promise<ApiResult<{ readonly feedback: readonly CommentThreadView[] }>> {
  return httpPost(
    `/api/admin/projects/${encodeURIComponent(projectId)}/feedback/${encodeURIComponent(commentId)}/resolve`,
  );
}
