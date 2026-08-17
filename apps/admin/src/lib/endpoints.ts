import type {
  AdminAccountListData,
  AdminAssessmentView,
  AdminOnboardingListData,
  AdminProjectDetail,
  AdminProjectListData,
  AdminProjectStatus,
  AdminProjectView,
  AdminReportView,
  ApiResult,
  AssessmentFindingSeverity,
  CommentThreadView,
  ConversationListData,
  FileView,
  OnboardingView,
  ProjectMilestone,
  TaskView,
  UploadTicket,
} from '@jobforge/shared';
import { get, patch, post, put, remove } from './api';

/*
 * ============================================================================
 * EVERY ENDPOINT THE CONSOLE CALLS
 * ============================================================================
 *
 * All of them under `/api/admin`, which is the mount carrying `requireAdmin`. That
 * middleware answers **NOT_FOUND** rather than FORBIDDEN to anybody who is not staff, so a
 * customer who guesses a URL learns only that it does not exist.
 *
 * ## This module is not the authorization boundary
 *
 * Nothing here decides whether the caller may do anything. Every function is a fetch, and
 * the server decides. If somebody deleted this file and typed the requests into a terminal
 * the answers would be identical — which is the property that makes shipping this console
 * to a browser safe, and why there is no `isAdmin` helper anywhere in it that gates a
 * request.
 *
 * ## Why there is still no Stripe function here, and what changed
 *
 * The rule this note has always stated is unchanged and is the important half: **a React
 * component must never become a second place where a payment decision is made.** Refunds,
 * amounts, Price verification and subscription changes are Stripe's business logic and the
 * server's.
 *
 * What it used to say alongside that was narrower than the rule — that the owner-only billing
 * endpoints sit behind `BILLING_ADMIN_TOKEN` rather than the session, so calling them from a
 * browser would mean shipping the token to one, and therefore *they stay operated with curl*.
 * Both halves of that are still true and the conclusion no longer follows, because
 * `createCheckoutLink` below does not call them. It calls `/api/admin`, which is behind the
 * session the console already holds, and the server decides everything: which Price, whether
 * the Price agrees with the published figure, whether a link may be created at all. The console
 * sends a product name and gets a URL back.
 *
 * **No Stripe key reaches this bundle, and none ever may.** That is the property the original
 * note was protecting, and honouring it did not require the operation to stay in a terminal.
 * See DECISION 019, which kept the token surface for the operations that genuinely have no
 * screen — statuses, guarantee credits, reconciliation.
 * ============================================================================
 */

/* ------------------------------------------------------------- conversations */

/*
 * ============================================================================
 * ONE PAGE OF A LIST, AND THE LIMIT AS AN ARGUMENT
 * ============================================================================
 *
 * All three list fetchers take a `limit` now, because all three lists are bounded and the
 * console's "Show more" control works by asking for a bigger prefix rather than by asking
 * for an offset.
 *
 * That choice is the one worth explaining here rather than at the call site. The inbox is a
 * **merged read model** over leads and change requests, sorted oldest-first, and rows arrive
 * continuously while somebody is reading. An offset window over a list that shifts underneath
 * it can skip a row entirely — and the row it skips is a person waiting for a reply. Asking
 * for a *larger prefix of the same query* cannot skip anything: the rows already on screen
 * are re-fetched, and the new ones land behind them.
 *
 * The cost is one request's worth of rows the console already had, at a scale where fifty
 * more rows is a few kilobytes. The other two lists take the same shape for consistency,
 * because three list pages that page in two different ways is how one of them gets it wrong.
 * ============================================================================
 */
export function fetchConversations(
  limit: number,
  signal?: AbortSignal,
): Promise<ApiResult<ConversationListData>> {
  return get(`/admin/conversations?limit=${limit}`, signal);
}

/**
 * Sends a reply.
 *
 * `conversationId` is qualified — `lead:<id>` or `comment:<id>` — and passed straight back
 * to the server untouched. Whether that becomes an email or a comment on somebody's
 * project is the server's decision, because the server is the only side that knows whether
 * the person has a portal to receive it in.
 */
export function sendReply(conversationId: string, body: string): Promise<ApiResult<unknown>> {
  return post(`/admin/conversations/${encodeURIComponent(conversationId)}/replies`, { body });
}

/* ------------------------------------------------------------------ projects */

