import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';
import { failure } from '../lib/apiResponse.js';
import type { Logger } from '../lib/logger.js';

export interface LeadRateLimiterOptions {
  readonly windowMs: number;
  readonly max: number;
  readonly logger: Logger;
}

/**
 * Per-IP throttle for the public lead endpoint.
 *
 * Deliberately generous: a real business owner might legitimately submit twice while
 * correcting a typo, and locking them out would cost a customer. It only exists to make
 * automated flooding uneconomical.
 *
 * Known limitation: the store is in-memory, so on Vercel the counter is per warm
 * function instance rather than global. That is enough to blunt a naive script; a
 * distributed store would be the next step if abuse ever becomes real, and is
 * deliberately not built today.
 */
export function createLeadRateLimiter(options: LeadRateLimiterOptions): RateLimitRequestHandler {
  const { windowMs, max, logger } = options;

  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (request, response) => {
      logger.warn('lead.rate_limited', { method: request.method, path: request.path });
      response
        .status(429)
        .json(
          failure(
            'RATE_LIMITED',
            'Too many submissions from this connection. Please wait a few minutes and try again, or call or email us directly.',
          ),
        );
    },
  });
}
