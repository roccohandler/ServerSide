import mongoose, { Schema, type Model } from 'mongoose';
import {
  INQUIRY_TYPES,
  LEAD_FIELD_LIMITS,
  LEAD_STATUSES,
  NOTIFICATION_STATUSES,
  type InquiryType,
  type LeadStatus,
  type NotificationStatus,
  type StoredLead,
} from './lead.types.js';

export interface LeadDocument {
  name: string;
  businessName: string;
  email: string;
  phone: string;
  website?: string;
  inquiryType: InquiryType;
  message?: string;
  status: LeadStatus;
  source: string;
  notificationStatus: NotificationStatus;
  userId?: string;
  createdAt: Date;
  updatedAt: Date;
}

/*
 * Intentionally small. This stores what is needed to call the person back and to tell
 * whether they were notified — no IP addresses, no user agents, no tracking identifiers.
 * Mongoose validation duplicates the zod limits on purpose: the schema at the API
 * boundary protects the request, this one protects the collection.
 */
const leadSchema = new Schema<LeadDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: LEAD_FIELD_LIMITS.name },
    businessName: {
      type: String,
      required: true,
      trim: true,
      maxlength: LEAD_FIELD_LIMITS.businessName,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: LEAD_FIELD_LIMITS.email,
    },
    phone: { type: String, required: true, trim: true, maxlength: LEAD_FIELD_LIMITS.phone },
    // Normalised to include a scheme, which can add up to 8 characters to what was typed.
    website: { type: String, trim: true, maxlength: LEAD_FIELD_LIMITS.website + 8 },
    inquiryType: { type: String, required: true, enum: INQUIRY_TYPES },
    message: { type: String, trim: true, maxlength: LEAD_FIELD_LIMITS.message },
    status: { type: String, required: true, enum: LEAD_STATUSES, default: 'new' },
    source: { type: String, required: true, trim: true, maxlength: 60 },
    notificationStatus: {
      type: String,
      required: true,
      enum: NOTIFICATION_STATUSES,
      default: 'pending',
    },
    /*
     * Optional, and every lead written before this field existed simply does not have it.
     * That is the correct reading of those documents rather than a gap to backfill: they
     * came from the anonymous contact form, which had no account to attach.
     */
    userId: { type: String, trim: true, maxlength: 64 },
  },
  { timestamps: true },
);

// Supports the recent-duplicate lookup performed on every submission.
leadSchema.index({ email: 1, createdAt: -1 });
// Supports reading the newest leads first when inspecting the collection by hand.
leadSchema.index({ createdAt: -1 });
/*
 * Supports the console inbox: unanswered leads, oldest first. Compound and in that
 * order, so the equality on `status` selects and the sort on `createdAt` is served by
 * the same index rather than by an in-memory sort of every lead ever received.
 */
leadSchema.index({ status: 1, createdAt: 1 });
/*
 * Supports the console's accounts table, which asks "which of these fifty accounts has ever
 * sent a request". Sparse, because the great majority of leads have no `userId` at all —
 * the anonymous contact form is still the main way one arrives — and indexing `null` fifty
 * thousand times to answer a question about the few that do is the wrong shape of index.
 */
leadSchema.index({ userId: 1 }, { sparse: true });

/*
 * Guard against re-registration. Serverless invocations reuse a warm module registry and
 * `tsx watch` re-imports on save; both would otherwise throw OverwriteModelError.
 */
export const LeadModel: Model<LeadDocument> =
  (mongoose.models['Lead'] as Model<LeadDocument> | undefined) ??
  mongoose.model<LeadDocument>('Lead', leadSchema);

/** Maps a persisted document to the plain domain shape used everywhere above the repository. */
export function toStoredLead(document: LeadDocument & { _id: unknown }): StoredLead {
  return {
    id: String(document._id),
    name: document.name,
    businessName: document.businessName,
    email: document.email,
    phone: document.phone,
    ...(document.website ? { website: document.website } : {}),
    inquiryType: document.inquiryType,
    ...(document.message ? { message: document.message } : {}),
    status: document.status,
    source: document.source,
    notificationStatus: document.notificationStatus,
    ...(document.userId ? { userId: document.userId } : {}),
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}
