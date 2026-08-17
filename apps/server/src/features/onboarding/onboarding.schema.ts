import { z } from 'zod';
import { AppError, type FieldErrors } from '../../lib/appError.js';
import { HONEYPOT_FIELD } from '../leads/index.js';
import { ONBOARDING_FIELD_LIMITS, type ValidatedOnboardingInput } from './onboarding.types.js';

/*
 * The security boundary for the onboarding endpoint. Same rules as the lead schema:
 * strict about shape, forgiving about format, and never assuming the request came from
 * our own form. Four required contact fields plus the two facts a build cannot start
 * without; everything else is optional, because a half-filled onboarding the owner can
 * chase is worth more than a bounced one.
 */

const required = (max: number, message: string) =>
  z.string({ error: message }).trim().min(1, message).max(max);

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value === '' ? undefined : value));

export const onboardingRequestSchema = z.strictObject({
  businessName: required(ONBOARDING_FIELD_LIMITS.businessName, 'Business name is required.'),
  contactName: required(ONBOARDING_FIELD_LIMITS.contactName, 'Your name is required.'),
  email: z
    .string({ error: 'Email address is required.' })
    .transform((value) => value.trim().toLowerCase())
    .pipe(
      z
        .email({ error: 'Please enter a valid email address.' })
        .max(ONBOARDING_FIELD_LIMITS.email, 'Email address is too long.'),
    ),
  phone: required(ONBOARDING_FIELD_LIMITS.phone, 'A phone number is required.'),
  services: required(
    ONBOARDING_FIELD_LIMITS.long,
    'The services you want to be hired for are required.',
  ),
  serviceAreas: required(ONBOARDING_FIELD_LIMITS.short, 'Your service area is required.'),
  website: optional(ONBOARDING_FIELD_LIMITS.short),
  googleBusinessProfile: optional(ONBOARDING_FIELD_LIMITS.short),
  domainAndHosting: optional(ONBOARDING_FIELD_LIMITS.long),
  photosNote: optional(ONBOARDING_FIELD_LIMITS.long),
  competitors: optional(ONBOARDING_FIELD_LIMITS.long),
  callsToAction: optional(ONBOARDING_FIELD_LIMITS.long),
  accessNotes: optional(ONBOARDING_FIELD_LIMITS.long),
  anythingElse: optional(ONBOARDING_FIELD_LIMITS.long),
  /** Hidden anti-spam input. Declared so `strictObject` tolerates it. */
  [HONEYPOT_FIELD]: z.string().max(200).optional(),
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

/**
 * Validates and normalises an untrusted request body.
 *
 * @throws {AppError} `VALIDATION_ERROR` with per-field messages safe to display, or
 * `MALFORMED_REQUEST` when the body is not an onboarding submission at all.
 */
export function parseOnboardingRequest(body: unknown): ValidatedOnboardingInput {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new AppError('MALFORMED_REQUEST', 'The request could not be read. Please try again.');
  }

  const result = onboardingRequestSchema.safeParse(body);

  if (!result.success) {
    if (result.error.issues.some((issue) => issue.code === 'unrecognized_keys')) {
      throw new AppError('MALFORMED_REQUEST', 'The request could not be read. Please try again.');
    }

    throw new AppError('VALIDATION_ERROR', 'Please check the highlighted fields and try again.', {
      fields: toFieldErrors(result.error),
    });
  }

  const { [HONEYPOT_FIELD]: honeypot, ...submission } = result.data;

  return {
    ...submission,
    isBotSubmission: typeof honeypot === 'string' && honeypot.trim().length > 0,
  };
}
