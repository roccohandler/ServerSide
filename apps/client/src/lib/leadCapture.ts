import { httpPost } from './http';
import type { ApiResult, LeadRequest, LeadSubmissionData } from '@jobforge/shared';

/**
 * Posts a contact-form submission.
 *
 * Shared on purpose: both the contact form and the audit's "send me my results" step capture
 * a lead, so this clears the two-or-more-features bar for a shared root. What it sat beside in
 * `lib/api.ts` did not — `requestPlaybook` and `submitOnboarding` each had exactly one consumer
 * and have moved into the features that use them. `lib/http.ts` stays shared too: it owns the
 * timeout, the envelope check and what "the network failed" means, for thirty-odd callers.
 *
 * It does not throw. Every outcome comes back as a discriminated result, which is why the
 * form has one code path for failure instead of a try/catch around a chain.
 */
export async function submitLead(payload: LeadRequest): Promise<ApiResult<LeadSubmissionData>> {
  return httpPost<LeadSubmissionData>('/api/leads', payload);
}
