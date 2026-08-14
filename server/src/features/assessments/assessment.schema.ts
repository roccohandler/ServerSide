import { z } from 'zod';
import { parseBody } from '../../lib/requestSchema.js';
import {
  ANSWER_MAX,
  ANSWER_MIN,
  ASSESSMENT_CATEGORIES,
  ASSESSMENT_FIELD_LIMITS,
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
