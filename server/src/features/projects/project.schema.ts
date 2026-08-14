import { z } from 'zod';
import { parseBody, parseQuery } from '../../lib/requestSchema.js';
import { COMMENT_FIELD_LIMITS } from '../feedback/index.js';
import { TASK_KINDS } from '../tasks/index.js';
import { PROJECT_FIELD_LIMITS, PROJECT_MILESTONES } from './project.types.js';

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
});

export const setMilestoneSchema = z.strictObject({
  milestone: z.enum(PROJECT_MILESTONES),
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

export const parseListQuery = (query: unknown) => parseQuery(listQuerySchema, query);
export const parseSetMilestone = (body: unknown) => parseBody(setMilestoneSchema, body);
export const parseAddComment = (body: unknown) => parseBody(addCommentSchema, body);
export const parseAddTask = (body: unknown) => parseBody(addTaskSchema, body);
export const parseSetDeploymentUrl = (body: unknown) => parseBody(setDeploymentUrlSchema, body);
