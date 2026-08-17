import { z } from 'zod';
import { parseBody } from '../../lib/requestSchema.js';
import { REPORT_FIELD_LIMITS, REPORT_MONTH } from './report.types.js';

/*
 * What the console may submit.
 *
 * No `publishedAt`, no `preparedBy` and no `userId`. The first is decided by an explicit
 * publish, the second comes from the session, and the third from the project — the same three
 * omissions, for the same three reasons, as the assessment review schema beside it.
 *
 * `enquiries` and `baseline` are counts of real things and cannot be negative. There is
 * deliberately no upper bound beyond the integer check: a busy month is a good problem, and a
 * cap here would be a number somebody guessed.
 */
const line = z.string().trim().min(1).max(REPORT_FIELD_LIMITS.line);

export const saveReportSchema = z.strictObject({
  month: z
    .string()
    .trim()
    .regex(REPORT_MONTH, { error: 'Give the month as YYYY-MM, for example 2026-08.' }),
  enquiries: z.number().int().min(0),
  /** Absent means "we do not know", which is a real answer. See `NewReportRecord.baseline`. */
  baseline: z.number().int().min(0).optional(),
  changeExplanation: z
    .string()
    .trim()
    .min(1, { error: 'Say what changed this month, in your own words.' })
    .max(REPORT_FIELD_LIMITS.changeExplanation),
  whatWeChanged: z.array(line).max(REPORT_FIELD_LIMITS.lines).default([]),
  whatIsNext: z.array(line).max(REPORT_FIELD_LIMITS.lines).default([]),
});

export const parseSaveReport = (body: unknown) => parseBody(saveReportSchema, body);