/*
 * ============================================================================
 * SEARCH IS A PARAMETER ON THE LIST, NOT A SECOND ENDPOINT
 * ============================================================================
 *
 * `q` narrows the same bounded, newest-first query the list already makes, so "Show more"
 * keeps working while a search is active and `hasMore` keeps meaning the same thing. A
 * separate `/search` route would have been a second query with a second answer to "is this
 * complete", and the two would disagree the first time either was changed.
 *
 * The server anchors and escapes it — see `lib/search.ts` there. It is a **prefix** match,
 * which is a real limit worth knowing at the call site: typing "heating" does not find
 * "Cascade Heating". It is what an index can serve, and it is what somebody typing a name
 * into a box actually means.
 */
export function fetchProjects(
  limit: number,
  search?: string,
  signal?: AbortSignal,
): Promise<ApiResult<AdminProjectListData>> {
  return get(`/admin/projects?limit=${limit}${searchParam(search)}`, signal);
}

/** Appends `&q=…`, encoded, or nothing at all. Empty and whitespace both mean "no filter". */
function searchParam(search: string | undefined): string {
  const trimmed = search?.trim();
  return trimmed ? `&q=${encodeURIComponent(trimmed)}` : '';
}

/**
 * Brings a project into existence for a scope agreed off-platform.
 *
 * `ownerEmail` is optional and is an **account** address — supplying it attaches the project
 * to that account, which seeds their onboarding tasks and emails them. Leaving it out creates
 * the project unowned, which is a real state: a scope can be agreed before a client signs up.
 */
export function createProject(input: {
  readonly businessName: string;
  readonly contactName: string;
  readonly email: string;
  readonly phone?: string;
  readonly notes?: string;
  readonly ownerEmail?: string;
}): Promise<ApiResult<{ readonly project: AdminProjectView }>> {
  return post('/admin/projects', input);
}

/**
 * Attaches an account to a project, or — with `null` — detaches one.
 *
 * Attaching is not a field write and the server does not treat it as one: it seeds the
 * onboarding tasks, writes the entry that starts the customer's own history, and sends the
 * email telling them what is needed. See `attachOwner` on the server.
 */
export function setProjectOwner(
  projectId: string,
  email: string | null,
): Promise<ApiResult<{ readonly project: AdminProjectView }>> {
  return patch(`/admin/projects/${encodeURIComponent(projectId)}/owner`, { email });
}

/**
 * Corrects the description of a project — who the client is, how to reach them, the note, and
 * the commercial label.
 *
 * Deliberately cannot reach `milestone` or any payment status. The first has its own endpoint
 * because moving it *means* something; the second belongs to Stripe.
 */
export function updateProject(
  projectId: string,
  changes: {
    readonly businessName?: string;
    readonly contactName?: string;
    readonly email?: string;
    readonly phone?: string;
    readonly notes?: string;
    readonly status?: AdminProjectStatus;
  },
): Promise<ApiResult<{ readonly project: AdminProjectView }>> {
  return patch(`/admin/projects/${encodeURIComponent(projectId)}`, changes);
}

export function fetchProject(
  projectId: string,
  signal?: AbortSignal,
): Promise<ApiResult<AdminProjectDetail>> {
  return get(`/admin/projects/${encodeURIComponent(projectId)}`, signal);
}

/**
 * Moves a project's milestone.
 *
 * The server owns what a milestone change *means* — which activity entries it writes, what
 * it tells the customer, whether it is even a legal transition. This sends the value and
 * nothing else; there is deliberately no client-side transition table, because two copies
 * of the rules is one too many and the browser's is the one nobody could trust.
 */
export function setMilestone(
  projectId: string,
  milestone: ProjectMilestone,
): Promise<ApiResult<{ readonly project: AdminProjectView }>> {
  return patch(`/admin/projects/${encodeURIComponent(projectId)}/milestone`, { milestone });
}

/**
 * Puts a milestone back, within fifteen minutes of it being moved.
 *
 * `changedAt` is when the console made the change, which is the only side that knows it — the
 * stored record has already moved. The server checks it against its own clock and refuses
 * anything outside the window, so this is a hint rather than an authority.
 */
