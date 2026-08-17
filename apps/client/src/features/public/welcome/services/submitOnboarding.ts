import { httpPost } from '../../../../lib/http';
import type { ApiResult, OnboardingData, OnboardingRequest } from '@jobforge/shared';

/**
 * Submits a new client's onboarding details, from `/welcome` after their deposit.
 *
 * Stored and emailed to the owner — the materials are the asset, so the same persist-first
 * design as the contact form.
 */
export async function submitOnboarding(
  payload: OnboardingRequest,
): Promise<ApiResult<OnboardingData>> {
  return httpPost<OnboardingData>('/api/onboarding', payload);
}
