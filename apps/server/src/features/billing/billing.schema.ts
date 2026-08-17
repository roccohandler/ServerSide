import { z } from 'zod';
import { AppError, type FieldErrors } from '../../lib/appError.js';
import {
  BILLING_PRODUCTS,
  GUARANTEE_REMEDIES,
  PROJECT_FIELD_LIMITS,
  PROJECT_STATUSES,
  type NewProjectInput,
} from './billing.types.js';

/*
 * The validation boundary for the owner-facing billing endpoints. These sit behind the
 * admin token, but "authenticated" is not "trusted input" — a typo in a curl command
 * should be a 400 with a field name, not a Mongoose cast error.
 */

const trimmed = (max: number) => z.string().trim().min(1).max(max);

export const createProjectSchema = z.strictObject({
  businessName: trimmed(PROJECT_FIELD_LIMITS.businessName),
  contactName: trimmed(PROJECT_FIELD_LIMITS.contactName),
  email: z
    .string()
    .transform((value) => value.trim().toLowerCase())
    .pipe(z.email({ error: 'Please enter a valid email address.' })),
  phone: trimmed(PROJECT_FIELD_LIMITS.phone).optional(),
  notes: trimmed(PROJECT_FIELD_LIMITS.notes).optional(),
});

export const createCheckoutSessionSchema = z.strictObject({
  projectId: trimmed(64),
  product: z.enum(BILLING_PRODUCTS),
});

/**
 * The console's version, where the project is in the path and the products are two.
 *
 * `BILLING_PRODUCTS` is deliberately not reused here. This is the button an operator presses
 * to ask a named client for money, and the two subscription products have no business on it:
 * the published terms say Growth Partner starts on launch day *only if the client chooses it*,
 * and a console control that emails somebody a subscription link is not that. Narrowing the
 * enum is what makes that a compile error rather than a policy somebody remembers.
 */
export const createCheckoutLinkSchema = z.strictObject({
  product: z.enum(['build-deposit', 'build-final']),
  /** Send it to the client as well as returning it. Off unless the operator asks. */
  notifyCustomer: z.boolean().default(false),
});

export const setProjectStatusSchema = z.strictObject({
  status: z.enum(PROJECT_STATUSES),
});

export const createPortalSessionSchema = z.strictObject({
  projectId: trimmed(64),
});

export const recordGuaranteeCreditSchema = z.strictObject({
  projectId: trimmed(64),
  /** The affected calendar month. One remedy per project-month, ever. */
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, { error: 'Use the YYYY-MM form, e.g. 2026-08.' }),
  remedy: z.enum(GUARANTEE_REMEDIES).optional(),
});

/*
 * Not strict: a query string may carry params this endpoint does not know (tracking,
 * caching quirks), and ignoring them is the correct reading of a GET.
 */
export const listProjectsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

function toFieldErrors(error: z.ZodError): FieldErrors {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    if (issue.path.length === 0) continue;
    const key = String(issue.path[0]);
    fields[key] ??= issue.message;
  }
  return fields;
}

function parseWith<T>(schema: z.ZodType<T>, body: unknown): T {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new AppError('MALFORMED_REQUEST', 'The request could not be read.');
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    /*
     * Unrecognised keys are a malformed request, not a validation problem — the same
     * rule as the lead and subscriber schemas. It matters here specifically because a
     * body smuggling an `amount` must be rejected as unreadable, never half-understood.
     */
    if (result.error.issues.some((issue) => issue.code === 'unrecognized_keys')) {
      throw new AppError('MALFORMED_REQUEST', 'The request could not be read.');
    }

    throw new AppError('VALIDATION_ERROR', 'Please check the highlighted fields.', {
      fields: toFieldErrors(result.error),
    });
  }
  return result.data;
}

export function parseCreateProject(body: unknown): NewProjectInput {
  return parseWith(createProjectSchema, body);
}

export function parseCreateCheckoutSession(body: unknown) {
  return parseWith(createCheckoutSessionSchema, body);
}

export function parseCreateCheckoutLink(body: unknown) {
  return parseWith(createCheckoutLinkSchema, body);
}

export function parseSetProjectStatus(body: unknown) {
  return parseWith(setProjectStatusSchema, body);
}

export function parseCreatePortalSession(body: unknown) {
  return parseWith(createPortalSessionSchema, body);
}

export function parseRecordGuaranteeCredit(body: unknown) {
  return parseWith(recordGuaranteeCreditSchema, body);
}

export function parseListProjectsQuery(query: unknown): { limit: number } {
  const result = listProjectsQuerySchema.safeParse(query ?? {});
  if (!result.success) {
    throw new AppError('VALIDATION_ERROR', 'Please check the highlighted fields.', {
      fields: toFieldErrors(result.error),
    });
  }
  return result.data;
}
