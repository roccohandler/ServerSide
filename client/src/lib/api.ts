import { env } from '../config/env';
import type { ApiFailure, ApiResult, LeadRequest, LeadSubmissionData } from '../types/api';

/**
 * The typed API client.
 *
 * Deliberately a plain `fetch` wrapper. The site makes exactly one request in its
 * entire lifetime, so a data-fetching library would add a dependency, a provider and a
 * cache for a single POST.
 *
 * `submitLead` never throws: every outcome, including a dead network, comes back as a
 * discriminated result. That means the form has one code path for failure instead of a
 * try/catch wrapped around a promise chain.
 */

/** Longer than any healthy request, short enough that a hung form is not left spinning. */
const REQUEST_TIMEOUT_MS = 15_000;

const NETWORK_FAILURE: ApiFailure = {
  success: false,
  error: {
    code: 'NETWORK_ERROR',
    message:
      'We could not reach the server. Check your connection and try again, or call or email us directly.',
  },
};

const UNEXPECTED_FAILURE: ApiFailure = {
  success: false,
  error: {
    code: 'INTERNAL_ERROR',
    message: 'Something went wrong on our end. Please try again, or call or email us directly.',
  },
};

/** Narrows an unknown JSON body to the response envelope both sides agreed on. */
function isApiResult<TData>(value: unknown): value is ApiResult<TData> {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as { success?: unknown; error?: unknown };

  if (candidate.success === true) return true;
  if (candidate.success !== false) return false;

  return (
    typeof candidate.error === 'object' &&
    candidate.error !== null &&
    typeof (candidate.error as { message?: unknown }).message === 'string'
  );
}

export async function submitLead(payload: LeadRequest): Promise<ApiResult<LeadSubmissionData>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${env.apiBaseUrl}/api/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const body: unknown = await response.json().catch(() => null);

    if (!isApiResult<LeadSubmissionData>(body)) {
      // A response we cannot read is a server problem, not something to show raw.
      return UNEXPECTED_FAILURE;
    }

    return body;
  } catch {
    // Offline, DNS failure, CORS rejection or our own timeout — all the same to the visitor.
    return NETWORK_FAILURE;
  } finally {
    clearTimeout(timeout);
  }
}
