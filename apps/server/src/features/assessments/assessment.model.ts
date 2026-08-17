import mongoose, { Schema, type Model } from 'mongoose';
import {
  ANSWER_MAX,
  ANSWER_MIN,
  ASSESSMENT_CATEGORIES,
  ASSESSMENT_FIELD_LIMITS,
  ASSESSMENT_FINDING_SEVERITIES,
  ASSESSMENT_STATUSES,
  type AssessmentCategory,
  type AssessmentFindingSeverity,
  type AssessmentResult,
  type AssessmentStatus,
  type StoredAssessment,
} from './assessment.types.js';

interface AnswerDocument {
  questionId: string;
  category: AssessmentCategory;
  value: number;
}

const answerSchema = new Schema<AnswerDocument>(
  {
    questionId: {
      type: String,
      required: true,
      trim: true,
      maxlength: ASSESSMENT_FIELD_LIMITS.questionId,
    },
    category: { type: String, required: true, enum: ASSESSMENT_CATEGORIES },
    value: { type: Number, required: true, min: ANSWER_MIN, max: ANSWER_MAX },
  },
  { _id: false },
);

interface FindingDocument {
  title: string;
  detail: string;
  severity: AssessmentFindingSeverity;
}

const findingSchema = new Schema<FindingDocument>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: ASSESSMENT_FIELD_LIMITS.findingTitle,
    },
    detail: {
      type: String,
      required: true,
      trim: true,
      maxlength: ASSESSMENT_FIELD_LIMITS.findingDetail,
    },
    severity: { type: String, required: true, enum: ASSESSMENT_FINDING_SEVERITIES },
  },
  { _id: false },
);

interface ReportDocument {
  summary: string;
  findings: FindingDocument[];
  recommendations: string[];
  preparedBy: string;
  deliveredAt?: Date;
}

/*
 * `deliveredAt` is the only optional field, and it is the state machine.
 *
 * There is no `status: 'draft' | 'delivered'` beside it, because two fields that must agree
 * are two fields that eventually will not. A date is either there or it is not.
 */
const reportSchema = new Schema<ReportDocument>(
  {
    summary: {
      type: String,
      required: true,
      trim: true,
      maxlength: ASSESSMENT_FIELD_LIMITS.reportSummary,
    },
    findings: { type: [findingSchema], required: true, default: [] },
    recommendations: { type: [String], required: true, default: [] },
    preparedBy: {
      type: String,
      required: true,
      trim: true,
      maxlength: ASSESSMENT_FIELD_LIMITS.preparedBy,
    },
    deliveredAt: { type: Date },
  },
  { _id: false },
);

export interface AssessmentDocument {
  userId: string;
  businessName: string;
  websiteUrl?: string;
  trade?: string;
  answers: AnswerDocument[];
  note?: string;
  status: AssessmentStatus;
  score: number;
  band: AssessmentResult['band'];
  weakestCategories: AssessmentCategory[];
  recommendations: string[];
  report?: ReportDocument;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const assessmentSchema = new Schema<AssessmentDocument>(
  {
    /*
     * Required. There is no such thing as an ownerless assessment in storage — an
     * anonymous one lives in the browser until the moment somebody signs in to keep it.
     * See the note at the top of `assessment.types.ts`.
     */
    userId: { type: String, required: true, maxlength: 64 },
    businessName: {
      type: String,
      required: true,
      trim: true,
      maxlength: ASSESSMENT_FIELD_LIMITS.businessName,
    },
    websiteUrl: { type: String, trim: true, maxlength: ASSESSMENT_FIELD_LIMITS.websiteUrl },
    trade: { type: String, trim: true, maxlength: ASSESSMENT_FIELD_LIMITS.trade },
    answers: { type: [answerSchema], required: true },
    note: { type: String, trim: true, maxlength: ASSESSMENT_FIELD_LIMITS.note },
    status: { type: String, required: true, enum: ASSESSMENT_STATUSES, default: 'submitted' },
    score: { type: Number, required: true, min: 0, max: 100 },
    band: { type: String, required: true, enum: ['strong', 'workable', 'costing-you'] },
    weakestCategories: { type: [String], required: true, default: [] },
    recommendations: { type: [String], required: true, default: [] },
    report: { type: reportSchema },
    submittedAt: { type: Date, required: true },
  },
  { timestamps: true },
);

assessmentSchema.index({ userId: 1, submittedAt: -1 });

/*
 * The console's queue: everything nobody has published a review for, oldest first.
 *
 * Indexed on the *absence* of a date, which Mongo handles as a sparse-ish equality against
 * null. The queue is the operational surface for the primary offer and it is read on every
 * console page load, so it does not get to be a collection scan.
 */
assessmentSchema.index({ 'report.deliveredAt': 1, submittedAt: 1 });

export const AssessmentModel: Model<AssessmentDocument> =
  (mongoose.models['Assessment'] as Model<AssessmentDocument> | undefined) ??
  mongoose.model<AssessmentDocument>('Assessment', assessmentSchema);

export function toStoredAssessment(
  document: AssessmentDocument & { _id: unknown },
): StoredAssessment {
  return {
    id: String(document._id),
    userId: document.userId,
    businessName: document.businessName,
    websiteUrl: document.websiteUrl,
    trade: document.trade,
    answers: document.answers.map((answer) => ({
      questionId: answer.questionId,
      category: answer.category,
      value: answer.value,
    })),
    note: document.note,
    status: document.status,
    score: document.score,
    band: document.band,
    weakestCategories: document.weakestCategories as AssessmentCategory[],
    recommendations: document.recommendations,
    report: document.report
      ? {
          summary: document.report.summary,
          findings: document.report.findings.map((finding) => ({
            title: finding.title,
            detail: finding.detail,
            severity: finding.severity,
          })),
          recommendations: document.report.recommendations,
          preparedBy: document.report.preparedBy,
          deliveredAt: document.report.deliveredAt,
        }
      : undefined,
    submittedAt: document.submittedAt,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}
