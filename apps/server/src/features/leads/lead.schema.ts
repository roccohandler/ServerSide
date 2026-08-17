import { z } from 'zod';
import { AppError, type FieldErrors } from '../../lib/appError.js';
import {
  HONEYPOT_FIELD,
  INQUIRY_TYPES,
  LEAD_FIELD_LIMITS,
  type ValidatedCustomerRequestInput,
  type ValidatedLeadInput,
} from './lead.types.js';

/*
 * This module is the security boundary. The browser validates too, but only to give
 * fast feedback — nothing here may assume the request came from our own form.
 *
 * Validation is deliberately forgiving about *format* and strict about *shape*: a real
 * plumber typing "(206) 555-0134" or "acmeplumbing.com" must get through, while an
 * unexpected key or an oversized field must not.
 */

/** Collapses runs of whitespace so pasted values do not arrive with stray newlines. */
const collapseWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim();

const requiredText = (field: keyof typeof LEAD_FIELD_LIMITS, label: string, minLength = 1) =>
  z
    .string({ error: `${label} is required.` })
    .transform(collapseWhitespace)
    .pipe(
      z
        .string()
        .min(minLength, `${label} is required.`)
        .max(
          LEAD_FIELD_LIMITS[field],
          `${label} must be ${LEAD_FIELD_LIMITS[field]} characters or fewer.`,
        ),
    );

/**
 * Only asserts that there are enough digits to dial. Visitors type "(206) 555-0134",
 * "206.555.0134" and "+1 206 555 0134"; rejecting any of those loses a real lead.
 */
const phoneSchema = z
  .string({ error: 'Phone number is required.' })
  .transform(collapseWhitespace)
  .pipe(
    z
      .string()
      .min(1, 'Phone number is required.')
      .max(
        LEAD_FIELD_LIMITS.phone,
        `Phone number must be ${LEAD_FIELD_LIMITS.phone} characters or fewer.`,
      )
      .refine((value) => {
        const digits = value.replace(/\D/g, '');
        return digits.length >= 10 && digits.length <= 15;
      }, 'Please enter a phone number we can reach you on, including the area code.'),
  );

const emailSchema = z
  .string({ error: 'Email address is required.' })
  .transform((value) => value.trim().toLowerCase())
  .pipe(
    z
      .email({ error: 'Please enter a valid email address.' })
      .max(LEAD_FIELD_LIMITS.email, 'Email address is too long.'),
  );

function normaliseWebsite(value: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return withScheme.replace(/\/+$/, '');
}

function isReachableUrl(value: string | undefined): boolean {
  if (value === undefined) return true;
  try {
    const url = new URL(value);
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname.includes('.');
  } catch {
    return false;
  }
}

/**
 * Optional. Owners type "acmeplumbing.com" far more often than a full URL, so a missing
 * scheme is normalised rather than rejected. `.optional()` stays outermost so the key
 * itself may be omitted entirely.
 */
const websiteSchema = z
  .string()
  .max(LEAD_FIELD_LIMITS.website, 'Website address is too long.')
  .transform(normaliseWebsite)
  .refine(isReachableUrl, 'Please enter a valid website address, for example acmeplumbing.com.')
  .optional();

/** Optional. Empty and whitespace-only messages collapse to "not provided". */
const messageSchema = z
  .string()
  .max(
    LEAD_FIELD_LIMITS.message,
    `Message must be ${LEAD_FIELD_LIMITS.message} characters or fewer.`,
  )
  .transform((value) => {
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  })
  .optional();

/**
 * `strictObject` rejects unrecognised keys. Client and server share one contract, so an
 * unexpected field means either a stale client or someone probing the endpoint.
 */
export const leadRequestSchema = z.strictObject({
  name: requiredText('name', 'Name', 2),
  businessName: requiredText('businessName', 'Business name'),
  email: emailSchema,
  phone: phoneSchema,
  website: websiteSchema,
  inquiryType: z.enum(INQUIRY_TYPES, { error: 'Please choose what you need help with.' }),
  message: messageSchema,
  /** Hidden anti-spam input. Declared so `strictObject` tolerates it; see `parseLeadRequest`. */
  [HONEYPOT_FIELD]: z.string().max(200).optional(),
});

