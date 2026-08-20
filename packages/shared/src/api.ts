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

/**
 * What a signed-in customer sends to `POST /api/app/assessment-request` — the second half
 * of the account-first funnel. Mirrors `ValidatedCustomerRequestInput` on the server.
 *
 * There is no `name`, no `email` and no `userId` in this shape, and that is the contract
 * rather than an omission: the account was created first, so who this is comes from the
 * session. The server's schema is a `strictObject` that does not mention those keys, so
 * sending one is a malformed request rather than a field that gets quietly ignored.
 *
 * No honeypot either. The endpoint is behind `requireAuth`; a hidden input defends a form
 * anybody can POST to, and reaching this one costs an account.
 */
export interface AssessmentRequestSubmission {
  readonly businessName: string;
  readonly phone: string;
  readonly website?: string;
  readonly inquiryType: InquiryType;
  readonly message?: string;
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
  /**
   * True on the demonstration account.
   *
   * Carried so the browser can render the banner from the same source of truth the server
   * authorises against. It decides what to *render* and nothing else — every restriction it
   * hints at is enforced on the server, and a bundle that lied about this would get exactly
   * the same answers to every request it made.
   */
  readonly demo?: boolean;
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

/**
 * How much a finding in the owner's review matters, worst first.
 *
 * Three words rather than a number, because a severity a reader has to interpret is one they
 * will interpret differently from the person who set it.
 */
export const ASSESSMENT_FINDING_SEVERITIES = ['critical', 'important', 'minor'] as const;

export type AssessmentFindingSeverity = (typeof ASSESSMENT_FINDING_SEVERITIES)[number];

export interface AssessmentFinding {
  readonly title: string;
  readonly detail: string;
  readonly severity: AssessmentFindingSeverity;
}

/**
 * The owner's written review — the thing "Get my free website assessment" actually promises.
 *
 * Distinct from the fields on `AssessmentView` beside it, which are the visitor's own
 * self-scored answers. `preparedBy` is a byline rather than a user id: it is read by a
 * customer, not resolved by anything.
 */
export interface AssessmentReportView {
  readonly summary: string;
  readonly findings: readonly AssessmentFinding[];
  readonly recommendations: readonly string[];
  readonly preparedBy: string;
  readonly deliveredAt: string;
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
  /**
   * Present only once delivered.
   *
   * A draft is deliberately unrepresentable — not hidden behind a flag the client is asked to
   * respect, but absent from the payload, so the only way a half-written review could reach a
   * customer is if somebody published it. Absent means "a review is being prepared".
   */
  readonly report?: AssessmentReportView;
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
  /**
   * The agreed scope and price, once the owner has written one up. DECISION 040.
   *
   * Absent means it has not been sent, which the portal renders as "we are still writing this
   * up" rather than as an empty panel. `acceptedAt` present means the customer has agreed to
   * **this version** — a replacement always clears it, so the pair can never describe a
   * document that has since changed.
   */
  readonly scope?: ScopeView;
  /**
   * Revision rounds used, and the allowance they are used against.
   *
   * Both together, always. A count with no denominator is a number nobody can act on, and the
   * allowance travels from the server rather than being a constant the browser holds — so the
   * published figure and the one on the customer's screen cannot drift.
   */
  readonly revisions: { readonly used: number; readonly included: number };
  readonly approvedAt?: string;
  readonly previewUrl?: string;
  readonly productionUrl?: string;
  readonly assessmentId?: string;
  /**
   * When we currently think this will be finished, and when that was last said.
   *
   * Both absent until somebody sets one, and **absent is a legitimate state that must render
   * as "not set yet", never as a date**. The pair travels together because a date whose age
   * the reader cannot see is one they stop believing after the first slip.
   */
  readonly estimatedCompletionAt?: string;
  readonly estimateUpdatedAt?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * The written agreement, as the customer reads it.
 *
 * `acceptedByUserId` is deliberately not here and is not merely omitted — the server builds
 * this shape field by field, so the account id that proves who accepted stays where it is
 * useful and never reaches a browser that already knows who it belongs to.
 *
 * `priceCents` rather than a formatted string, matching every other figure crossing this
 * boundary: formatting is the reader's locale's business, and a server that formats currency
 * is a server guessing where somebody is.
 */
export interface ScopeView {
  /** Increments on every send. Shown, because two people reading different documents with
   * the same name is the failure the record exists to prevent. */
  readonly version: number;
  readonly summary: string;
  readonly lines: readonly string[];
  readonly priceCents: number;
  readonly notes?: string;
  /** True when accepting this also grants case-study permission — the founding-client condition. */
  readonly caseStudy: boolean;
  readonly sentAt: string;
  /** Present exactly when this version has been accepted. There is no boolean beside it. */
  readonly acceptedAt?: string;
  readonly acceptedName?: string;
}

/* ------------------------------------------------------------------- reports */

/**
 * A month of Growth Partner, as the customer reads it.
 *
 * Only ever built from a *published* report — the server's router filters drafts out before
 * mapping, and the type has no way to express one. See `features/reports` for the whole rule,
 * including the one sentence this feature must never write.
 */
export interface ReportView {
  readonly id: string;
  readonly projectId: string;
  /** `2026-08`. */
  readonly month: string;
  /** `August 2026`. Built on the server so two frontends cannot disagree about it. */
  readonly monthLabel: string;
  readonly enquiries: number;
  /** Absent means "we do not know", which is a real answer and not a zero. */
  readonly baseline?: number;
  readonly changeExplanation: string;
  readonly whatWeChanged: readonly string[];
  readonly whatIsNext: readonly string[];
  readonly preparedBy: string;
  readonly publishedAt: string;
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
  /**
   * The one task that arrives after a launch rather than before it.
   *
   * Asks a client whose site is now live to keep their Google listing current and to ask a
   * happy customer for a review — which for a local service business usually does more than
   * anything on the website itself, and which the site already says out loud.
   */
  'review-listing',
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

/* --------------------------------------------------------------------- files */

/**
 * Which side of the desk a file came from.
 *
 * The same two words a comment's `authorRole` uses, deliberately: a project has one
 * conversation and one pile of files, and two vocabularies for "us" and "them" would make a
 * reader check which one they were looking at.
 */
export const FILE_SOURCES = ['customer', 'team'] as const;

export type FileSource = (typeof FILE_SOURCES)[number];

/*
 * ============================================================================
 * THE UPLOAD RULES ARE DELIBERATELY NOT HERE
 * ============================================================================
 *
 * `ALLOWED_FILE_TYPES` and `MAX_FILE_BYTES` are values a browser genuinely needs — the file
 * picker's `accept` list and the check that fails a 40 MB video in a hundred milliseconds
 * rather than after two minutes of uploading. They live in each application's own file
 * feature instead, and `contract.sync.test.ts` pins both copies against the server's.
 *
 * The reason is the one `content/capabilities.ts` already records: **this module is eager.**
 * Marketing code imports `FIELD_LIMITS` from this barrel, so every runtime value declared
 * here lands in the chunk a first-time visitor to the homepage downloads — and a list of the
 * MIME types a signed-in customer may attach to a project is not something a stranger reading
 * about roofing websites should be paying for.
 *
 * Types cost nothing and stay. `FileView` below is erased at build time.
 * ============================================================================
 */

export interface FileView {
  readonly id: string;
  readonly projectId: string;
  readonly taskId?: string;
  readonly filename: string;
  readonly contentType: string;
  readonly size: number;
  /** Public and unguessable. Never treated as an authorization by either side. */
  readonly url: string;
  readonly source: FileSource;
  /** A sentence from the owner, on something they sent. */
  readonly note?: string;
  readonly at: string;
}

/** What the server hands back before the browser uploads. Scoped to one file, one minute. */
export interface UploadTicket {
  readonly token: string;
  readonly pathname: string;
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

/**
 * How far behind the reader is on their own stream.
 *
 * There is no `NotificationView` beside this and there is not going to be one. A
 * notification in this system is an outbound act — an email, a queued digest line — with no
 * record to read back; what a customer catches up on is the activity above, which already
 * exists. `since` is what makes the sentence on screen say *since when*.
 */
export interface UnreadSummary {
  readonly count: number;
  /** ISO. The catch-up marker, or the account's creation date if they never have. */
  readonly since: string;
  /** The count stopped at its cap. Print "50+", not a number that is wrong. */
  readonly capped: boolean;
}

/* ------------------------------------------------------------------- billing */

/**
 * What a customer may buy for themselves.
 *
 * `build-final` joined this list when the portal learned to take the second instalment. Naming
 * it is not the same as being offered it: `available.final` below decides that, and the server
 * refuses a purchase the summary says is unavailable. See `billing.summary.ts` there for the
 * three conditions.
 */
export const CUSTOMER_PRODUCTS = [
  'build-deposit',
  'build-final',
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
  /**
   * What may be bought right now. Three booleans, and the buttons on the billing page are
   * exactly these — a control that is not backed by one of them is a control the server will
   * refuse.
   */
  readonly available: {
    readonly deposit: boolean;
    /** Deposit cleared, balance outstanding, and the build at or past `launching`. */
    readonly final: boolean;
    readonly plan: boolean;
  };
}

/* ----------------------------------------------------------------- dashboard */

export const CURRENT_ACTION_KINDS = [
  'complete-tasks',
  'review-preview',
  'approve-website',
  /* Somebody who created an account for an assessment and stopped before the request. */
  'finish-request',
  'start-assessment',
  /*
   * The two steps before a build starts. DECISION 040.
   *
   * `request-scope` is somebody with an assessment and no project: the next move is a
   * conversation that produces a written scope, not a payment. `accept-scope` is somebody
   * whose scope has been written and not yet agreed — the first customer-visible state a
   * project has, and one that did not exist while a project could only be created by a
   * payment.
   */
  'request-scope',
  'accept-scope',
  'pay-deposit',
  /* The launch instalment, once the build is going live and the deposit has cleared. */
  'pay-final',
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
  /**
   * Counted in the same response as `activity` on purpose: the page prints "3 new" directly
   * above the entries it is counting, and two round trips is one chance for an event to land
   * between them and make the heading disagree with the list under it.
   */
  readonly unread: UnreadSummary;
}

export interface ProjectOverviewData {
  readonly project: ProjectView;
  readonly tasks: readonly TaskView[];
  readonly feedback: readonly CommentThreadView[];
  readonly deployments: readonly DeploymentView[];
  readonly activity: readonly ActivityView[];
  /** Both directions — what they sent us and what we sent them. Empty without a store. */
  readonly files: readonly FileView[];
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
  /**
   * Whether this account has ever sent a request, from either form.
   *
   * Composed in by `GET /api/admin/accounts` from a second query rather than read off the
   * user document. `false` is the row that matters: somebody who came for an assessment,
   * made an account, and stopped — which before DECISION 028 was somebody who left no trace
   * at all.
   */
  readonly hasRequested?: boolean;
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
  /**
   * The agreed scope, as staff see it. DECISION 040.
   *
   * Two fields more than the customer's copy — `sentBy` and `acceptedByUserId` — and the
   * difference is the point of having two types. The customer already knows who they are and
   * has no use for an account id; the console is where "who sent this" and "which account
   * accepted it" are the questions somebody is actually asking.
   *
   * This surface serialises `StoredProject` directly rather than through a built view, so the
   * type describes what genuinely arrives. Anything that must *not* reach staff would have to
   * be removed on the server, not omitted here.
   */
  readonly scope?: AdminScopeView;
  readonly approvedAt?: string;
  readonly previewUrl?: string;
  readonly productionUrl?: string;
  readonly depositStatus: AdminPaymentStatus;
  readonly finalStatus: AdminPaymentStatus;
  readonly subscriptionStatus: AdminSubscriptionStatus;
  /** Absent until somebody sets one, which is a legitimate state. See `ProjectView`. */
  readonly estimatedCompletionAt?: string;
  readonly estimateUpdatedAt?: string;
  /** Staff-only: who last moved the date. The customer is told it moved, not by whom. */
  readonly estimateUpdatedBy?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** The agreed scope with the two staff-only fields. See `AdminProjectView.scope`. */
export interface AdminScopeView extends ScopeView {
  /** A name, not a user id — the same argument `estimateUpdatedBy` makes. */
  readonly sentBy: string;
  /** Which account accepted. The id, because this one has to be provable. */
  readonly acceptedByUserId?: string;
}

/* ------------------------------------------------------------- the worklist */

/**
 * One thing that has gone quiet, already written as a sentence.
 *
 * `detail` arrives composed rather than as the numbers behind it, and `waitingDays` arrives
 * counted. Both are the server's job here for the same reason `monthLabel` is on a report:
 * two frontends deriving "9 days at review" from a timestamp is two chances to disagree
 * about what a day is, on a screen whose entire content is a claim about elapsed time.
 */
export interface WorklistItem {
  readonly id: string;
  readonly title: string;
  readonly detail: string;
  /** Relative to the console's own router. Absent when there is nowhere specific to go. */
  readonly href?: string;
  readonly waitingDays: number;
}

/** A named group of them, carrying what to say when it is empty — which is the good case. */
export interface WorklistGroup {
  readonly key: string;
  readonly title: string;
  readonly emptyLabel: string;
  readonly items: readonly WorklistItem[];
}

/* ---------------------------------------------- the console's own report shape */

/** A month as the console holds it: everything the customer sees, plus whether it is out. */
export interface AdminReportView {
  readonly id: string;
  readonly projectId: string;
  readonly userId: string;
  readonly month: string;
  readonly monthLabel: string;
  readonly enquiries: number;
  readonly baseline?: number;
  readonly changeExplanation: string;
  readonly whatWeChanged: readonly string[];
  readonly whatIsNext: readonly string[];
  readonly preparedBy: string;
  readonly published: boolean;
  readonly publishedAt?: string;
}

/**
 * An assessment as the console holds it.
 *
 * `draft` carries the review in whatever state it is in — the customer's `report` field is
 * present only once delivered, so the console needs the other one or it would be editing a
 * document it cannot read back.
 */
export interface AdminAssessmentView extends AssessmentView {
  readonly userId: string;
  readonly trade?: string;
  readonly note?: string;
  readonly draft?: AssessmentReportView;
  readonly delivered: boolean;
}

/*
 * ------------------------------------------------------------- conversations
 *
 * The console inbox. Mirrors `features/conversations/conversation.types.ts`, and
 * `contract.sync.test.ts` pins the kind list against it.
 *
 * `id` is qualified — `lead:<id>` or `comment:<id>` — because a conversation is a view
 * over two different records rather than a row in a table of its own. The console treats
 * it as opaque and hands it straight back to the reply route; the server is the only side
 * that reads it.
 */
export const CONVERSATION_KINDS = ['prospect', 'customer'] as const;

export type ConversationKind = (typeof CONVERSATION_KINDS)[number];

export interface ConversationSummary {
  readonly id: string;
  readonly personName: string;
  readonly businessName: string;
  /** `prospect` came in through the marketing site; `customer` has a project. */
  readonly kind: ConversationKind;
  readonly lastMessage: string;
  readonly receivedAt: string;
  readonly awaitingReply: boolean;
}

export interface ConversationListData {
  readonly conversations: readonly ConversationSummary[];
  /**
   * Whether either source had more to give than the limit allowed.
   *
   * The console used to infer this from the row count reaching the limit, which is wrong in
   * both directions — exactly fifty people waiting read as "there are more", and one source
   * being cut while the other was not read as a complete list. The server fetches one row
   * beyond the limit to answer it exactly.
   *
   * Optional so a console deployed ahead of the server does not render a claim from
   * `undefined`. Absent means "not known", which is what it was before.
   */
  readonly hasMore?: boolean;
}

/*
 * ============================================================================
 * THE TWO OTHER BOUNDED LISTS
 * ============================================================================
 *
 * Projects and accounts, in the shape the inbox already had. Both were untyped inline in
 * `apps/admin/src/lib/endpoints.ts` and both sent a bounded list that said nothing about
 * being bounded — so the console rendered fifty rows and a reader had no way to know whether
 * that was everybody.
 *
 * `hasMore` is optional on all three for the same reason it is optional on
 * `ConversationListData`: a console deployed ahead of the server must render "not known"
 * rather than a claim built from `undefined`. Absent means what it always meant.
 * ============================================================================
 */
export interface AdminProjectListData {
  readonly projects: readonly AdminProjectView[];
  readonly hasMore?: boolean;
}

export interface AdminAccountListData {
  readonly accounts: readonly AdminAccountView[];
  readonly hasMore?: boolean;
}

export interface AdminProjectDetail {
  readonly project: AdminProjectView;
  readonly tasks: readonly TaskView[];
  readonly feedback: readonly CommentThreadView[];
  readonly deployments: readonly DeploymentView[];
  /** Includes the internal entries a customer never sees. */
  readonly activity: readonly ActivityView[];
  readonly files: readonly FileView[];
  /**
   * The welcome-form answers, when a submission matched this project by address.
   *
   * `null` is common and is not an error: a project created from the console before its client
   * has onboarded has none, and a submission whose address did not match is on the unmatched
   * worklist waiting for somebody to say where it belongs.
   */
  readonly onboarding: OnboardingView | null;
}

/**
 * What a new client told us, immediately after paying.
 *
 * **This is the brief.** Every other admin shape here is state — where a project is, what has
 * been paid, what is outstanding — and this one is the material the website is actually made
 * from. It arrived by email for as long as the feature has existed and appeared on no screen.
 */
export interface OnboardingView {
  readonly id: string;
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
  /** Absent on the unmatched ones, which is the whole reason that list exists. */
  readonly projectId?: string;
  readonly at: string;
}

/** The console's worklist: submissions that matched no project. Empty when all is well. */
export interface AdminOnboardingListData {
  readonly submissions: readonly OnboardingView[];
  readonly hasMore?: boolean;
}

/*
 * ============================================================================
 * HOW LONG A FIELD MAY BE, ON BOTH SIDES
 * ============================================================================
 *
 * Mirrored from the server's Zod schemas and pinned by `contract.sync.test.ts`, exactly as
 * the status lists above are — and for a sharper reason than they have.
 *
 * A form that lets somebody type past what the server accepts fails *after* they finish, with
 * a rejection that names no field. That is not hypothetical here: `TaskForm` offered an
 * optional description the server required, and submitting without one produced "Please check
 * the highlighted fields" and no indication of which. The same shape of defect, in the other
 * direction, is a reply typed to four thousand and one characters.
 *
 * So the browser stops where the server would. **The client limit is not validation** — the
 * server revalidates everything and is the only side that decides — it is a courtesy that
 * turns a rejection into something visible before it happens.
 *
 * The pinning matters more than the numbers: a `.max()` changed on the server and not here is
 * a form that lies, and there is nothing about it a type checker could notice.
 * ============================================================================
 */
export const FIELD_LIMITS = {
  /** `lead.types.ts` — the contact form and the assessment request. */
  lead: {
    name: 100,
    businessName: 120,
    email: 254,
    phone: 32,
    website: 300,
    message: 2000,
  },
  /** `onboarding.types.ts` — `/welcome`, the longest form on the site. */
  onboarding: {
    businessName: 200,
    contactName: 100,
    email: 254,
    phone: 30,
    short: 300,
    long: 2000,
  },
  /** `project.schema.ts` — what the console adds to a project. */
  task: {
    title: 160,
    description: 1000,
  },
  /** `feedback.types.ts` — a change request and every reply to it, either side of the desk. */
  comment: {
    body: 4000,
  },
} as const;

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
