import type { ErrorRequestHandler } from 'express';
import { AppError, isAppError, type AppErrorCode } from '../lib/appError.js';
import { failure } from '../lib/apiResponse.js';
import { describeError, type Logger } from '../lib/logger.js';

export interface ErrorHandlerOptions {
  readonly logger: Logger;
  /** Controls whether debug detail is attached to the response. */
  readonly isProduction: boolean;
}

interface BodyParserError extends Error {
  readonly type?: string;
  readonly status?: number;
}

/**
 * Recognises the errors body-parser raises before any of our code runs.
 * Without this a 1 MB POST or a truncated JSON body would surface as an opaque 500.
 */
function fromBodyParser(error: unknown): AppError | null {
  if (!(error instanceof Error)) return null;
  const candidate = error as BodyParserError;

  if (candidate.type === 'entity.too.large') {
    return new AppError('PAYLOAD_TOO_LARGE', 'That submission is too large to accept.', {
      cause: error,
    });
  }

  if (candidate.type === 'entity.parse.failed' || error instanceof SyntaxError) {
    return new AppError(
      'MALFORMED_REQUEST',
      'The submission could not be read. Please try again.',
      {
        cause: error,
      },
    );
  }

  return null;
}

const GENERIC_MESSAGE = 'Something went wrong on our end. Please try again, or call or email us.';

/**
 * The single place where an error becomes an HTTP response.
 *
 * Four categories are distinguished:
 *   - validation failures        -> 400 with per-field messages
 *   - expected application state -> the AppError's own code and message
 *   - malformed transport        -> 400/413 from body-parser
 *   - anything else              -> 500 with a fixed message
 *
 * Only the first three carry a message we wrote. An unexpected error is assumed to be a
 * programming mistake and its message is discarded, because it may contain a connection
 * string, a query, or a provider response. The detail goes to the log instead.
 */
export function createErrorHandler(options: ErrorHandlerOptions): ErrorRequestHandler {
  const { logger, isProduction } = options;

  // Express identifies error middleware by arity, so all four parameters must stay.
  return (error, request, response, next) => {
    if (response.headersSent) {
      next(error);
      return;
    }

    const normalised = isAppError(error) ? error : fromBodyParser(error);
    const statusCode = normalised?.statusCode ?? 500;
    const code: AppErrorCode = normalised?.code ?? 'INTERNAL_ERROR';
    const message = normalised?.message ?? GENERIC_MESSAGE;

    const requestContext = {
      requestId: request.id,
      method: request.method,
      path: request.path,
      statusCode,
      code,
    };
    const errorDetail = describeError(error);

    if (statusCode >= 500) {
      logger.error('request.failed', { ...requestContext, ...errorDetail });
    } else {
      // Client mistakes are normal traffic; log them without stack noise.
      const { stack: _stack, ...detailWithoutStack } = errorDetail;
      logger.warn('request.rejected', { ...requestContext, ...detailWithoutStack });
    }

    response.status(statusCode).json(
      failure(code, message, {
        ...(normalised?.fields ? { fields: normalised.fields } : {}),
        ...(isProduction || normalised
          ? {}
          : {
              debug: {
                name: error instanceof Error ? error.name : 'UnknownError',
                message: error instanceof Error ? error.message : String(error),
                ...(error instanceof Error && error.stack ? { stack: error.stack } : {}),
              },
            }),
      }),
    );
  };
}
