import { httpPost } from './http';
import type {
  ApiResult,
  LeadRequest,
  LeadSubmissionData,
  OnboardingData,
  OnboardingRequest,
  SubscriberRequest,
  SubscriptionData,
} from '../types/api';

/**
 * The public marketing endpoints.
 *
 * Three POSTs, each a one-line call onto `lib/http`. The timeout, the response-envelope
 * check and the two failure constants used to live in this file; they moved to `http.ts`
 * when the authenticated application needed the same three things, so there is now one
 * place that decides what "the network failed" looks like rather than two that agree
 * today.
 *
 * Neither half throws: every outcome comes back as a discriminated result, which is why
 * a form here has one code path for failure instead of a try/catch around a chain.
 */

export async function submitLead(payload: LeadRequest): Promise<ApiResult<LeadSubmissionData>> {
  return httpPost<LeadSubmissionData>('/api/leads', payload);
}

/**
 * Asks for the PlayBook workbook.
 *
 * The server stores the request and notifies the owner, who sends the workbook. Nothing
 * is auto-delivered, and the success copy on the page says so in those terms — a
 * confirmation that implied an automatic email would be describing a feature that does
 * not exist.
 */
export async function requestPlaybook(
  payload: SubscriberRequest,
): Promise<ApiResult<SubscriptionData>> {
  return httpPost<SubscriptionData>('/api/subscribers', payload);
}

/**
 * Submits a new client's onboarding details, from `/welcome` after their deposit.
 * Stored and emailed to the owner — the materials are the asset, so the same
 * persist-first design as the contact form.
 */
export async function submitOnboarding(
  payload: OnboardingRequest,
): Promise<ApiResult<OnboardingData>> {
  return httpPost<OnboardingData>('/api/onboarding', payload);
}
