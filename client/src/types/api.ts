/**
 * The client's half of the API contract.
 *
 * These types mirror `server/src/features/leads/lead.types.ts` and
 * `server/src/lib/apiResponse.ts`. They are duplicated rather than shared through a
 * third workspace: the contract is fifteen lines, both sides have a test that pins the
 * slug list, and a shared package would add a build step to every deploy for no real
 * safety. If the contract grows, extract it then.
 */

export const INQUIRY_TYPES = [
  'new-website',
  'improve-website',
  'manage-website',
  'no-website',
  'not-sure',
] as const;

export type InquiryType = (typeof INQUIRY_TYPES)[number];

/** Hidden anti-spam input. Must match `HONEYPOT_FIELD` on the server. */
export const HONEYPOT_FIELD = 'companyFax';

export interface LeadRequest {
  readonly name: string;
  readonly businessName: string;
  readonly email: string;
  readonly phone: string;
  readonly website?: string;
  readonly inquiryType: InquiryType;
  readonly message?: string;
  readonly [HONEYPOT_FIELD]?: string;
}

export interface LeadSubmissionData {
  readonly submittedAt: string;
}

/* ------------------------------------------------------------------ subscribers */

/**
 * The PlayBook workbook request. Mirrors
 * `server/src/features/subscribers/subscriber.types.ts`.
 *
 * One field, because asking for anything else would be collecting data to have it. The
 * asset is optional: the server defaults it, so the client never has to name it.
 */
export const SUBSCRIPTION_ASSETS = ['playbook-workbook'] as const;

export type SubscriptionAsset = (typeof SUBSCRIPTION_ASSETS)[number];

export interface SubscriberRequest {
  readonly email: string;
  readonly asset?: SubscriptionAsset;
  readonly [HONEYPOT_FIELD]?: string;
}

export interface SubscriptionData {
  readonly requestedAt: string;
  /**
   * What actually happened, so the confirmation can say it.
   *
   * `sent` — the workbook was emailed to them. `queued` — the request reached the owner,
   * who sends it. The page picks its copy from this rather than assuming, so it can never
   * tell somebody to check their inbox when nothing is coming.
   */
  readonly delivery: 'sent' | 'queued';
}

/* ------------------------------------------------------------------ onboarding */

/**
 * The new-client onboarding submission, from `/welcome` after a deposit. Mirrors
 * `server/src/features/onboarding/onboarding.types.ts`. Four required contact fields
 * plus the two facts a build cannot start without; everything else optional.
 */
export interface OnboardingRequest {
  readonly businessName: string;
  readonly contactName: string;
  readonly email: string;
  readonly phone: string;
  readonly services: string;
  readonly serviceAreas: string;
  readonly website?: string;
  readonly googleBusinessProfile?: string;
  readonly domainAndHosting?: string;
  readonly photosNote?: string;
  readonly competitors?: string;
  readonly callsToAction?: string;
  readonly accessNotes?: string;
  readonly anythingElse?: string;
  readonly [HONEYPOT_FIELD]?: string;
}

export interface OnboardingData {
  readonly receivedAt: string;
}

/* ------------------------------------------------------------------ accounts */

/**
 * The authenticated customer application's half of the contract. Mirrors the server's
 * `auth`, `assessments`, `projects`, `tasks`, `feedback`, `deployments`, `activity` and
 * `billing` features.
 *
 * Duplicated rather than shared through a third workspace, for the same reason the lead
 * contract is: both sides pin the shapes with tests — see `contract.sync.test.ts`, which
 * reads the server's own constants and fails when the two drift — and a shared package
 * would add a build step to every deploy. The moment this stops being enforceable by a
 * test, extract it.
 */
export const USER_ROLES = ['customer', 'admin'] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const AUTH_PROVIDERS = ['password', 'google'] as const;

export type AuthProvider = (typeof AUTH_PROVIDERS)[number];

export interface PublicUser {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly businessName?: string;
  readonly role: UserRole;
  readonly emailVerified: boolean;
  readonly capabilities: readonly string[];
  readonly authProviders: readonly AuthProvider[];
}

