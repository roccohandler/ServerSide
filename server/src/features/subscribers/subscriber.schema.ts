import { z } from 'zod';
import { AppError, type FieldErrors } from '../../lib/appError.js';
import { HONEYPOT_FIELD } from '../leads/lead.types.js';
import {
  SUBSCRIBER_FIELD_LIMITS,
  SUBSCRIPTION_ASSETS,
  type ValidatedSubscriberInput,
} from './subscriber.types.js';

/*
 * The security boundary for the subscribe endpoint.
 *
 * Same rules as the lead schema: strict about shape, forgiving about format, and never
 * assuming the request came from our own form. This one asks for a single field, which
 * makes it a more attractive target for a naive script than the six-field lead form —
 * hence the same honeypot, and its own rate limit at the route.
 *
 * The honeypot field name is imported from the lead feature rather than redeclared. Two
 * constants with the same value in two files is how they eventually stop matching, and a
 * honeypot that does not match the client is a honeypot that catches nothing.
 */

const emailSchema = z
  .string({ error: 'Email address is required.' })
  .transform((value) => value.trim().toLowerCase())
  .pipe(
    z
      .email({ error: 'Please enter a valid email address.' })
      .max(SUBSCRIBER_FIELD_LIMITS.email, 'Email address is too long.'),
  );

/**
 * `strictObject` rejects unrecognised keys, so a stale client or a probe is a 400 rather
 * than a silently half-understood request.
 *
 * `asset` defaults rather than being required: there is one asset today, and making the
 * client name it correctly on every request buys nothing. The default is what stops this
 * becoming a required field the day a second asset is added.
 */
export const subscriberRequestSchema = z.strictObject({
  email: emailSchema,
  asset: z.enum(SUBSCRIPTION_ASSETS).default('playbook-workbook'),
  /** Hidden anti-spam input. Declared so `strictObject` tolerates it. */
  [HONEYPOT_FIELD]: z.string().max(200).optional(),
});

export type SubscriberRequestPayload = z.infer<typeof subscriberRequestSchema>;

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
 * `MALFORMED_REQUEST` when the body is not a subscribe request at all.
 */
export function parseSubscriberRequest(body: unknown): ValidatedSubscriberInput {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new AppError('MALFORMED_REQUEST', 'The request could not be read. Please try again.');
  }

  const result = subscriberRequestSchema.safeParse(body);

  if (!result.success) {
    if (result.error.issues.some((issue) => issue.code === 'unrecognized_keys')) {
      throw new AppError('MALFORMED_REQUEST', 'The request could not be read. Please try again.');
    }

    throw new AppError('VALIDATION_ERROR', 'Please check the highlighted fields and try again.', {
      fields: toFieldErrors(result.error),
    });
  }

  const { [HONEYPOT_FIELD]: honeypot, ...subscriber } = result.data;

  return {
    ...subscriber,
    isBotSubmission: typeof honeypot === 'string' && honeypot.trim().length > 0,
  };
}
