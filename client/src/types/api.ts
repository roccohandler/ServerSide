/**
 * The client's half of the API contract.
 *
 * These types mirror `server/src/features/leads/lead.types.ts` and
 * `server/src/lib/apiResponse.ts`. They are duplicated rather than shared through a
 * third workspace: the contract is fifteen lines, both sides have a test that pins the
 * slug list, and a shared package would add a build step to every deploy for no real
 * safety. If the contract grows, extract it then.
 */

export const INQUIRY_TYPES = ['new-website', 'improve-website', 'no-website', 'not-sure'] as const;

export type InquiryType = (typeof INQUIRY_TYPES)[number];

/** Hidden anti-spam input. Must match `HONEYPOT_FIELD` on the server. */
export const HONEYPOT_FIELD = 'companyFax';

export interface LeadRequest {
  readonly name: string;
  readonly businessName: string;
  readonly email: string;
  readonly phone: string;
  readonly website?: string;
  readonly inquiryType: InquiryType;
  readonly message?: string;
  readonly [HONEYPOT_FIELD]?: string;
}

export interface LeadSubmissionData {
  readonly submittedAt: string;
}

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'MALFORMED_REQUEST'
  | 'PAYLOAD_TOO_LARGE'
  | 'RATE_LIMITED'
  | 'NOT_FOUND'
  | 'SERVICE_UNAVAILABLE'
  | 'INTERNAL_ERROR'
  /** Client-side only: the request never reached the server. */
  | 'NETWORK_ERROR';

export interface ApiSuccess<TData> {
  readonly success: true;
  readonly data: TData;
}

export interface ApiFailure {
  readonly success: false;
  readonly error: {
    readonly code: ApiErrorCode;
    readonly message: string;
    readonly fields?: Readonly<Record<string, string>>;
  };
}

export type ApiResult<TData> = ApiSuccess<TData> | ApiFailure;
