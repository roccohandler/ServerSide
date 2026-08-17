import type { AppErrorCode, FieldErrors } from './appError.js';

/*
 * The response envelope. Every endpoint answers in exactly one of these two shapes so
 * the client has a single place to branch, and so no handler can invent its own format.
 */

export interface ApiSuccess<TData> {
  readonly success: true;
  readonly data: TData;
}

export interface ApiFailure {
  readonly success: false;
  readonly error: {
    readonly code: AppErrorCode;
    /** Safe to render to a visitor verbatim. */
    readonly message: string;
    /** Present for validation failures: field name -> what to fix. */
    readonly fields?: FieldErrors;
    /** Development only. Never populated when NODE_ENV=production. */
    readonly debug?: { readonly name: string; readonly message: string; readonly stack?: string };
  };
}

export type ApiResponse<TData> = ApiSuccess<TData> | ApiFailure;

export function success<TData>(data: TData): ApiSuccess<TData> {
  return { success: true, data };
}

export function failure(
  code: AppErrorCode,
  message: string,
  extra: { fields?: FieldErrors; debug?: ApiFailure['error']['debug'] } = {},
): ApiFailure {
  return {
    success: false,
    error: {
      code,
      message,
      ...(extra.fields ? { fields: extra.fields } : {}),
      ...(extra.debug ? { debug: extra.debug } : {}),
    },
  };
}
