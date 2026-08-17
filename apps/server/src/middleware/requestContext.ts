import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';
import type { Logger } from '../lib/logger.js';

/*
 * The augmentation lives in this module rather than in a standalone .d.ts because this
 * is the middleware that assigns both properties. Keeping them together means any
 * program that includes the middleware also gets the types, no matter which tsconfig
 * pulled it in.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- the shape Express type augmentation requires
  namespace Express {
    interface Request {
      /** Correlation id, echoed to the client as `X-Request-Id`. */
      id: string;
      /** Request-scoped logger with the correlation id already bound. */
      log: Logger;
    }
  }
}

/**
 * Attaches a correlation id and a request-scoped logger.
 *
 * This is what makes "the lead saved but the email failed" diagnosable: every record
 * written while handling one request carries the same `requestId`, and the visitor can
 * quote the `X-Request-Id` header from their browser's network tab.
 *
 * Mounted before every route, which is why `request.id` and `request.log` are typed as
 * always present rather than optional.
 */
export function createRequestContext(logger: Logger): RequestHandler {
  return (request, response, next) => {
    // Reuse an upstream id when a proxy already assigned one, so traces stay joined up.
    const upstream = request.get('x-request-id');
    const requestId = upstream && upstream.length <= 64 ? upstream : randomUUID();

    request.id = requestId;
    request.log = logger.child({ requestId });
    response.setHeader('X-Request-Id', requestId);

    next();
  };
}
