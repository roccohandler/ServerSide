import mongoose, { Schema, type Model } from 'mongoose';
import { REPORT_FIELD_LIMITS, REPORT_MONTH, type StoredReport } from './report.types.js';

export interface ReportDocument {
  projectId: string;
  userId: string;
  month: string;
  enquiries: number;
  baseline?: number;
  changeExplanation: string;
  whatWeChanged: string[];
  whatIsNext: string[];
  preparedBy: string;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const reportSchema = new Schema<ReportDocument>(
  {
    projectId: { type: String, required: true, maxlength: 64 },
    /*
     * Denormalised from the project rather than joined at read time.
     *
     * The customer's Reports screen is "everything ever published to me", across however many
     * projects they have had, and resolving that through the project collection on every load
     * would be a join for a list that is almost always three rows long. The copy is safe
     * because a report is written after a project has an owner and a project's owner does not
     * change — `attachOwner` claims an *unowned* project, and `detachOwner` makes the project
     * invisible to everybody, which is the same answer this field would give.
     */
    userId: { type: String, required: true, maxlength: 64 },
    month: {
      type: String,
      required: true,
      match: REPORT_MONTH,
      maxlength: REPORT_FIELD_LIMITS.month,
    },
    enquiries: { type: Number, required: true, min: 0 },
    baseline: { type: Number, min: 0 },
    changeExplanation: {
      type: String,
      required: true,
      trim: true,
      maxlength: REPORT_FIELD_LIMITS.changeExplanation,
    },
    whatWeChanged: { type: [String], required: true, default: [] },
    whatIsNext: { type: [String], required: true, default: [] },
    preparedBy: {
      type: String,
      required: true,
      trim: true,
      maxlength: REPORT_FIELD_LIMITS.preparedBy,
    },
    publishedAt: { type: Date },
  },
  { timestamps: true },
);

/*
 * One report per project per month, enforced by the database rather than by a check.
 *
 * A second August report is not a thing an operator wants and it is a thing a double-submit
 * produces. The unique index means the retry answers a duplicate-key error the service turns
 * into an update, rather than two rows the customer sees as two contradictory Augusts.
 */
reportSchema.index({ projectId: 1, month: 1 }, { unique: true });

/** The customer's Reports screen: everything published to them, newest first. */
reportSchema.index({ userId: 1, month: -1 });

export const ReportModel: Model<ReportDocument> =
  (mongoose.models['Report'] as Model<ReportDocument> | undefined) ??
  mongoose.model<ReportDocument>('Report', reportSchema);

export function toStoredReport(document: ReportDocument & { _id: unknown }): StoredReport {
  return {
    id: String(document._id),
    projectId: document.projectId,
    userId: document.userId,
    month: document.month,
    enquiries: document.enquiries,
    baseline: document.baseline,
    changeExplanation: document.changeExplanation,
    whatWeChanged: document.whatWeChanged,
    whatIsNext: document.whatIsNext,
    preparedBy: document.preparedBy,
    publishedAt: document.publishedAt,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}
