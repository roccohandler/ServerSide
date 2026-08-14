import mongoose, { Schema, type Model } from 'mongoose';
import {
  ACTIVITY_AUDIENCES,
  ACTIVITY_FIELD_LIMITS,
  ACTIVITY_TYPES,
  type ActivityAudience,
  type ActivityType,
  type StoredActivity,
} from './activity.types.js';

export interface ActivityDocument {
  type: ActivityType;
  summary: string;
  audience: ActivityAudience;
  projectId?: string;
  userId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const activitySchema = new Schema<ActivityDocument>(
  {
    type: { type: String, required: true, enum: ACTIVITY_TYPES },
    summary: { type: String, required: true, trim: true, maxlength: ACTIVITY_FIELD_LIMITS.summary },
    audience: { type: String, required: true, enum: ACTIVITY_AUDIENCES, default: 'customer' },
    projectId: { type: String, trim: true, maxlength: 64 },
    userId: { type: String, trim: true, maxlength: 64 },
  },
  { timestamps: true },
);

/* The two queries that exist: one customer's recent activity, and one project's. */
activitySchema.index({ userId: 1, createdAt: -1 });
activitySchema.index({ projectId: 1, createdAt: -1 });

export const ActivityModel: Model<ActivityDocument> =
  (mongoose.models['Activity'] as Model<ActivityDocument> | undefined) ??
  mongoose.model<ActivityDocument>('Activity', activitySchema);

export function toStoredActivity(document: ActivityDocument & { _id: unknown }): StoredActivity {
  return {
    id: String(document._id),
    type: document.type,
    summary: document.summary,
    audience: document.audience,
    projectId: document.projectId,
    userId: document.userId,
    createdAt: document.createdAt,
  };
}