export interface SessionData {
  readonly user: PublicUser;
}

export interface CurrentUserData {
  /** Null when nobody is signed in. Not an error — most visitors are anonymous. */
  readonly user: PublicUser | null;
}

/**
 * What the sign-in page needs before anybody has signed in.
 *
 * `googleEnabled` false is a normal, supported state — see the note on the Google
 * button. The client id is public by definition; it is served rather than inlined at
 * build time so one build can be deployed against a development and a production
 * OAuth client.
 */
export interface AuthConfigData {
  readonly googleEnabled: boolean;
  readonly googleClientId: string | null;
}

/* --------------------------------------------------------------- assessments */

export const ASSESSMENT_CATEGORIES = [
  'speed',
  'mobile',
  'clarity',
  'trust',
  'conversion',
  'visibility',
] as const;

export type AssessmentCategory = (typeof ASSESSMENT_CATEGORIES)[number];

export interface AssessmentAnswer {
  readonly questionId: string;
  readonly category: AssessmentCategory;
  readonly value: number;
}

export interface AssessmentRequest {
  readonly businessName: string;
  readonly websiteUrl?: string;
  readonly trade?: string;
  readonly answers: readonly AssessmentAnswer[];
  readonly note?: string;
}

export interface AssessmentView {
  readonly id: string;
  readonly businessName: string;
  readonly websiteUrl?: string;
  readonly score: number;
  readonly band: 'strong' | 'workable' | 'costing-you';
  readonly weakestCategories: readonly AssessmentCategory[];
  readonly recommendations: readonly string[];
  readonly submittedAt: string;
}

/* ------------------------------------------------------------------ projects */

export const PROJECT_MILESTONES = [
  'onboarding',
  'planning',
  'building',
  'review',
  'revisions',
  'approval',
  'launching',
  'live',
] as const;

export type ProjectMilestone = (typeof PROJECT_MILESTONES)[number];

export const APPROVAL_STATES = [
  'not_ready',
  'ready_for_review',
  'changes_requested',
  'approved',
] as const;

export type ApprovalState = (typeof APPROVAL_STATES)[number];

/**
 * What a customer is allowed to see about their own project.
 *
 * Notice the absence of every Stripe identifier, the owner's internal notes and the
 * account id. That is not an oversight in this type — the server builds this shape
 * explicitly rather than by deleting fields, so nothing new leaks by default.
 */
