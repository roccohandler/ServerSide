import mongoose, { Schema, type Model } from 'mongoose';
import {
  GUARANTEE_REMEDIES,
  type GuaranteeRemedy,
  type StoredGuaranteeCredit,
} from './billing.types.js';

/*
 * Billing's own documents.
 *
 * The project document used to live in this file and now lives in
 * `features/projects/project.model.ts` — it is one record that both features write to,
 * and keeping its definition under `billing/` made fulfilment look like a billing
 * concern. What is left here is the two collections nothing outside billing has any
 * business reading.
 */

/*
 * Webhook idempotency: Stripe retries deliveries, and a retried `checkout.session.completed`
 * must not send the owner a second "payment received" email. One document per event id;
 * the unique index is what makes "have we seen this" race-safe.
 *
 * `status` is what makes the processing at-least-once rather than at-most-once: an event
 * is claimed as `processing`, marked `processed` only after every state change landed, and
 * deleted again when processing fails — so Stripe's retry finds no record and runs it
 * again, instead of finding a record and skipping a payment that was never applied.
 */
export const BILLING_EVENT_STATUSES = ['processing', 'processed'] as const;

export type BillingEventStatus = (typeof BILLING_EVENT_STATUSES)[number];

export interface BillingEventDocument {
  eventId: string;
  type: string;
  status: BillingEventStatus;
  createdAt: Date;
  updatedAt: Date;
}

const billingEventSchema = new Schema<BillingEventDocument>(
  {
    eventId: { type: String, required: true, unique: true },
    type: { type: String, required: true, maxlength: 100 },
    status: { type: String, required: true, enum: BILLING_EVENT_STATUSES, default: 'processing' },
  },
  { timestamps: true },
);

export const BillingEventModel: Model<BillingEventDocument> =
  (mongoose.models['BillingEvent'] as Model<BillingEventDocument> | undefined) ??
  mongoose.model<BillingEventDocument>('BillingEvent', billingEventSchema);

/*
 * Response-guarantee remedies, one document per project and affected month. The
 * compound unique index is what makes "was this month already waived" race-safe —
 * a double-click on the owner's side must never credit a client twice.
 */
export interface GuaranteeCreditDocument {
  projectId: string;
  month: string;
  remedy: GuaranteeRemedy;
  amountCents: number;
  status: BillingEventStatus;
  stripeReference?: string;
  createdAt: Date;
  updatedAt: Date;
}

const guaranteeCreditSchema = new Schema<GuaranteeCreditDocument>(
  {
    projectId: { type: String, required: true, maxlength: 64 },
    month: { type: String, required: true, match: /^\d{4}-(0[1-9]|1[0-2])$/ },
    remedy: { type: String, required: true, enum: GUARANTEE_REMEDIES },
    amountCents: { type: Number, required: true, min: 0 },
    status: { type: String, required: true, enum: BILLING_EVENT_STATUSES, default: 'processing' },
    stripeReference: { type: String, trim: true },
  },
  { timestamps: true },
);

guaranteeCreditSchema.index({ projectId: 1, month: 1 }, { unique: true });

export const GuaranteeCreditModel: Model<GuaranteeCreditDocument> =
  (mongoose.models['GuaranteeCredit'] as Model<GuaranteeCreditDocument> | undefined) ??
  mongoose.model<GuaranteeCreditDocument>('GuaranteeCredit', guaranteeCreditSchema);

export function toStoredGuaranteeCredit(document: GuaranteeCreditDocument): StoredGuaranteeCredit {
  return {
    projectId: document.projectId,
    month: document.month,
    remedy: document.remedy,
    amountCents: document.amountCents,
    stripeReference: document.stripeReference,
    createdAt: document.createdAt,
  };
}
