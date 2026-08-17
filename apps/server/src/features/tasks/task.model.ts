import mongoose, { Schema, type Model } from 'mongoose';
import {
  TASK_FIELD_LIMITS,
  TASK_KINDS,
  TASK_STATUSES,
  type StoredTask,
  type TaskKind,
  type TaskStatus,
} from './task.types.js';

export interface TaskDocument {
  projectId: string;
  userId: string;
  kind: TaskKind;
  title: string;
  description: string;
  status: TaskStatus;
  dueAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<TaskDocument>(
  {
    projectId: { type: String, required: true, maxlength: 64 },
    userId: { type: String, required: true, maxlength: 64 },
    kind: { type: String, required: true, enum: TASK_KINDS },
    title: { type: String, required: true, trim: true, maxlength: TASK_FIELD_LIMITS.title },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: TASK_FIELD_LIMITS.description,
    },
    status: { type: String, required: true, enum: TASK_STATUSES, default: 'open' },
    dueAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true },
);

/*
 * The index that makes seeding idempotent.
 *
 * A retried Stripe event re-runs the onboarding seed; without this, a second delivery
 * would give the customer ten tasks instead of five. `custom` is excluded via the
 * partial filter, because the owner is allowed to add two hand-written tasks.
 */
taskSchema.index(
  { projectId: 1, kind: 1 },
  { unique: true, partialFilterExpression: { kind: { $ne: 'custom' } } },
);
taskSchema.index({ userId: 1, status: 1, createdAt: 1 });
taskSchema.index({ projectId: 1, createdAt: 1 });

export const TaskModel: Model<TaskDocument> =
  (mongoose.models['Task'] as Model<TaskDocument> | undefined) ??
  mongoose.model<TaskDocument>('Task', taskSchema);

export function toStoredTask(document: TaskDocument & { _id: unknown }): StoredTask {
  return {
    id: String(document._id),
    projectId: document.projectId,
    userId: document.userId,
    kind: document.kind,
    title: document.title,
    description: document.description,
    status: document.status,
    dueAt: document.dueAt,
    completedAt: document.completedAt,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}