export function undoMilestone(
  projectId: string,
  previous: ProjectMilestone,
  changedAt: Date,
): Promise<ApiResult<{ readonly project: AdminProjectView }>> {
  return patch(`/admin/projects/${encodeURIComponent(projectId)}/milestone/undo`, {
    milestone: previous,
    changedAt: changedAt.toISOString(),
  });
}

/**
 * A Stripe Checkout link for one half of the build, optionally emailed to the client.
 *
 * The server verifies the configured Stripe Price against the published figure before it
 * creates anything, and refuses with a 503 whose message names the product and both amounts.
 * That message is written for whoever deployed this and the panel renders it verbatim — see
 * `CheckoutLinkPanel`.
 *
 * `emailedTo` is the address a message was **built for**, never a delivery confirmation. The
 * notifier swallows its own failures by contract, so nothing on either side of this call can
 * honestly claim more than that, and the wording says so.
 */
export function createCheckoutLink(
  projectId: string,
  input: { readonly product: 'build-deposit' | 'build-final'; readonly notifyCustomer: boolean },
): Promise<
  ApiResult<{
    readonly url: string;
    readonly product: string;
    readonly emailedTo: string | null;
  }>
> {
  return post(`/admin/projects/${encodeURIComponent(projectId)}/checkout-link`, input);
}

export function setUrls(
  projectId: string,
  input: { readonly previewUrl?: string; readonly productionUrl?: string },
): Promise<ApiResult<{ readonly project: AdminProjectView }>> {
  return patch(`/admin/projects/${encodeURIComponent(projectId)}/urls`, input);
}

export function addTask(
  projectId: string,
  input: {
    readonly kind: string;
    readonly title: string;
    /** Required by `addTaskSchema` on the server, not optional. */
    readonly description: string;
    readonly dueAt?: string;
  },
): Promise<ApiResult<{ readonly task: TaskView }>> {
  return post(`/admin/projects/${encodeURIComponent(projectId)}/tasks`, input);
}

export function addReply(
  projectId: string,
  input: { readonly body: string; readonly parentId?: string },
): Promise<ApiResult<{ readonly feedback: readonly CommentThreadView[] }>> {
  return post(`/admin/projects/${encodeURIComponent(projectId)}/feedback`, input);
}

export function resolveComment(
  projectId: string,
  commentId: string,
): Promise<ApiResult<{ readonly feedback: readonly CommentThreadView[] }>> {
  return post(
    `/admin/projects/${encodeURIComponent(projectId)}/feedback/${encodeURIComponent(commentId)}/resolve`,
  );
}

/* --------------------------------------------------------------------- files */

/*
 * ============================================================================
 * THE SAME THREE STEPS THE CUSTOMER PORTAL USES, IN THE OTHER DIRECTION
 * ============================================================================
 *
 * Ask for a token, put the bytes straight into the store, tell the server it landed. The only
 * difference between these and the customer's is the mount — `/admin/projects/:id/files`
 * rather than `/app/…` — and that difference is what makes the server record the file as
 * something *we* sent, email the client about it, and refuse to let them delete it.
 *
 * Neither console nor portal decides any of that. Both send the same three requests to two
 * mounts of one router. See `file.routes.ts`.
 */
export function prepareUpload(
  projectId: string,
  input: { readonly filename: string; readonly contentType: string },
): Promise<ApiResult<UploadTicket>> {
  return post(`/admin/projects/${encodeURIComponent(projectId)}/files/token`, input);
}

export function confirmUpload(
  projectId: string,
  input: { readonly pathname: string; readonly filename: string; readonly note?: string },
): Promise<ApiResult<{ readonly file: FileView }>> {
  return post(`/admin/projects/${encodeURIComponent(projectId)}/files`, input);
}

export function deleteFile(projectId: string, fileId: string): Promise<ApiResult<unknown>> {
  return remove(
    `/admin/projects/${encodeURIComponent(projectId)}/files/${encodeURIComponent(fileId)}`,
  );
}

/* ------------------------------------------------------------------- reports */

export function fetchProjectReports(
  projectId: string,
  signal?: AbortSignal,
): Promise<ApiResult<{ readonly reports: readonly AdminReportView[] }>> {
  return get(`/admin/projects/${encodeURIComponent(projectId)}/reports`, signal);
}

/**
 * Writes a month, creating it or replacing the draft that was there.
 *
 * `PUT` rather than `POST`, because `{ project, month }` identifies it: saving August twice
 * is one August, and the server's unique index says so. Saving is deliberately not
 * publishing — see `publishReport`.
 */
