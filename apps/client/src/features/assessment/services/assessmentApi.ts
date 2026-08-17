import { httpGet, httpPost } from '../../../lib/http';
import type { ApiResult, AssessmentRequest, AssessmentView } from '@jobforge/shared';

export interface SubmitAssessmentData {
  readonly assessment: AssessmentView;
  /** True when this submission matched one that already landed. Not an error. */
  readonly duplicate: boolean;
}

export function submitAssessment(
  submission: AssessmentRequest,
): Promise<ApiResult<SubmitAssessmentData>> {
  return httpPost<SubmitAssessmentData>('/api/app/assessments', submission);
}

export function fetchLatestAssessment(
  signal?: AbortSignal,
): Promise<ApiResult<{ readonly assessment: AssessmentView | null }>> {
  return httpGet('/api/app/assessments/latest', signal);
}

export function fetchAssessments(
  signal?: AbortSignal,
): Promise<ApiResult<{ readonly assessments: readonly AssessmentView[] }>> {
  return httpGet('/api/app/assessments', signal);
}