export interface ProjectView {
  readonly id: string;
  readonly businessName: string;
  readonly milestone: ProjectMilestone;
  readonly milestoneLabel: string;
  readonly milestoneDetail: string;
  readonly waitingOnCustomer: boolean;
  readonly progress: { readonly step: number; readonly total: number };
  readonly approval: ApprovalState;
  readonly approvedAt?: string;
  readonly previewUrl?: string;
  readonly productionUrl?: string;
  readonly assessmentId?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/* --------------------------------------------------------------------- tasks */

export type TaskStatus = 'open' | 'completed';

/**
 * The kinds of task the system knows about.
 *
 * Mirrored here from the server so the admin surface can offer them in a select rather than
 * asking an operator to type a slug — and `contract.sync.test.ts` asserts the two lists match,
 * because a kind the client offers and the server rejects is a form that fails on submit.
 *
 * `custom` is the escape hatch for anything typed by hand for one project.
 */
export const TASK_KINDS = [
  'provide-business-details',
  'upload-logo',
  'upload-photos',
  'confirm-services',
  'confirm-service-areas',
  'review-preview',
  'approve-website',
  'connect-domain',
  'custom',
] as const;

export type TaskKind = (typeof TASK_KINDS)[number];

export interface TaskView {
  readonly id: string;
  readonly projectId: string;
  readonly kind: string;
  readonly title: string;
  readonly description: string;
  readonly status: TaskStatus;
  readonly dueAt?: string;
  readonly completedAt?: string;
  readonly createdAt: string;
}

/* ------------------------------------------------------------------ feedback */

export interface CommentReplyView {
  readonly id: string;
  readonly body: string;
  readonly authorName: string;
  readonly authorRole: 'customer' | 'team';
  readonly createdAt: string;
}

export interface CommentThreadView {
  readonly id: string;
  readonly body: string;
  readonly authorName: string;
  readonly authorRole: 'customer' | 'team';
  readonly resolved: boolean;
  readonly resolvedAt?: string;
  readonly createdAt: string;
  readonly replies: readonly CommentReplyView[];
}

/* --------------------------------------------------------------- deployments */

export interface DeploymentView {
  readonly id: string;
  readonly environment: 'preview' | 'production';
  readonly state: 'queued' | 'building' | 'ready' | 'failed' | 'cancelled';
  /** Only present once the deployment is actually ready. */
  readonly url?: string;
  readonly at: string;
}

/* ------------------------------------------------------------------ activity */

export interface ActivityView {
  readonly id: string;
  readonly type: string;
  readonly summary: string;
  readonly projectId?: string;
  readonly at: string;
}

/* ------------------------------------------------------------------- billing */

export const CUSTOMER_PRODUCTS = [
  'build-deposit',
  'growth-partner-monthly',
  'growth-partner-annual',
] as const;

export type CustomerProduct = (typeof CUSTOMER_PRODUCTS)[number];

export interface PaymentSummary {
  readonly status: 'pending' | 'paid' | 'failed' | 'refunded';
  readonly label: string;
}

export interface BillingSummary {
  readonly hasBillingAccount: boolean;
  readonly build: { readonly deposit: PaymentSummary; readonly final: PaymentSummary };
  readonly subscription: {
    readonly status: 'none' | 'active' | 'past_due' | 'canceled' | 'incomplete';
    readonly label: string;
    readonly manageable: boolean;
  };
  readonly available: { readonly deposit: boolean; readonly plan: boolean };
}

/* ----------------------------------------------------------------- dashboard */

export const CURRENT_ACTION_KINDS = [
  'complete-tasks',
  'review-preview',
  'approve-website',
  'start-assessment',
  'pay-deposit',
  'choose-plan',
  'fix-payment',
  'verify-email',
  'waiting-on-us',
  'live',
] as const;

export type CurrentActionKind = (typeof CURRENT_ACTION_KINDS)[number];

export interface CurrentAction {
  readonly kind: CurrentActionKind;
  readonly heading: string;
  readonly body: string;
  readonly cta: { readonly label: string; readonly href: string } | null;
  readonly waitingOnCustomer: boolean;
}

/** Everything the private landing page renders, in one response. */
export interface DashboardData {
  readonly user: PublicUser;
  readonly currentAction: CurrentAction;
  readonly project: ProjectView | null;
  readonly projects: readonly ProjectView[];
  readonly assessment: AssessmentView | null;
  readonly tasks: readonly TaskView[];
  readonly activity: readonly ActivityView[];
  readonly billing: BillingSummary;
}

export interface ProjectOverviewData {
  readonly project: ProjectView;
  readonly tasks: readonly TaskView[];
  readonly feedback: readonly CommentThreadView[];
  readonly deployments: readonly DeploymentView[];
  readonly activity: readonly ActivityView[];
}

/* --------------------------------------------------------------------- admin */

/*
 * ============================================================================
 * THE ADMIN SHAPES
 * ============================================================================
 *
 * `/api/admin` answers with the **stored** project record rather than the customer's
 * `ProjectView`, because operating the business genuinely needs the Stripe ids, the internal
 * notes and the payment statuses. That is a deliberate asymmetry and it is the reason these
 * types are separate rather than reused.
 *
 * Two things follow, and both matter:
 *
 *   1. **These types are not a permission.** Declaring a field here does not make the server
 *      send it, and the server sending it does not mean a customer could ever see it — the
 *      route is behind `requireAdmin`, which answers NOT_FOUND to everybody else. If this file
 *      and the server ever disagree, the server wins.
 *   2. **Nothing secret is in here.** No Stripe secret key, no session token, no password
 *      hash. `AdminAccountView` is built field by field on the server precisely so that a
 *      field added to storage does not appear in a browser by default.
 * ============================================================================
 */

export type AdminUserRole = 'customer' | 'admin';

export interface AdminAccountView {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly businessName?: string;
  readonly role: AdminUserRole;
  readonly emailVerified: boolean;
  readonly authProviders: readonly ('password' | 'google')[];
  /** Whether this person has ever paid. Deliberately a boolean, not the Stripe id. */
  readonly hasStripeCustomer: boolean;
  readonly lastLoginAt?: string;
  readonly createdAt: string;
}

/*
 * The stored statuses, mirrored from the server and **pinned by `contract.sync.test.ts`**.
 *
 * Written as `as const` arrays rather than hand-typed unions because the first version of these
 * was hand-typed and got two of them wrong: `unpaid` for a status that is actually `pending`,
 * and `cancelled` for `canceled` — Stripe's American spelling, which the server mirrors and the
 * British instinct silently corrects. Neither error would have been a type error anywhere,
 * because these describe a JSON payload; they would have been a status cell rendering nothing.
 *
 * Pinning them means the server is the authority and a rename fails the build on both sides.
 */
export const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'] as const;

export type AdminPaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const SUBSCRIPTION_STATUSES = [
  'none',
  'active',
  'past_due',
  'canceled',
  'incomplete',
] as const;

export type AdminSubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const PROJECT_STATUSES = [
  'agreed',
  'deposit-paid',
  'in-build',
  'launched',
  'complete',
  'cancelled',
] as const;

export type AdminProjectStatus = (typeof PROJECT_STATUSES)[number];

/**
 * The stored project, as staff see it.
 *
 * Wider than `ProjectView` by design: the payment statuses and the contact details are what an
 * operator works from, and hiding them would make the surface useless for its one purpose.
 */
export interface AdminProjectView {
  readonly id: string;
  readonly businessName: string;
  readonly contactName: string;
  readonly email: string;
  readonly phone?: string;
  readonly notes?: string;
  /** Absent on projects created before accounts existed, and the reason tasks can fail. */
  readonly ownerUserId?: string;
  readonly assessmentId?: string;
  readonly status: AdminProjectStatus;
  readonly milestone: ProjectMilestone;
  readonly approval: ApprovalState;
  readonly approvedAt?: string;
  readonly previewUrl?: string;
  readonly productionUrl?: string;
  readonly depositStatus: AdminPaymentStatus;
  readonly finalStatus: AdminPaymentStatus;
  readonly subscriptionStatus: AdminSubscriptionStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AdminProjectDetail {
  readonly project: AdminProjectView;
  readonly tasks: readonly TaskView[];
  readonly feedback: readonly CommentThreadView[];
  readonly deployments: readonly DeploymentView[];
  /** Includes the internal entries a customer never sees. */
  readonly activity: readonly ActivityView[];
}

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'MALFORMED_REQUEST'
  | 'PAYLOAD_TOO_LARGE'
  | 'RATE_LIMITED'
  /** No usable session. The client's cue to send somebody to the sign-in page. */
  | 'UNAUTHENTICATED'
  /** Signed in and still not allowed. Signing in again cannot fix this one. */
  | 'FORBIDDEN'
  | 'CONFLICT'
  | 'NOT_FOUND'
  | 'SERVICE_UNAVAILABLE'
  | 'INTERNAL_ERROR'
  /** Client-side only: the request never reached the server. */
  | 'NETWORK_ERROR';

export interface ApiSuccess<TData> {
  readonly success: true;
  readonly data: TData;
}

export interface ApiFailure {
  readonly success: false;
  readonly error: {
    readonly code: ApiErrorCode;
    readonly message: string;
    readonly fields?: Readonly<Record<string, string>>;
  };
}

export type ApiResult<TData> = ApiSuccess<TData> | ApiFailure;
