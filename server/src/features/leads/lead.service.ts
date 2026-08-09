import { describeError, redactEmail, type Logger } from '../../lib/logger.js';
import type { EmailService } from '../../infrastructure/email/email.service.js';
import { buildNewLeadEmail } from './lead.email.js';
import type { LeadRepository } from './lead.repository.js';
import type {
  LeadSubmissionOutcome,
  NotificationStatus,
  StoredLead,
  ValidatedLeadInput,
} from './lead.types.js';

/** Where the lead came from. One value today; the field exists so a second one is cheap. */
export const LEAD_SOURCE = 'website-contact-form';

/**
 * How long an identical submission is treated as an accidental repeat.
 *
 * Ten minutes covers double-clicks, refreshes and "did that send?" resubmissions without
 * blocking someone who genuinely writes again later in the day.
 */
export const DEFAULT_DUPLICATE_WINDOW_MS = 10 * 60 * 1000;

export interface LeadService {
  submit(input: ValidatedLeadInput): Promise<LeadSubmissionOutcome>;
}

export interface LeadServiceDependencies {
  readonly repository: LeadRepository;
  readonly emailService: EmailService;
  /** Undefined when no notification address is configured; leads are still stored. */
  readonly notificationRecipient: string | undefined;
  readonly logger: Logger;
  readonly now?: () => Date;
  readonly duplicateWindowMs?: number;
}

/**
 * Business rules for a lead submission.
 *
 * ## Persist first, notify second
 *
 * A lead is written to MongoDB before Resend is called, and a failed notification never
 * fails the request. The reasoning: the lead itself is the asset. If we notified first
 * we could email the owner about a lead we then failed to store, and if we rolled the
 * lead back on a Resend outage we would throw away real work from a real customer.
 *
 * The cost of that choice is that a delivery failure is silent to the visitor, so it is
 * recorded twice: `notificationStatus: 'failed'` on the lead document, and an error log
 * carrying the lead id. Recovering means querying for failed notifications and following
 * up by hand. That is an acceptable manual step at this volume, and it is the reason
 * `notificationStatus` exists on an otherwise deliberately tiny schema.
 */
export function createLeadService(dependencies: LeadServiceDependencies): LeadService {
  const {
    repository,
    emailService,
    notificationRecipient,
    logger,
    now = () => new Date(),
    duplicateWindowMs = DEFAULT_DUPLICATE_WINDOW_MS,
  } = dependencies;

  async function notify(lead: StoredLead): Promise<NotificationStatus> {
    if (!notificationRecipient) {
      logger.warn('lead.notification_skipped_no_recipient', { leadId: lead.id });
      await safelyRecordNotificationStatus(lead.id, 'skipped');
      return 'skipped';
    }

    try {
      await emailService.send(buildNewLeadEmail({ lead, recipient: notificationRecipient }));
      await safelyRecordNotificationStatus(lead.id, 'sent');
      logger.info('lead.notification_sent', { leadId: lead.id });
      return 'sent';
    } catch (error) {
      // Loud in the logs, invisible to the visitor: the lead is already safe in MongoDB.
      logger.error('lead.notification_failed', { leadId: lead.id, ...describeError(error) });
      await safelyRecordNotificationStatus(lead.id, 'failed');
      return 'failed';
    }
  }

  async function safelyRecordNotificationStatus(id: string, status: NotificationStatus) {
    try {
      await repository.updateNotificationStatus(id, status);
    } catch (error) {
      // The lead is stored; only the bookkeeping failed. Never let this mask the request.
      logger.error('lead.notification_status_update_failed', {
        leadId: id,
        attemptedStatus: status,
        ...describeError(error),
      });
    }
  }

  return {
    async submit(input) {
      if (input.isBotSubmission) {
        // Nothing is stored and nothing is sent, but the caller still gets a success
        // response so a bot cannot learn that the honeypot exists.
        logger.warn('lead.rejected_honeypot');
        return { kind: 'discarded', reason: 'honeypot' };
      }

      const existing = await repository.findRecentDuplicate({
        email: input.email,
        inquiryType: input.inquiryType,
        message: input.message,
        since: new Date(now().getTime() - duplicateWindowMs),
      });

      if (existing) {
        logger.info('lead.duplicate_ignored', { leadId: existing.id });
        return { kind: 'duplicate', lead: existing };
      }

      const lead = await repository.create({
        name: input.name,
        businessName: input.businessName,
        email: input.email,
        phone: input.phone,
        ...(input.website ? { website: input.website } : {}),
        inquiryType: input.inquiryType,
        ...(input.message ? { message: input.message } : {}),
        status: 'new',
        source: LEAD_SOURCE,
        notificationStatus: 'pending',
      });

      logger.info('lead.created', {
        leadId: lead.id,
        inquiryType: lead.inquiryType,
        // Personal data stays out of the logs; the domain is enough to spot patterns.
        email: redactEmail(lead.email),
      });

      const notification = await notify(lead);

      return { kind: 'created', lead, notification };
    },
  };
}
