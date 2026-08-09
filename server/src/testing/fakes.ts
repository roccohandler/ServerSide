import type { LeadRepository } from '../features/leads/lead.repository.js';
import type {
  NewLeadRecord,
  NotificationStatus,
  StoredLead,
  ValidatedLeadInput,
} from '../features/leads/lead.types.js';
import type { EmailMessage, EmailService } from '../infrastructure/email/email.service.js';

/*
 * Test doubles for the two external systems. Everything the lead feature does can be
 * exercised against these, so the suite needs neither MongoDB nor a Resend account.
 */

export interface InMemoryLeadRepository extends LeadRepository {
  readonly leads: StoredLead[];
  /** Makes the next (and every) `create` reject, to exercise persistence failure. */
  failNextCreate(error: Error): void;
  failNextStatusUpdate(error: Error): void;
}

export function createInMemoryLeadRepository(
  options: { now?: () => Date } = {},
): InMemoryLeadRepository {
  const now = options.now ?? (() => new Date());
  const leads: StoredLead[] = [];
  let createError: Error | null = null;
  let statusUpdateError: Error | null = null;
  let nextId = 1;

  return {
    leads,

    failNextCreate(error) {
      createError = error;
    },

    failNextStatusUpdate(error) {
      statusUpdateError = error;
    },

    async create(record: NewLeadRecord) {
      if (createError) {
        const error = createError;
        createError = null;
        throw error;
      }

      const timestamp = now();
      const lead: StoredLead = {
        ...record,
        id: `lead-${nextId++}`,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      leads.push(lead);
      return lead;
    },

    async findRecentDuplicate(query) {
      return (
        leads.find(
          (lead) =>
            lead.email === query.email &&
            lead.inquiryType === query.inquiryType &&
            (lead.message ?? undefined) === query.message &&
            lead.createdAt >= query.since,
        ) ?? null
      );
    },

    async updateNotificationStatus(id: string, status: NotificationStatus) {
      if (statusUpdateError) {
        const error = statusUpdateError;
        statusUpdateError = null;
        throw error;
      }

      const index = leads.findIndex((lead) => lead.id === id);
      if (index >= 0) {
        leads[index] = { ...(leads[index] as StoredLead), notificationStatus: status };
      }
    },
  };
}

export interface RecordingEmailService extends EmailService {
  readonly sent: EmailMessage[];
  /** Makes every subsequent `send` reject, to exercise the notification failure path. */
  failWith(error: Error): void;
}

export function createRecordingEmailService(): RecordingEmailService {
  const sent: EmailMessage[] = [];
  let failure: Error | null = null;

  return {
    sent,
    failWith(error) {
      failure = error;
    },
    async send(message) {
      if (failure) throw failure;
      sent.push(message);
    },
  };
}

/** A submission that passes validation, for tests that are not about validation. */
export function buildValidLeadInput(
  overrides: Partial<ValidatedLeadInput> = {},
): ValidatedLeadInput {
  return {
    name: 'Dana Reyes',
    businessName: 'Cascade Heating & Air',
    email: 'dana@cascadeheating.example',
    phone: '(206) 555-0134',
    website: 'https://cascadeheating.example',
    inquiryType: 'improve-website',
    message: 'Our site is slow on phones and the quote form goes nowhere.',
    isBotSubmission: false,
    ...overrides,
  };
}

/** The same submission as an untrusted request body. */
export function buildValidLeadRequestBody(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    name: 'Dana Reyes',
    businessName: 'Cascade Heating & Air',
    email: 'Dana@Cascadeheating.example',
    phone: '(206) 555-0134',
    website: 'cascadeheating.example',
    inquiryType: 'improve-website',
    message: 'Our site is slow on phones and the quote form goes nowhere.',
    ...overrides,
  };
}
