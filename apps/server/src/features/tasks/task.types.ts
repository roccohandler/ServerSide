/*
 * ============================================================================
 * CUSTOMER TASKS
 * ============================================================================
 *
 * The things the build is waiting on the customer for. Two states, open and completed,
 * and that is the whole state machine.
 *
 * It is worth saying what this deliberately is not, because the pull towards each is
 * real and each one would cost weeks: no assignees (there is one customer and one
 * builder), no priorities (they are all blocking or they would not be here), no
 * sub-tasks, no comments (that is the feedback feature), no board. A local plumber
 * being asked to upload a logo does not need a workflow engine, and every field added
 * here is a field on a form somebody has to look at before they can send us a photo.
 *
 * `kind` exists so the onboarding set can be seeded idempotently and so the dashboard
 * can eventually deep-link a task to the thing that completes it. It is not a taxonomy
 * to be extended casually.
 * ============================================================================
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
  /** Anything the owner types by hand for one project. */
  'custom',
] as const;

export type TaskKind = (typeof TASK_KINDS)[number];

export const TASK_STATUSES = ['open', 'completed'] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_FIELD_LIMITS = {
  title: 160,
  description: 1000,
} as const;

/**
 * The onboarding set, seeded once when a project is activated by a payment.
 *
 * Ordered, and the order is what the dashboard shows. Keyed by `kind` so seeding is
 * idempotent: a duplicate Stripe event re-runs the seed and adds nothing, because the
 * repository refuses a second task with the same project and kind.
 */
export const ONBOARDING_TASKS: readonly {
  readonly kind: TaskKind;
  readonly title: string;
  readonly description: string;
}[] = [
  {
    kind: 'provide-business-details',
    title: 'Confirm your business details',
    description:
      'Your business name as you want it written, your phone number, and the address you want customers to see.',
  },
  {
    kind: 'confirm-services',
    title: 'List the services you want pages for',
    description: 'The work you actually want more of. Five or six is plenty to start with.',
  },
  {
    kind: 'confirm-service-areas',
    title: 'Confirm the areas you cover',
    description: 'The towns and neighbourhoods you will travel to, so the site says so.',
  },
  {
    kind: 'upload-logo',
    title: 'Send us your logo',
    description:
      'The highest-quality version you have. If you do not have one, say so and we will set the site up without it.',
  },
  {
    kind: 'upload-photos',
    title: 'Send us photos of your work',
    description:
      'Real photographs of finished jobs, your van, or your team. These do more for enquiries than anything else on the page.',
  },
];

export interface NewTaskRecord {
  readonly projectId: string;
  /** Denormalised so "my open tasks" is one indexed query rather than a join. */
  readonly userId: string;
  readonly kind: TaskKind;
  readonly title: string;
  readonly description: string;
  readonly status: TaskStatus;
  readonly dueAt?: Date | undefined;
}

export interface StoredTask {
  readonly id: string;
  readonly projectId: string;
  readonly userId: string;
  readonly kind: TaskKind;
  readonly title: string;
  readonly description: string;
  readonly status: TaskStatus;
  readonly dueAt?: Date | undefined;
  readonly completedAt?: Date | undefined;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface TaskView {
  readonly id: string;
  readonly projectId: string;
  readonly kind: TaskKind;
  readonly title: string;
  readonly description: string;
  readonly status: TaskStatus;
  readonly dueAt?: string | undefined;
  readonly completedAt?: string | undefined;
  readonly createdAt: string;
}

export function toTaskView(task: StoredTask): TaskView {
  return {
    id: task.id,
    projectId: task.projectId,
    kind: task.kind,
    title: task.title,
    description: task.description,
    status: task.status,
    dueAt: task.dueAt?.toISOString(),
    completedAt: task.completedAt?.toISOString(),
    createdAt: task.createdAt.toISOString(),
  };
}
