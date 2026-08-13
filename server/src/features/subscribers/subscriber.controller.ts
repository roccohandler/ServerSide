import type { RequestHandler } from 'express';
import { parseSubscriberRequest } from './subscriber.schema.js';
import type { SubscriberService } from './subscriber.service.js';

export interface SubscriptionResponse {
  readonly requestedAt: string;
  /**
   * Which of the two real behaviours happened.
   *
   * `sent` means the workbook was emailed to them; `queued` means the request reached the
   * owner, who sends it. The client picks its confirmation copy from this rather than
   * assuming, so the page can never say "check your inbox" when nothing is coming.
   *
   * It is derived from configuration, not from the outcome of a particular send: a
   * failed delivery is still a stored request the owner can act on, and telling a visitor
   * about an email failure they cannot do anything about helps nobody.
   */
  readonly delivery: 'sent' | 'queued';
}

export interface SubscriberControllerDependencies {
  readonly subscriberService: SubscriberService;
  /** True when `PLAYBOOK_PDF_URL` is configured and the workbook is emailed directly. */
  readonly autoSendEnabled: boolean;
}

/**
 * HTTP concerns only. Errors are thrown and the central error handler decides what a
 * visitor is allowed to see — the same arrangement as the lead controller.
 */
export function createSubscriberController(dependencies: SubscriberControllerDependencies): {
  subscribe: RequestHandler;
} {
  const { subscriberService, autoSendEnabled } = dependencies;

  return {
    subscribe: async (request, response) => {
      const input = parseSubscriberRequest(request.body);
      const outcome = await subscriberService.subscribe(input);

      /*
       * One response for all three outcomes.
       *
       * A caught bot, a repeat request and a stored one are indistinguishable from
       * outside — otherwise the response tells a script which trick worked, and it tells
       * anybody with a list of addresses which of them have already subscribed.
       */
      const requestedAt = outcome.kind === 'discarded' ? new Date() : outcome.subscriber.createdAt;

      response.status(202).json({
        success: true,
        data: {
          requestedAt: requestedAt.toISOString(),
          delivery: autoSendEnabled ? 'sent' : 'queued',
        } satisfies SubscriptionResponse,
      });
    },
  };
}
