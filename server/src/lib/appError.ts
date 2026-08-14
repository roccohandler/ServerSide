/**
 * The complete set of error codes this API can return.
 *
 * Codes are part of the public API contract: the client may branch on them, so they
 * must stay stable and must never carry internal detail (no driver codes, no stack
 * frames, no configuration values).
 */
export const APP_ERROR_CODES = [
  'VALIDATION_ERROR',
  'MALFORMED_REQUEST',
  'PAYLOAD_TOO_LARGE',
  'RATE_LIMITED',
  /**
   * No usable session. The client's cue to send somebody to the sign-in page — which is
   * why it is distinct from FORBIDDEN: signing in again fixes this one and cannot fix
   * the other.
   */
  'UNAUTHENTICATED',
  /**
   * Signed in, and still not allowed. Returned when a capability is missing.
   *
   * Deliberately NOT what a request for somebody else's record returns: that answers
   * NOT_FOUND, because "you may not see this" and "this does not exist" have to be
   * indistinguishable or the API confirms which ids are real.
   */
  'FORBIDDEN',
  /** The request is well-formed but conflicts with what is already stored. */
  'CONFLICT',
  'NOT_FOUND',
  'SERVICE_UNAVAILABLE',
  'INTERNAL_ERROR',
] as const;

export type AppErrorCode = (typeof APP_ERROR_CODES)[number];

/** Field name -> human readable problem. Only ever populated from our own schemas. */
export type FieldErrors = Readonly<Record<string, string>>;

interface AppErrorOptions {
  readonly statusCode?: number;
  readonly fields?: FieldErrors;
  readonly cause?: unknown;
}

const DEFAULT_STATUS: Record<AppErrorCode, number> = {
  VALIDATION_ERROR: 400,
  MALFORMED_REQUEST: 400,
  PAYLOAD_TOO_LARGE: 413,
  RATE_LIMITED: 429,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  CONFLICT: 409,
  NOT_FOUND: 404,
  SERVICE_UNAVAILABLE: 503,
  INTERNAL_ERROR: 500,
};

/**
 * An error that is safe to show a visitor.
 *
 * Anything thrown that is *not* an AppError is treated as a programming error by the
 * central error handler and collapsed into a generic 500, so throwing AppError is how
 * a module opts in to having its message reach the browser.
 */
export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly statusCode: number;
  readonly fields: FieldErrors | undefined;

  constructor(code: AppErrorCode, message: string, options: AppErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.name = 'AppError';
    this.code = code;
    this.statusCode = options.statusCode ?? DEFAULT_STATUS[code];
    this.fields = options.fields;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
