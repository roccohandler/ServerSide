import type { z } from 'zod';
import { AppError, type FieldErrors } from './appError.js';

/*
 * The validation boundary, shared by the features added for the customer platform.
 *
 * The four original features (leads, subscribers, onboarding, billing) each carry their
 * own copy of `parseWith`, written before there were four of them. They are left alone
 * deliberately — they work, they are tested, and rewriting them is not part of this
 * change — but nothing new should add a fifth copy, so this is where the next one goes.
 *
 * The two rules it encodes are the ones those copies converged on independently:
 *
 *   - An unrecognised key is a MALFORMED_REQUEST, not a validation problem. A body
 *     smuggling `role` or `amount` must be rejected as unreadable rather than
 *     half-understood — the failure mode where the extra key is silently dropped is how
 *     a privilege-escalation attempt turns into a successful one after a later refactor
 *     starts reading it.
 *   - Field errors are keyed by the first path segment, so a form can put the message
 *     against the input that caused it.
 */

function toFieldErrors(error: z.ZodError): FieldErrors {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    if (issue.path.length === 0) continue;
    const key = String(issue.path[0]);
    fields[key] ??= issue.message;
  }
  return fields;
}

export function parseBody<T>(schema: z.ZodType<T>, body: unknown): T {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new AppError('MALFORMED_REQUEST', 'The request could not be read.');
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    if (result.error.issues.some((issue) => issue.code === 'unrecognized_keys')) {
      throw new AppError('MALFORMED_REQUEST', 'The request could not be read.');
    }

    throw new AppError('VALIDATION_ERROR', 'Please check the highlighted fields.', {
      fields: toFieldErrors(result.error),
    });
  }

  return result.data;
}

/**
 * Query strings are parsed leniently: a GET may legitimately carry parameters this
 * endpoint knows nothing about (tracking, cache-busting), and ignoring them is the
 * correct reading of a URL.
 */
/**
 * One path parameter, as a string.
 *
 * Express 5 types a param as `string | string[]` because a wildcard segment can capture
 * several. None of this application's routes do, but the type is real — and an array
 * flattened with `String()` would produce `a,b`, which then gets fed to an id lookup.
 * Returning empty for anything that is not a plain string turns that into a clean
 * NOT_FOUND instead.
 */
export function pathParam(
  params: Readonly<Record<string, string | string[] | undefined>>,
  name: string,
): string {
  const value = params[name];
  return typeof value === 'string' ? value : '';
}

export function parseQuery<T>(schema: z.ZodType<T>, query: unknown): T {
  const result = schema.safeParse(query ?? {});
  if (!result.success) {
    throw new AppError('VALIDATION_ERROR', 'Please check the highlighted fields.', {
      fields: toFieldErrors(result.error),
    });
  }
  return result.data;
}
