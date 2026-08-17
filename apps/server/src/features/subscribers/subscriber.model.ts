import mongoose, { Schema, type Model } from 'mongoose';
import {
  SUBSCRIBER_FIELD_LIMITS,
  SUBSCRIBER_NOTIFICATION_STATUSES,
  SUBSCRIPTION_ASSETS,
  type StoredSubscriber,
  type SubscriberNotificationStatus,
  type SubscriptionAsset,
} from './subscriber.types.js';

export interface SubscriberDocument {
  email: string;
  asset: SubscriptionAsset;
  source: string;
  consentedAt: Date;
  consentText: string;
  notificationStatus: SubscriberNotificationStatus;
  createdAt: Date;
  updatedAt: Date;
}

/*
 * Four fields and two timestamps.
 *
 * No name, no company, no IP address, no user agent, no tracking identifier — because
 * none of those are needed to email somebody a PDF they asked for, and collecting data
 * "in case it is useful later" is how a one-line privacy policy stops being true.
 *
 * `consentText` stores the exact words shown next to the button. A record that somebody
 * consented is close to worthless without a record of what they were consenting to, and
 * that wording is in a content file that will be edited.
 */
const subscriberSchema = new Schema<SubscriberDocument>(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: SUBSCRIBER_FIELD_LIMITS.email,
    },
    asset: { type: String, required: true, enum: SUBSCRIPTION_ASSETS },
    source: { type: String, required: true, trim: true, maxlength: 60 },
    consentedAt: { type: Date, required: true },
    consentText: { type: String, required: true, maxlength: SUBSCRIBER_FIELD_LIMITS.consentText },
    notificationStatus: {
      type: String,
      required: true,
      enum: SUBSCRIBER_NOTIFICATION_STATUSES,
      default: 'pending',
    },
  },
  { timestamps: true },
);

/*
 * Supports the "have they already asked" lookup on every request. Not unique: somebody
 * who asks again a year later should get it again, and a unique index would turn that
 * into a 500 rather than a second copy of a PDF.
 */
subscriberSchema.index({ email: 1, asset: 1, createdAt: -1 });
subscriberSchema.index({ createdAt: -1 });

/* Same re-registration guard as the lead model — warm serverless registries and tsx watch. */
export const SubscriberModel: Model<SubscriberDocument> =
  (mongoose.models['Subscriber'] as Model<SubscriberDocument> | undefined) ??
  mongoose.model<SubscriberDocument>('Subscriber', subscriberSchema);

export function toStoredSubscriber(
  document: SubscriberDocument & { _id: unknown },
): StoredSubscriber {
  return {
    id: String(document._id),
    email: document.email,
    asset: document.asset,
    source: document.source,
    consentedAt: document.consentedAt,
    consentText: document.consentText,
    notificationStatus: document.notificationStatus,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}