export function saveReport(
  projectId: string,
  input: {
    readonly month: string;
    readonly enquiries: number;
    readonly baseline?: number;
    readonly changeExplanation: string;
    readonly whatWeChanged: readonly string[];
    readonly whatIsNext: readonly string[];
  },
): Promise<ApiResult<{ readonly report: AdminReportView }>> {
  return put(`/admin/projects/${encodeURIComponent(projectId)}/reports`, input);
}

/** Sends it. Emails the customer, writes their activity entry, and cannot be undone. */
export function publishReport(
  projectId: string,
  reportId: string,
): Promise<ApiResult<{ readonly report: AdminReportView }>> {
  return post(
    `/admin/projects/${encodeURIComponent(projectId)}/reports/${encodeURIComponent(reportId)}/publish`,
  );
}

/* --------------------------------------------------------------- assessments */

/**
 * The queue: everybody who asked for a free website assessment and has not had one.
 *
 * Oldest first, because the person who has been waiting longest is the one being let down.
 * Empty when nobody is waiting, which is the state to aim for.
 */
export function fetchAssessmentQueue(
  limit: number,
  signal?: AbortSignal,
): Promise<
  ApiResult<{ readonly assessments: readonly AdminAssessmentView[]; readonly hasMore: boolean }>
> {
  return get(`/admin/assessments?limit=${limit}`, signal);
}

export function fetchAssessment(
  assessmentId: string,
  signal?: AbortSignal,
): Promise<ApiResult<{ readonly assessment: AdminAssessmentView }>> {
  return get(`/admin/assessments/${encodeURIComponent(assessmentId)}`, signal);
}

/** Saves the review without sending it. The byline comes from the session, not from here. */
export function saveAssessmentReport(
  assessmentId: string,
  input: {
    readonly summary: string;
    readonly findings: readonly {
      readonly title: string;
      readonly detail: string;
      readonly severity: AssessmentFindingSeverity;
    }[];
    readonly recommendations: readonly string[];
  },
): Promise<ApiResult<{ readonly assessment: AdminAssessmentView }>> {
  return patch(`/admin/assessments/${encodeURIComponent(assessmentId)}/report`, input);
}

/** Publishes it. Emails the customer and cannot be undone. */
export function deliverAssessmentReport(
  assessmentId: string,
): Promise<ApiResult<{ readonly assessment: AdminAssessmentView }>> {
  return post(`/admin/assessments/${encodeURIComponent(assessmentId)}/deliver`);
}

/* ------------------------------------------------------------------ estimate */

/**
 * Sets, revises or clears the estimated launch date.
 *
 * `null` clears it. The server sends the customer an email when the date **moves** and says
 * nothing when it is set for the first time or cleared — see `ProjectService.setEstimate`.
 * Nothing about that rule lives here; this sends a date.
 */
export function setEstimate(
  projectId: string,
  estimatedCompletionAt: string | null,
): Promise<ApiResult<{ readonly project: AdminProjectView }>> {
  return patch(`/admin/projects/${encodeURIComponent(projectId)}/estimate`, {
    estimatedCompletionAt,
  });
}

/* ------------------------------------------------------------------ accounts */

export function fetchAccounts(
  limit: number,
  search?: string,
  signal?: AbortSignal,
): Promise<ApiResult<AdminAccountListData>> {
  return get(`/admin/accounts?limit=${limit}${searchParam(search)}`, signal);
}

/* --------------------------------------------------------------- onboarding */

/**
 * The submissions that matched no project — a worklist, not an archive.
 *
 * A submission that found its project is on that project's page, which is where somebody
 * building the site is looking. This list is empty when the automatic matching is working,
 * and every row on it needs a person to decide where it belongs.
 */
export function fetchUnmatchedOnboarding(
  limit: number,
  signal?: AbortSignal,
): Promise<ApiResult<AdminOnboardingListData>> {
  return get(`/admin/onboarding?limit=${limit}`, signal);
}

/** The manual match, for somebody who paid under one address and onboarded under another. */
export function attachOnboarding(
  onboardingId: string,
  projectId: string,
): Promise<ApiResult<{ readonly submission: OnboardingView }>> {
  return post(`/admin/onboarding/${encodeURIComponent(onboardingId)}/project`, { projectId });
}
