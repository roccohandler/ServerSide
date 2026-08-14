import type { RequestHandler } from 'express';
import { AppError, isAppError } from '../../lib/appError.js';
import { success } from '../../lib/apiResponse.js';
import { describeError, type Logger } from '../../lib/logger.js';
import type { DeploymentService } from './deployment.service.js';
import type { DeploymentProvider } from './deployment.types.js';

export interface DeploymentWebhookDependencies {
  readonly deploymentService: DeploymentService;
  /** Undefined when no provider is configured; the endpoint then answers 503. */
  readonly provider: DeploymentProvider | undefined;
  readonly logger: Logger;
}

/**
 * The hosting provider's webhook.
 *
 * Wired in `app.ts` *before* the JSON body parser, with a raw parser of its own, for
 * exactly the reason the Stripe webhook is: signature verification needs the bytes that
 * were sent, and a body that has been parsed and re-serialised does not verify.
 *
 * Answers 200 for anything it successfully understood, including events it chose to
 * ignore. A provider that receives a 4xx will retry, and retrying an event we correctly
 * decided was irrelevant is noise for both sides. Genuine failures — a bad signature, a
 * database that is down — return their real status so the retry does happen.
 */
export function createDeploymentWebhookHandler(
  dependencies: DeploymentWebhookDependencies,
): RequestHandler {
  const { deploymentService, provider, logger } = dependencies;

  return (request, response, next) => {
    void (async () => {
      try {
        if (!provider) {
          throw new AppError(
            'SERVICE_UNAVAILABLE',
            'Deployment tracking is not configured on this deployment.',
          );
        }

        if (!Buffer.isBuffer(request.body)) {
          throw new AppError('MALFORMED_REQUEST', 'The request could not be read.');
        }

        const event = provider.parseWebhook({ rawBody: request.body, headers: request.headers });

        if (!event) {
          response.json(success({ received: true, applied: false }));
          return;
        }

        await deploymentService.apply(event);
        response.json(success({ received: true, applied: true }));
      } catch (error) {
        if (!isAppError(error)) {
          logger.error('deployment.webhook_failed', describeError(error));
        }
        next(error);
      }
    })();
  };
}