export type LeadRequestPayload = z.infer<typeof leadRequestSchema>;

function toFieldErrors(error: z.ZodError): FieldErrors {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    if (issue.path.length === 0) continue;
    const key = String(issue.path[0]);
    // First problem per field wins; five messages on one input helps nobody.
    fields[key] ??= issue.message;
  }
  return fields;
}

/**
 * Validates and normalises an untrusted request body.
 *
 * @throws {AppError} `VALIDATION_ERROR` with per-field messages that are safe to
 * display, or `MALFORMED_REQUEST` when the body is not a lead submission at all.
 * Messages come from this schema only — raw input is never echoed back to the browser.
 */
export function parseLeadRequest(body: unknown): ValidatedLeadInput {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new AppError('MALFORMED_REQUEST', 'The submission could not be read. Please try again.');
  }

  const result = leadRequestSchema.safeParse(body);

  if (!result.success) {
    if (result.error.issues.some((issue) => issue.code === 'unrecognized_keys')) {
      throw new AppError(
        'MALFORMED_REQUEST',
        'The submission could not be read. Please try again.',
      );
    }

    throw new AppError('VALIDATION_ERROR', 'Please check the highlighted fields and try again.', {
      fields: toFieldErrors(result.error),
    });
  }

  const { [HONEYPOT_FIELD]: honeypot, ...lead } = result.data;

  return {
    ...lead,
    isBotSubmission: typeof honeypot === 'string' && honeypot.trim().length > 0,
  };
}

/*
 * ============================================================================
 * THE SIGNED-IN CUSTOMER'S REQUEST
 * ============================================================================
 *
 * The second half of the account-first funnel: the account exists, so the four fields below
 * are everything still missing. See `docs/ACCOUNT-FIRST-CAPTURE.md`.
 *
 * ## Why this is a second schema rather than `leadRequestSchema.partial()`
 *
 * Because they are validating two different things. `leadRequestSchema` describes an
 * anonymous submission from a public form, where the name and the address are claims in the
 * body and the honeypot is the only thing standing between the collection and a bot. This
 * describes the *remainder* of a request from somebody the server has already identified.
 *
 * Deriving one from the other would put `name`, `email` and the honeypot in this shape as
 * optional keys — three fields that must never be read here, kept one `.parse()` away from
 * being read here, in the file whose whole job is to decide what the server believes. A
 * `strictObject` that does not mention them cannot be made to accept them.
 *
 * The field rules themselves *are* shared, because those genuinely are one rule: a phone
 * number is a phone number on both surfaces, and a second opinion about what counts as one
 * is how the two forms start disagreeing about the same customer.
 * ============================================================================
 */
export const customerRequestSchema = z.strictObject({
  businessName: requiredText('businessName', 'Business name'),
  phone: phoneSchema,
  website: websiteSchema,
  inquiryType: z.enum(INQUIRY_TYPES, { error: 'Please choose what you need help with.' }),
  message: messageSchema,
});

/**
 * Validates the body of `POST /api/app/assessment-request`.
 *
 * @throws {AppError} `VALIDATION_ERROR` with per-field messages, or `MALFORMED_REQUEST`
 * when the body is not a request at all. Identity is never taken from here — see
 * `ValidatedCustomerRequestInput`.
 */
export function parseCustomerRequest(body: unknown): ValidatedCustomerRequestInput {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new AppError('MALFORMED_REQUEST', 'The submission could not be read. Please try again.');
  }

  const result = customerRequestSchema.safeParse(body);

  if (!result.success) {
    if (result.error.issues.some((issue) => issue.code === 'unrecognized_keys')) {
      /*
       * The likeliest unrecognised key here is `name` or `email` from a client that thinks
       * it is talking to the public endpoint. Refusing rather than ignoring is the point:
       * silently dropping an identity field is how a caller comes to believe it was
       * honoured.
       */
      throw new AppError(
        'MALFORMED_REQUEST',
        'The submission could not be read. Please try again.',
      );
    }

    throw new AppError('VALIDATION_ERROR', 'Please check the highlighted fields and try again.', {
      fields: toFieldErrors(result.error),
    });
  }

  return result.data;
}
