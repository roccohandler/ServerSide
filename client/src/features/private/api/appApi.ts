import { httpGet, httpPost } from '../../../lib/http';
import type {
  ApiResult,
  BillingSummary,
  CommentThreadView,
  CustomerProduct,
  DashboardData,
  ProjectOverviewData,
  ProjectView,
  TaskView,
} from '../../../types/api';

/*
 * The authenticated application's endpoints.
 *
 * One module rather than one per feature, because there are eleven of them and each is
 * a single line — a folder of eleven files would be organisation for its own sake. If
 * any of these grows validation, retries or caching of its own, it moves out.
 *
 * Every path is under `/api/app`, which is the mount that carries `requireAuth`. There
 * is deliberately no function here that takes a customer id: the server derives it from
 * the session, and a parameter for it would be a parameter somebody could change.
 */

export function fetchDashboard(signal?: AbortSignal): Promise<ApiResult<DashboardData>> {
  return httpGet<DashboardData>('/api/app/dashboard', signal);
}

export function fetchProjects(
  signal?: AbortSignal,
): Promise<ApiResult<{ readonly projects: readonly ProjectView[] }>> {
  return httpGet('/api/app/projects', signal);
}

export function fetchProjectOverview(
  projectId: string,
  signal?: AbortSignal,
): Promise<ApiResult<ProjectOverviewData>> {
  return httpGet<ProjectOverviewData>(
    `/api/app/projects/${encodeURIComponent(projectId)}/overview`,
    signal,
  );
}

export function completeTask(
  projectId: string,
  taskId: string,
): Promise<ApiResult<{ readonly task: TaskView; readonly project: ProjectView }>> {
  return httpPost(
    `/api/app/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}/complete`,
  );
}

export function addComment(
  projectId: string,
  input: { readonly body: string; readonly parentId?: string },
): Promise<ApiResult<{ readonly feedback: readonly CommentThreadView[] }>> {
  return httpPost(`/api/app/projects/${encodeURIComponent(projectId)}/feedback`, input);
}

/**
 * The explicit approval.
 *
 * Its own endpoint rather than a status update, because "the customer approved this" is
 * a claim that has to be defensible later — the server records who, when and against
 * which deployment. A comment saying "looks good" does not come near this function.
 */
export function approveProject(
  projectId: string,
): Promise<ApiResult<{ readonly project: ProjectView }>> {
  return httpPost(`/api/app/projects/${encodeURIComponent(projectId)}/approve`);
}

export function requestChanges(
  projectId: string,
): Promise<ApiResult<{ readonly project: ProjectView }>> {
  return httpPost(`/api/app/projects/${encodeURIComponent(projectId)}/request-changes`);
}

export function fetchBilling(
  signal?: AbortSignal,
): Promise<ApiResult<{ readonly billing: BillingSummary }>> {
  return httpGet('/api/app/billing', signal);
}

/**
 * Starts a Checkout session and returns Stripe's hosted URL.
 *
 * Returning a URL rather than navigating is the point: nothing here marks anything as
 * paid, and the page that Stripe redirects back to does not either. The webhook is the
 * only thing that changes state.
 */
export function startCheckout(
  product: CustomerProduct,
): Promise<ApiResult<{ readonly url: string; readonly product: CustomerProduct }>> {
  return httpPost('/api/app/billing/checkout', { product });
}

/** A link into Stripe's own portal, which owns invoices, cards and cancellation. */
export function openBillingPortal(): Promise<ApiResult<{ readonly url: string }>> {
  return httpPost('/api/app/billing/portal');
}
