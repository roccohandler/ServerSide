import { z } from 'zod';
import { parseBody, parseQuery } from '../../lib/requestSchema.js';
import { COMMENT_FIELD_LIMITS } from '../feedback/index.js';
import { TASK_KINDS } from '../tasks/index.js';
import { PROJECT_FIELD_LIMITS, PROJECT_MILESTONES, PROJECT_STATUSES } from './project.types.js';

/*
 * The bodies the project portal accepts.
 *
 * Small, and every one of them is a `strictObject`. There is no `projectId` field on
 * any of them: the project comes from the URL and has already been authorized by the
 * time a handler parses a body, so a body carrying one would be a second, unchecked
 * source of the same fact.
 */

export const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  /**
   * The console's search box.
   *
   * Bounded here and escaped in `lib/search.ts`, which is where it becomes a query. Both are
   * needed and neither is sufficient: the length limit stops a paste accident reaching the
   * driver, and the escaping is what stops a regular expression being one.
   */
  q: z.string().trim().max(80).optional(),
});

export const setMilestoneSchema = z.strictObject({
  milestone: z.enum(PROJECT_MILESTONES),
});

/**
 * Putting a milestone back.
 *
 * `changedAt` comes from the client, and the service checks it against the server's own clock
 * rather than trusting it: a timestamp in the future or older than the window is refused. It
 * is in the body rather than read from storage because the project record has already moved,
 * and the *when* is what decides whether an undo is a correction or a second change.
 */
export const undoMilestoneSchema = z.strictObject({
  milestone: z.enum(PROJECT_MILESTONES),
  changedAt: z.coerce.date(),
});

export const addCommentSchema = z.strictObject({
  body: z
    .string()
    .trim()
    .min(1, { error: 'Write something before sending it.' })
    .max(COMMENT_FIELD_LIMITS.body),
  /** Present on a reply, absent on a new request. Never two deep — see the service. */
  parentId: z.string().trim().min(1).max(64).optional(),
});

export const addTaskSchema = z.strictObject({
  kind: z.enum(TASK_KINDS).default('custom'),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(1000),
  dueAt: z.coerce.date().optional(),
});

export const setDeploymentUrlSchema = z.strictObject({
  previewUrl: z.url().max(PROJECT_FIELD_LIMITS.url).optional(),
  productionUrl: z.url().max(PROJECT_FIELD_LIMITS.url).optional(),
});

/**
 * The estimated launch date.
 *
 * `nullable` rather than `optional`, and the difference is the whole shape of the field:
 * omitting it would mean "leave it alone", which is what a `PATCH` normally means and is
 * exactly what this route must not offer. There are two things an operator can do here —
 * name a date, or say there is no longer one — and both are explicit.
 *
 * `estimateUpdatedBy` is absent for the reason `preparedBy` is absent from the review schema:
 * it comes from the session, and a byline a request could choose is one that can be somebody
 * else's name.
 */
export const setEstimateSchema = z.strictObject({
  estimatedCompletionAt: z.coerce.date().nullable(),
});

/**
 * A project brought into existence from the console, for a scope agreed off-platform.
 *
 * `ownerEmail` is optional and is an *account* address rather than a contact one — supplying
 * it attaches the project to that account through `attachOwner`, which seeds and notifies.
 * Leaving it out creates the project unowned, which is a real state: a scope can be agreed
 * before the client has signed up.
 *
 * There is no `status` and no `milestone`. A new project starts where every new project
 * starts, and an operator who could type either into this form would have two ways to create
 * a project in a state nothing else in the system expects.
 */
export const createProjectSchema = z.strictObject({
  businessName: z.string().trim().min(1).max(PROJECT_FIELD_LIMITS.businessName),
  contactName: z.string().trim().min(1).max(PROJECT_FIELD_LIMITS.contactName),
  email: z.email().max(PROJECT_FIELD_LIMITS.email),
  phone: z.string().trim().max(PROJECT_FIELD_LIMITS.phone).optional(),
  notes: z.string().trim().max(PROJECT_FIELD_LIMITS.notes).optional(),
  ownerEmail: z.email().max(PROJECT_FIELD_LIMITS.email).optional(),
});

/**
 * Attaching or detaching an account.
 *
 * `email: null` detaches, which is why this is not `.optional()` — an absent field and a
 * deliberate `null` would be indistinguishable, and one of them means "leave it alone".
 */
export const setProjectOwnerSchema = z.strictObject({
  email: z.email().max(PROJECT_FIELD_LIMITS.email).nullable(),
});

/**
 * The editable description of a project. Six fields, and the list is the guard — see
 * `ProjectDetailsUpdate` for what is deliberately unreachable and why.
 *
 * Every field optional and at least one required, so a form that submits only what changed is
 * accepted and an empty request is refused rather than writing nothing and reporting success.
 */
export const updateProjectDetailsSchema = z
  .strictObject({
    businessName: z.string().trim().min(1).max(PROJECT_FIELD_LIMITS.businessName).optional(),
    contactName: z.string().trim().min(1).max(PROJECT_FIELD_LIMITS.contactName).optional(),
    email: z.email().max(PROJECT_FIELD_LIMITS.email).optional(),
    phone: z.string().trim().max(PROJECT_FIELD_LIMITS.phone).optional(),
    notes: z.string().trim().max(PROJECT_FIELD_LIMITS.notes).optional(),
    status: z.enum(PROJECT_STATUSES).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    error: 'Nothing was changed.',
  });

export const parseListQuery = (query: unknown) => parseQuery(listQuerySchema, query);
export const parseCreateProject = (body: unknown) => parseBody(createProjectSchema, body);
export const parseSetProjectOwner = (body: unknown) => parseBody(setProjectOwnerSchema, body);
export const parseUpdateProjectDetails = (body: unknown) =>
  parseBody(updateProjectDetailsSchema, body);
export const parseSetMilestone = (body: unknown) => parseBody(setMilestoneSchema, body);
export const parseUndoMilestone = (body: unknown) => parseBody(undoMilestoneSchema, body);
export const parseAddComment = (body: unknown) => parseBody(addCommentSchema, body);
export const parseAddTask = (body: unknown) => parseBody(addTaskSchema, body);
export const parseSetDeploymentUrl = (body: unknown) => parseBody(setDeploymentUrlSchema, body);
export const parseSetEstimate = (body: unknown) => parseBody(setEstimateSchema, body);
