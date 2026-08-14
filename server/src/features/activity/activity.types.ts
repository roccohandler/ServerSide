/*
 * ============================================================================
 * THE ACTIVITY STREAM, AND THE EVENT NAMES AUTOMATION WILL EVENTUALLY USE
 * ============================================================================
 *
 * Every meaningful thing that happens to a customer or a project is recorded here, once,
 * by the service that caused it. Two uses today and a third later:
 *
 *   1. The customer's dashboard shows the recent ones in plain language.
 *   2. The owner gets a complete history of a project without opening the database.
 *   3. Later: these names become the triggers for automation. They are written as
 *      `noun.past_tense` for exactly that reason.
 *
 * ## Why this is a table and not an event bus
 *
 * An event bus would be the architecturally exciting answer and would be the wrong one
 * today: there is one process, one database and no subscriber that needs to run
 * out-of-band. What an event bus would buy is decoupling between the thing that happens
 * and the things that react — and that decoupling is bought here instead by every
 * service depending on the `ActivityRecorder` *interface* rather than on each other.
 * Introducing a real bus later means writing one new implementation of that interface.
 * Nothing above it changes.
 *
 * ## Customer-visible is a per-event decision
 *
 * Some activity is for the owner: a webhook arrived out of order, a deployment failed
 * and is being retried. `audience` decides, and the customer query filters on it, so
 * "everything the customer sees" is a property of the data rather than of whichever
 * component remembered to filter.
 * ============================================================================
 */

export const ACTIVITY_TYPES = [
  'account.created',
  'assessment.submitted',
  'billing.checkout_started',
  'billing.payment_succeeded',
  'billing.payment_failed',
  'billing.subscription_changed',
  'project.created',
  'project.milestone_changed',
  'project.approved',
  'project.changes_requested',
  'project.launched',
  'task.created',
  'task.completed',
  'deployment.preview_ready',
  'deployment.production_ready',
  'deployment.failed',
  'feedback.created',
  'feedback.replied',
  'feedback.resolved',
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

/** Who an entry is written for. The customer query never sees `internal`. */
export const ACTIVITY_AUDIENCES = ['customer', 'internal'] as const;

export type ActivityAudience = (typeof ACTIVITY_AUDIENCES)[number];

export const ACTIVITY_FIELD_LIMITS = {
  summary: 300,
} as const;

export interface NewActivityRecord {
  readonly type: ActivityType;
  /** One short sentence, already written for whoever the audience is. */
  readonly summary: string;
  readonly audience: ActivityAudience;
  /** Absent for account-level events that predate a project. */
  readonly projectId?: string | undefined;
  /** Whose stream this belongs to. Absent only for events with no known account. */
  readonly userId?: string | undefined;
}

export interface StoredActivity extends NewActivityRecord {
  readonly id: string;
  readonly createdAt: Date;
}

/** What the browser is given. Dates as ISO strings; no internal ids beyond the project. */
export interface ActivityView {
  readonly id: string;
  readonly type: ActivityType;
  readonly summary: string;
  readonly projectId?: string | undefined;
  readonly at: string;
}

export function toActivityView(activity: StoredActivity): ActivityView {
  return {
    id: activity.id,
    type: activity.type,
    summary: activity.summary,
    projectId: activity.projectId,
    at: activity.createdAt.toISOString(),
  };
}
