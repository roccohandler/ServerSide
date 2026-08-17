import { describeError, redactEmail, type Logger } from '../../lib/logger.js';
import type { EmailService } from '../../infrastructure/email/email.service.js';
import {
  buildSubscriberNotificationEmail,
  buildWorkbookDeliveryEmail,
} from './subscriber.email.js';
import type { SubscriberRepository } from './subscriber.repository.js';
import type {
  StoredSubscriber,
  SubscriberNotificationStatus,
  SubscriptionOutcome,
  ValidatedSubscriberInput,
} from './subscriber.types.js';

/** Where the request came from. */
export const SUBSCRIBER_SOURCE = 'playbook-page';

/**
 * How long a repeat request for the same asset is treated as the same request.
 *
 * Thirty days, not ten minutes. Somebody who asks twice in a fortnight has not double
 * clicked — they have lost the first email — and either way the right answer is one
 * record and one notification, not two. Ask again next year and you get it again.
 */
export const DEFAULT_SUBSCRIPTION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export interface SubscriberService {
  subscribe(input: ValidatedSubscriberInput): Promise<SubscriptionOutcome>;
}

export interface SubscriberServiceDependencies {
  readonly repository: SubscriberRepository;
  readonly emailService: EmailService;
  /** Undefined when no notification address is configured; requests are still stored. */
  readonly notificationRecipient: string | undefined;
  /**
   * The exact wording shown next to the submit button, stored with the record.
   *
   * Passed in rather than imported because it lives in the client content layer and will
   * be edited. Storing what somebody was actually shown is the difference between having
   * consent and having a boolean.
   */
  readonly consentText: string;
  /**
   * Where the workbook is hosted.
   *
   * Set: the subscriber gets the link automatically. Unset: the owner is notified and
   * sends it. This one value is the entire difference between the two behaviours, and it
   * is also what the client's confirmation copy is chosen from — so a page never claims
   * an email is on its way that nothing is sending.
   */
  readonly pdfUrl?: string | undefined;
  readonly logger: Logger;
  readonly now?: () => Date;
  readonly subscriptionWindowMs?: number;
}

/**
 * Business rules for a PlayBook request.
 *
 * Same persist-then-notify tradeoff as the lead service, and for the same reason: the
 * request is the asset. If the notification fails, the record is still there and can be
 * found with a query — whereas a request we notified about but failed to store is gone.
 *
 * Delivery has two modes and one switch. With `pdfUrl` configured the subscriber is
 * emailed the workbook directly; without it the owner is notified and sends it by hand.
 * There is deliberately no third path: emailing somebody a link to a file that does not
 * exist would be pretending the feature is finished, and they would find out.
 */
export function createSubscriberService(
  dependencies: SubscriberServiceDependencies,
): SubscriberService {
  const {
    repository,
    emailService,
    notificationRecipient,
    consentText,
    pdfUrl,
    logger,
    now = () => new Date(),
    subscriptionWindowMs = DEFAULT_SUBSCRIPTION_WINDOW_MS,
  } = dependencies;

  async function safelyRecordNotificationStatus(
    id: string,
    status: SubscriberNotificationStatus,
  ): Promise<void> {
    try {
      await repository.updateNotificationStatus(id, status);
    } catch (error) {
      // The record is stored; only the bookkeeping failed. Never mask the request.
      logger.error('subscriber.notification_status_update_failed', {
        subscriberId: id,
        attemptedStatus: status,
        ...describeError(error),
      });
    }
  }

  /**
   * Delivers the workbook, or tells the owner to.
   *
   * Which of the two happens depends entirely on whether `pdfUrl` is configured. There is
   * no third path where somebody is emailed a link to nothing — that is the whole reason
   * the switch exists rather than a flag somebody could set optimistically.
   */
  async function deliver(subscriber: StoredSubscriber): Promise<SubscriberNotificationStatus> {
    if (pdfUrl) {
      try {
        await emailService.send(
          buildWorkbookDeliveryEmail({
            subscriber,
            pdfUrl,
            // Replies reach a human rather than a no-reply address.
            replyTo: notificationRecipient,
          }),
        );
        await safelyRecordNotificationStatus(subscriber.id, 'sent');
        logger.info('subscriber.workbook_sent', { subscriberId: subscriber.id });
        return 'sent';
      } catch (error) {
        logger.error('subscriber.workbook_send_failed', {
          subscriberId: subscriber.id,
          ...describeError(error),
        });
        await safelyRecordNotificationStatus(subscriber.id, 'failed');
        return 'failed';
      }
    }

    if (!notificationRecipient) {
      logger.warn('subscriber.notification_skipped_no_recipient', { subscriberId: subscriber.id });
      await safelyRecordNotificationStatus(subscriber.id, 'skipped');
      return 'skipped';
    }

    try {
      await emailService.send(
        buildSubscriberNotificationEmail({ subscriber, recipient: notificationRecipient }),
      );
      await safelyRecordNotificationStatus(subscriber.id, 'sent');
      logger.info('subscriber.notification_sent', { subscriberId: subscriber.id });
      return 'sent';
    } catch (error) {
      logger.error('subscriber.notification_failed', {
        subscriberId: subscriber.id,
        ...describeError(error),
      });
      await safelyRecordNotificationStatus(subscriber.id, 'failed');
      return 'failed';
    }
  }

  return {
    async subscribe(input) {
      if (input.isBotSubmission) {
        // Nothing stored, nothing sent, and the caller still gets a success response so
        // a bot cannot learn the honeypot exists.
        logger.warn('subscriber.rejected_honeypot');
        return { kind: 'discarded', reason: 'honeypot' };
      }

      const existing = await repository.findExisting({
        email: input.email,
        asset: input.asset,
        since: new Date(now().getTime() - subscriptionWindowMs),
      });

      if (existing) {
        logger.info('subscriber.duplicate_ignored', { subscriberId: existing.id });
        return { kind: 'duplicate', subscriber: existing };
      }

      const subscriber = await repository.create({
        email: input.email,
        asset: input.asset,
        source: SUBSCRIBER_SOURCE,
        consentedAt: now(),
        consentText,
        notificationStatus: 'pending',
      });

      logger.info('subscriber.created', {
        subscriberId: subscriber.id,
        asset: subscriber.asset,
        // Personal data stays out of the logs; the domain is enough to spot patterns.
        email: redactEmail(subscriber.email),
      });

      const notification = await deliver(subscriber);

      return { kind: 'created', subscriber, notification };
    },
  };
}
