import type { RequestHandler } from 'express';
import { AppError } from '../../lib/appError.js';
import { success } from '../../lib/apiResponse.js';
import type { Logger } from '../../lib/logger.js';
import type { BillingService } from './billing.service.js';
import type { StripeClient } from './stripe.client.js';

export interface StripeWebhookDependencies {
  readonly billingService: BillingService;
  /** Undefined when Stripe is not configured; the endpoint then answers 503. */
  readonly stripe: StripeClient | undefined;
  readonly logger: Logger;
}

/**
 * The Stripe webhook transport.
 *
 * Wired in `app.ts` with `express.raw()` **before** the JSON body parser, because
 * signature verification needs the exact bytes Stripe sent — a re-serialised JSON body
 * fails verification even when nothing was tampered with.
 *
 * An invalid signature is a 400, never a 500: it is expected input (a probe, a replay,
 * a misconfigured secret), and answering 500 would make Stripe retry a request that can
 * never succeed.
 */
export function createStripeWebhookHandler(
  dependencies: StripeWebhookDependencies,
): RequestHandler {
  const { billingService, stripe, logger } = dependencies;

  return async (request, response) => {
    if (!stripe) {
      throw new AppError('SERVICE_UNAVAILABLE', 'Billing is not configured on this deployment.');
    }

    const signature = request.header('stripe-signature');
    if (!signature) {
      throw new AppError('MALFORMED_REQUEST', 'Missing Stripe signature.');
    }

    if (!Buffer.isBuffer(request.body)) {
      // A programming error in the wiring, not a bad request — but it must be loud.
      logger.error('billing.webhook_body_not_raw', {
        detail: 'The webhook route must be registered with express.raw() before express.json().',
      });
      throw new AppError('INTERNAL_ERROR', 'Webhook misconfigured.');
    }

    let event;
    try {
      event = stripe.verifyWebhook(request.body, signature);
    } catch (error) {
      logger.warn('billing.webhook_signature_invalid', {
        detail: error instanceof Error ? error.message : 'unknown',
      });
      throw new AppError('MALFORMED_REQUEST', 'Invalid Stripe signature.');
    }

    await billingService.handleWebhookEvent(event);
    response.json(success({ received: true }));
  };
}
