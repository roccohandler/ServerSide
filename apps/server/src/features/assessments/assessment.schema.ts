import { z } from 'zod';
import { parseBody } from '../../lib/requestSchema.js';
import {
  ANSWER_MAX,
  ANSWER_MIN,
  ASSESSMENT_CATEGORIES,
  ASSESSMENT_FIELD_LIMITS,
  ASSESSMENT_FINDING_SEVERITIES,
  type AssessmentReportDraft,
  type AssessmentSubmission,
} from './assessment.types.js';

/*
 * What a submission is allowed to contain.
 *
 * Notice what has no field here: `score`, `band`, `recommendations`, `userId`. The first
 * three are computed by the service from the answers, and the fourth comes from the
 * session. A strict object means a body offering any of them is rejected as unreadable
 * rather than having them quietly dropped — the version where they are dropped is safe
 * right up until somebody spreads the parsed body into the create call.
 */

const answerSchema = z.strictObject({
  questionId: z.string().trim().min(1).max(ASSESSMENT_FIELD_LIMITS.questionId),
  category: z.enum(ASSESSMENT_CATEGORIES),
  value: z.number().int().min(ANSWER_MIN).max(ANSWER_MAX),
});

export const submitAssessmentSchema = z.strictObject({
  businessName: z
    .string()
    .trim()
    .min(1, { error: 'Please tell us the name of your business.' })
    .max(ASSESSMENT_FIELD_LIMITS.businessName),
  /*
   * Accepted with or without a scheme, because nobody types `https://`. Normalised here
   * so storage holds one shape and the owner's notification has a clickable link.
   */
  websiteUrl: z
    .string()
    .trim()
    .max(ASSESSMENT_FIELD_LIMITS.websiteUrl)
    .transform((value) => (value.length === 0 ? undefined : value))
    .optional()
    .transform((value) =>
      value === undefined ? undefined : /^https?:\/\//i.test(value) ? value : `https://${value}`,
    ),
  trade: z.string().trim().min(1).max(ASSESSMENT_FIELD_LIMITS.trade).optional(),
  answers: z
    .array(answerSchema)
    .min(1, { error: 'Answer at least one question before sending the assessment.' })
    .max(ASSESSMENT_FIELD_LIMITS.answers),
  note: z.string().trim().min(1).max(ASSESSMENT_FIELD_LIMITS.note).optional(),
});

export function parseSubmitAssessment(body: unknown): AssessmentSubmission {
  return parseBody(submitAssessmentSchema, body);
}

/*
 * The owner's review, as the console submits it.
 *
 * `deliveredAt` has no field here for exactly the reason `score` has none above: it is
 * decided by the server, at the moment of an explicit publish, and a body that could carry
 * it would be a way to back-date a document somebody was told the date of.
 *
 * `preparedBy` likewise comes from the session in the route, not from here — a byline a
 * request could choose is one that can be somebody else's name.
 */
const findingSchema = z.strictObject({
  title: z.string().trim().min(1).max(ASSESSMENT_FIELD_LIMITS.findingTitle),
  detail: z.string().trim().min(1).max(ASSESSMENT_FIELD_LIMITS.findingDetail),
  severity: z.enum(ASSESSMENT_FINDING_SEVERITIES),
});

export const saveAssessmentReportSchema = z.strictObject({
  summary: z
    .string()
    .trim()
    .min(1, { error: 'A review needs a summary before it can be saved.' })
    .max(ASSESSMENT_FIELD_LIMITS.reportSummary),
  findings: z.array(findingSchema).max(ASSESSMENT_FIELD_LIMITS.findings).default([]),
  recommendations: z
    .array(z.string().trim().min(1).max(ASSESSMENT_FIELD_LIMITS.reportRecommendation))
    .max(ASSESSMENT_FIELD_LIMITS.reportRecommendations)
    .default([]),
});

export function parseSaveAssessmentReport(
  body: unknown,
): Omit<AssessmentReportDraft, 'preparedBy'> {
  return parseBody(saveAssessmentReportSchema, body);
}
