import { httpDelete, httpGet, httpPost } from '../../../lib/http';
import type {
  ApiResult,
  AssessmentRequestSubmission,
  BillingSummary,
  CommentThreadView,
  CustomerProduct,
  DashboardData,
  FileView,
  LeadSubmissionData,
  ProjectOverviewData,
  ProjectView,
  TaskView,
  UnreadSummary,
  UploadTicket,
} from '@jobforge/shared';

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

/**
 * The second half of the account-first funnel — the four questions the account cannot
 * answer. See DECISION 028.
 *
 * The submission carries no name and no email address, and that is the contract rather than
 * an omission: the server takes both from the session, and its schema refuses a body that
 * mentions either. There is nothing here a caller could set to file a request as somebody
 * else, which is the same rule every other function in this file follows.
 */
export function submitAssessmentRequest(
  submission: AssessmentRequestSubmission,
): Promise<ApiResult<LeadSubmissionData>> {
  return httpPost<LeadSubmissionData>('/api/app/assessment-request', submission);
}

/**
 * Marks the activity stream caught up, as of now.
 *
 * Only the dashboard calls this, because the dashboard is the one screen where the entries
 * are actually on the page. The *count* is read somewhere else entirely — `session/useUnread`
 * owns it, because the shell renders it and shared UI may not import a feature. The two are
 * not a split of one thing: this is an act the reader performs, that is state the shell holds.
 *
 * The failure case is deliberately uninteresting. A mark that does not land means the same
 * items are announced once more, which is the harmless direction of the two.
 */
export function markActivityRead(): Promise<ApiResult<UnreadSummary>> {
  return httpPost<UnreadSummary>('/api/app/activity/read');
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

/**
 * Agreeing to the scope and the price. DECISION 040.
 *
 * Its own endpoint for the same reason `approveProject` is: "they agreed to this, on this
 * date, at this version" is a claim that has to be defensible later, and the server is what
 * records it. There is deliberately no counterpart for withdrawing — what supersedes an
 * acceptance is a new version, which only the owner can send.
 */
export function acceptScope(
  projectId: string,
): Promise<ApiResult<{ readonly project: ProjectView }>> {
  return httpPost(`/api/app/projects/${encodeURIComponent(projectId)}/scope/accept`);
}

/* ------------------------------------------------------------------- files */

/**
 * Step one of an upload: ask permission and get somewhere to put it.
 *
 * The server decides the path and mints a token scoped to this one file, this one type and
 * one minute. The browser never chooses where a file lands — see `file.service.ts` for why
 * that is the check rather than a convention.
 */
export function prepareUpload(
  projectId: string,
  input: { readonly filename: string; readonly contentType: string },
): Promise<ApiResult<UploadTicket>> {
  return httpPost(`/api/app/projects/${encodeURIComponent(projectId)}/files/token`, input);
}

/**
 * Step three: tell the server the upload finished.
 *
 * Safe to retry. The server verifies the pathname against the store and the row is unique on
 * it, so a second confirmation returns the file that is already there rather than duplicating
 * it — which is what makes it worth retrying at all.
 */
export function confirmUpload(
  projectId: string,
  input: { readonly pathname: string; readonly filename: string; readonly taskId?: string },
): Promise<ApiResult<{ readonly file: FileView }>> {
  return httpPost(`/api/app/projects/${encodeURIComponent(projectId)}/files`, input);
}

export function deleteFile(projectId: string, fileId: string): Promise<ApiResult<unknown>> {
  return httpDelete(
    `/api/app/projects/${encodeURIComponent(projectId)}/files/${encodeURIComponent(fileId)}`,
  );
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
