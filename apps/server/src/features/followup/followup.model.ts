import mongoose, { Schema, type Model } from 'mongoose';
import { SUPPRESSION_REASONS, type SuppressionReason } from './followup.types.js';

/*
 * Two collections, and they answer two different questions.
 *
 * `FollowUpSend` is "has this exact message already gone to this account", and its unique
 * index is the entire correctness property of the feature — see the note on it below.
 *
 * `Suppression` is "may we send this address anything that is not transactional", and it is
 * keyed on the **address** rather than on the account. That is deliberate: somebody who
 * unsubscribes and then signs up again with the same address has not changed their mind, and
 * a suppression tied to a user id would quietly lapse the moment they did.
 */

export interface FollowUpSendDocument {
  userId: string;
  ruleKey: string;
  sentAt: Date;
}

const followUpSendSchema = new Schema<FollowUpSendDocument>({
  userId: { type: String, required: true, maxlength: 64 },
  ruleKey: { type: String, required: true, maxlength: 64 },
  sentAt: { type: Date, required: true },
});

/*
 * ============================================================================
 * THE UNIQUE INDEX IS THE FEATURE
 * ============================================================================
 *
 * Idempotency here is not a nicety, it is the only thing standing between a scheduled job and
 * emailing the same person the same sentence every morning until they mark it as spam. A
 * check-then-write in the service would be correct until the day two invocations overlap —
 * which is exactly what happens when a cron run is slow and the next one starts, and which
 * would produce duplicates on the busiest morning rather than the quietest.
 *
 * So the database refuses it. `recordSend` inserts *before* the mail goes out and treats a
 * duplicate-key error as "somebody else is sending this one", and the send is skipped rather
 * than raced. The cost of that ordering is a message that is recorded and then fails to send —
 * one person not nudged, which is the correct thing to lose. The alternative loses their
 * goodwill.
 * ============================================================================
 */
followUpSendSchema.index({ userId: 1, ruleKey: 1 }, { unique: true });

export const FollowUpSendModel: Model<FollowUpSendDocument> =
  (mongoose.models['FollowUpSend'] as Model<FollowUpSendDocument> | undefined) ??
  mongoose.model<FollowUpSendDocument>('FollowUpSend', followUpSendSchema);

export interface SuppressionDocument {
  email: string;
  reason: SuppressionReason;
  createdAt: Date;
}

const suppressionSchema = new Schema<SuppressionDocument>({
  /* Lowercased by the service before it reaches here. One address is one row. */
  email: { type: String, required: true, unique: true, maxlength: 320 },
  reason: { type: String, required: true, enum: SUPPRESSION_REASONS },
  createdAt: { type: Date, required: true },
});

export const SuppressionModel: Model<SuppressionDocument> =
  (mongoose.models['Suppression'] as Model<SuppressionDocument> | undefined) ??
  mongoose.model<SuppressionDocument>('Suppression', suppressionSchema);
