/*
 * ============================================================================
 * THE PROJECT — ONE WEBSITE BUILD, FROM AGREEMENT TO LIVE
 * ============================================================================
 *
 * A project is the spine of the whole application: billing attaches payments to it,
 * deployments attach URLs to it, tasks and comments hang off it, and the customer's
 * dashboard is mostly a rendering of one.
 *
 * ## Two state fields, not one
 *
 * There is a strong pull towards a single `status` covering everything from "quoted" to
 * "subscribed", and it is worth saying explicitly why that is refused. Money and
 * fulfilment move independently: a project can be fully paid and not yet started, or
 * built and awaiting the final payment. One enum spanning both would need a value for
 * every combination, and every one of those values would be a state somebody has to
 * remember to set from two different places.
 *
 * So:
 *
 *   - **`status`** is the commercial state. Billing owns it. It is advanced by verified
 *     Stripe webhooks and by the owner, and it existed before this feature did.
 *   - **`milestone`** is the fulfilment state. This feature owns it. It is what the
 *     customer's dashboard renders, and it never encodes anything about payment.
 *   - **`approval`** is a third, tiny state machine, because approving a website is a
 *     deliberate act with a legal flavour and must never be inferred from a comment
 *     saying "looks good".
 *
 * A project belongs to a user through `ownerUserId`. It is optional because projects
 * predate accounts — the owner created them by hand — and a project with no owner is
 * simply one no customer can see.
 * ============================================================================
 */

