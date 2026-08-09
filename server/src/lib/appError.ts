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
