import mongoose, { Schema, type Model } from 'mongoose';
import {
  APPROVAL_STATES,
  PAYMENT_STATUSES,
  PROJECT_FIELD_LIMITS,
  PROJECT_MILESTONES,
  PROJECT_STATUSES,
  SUBSCRIPTION_STATUSES,
  type ApprovalState,
  type PaymentStatus,
  type ProjectMilestone,
  type ProjectStatus,
  type StoredProject,
  type SubscriptionStatus,
} from './project.types.js';

/*
 * The project document.
 *
 * This moved here from the billing feature, which is where it was first needed. It is
 * one record with two features writing to it — billing advances the payment fields from
 * verified webhooks, fulfilment advances the milestone and the URLs — and the move is
 * what stops there being two notions of "a project". Billing reads it through its own
 * repository; nothing else does.
 */
export interface ProjectDocument {
  businessName: string;
  contactName: string;
  email: string;
  phone?: string;
  notes?: string;
  ownerUserId?: string;
  assessmentId?: string;
  status: ProjectStatus;
  milestone: ProjectMilestone;
  approval: ApprovalState;
  approvedAt?: Date;
  approvedDeploymentId?: string;
  previewUrl?: string;
  productionUrl?: string;
  depositStatus: PaymentStatus;
  finalStatus: PaymentStatus;
  subscriptionStatus: SubscriptionStatus;
  stripeCustomerId?: string;
  subscriptionId?: string;
  depositSessionId?: string;
  finalSessionId?: string;
  depositPaymentIntentId?: string;
  finalPaymentIntentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<ProjectDocument>(
  {
    businessName: {
      type: String,
      required: true,
      trim: true,
      maxlength: PROJECT_FIELD_LIMITS.businessName,
    },
    contactName: {
      type: String,
      required: true,
      trim: true,
      maxlength: PROJECT_FIELD_LIMITS.contactName,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: PROJECT_FIELD_LIMITS.email,
    },
    phone: { type: String, trim: true, maxlength: PROJECT_FIELD_LIMITS.phone },
    notes: { type: String, trim: true, maxlength: PROJECT_FIELD_LIMITS.notes },
    /*
     * Which account may see this project. Optional because projects created by hand
     * before the customer signed up have no owner yet; the billing feature fills it in
     * when a payment identifies one.
     */
    ownerUserId: { type: String, trim: true, maxlength: 64 },
    assessmentId: { type: String, trim: true, maxlength: 64 },
    status: { type: String, required: true, enum: PROJECT_STATUSES, default: 'agreed' },
    milestone: { type: String, required: true, enum: PROJECT_MILESTONES, default: 'onboarding' },
    approval: { type: String, required: true, enum: APPROVAL_STATES, default: 'not_ready' },
    approvedAt: { type: Date },
    approvedDeploymentId: { type: String, trim: true, maxlength: 64 },
    previewUrl: { type: String, trim: true, maxlength: PROJECT_FIELD_LIMITS.url },
    productionUrl: { type: String, trim: true, maxlength: PROJECT_FIELD_LIMITS.url },
    depositStatus: { type: String, required: true, enum: PAYMENT_STATUSES, default: 'pending' },
    finalStatus: { type: String, required: true, enum: PAYMENT_STATUSES, default: 'pending' },
    subscriptionStatus: {
      type: String,
      required: true,
      enum: SUBSCRIPTION_STATUSES,
      default: 'none',
    },
    stripeCustomerId: { type: String, trim: true },
    subscriptionId: { type: String, trim: true },
    depositSessionId: { type: String, trim: true },
    finalSessionId: { type: String, trim: true },
    depositPaymentIntentId: { type: String, trim: true },
    finalPaymentIntentId: { type: String, trim: true },
  },
  { timestamps: true },
);

projectSchema.index({ createdAt: -1 });
projectSchema.index({ subscriptionId: 1 });
/* The customer dashboard's only query: this person's projects, newest first. */
projectSchema.index({ ownerUserId: 1, createdAt: -1 });
/*
 * Two callers, one index: matching an onboarding submission to its project by address, and
 * the console's search box, which is an anchored prefix — see `lib/search.ts` for why that
 * matters. A `contains` search would not have been able to use this at all.
 */
projectSchema.index({ email: 1 });

/* Same re-registration guard as the lead model — warm serverless registries and tsx watch. */
export const ProjectModel: Model<ProjectDocument> =
  (mongoose.models['Project'] as Model<ProjectDocument> | undefined) ??
  mongoose.model<ProjectDocument>('Project', projectSchema);

export function toStoredProject(document: ProjectDocument & { _id: unknown }): StoredProject {
  return {
    id: String(document._id),
    businessName: document.businessName,
    contactName: document.contactName,
    email: document.email,
    phone: document.phone,
    notes: document.notes,
    ownerUserId: document.ownerUserId,
    assessmentId: document.assessmentId,
    status: document.status,
    /*
     * Defaulted on read as well as in the schema. Projects written before this feature
     * existed have neither field, and a `lean()` read returns exactly what is stored.
     */
    milestone: document.milestone ?? 'onboarding',
    approval: document.approval ?? 'not_ready',
    approvedAt: document.approvedAt,
    approvedDeploymentId: document.approvedDeploymentId,
    previewUrl: document.previewUrl,
    productionUrl: document.productionUrl,
    depositStatus: document.depositStatus,
    finalStatus: document.finalStatus,
    subscriptionStatus: document.subscriptionStatus,
    stripeCustomerId: document.stripeCustomerId,
    subscriptionId: document.subscriptionId,
    depositSessionId: document.depositSessionId,
    finalSessionId: document.finalSessionId,
    depositPaymentIntentId: document.depositPaymentIntentId,
    finalPaymentIntentId: document.finalPaymentIntentId,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}
