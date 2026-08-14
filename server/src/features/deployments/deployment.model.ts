import mongoose, { Schema, type Model } from 'mongoose';
import {
  DEPLOYMENT_ENVIRONMENTS,
  DEPLOYMENT_FIELD_LIMITS,
  DEPLOYMENT_STATES,
  type DeploymentEnvironment,
  type DeploymentState,
  type StoredDeployment,
} from './deployment.types.js';

export interface DeploymentDocument {
  provider: 'vercel';
  externalId: string;
  projectId: string;
  environment: DeploymentEnvironment;
  state: DeploymentState;
  url?: string;
  commitSha?: string;
  commitMessage?: string;
  occurredAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const deploymentSchema = new Schema<DeploymentDocument>(
  {
    provider: { type: String, required: true, enum: ['vercel'] },
    externalId: {
      type: String,
      required: true,
      trim: true,
      maxlength: DEPLOYMENT_FIELD_LIMITS.externalId,
    },
    projectId: { type: String, required: true, maxlength: 64 },
    environment: { type: String, required: true, enum: DEPLOYMENT_ENVIRONMENTS },
    state: { type: String, required: true, enum: DEPLOYMENT_STATES },
    url: { type: String, trim: true, maxlength: DEPLOYMENT_FIELD_LIMITS.url },
    commitSha: { type: String, trim: true, maxlength: DEPLOYMENT_FIELD_LIMITS.commitSha },
    commitMessage: {
      type: String,
      trim: true,
      maxlength: DEPLOYMENT_FIELD_LIMITS.commitMessage,
    },
    occurredAt: { type: Date, required: true },
  },
  { timestamps: true },
);

/*
 * The idempotency key. One provider deployment is one row however many times its state
 * changes, and however many times the provider redelivers the same change.
 */
deploymentSchema.index({ provider: 1, externalId: 1 }, { unique: true });
deploymentSchema.index({ projectId: 1, occurredAt: -1 });

export const DeploymentModel: Model<DeploymentDocument> =
  (mongoose.models['Deployment'] as Model<DeploymentDocument> | undefined) ??
  mongoose.model<DeploymentDocument>('Deployment', deploymentSchema);

export function toStoredDeployment(
  document: DeploymentDocument & { _id: unknown },
): StoredDeployment {
  return {
    id: String(document._id),
    provider: document.provider,
    externalId: document.externalId,
    projectId: document.projectId,
    environment: document.environment,
    state: document.state,
    url: document.url,
    commitSha: document.commitSha,
    commitMessage: document.commitMessage,
    occurredAt: document.occurredAt,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}