/** The commercial state. Advanced by webhooks and by the owner. Billing's field. */
export const PROJECT_STATUSES = [
  /** Scope agreed in writing; nothing paid yet. */
  'agreed',
  /** Deposit received — the project is on the build schedule. */
  'deposit-paid',
  /** Build in progress. Owner-set. */
  'in-build',
  /** Site live; final payment received or due. */
  'launched',
  /** Everything done and settled. Owner-set. */
  'complete',
  /** Called off. Owner-set. */
  'cancelled',
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

/**
 * The fulfilment state, in the order it happens.
 *
 * Ordered on purpose: `milestoneIndex` turns this list into the progress bar the
 * customer sees, so adding a step to the process is one entry here rather than a
 * number typed into a component.
 */
export const PROJECT_MILESTONES = [
  /** Waiting on the customer's materials: logo, photos, services, service areas. */
  'onboarding',
  /** We have what we need and are planning the build. */
  'planning',
  'building',
  /** A preview is up and the customer has been asked to look at it. */
  'review',
  /** They asked for changes and we are making them. */
  'revisions',
  /** Changes are done; waiting for the customer to approve. */
  'approval',
  /** Approved. Going to production. */
  'launching',
  'live',
] as const;

export type ProjectMilestone = (typeof PROJECT_MILESTONES)[number];

export function milestoneIndex(milestone: ProjectMilestone): number {
  return PROJECT_MILESTONES.indexOf(milestone);
}

/**
 * What the customer is told, and who the next move belongs to.
 *
 * The `waiting` flag is the single most useful thing on the dashboard: the question
 * every client of every agency actually has is "are they working, or is this sitting on
 * me?", and most project portals answer it by making somebody read a status they do not
 * have the vocabulary for. `building` is not a word a plumber owes anybody.
 */
export interface MilestonePresentation {
  readonly label: string;
  readonly detail: string;
  /** True when the next move belongs to the customer. */
  readonly waitingOnCustomer: boolean;
}

export const MILESTONE_PRESENTATION: Readonly<Record<ProjectMilestone, MilestonePresentation>> = {
  onboarding: {
    label: 'We need a few things from you',
    detail: 'Your website starts as soon as we have your details, logo and photos.',
    waitingOnCustomer: true,
  },
  planning: {
    label: 'We are planning your website',
    detail: 'We are mapping out your pages and what each one needs to do.',
    waitingOnCustomer: false,
  },
  building: {
    label: 'Your website is being built',
    detail: 'We will send you a preview link as soon as there is something to look at.',
    waitingOnCustomer: false,
  },
  review: {
    label: 'Your website preview is ready',
    detail: 'Have a look and tell us what you would like changed.',
    waitingOnCustomer: true,
  },
  revisions: {
    label: 'We are making your changes',
    detail: 'We are working through what you asked for and will let you know when it is ready.',
    waitingOnCustomer: false,
  },
  approval: {
    label: 'Ready for your approval',
    detail: 'Your changes are done. Approve the website and we will put it live.',
    waitingOnCustomer: true,
  },
  launching: {
    label: 'We are putting your website live',
    detail: 'Pointing your domain and running the final checks.',
    waitingOnCustomer: false,
  },
  live: {
    label: 'Your website is live',
    detail: 'It is up and being looked after.',
    waitingOnCustomer: false,
  },
};

/**
 * Approval is its own state machine, and it is deliberately explicit.
 *
 * A customer writing "looks good" in a comment is not approval. Approval is a button,
 * with a record of who pressed it, when, and which deployment they were looking at —
 * because "you approved this" is a sentence that has to be defensible six months later.
 */
export const APPROVAL_STATES = [
  'not_ready',
  'ready_for_review',
  'changes_requested',
  'approved',
] as const;

export type ApprovalState = (typeof APPROVAL_STATES)[number];

export const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/**
 * The subscription's state, mirrored from Stripe by webhook. `none` is the honest
 * default: Growth Partner is optional, and most projects may never have one.
 */
export const SUBSCRIPTION_STATUSES = [
  'none',
  'active',
  'past_due',
  'canceled',
  'incomplete',
] as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

/** Shared by the zod schemas and the Mongoose model. */
export const PROJECT_FIELD_LIMITS = {
  businessName: 200,
  contactName: 100,
  email: 254,
  phone: 30,
  notes: 2000,
  url: 2048,
} as const;

/** What the owner supplies when a scope has been agreed. */
export interface NewProjectInput {
  readonly businessName: string;
  readonly contactName: string;
  readonly email: string;
  readonly phone?: string | undefined;
  readonly notes?: string | undefined;
  /** Set when the project was created for a signed-up customer rather than by hand. */
  readonly ownerUserId?: string | undefined;
  readonly assessmentId?: string | undefined;
}

/** What the repository is asked to store. */
export interface NewProjectRecord extends NewProjectInput {
  readonly status: ProjectStatus;
  readonly milestone: ProjectMilestone;
  readonly approval: ApprovalState;
  readonly depositStatus: PaymentStatus;
  readonly finalStatus: PaymentStatus;
  readonly subscriptionStatus: SubscriptionStatus;
}

export interface StoredProject {
  readonly id: string;
  readonly businessName: string;
  readonly contactName: string;
  readonly email: string;
  readonly phone?: string | undefined;
  readonly notes?: string | undefined;
  /** The account that may see this project. Absent on projects created before accounts. */
  readonly ownerUserId?: string | undefined;
  readonly assessmentId?: string | undefined;
  readonly status: ProjectStatus;
  readonly milestone: ProjectMilestone;
  readonly approval: ApprovalState;
  readonly approvedAt?: Date | undefined;
  /** Which deployment the approval was given against. See `deployments`. */
  readonly approvedDeploymentId?: string | undefined;
  readonly previewUrl?: string | undefined;
  readonly productionUrl?: string | undefined;
  readonly depositStatus: PaymentStatus;
  readonly finalStatus: PaymentStatus;
  readonly subscriptionStatus: SubscriptionStatus;
  readonly stripeCustomerId?: string | undefined;
  readonly subscriptionId?: string | undefined;
  readonly depositSessionId?: string | undefined;
  readonly finalSessionId?: string | undefined;
  /** PaymentIntent ids for the two one-time payments — how a later refund finds its project. */
  readonly depositPaymentIntentId?: string | undefined;
  readonly finalPaymentIntentId?: string | undefined;
  /*
   * ==========================================================================
   * WHEN WE THINK IT WILL BE DONE
   * ==========================================================================
   *
   * Three fields for one date, and the two beside it are not bookkeeping.
   *
   * **Absent is a legitimate state and must render as "not set yet", never as a date.** Early
   * in a build there genuinely is no answer, and inventing one — a default of "four weeks
   * from the deposit", say — would be the system making a promise no person made.
   *
   * `estimateUpdatedAt` and `estimateUpdatedBy` exist because a date that moves silently is
   * worse than no date at all. The customer's project page shows when the estimate last
   * changed, so a date they are looking at is one they can tell is current; the console shows
   * who moved it, which is the question a month later.
   */
  readonly estimatedCompletionAt?: Date | undefined;
  readonly estimateUpdatedAt?: Date | undefined;
  /** A name, not a user id — the same argument `AssessmentReport.preparedBy` makes. */
  readonly estimateUpdatedBy?: string | undefined;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * What an operator may correct about a project, and nothing else.
 *
 * ============================================================================
 * SIX FIELDS, AND THE LIST IS THE GUARD
 * ============================================================================
 *
 * Every field here is a *description* of the client — who they are, how to reach them, what
 * the owner has noted, and the commercial label. Not one of them is a lifecycle value.
 *
 * `milestone` is deliberately absent even though the console changes it constantly. It moves
 * through `setMilestone`, which decides what the change means: which activity entries it
 * writes, what the customer is told, and whether the transition is legal at all. A milestone
 * reachable through a general-purpose edit form would be a second way to move it, with none
 * of that — and the second way is the one that gets used by accident.
 *
 * `depositStatus`, `finalStatus` and `subscriptionStatus` are absent for a harder reason:
 * they are Stripe's, mirrored by verified webhook. A form that could type "paid" into one of
 * them would make the console a place where a payment can be invented.
 * ============================================================================
 */
export interface ProjectDetailsUpdate {
  readonly businessName?: string;
  readonly contactName?: string;
  readonly email?: string;
  readonly phone?: string;
  readonly notes?: string;
  readonly status?: ProjectStatus;
}

/** The fields a webhook, the owner or the fulfilment feature may change after creation. */
export interface ProjectUpdate {
  readonly businessName?: string;
  readonly contactName?: string;
  readonly email?: string;
  readonly phone?: string;
  readonly notes?: string;
  readonly status?: ProjectStatus;
  readonly milestone?: ProjectMilestone;
  readonly approval?: ApprovalState;
  readonly approvedAt?: Date | null;
  readonly approvedDeploymentId?: string | null;
  readonly previewUrl?: string;
  readonly productionUrl?: string;
  /** `null` detaches. The project stops being visible to that account entirely. */
  readonly ownerUserId?: string | null;
  readonly assessmentId?: string;
  readonly depositStatus?: PaymentStatus;
  readonly finalStatus?: PaymentStatus;
  readonly subscriptionStatus?: SubscriptionStatus;
  readonly stripeCustomerId?: string;
  readonly subscriptionId?: string;
  readonly depositSessionId?: string;
  readonly finalSessionId?: string;
  readonly depositPaymentIntentId?: string;
  readonly finalPaymentIntentId?: string;
  /** `null` clears the estimate, which returns the project to "not set yet". */
  readonly estimatedCompletionAt?: Date | null;
  readonly estimateUpdatedAt?: Date;
  readonly estimateUpdatedBy?: string;
}

/**
 * What a customer is allowed to see about their own project.
 *
 * Explicitly built rather than produced by deleting fields from `StoredProject`, so a
 * field added to storage is invisible until somebody decides it should be visible. The
 * subtraction version leaks the next Stripe id somebody adds.
 */
export interface CustomerProjectView {
  readonly id: string;
  readonly businessName: string;
  readonly milestone: ProjectMilestone;
  readonly milestoneLabel: string;
  readonly milestoneDetail: string;
  readonly waitingOnCustomer: boolean;
  readonly progress: { readonly step: number; readonly total: number };
  readonly approval: ApprovalState;
  readonly approvedAt?: string | undefined;
  readonly previewUrl?: string | undefined;
  readonly productionUrl?: string | undefined;
  readonly assessmentId?: string | undefined;
  /**
   * Both absent until somebody sets one, and the pair travels together.
   *
   * A date with no "last updated" beside it is a date the reader cannot tell the age of, and
   * an estimate whose age is unknowable is one they stop believing after the first slip.
   * `estimateUpdatedBy` is deliberately *not* here — the customer needs to know the date
   * moved, not which member of staff moved it.
   */
  readonly estimatedCompletionAt?: string | undefined;
  readonly estimateUpdatedAt?: string | undefined;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function toCustomerProjectView(project: StoredProject): CustomerProjectView {
  const presentation = MILESTONE_PRESENTATION[project.milestone];

  return {
    id: project.id,
    businessName: project.businessName,
    milestone: project.milestone,
    milestoneLabel: presentation.label,
    milestoneDetail: presentation.detail,
    waitingOnCustomer: presentation.waitingOnCustomer,
    progress: {
      step: milestoneIndex(project.milestone) + 1,
      total: PROJECT_MILESTONES.length,
    },
    approval: project.approval,
    approvedAt: project.approvedAt?.toISOString(),
    previewUrl: project.previewUrl,
    productionUrl: project.productionUrl,
    assessmentId: project.assessmentId,
    estimatedCompletionAt: project.estimatedCompletionAt?.toISOString(),
    estimateUpdatedAt: project.estimateUpdatedAt?.toISOString(),
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

/**
 * A webhook event, after signature verification and before interpretation. Only the
 * fields the billing feature actually reads.
 */
export interface VerifiedStripeEvent {
  readonly id: string;
  readonly type: string;
  readonly data: { readonly object: Record<string, unknown> };
}
