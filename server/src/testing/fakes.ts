import type { LeadRepository } from '../features/leads/lead.repository.js';
import type {
  NewLeadRecord,
  NotificationStatus,
  StoredLead,
  ValidatedLeadInput,
} from '../features/leads/lead.types.js';
import type { SubscriberRepository } from '../features/subscribers/subscriber.repository.js';
import type {
  NewSubscriberRecord,
  StoredSubscriber,
  SubscriberNotificationStatus,
  ValidatedSubscriberInput,
} from '../features/subscribers/subscriber.types.js';
import { STALE_CLAIM_MS, type BillingRepository } from '../features/billing/billing.repository.js';
import type {
  GuaranteeRemedy,
  NewProjectRecord,
  ProjectUpdate,
  StoredGuaranteeCredit,
  StoredProject,
} from '../features/billing/billing.types.js';
import type { CheckoutSessionRequest, StripeClient } from '../features/billing/stripe.client.js';
import type { VerifiedStripeEvent } from '../features/billing/billing.types.js';
import type { EmailMessage, EmailService } from '../infrastructure/email/email.service.js';

/*
 * Test doubles for the external systems. Everything the lead, subscriber, onboarding
 * and billing features do can be exercised against these, so the suite needs neither
 * MongoDB, a Resend account nor a Stripe account.
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

/* ------------------------------------------------------------------ subscribers */

export interface InMemorySubscriberRepository extends SubscriberRepository {
  readonly subscribers: StoredSubscriber[];
  /** Makes the next `create` reject, to exercise the persistence failure path. */
  failNextCreate(error: Error): void;
  failNextStatusUpdate(error: Error): void;
}

export function createInMemorySubscriberRepository(
  options: { now?: () => Date } = {},
): InMemorySubscriberRepository {
  const now = options.now ?? (() => new Date());
  const subscribers: StoredSubscriber[] = [];
  let createError: Error | null = null;
  let statusUpdateError: Error | null = null;
  let nextId = 1;

  return {
    subscribers,

    failNextCreate(error) {
      createError = error;
    },

    failNextStatusUpdate(error) {
      statusUpdateError = error;
    },

    async create(record: NewSubscriberRecord) {
      if (createError) {
        const error = createError;
        createError = null;
        throw error;
      }

      const timestamp = now();
      const subscriber: StoredSubscriber = {
        ...record,
        id: `subscriber-${nextId++}`,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      subscribers.push(subscriber);
      return subscriber;
    },

    async findExisting(query) {
      return (
        subscribers.find(
          (subscriber) =>
            subscriber.email === query.email &&
            subscriber.asset === query.asset &&
            subscriber.createdAt >= query.since,
        ) ?? null
      );
    },

    async updateNotificationStatus(id: string, status: SubscriberNotificationStatus) {
      if (statusUpdateError) {
        const error = statusUpdateError;
        statusUpdateError = null;
        throw error;
      }

      const index = subscribers.findIndex((subscriber) => subscriber.id === id);
      if (index >= 0) {
        subscribers[index] = {
          ...(subscribers[index] as StoredSubscriber),
          notificationStatus: status,
        };
      }
    },
  };
}

/** A subscribe request that passes validation, for tests that are not about validation. */
export function buildValidSubscriberInput(
  overrides: Partial<ValidatedSubscriberInput> = {},
): ValidatedSubscriberInput {
  return {
    email: 'dana@cascadeheating.example',
    asset: 'playbook-workbook',
    isBotSubmission: false,
    ...overrides,
  };
}

/* ------------------------------------------------------------------ email */

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

/* ------------------------------------------------------------------ billing fakes */

interface RecordedEvent {
  type: string;
  status: 'processing' | 'processed';
  claimedAt: Date;
}

interface RecordedGuaranteeCredit {
  remedy: GuaranteeRemedy;
  amountCents: number;
  status: 'processing' | 'processed';
  stripeReference?: string;
  claimedAt: Date;
}

export interface InMemoryBillingRepository extends BillingRepository {
  readonly projects: StoredProject[];
  /** Every event id currently recorded, claimed or processed. */
  readonly recordedEventIds: string[];
  /** Event ids whose processing completed. */
  readonly processedEventIds: string[];
  /** Recorded guarantee remedies, as `projectId:month` keys. */
  readonly guaranteeCreditKeys: string[];
  /** Makes the next `updateProject` reject, to exercise webhook retry recovery. */
  failNextUpdate(error: Error): void;
}

export function createInMemoryBillingRepository(
  options: { now?: () => Date } = {},
): InMemoryBillingRepository {
  const now = options.now ?? (() => new Date());
  const projects: StoredProject[] = [];
  const events = new Map<string, RecordedEvent>();
  const guaranteeCredits = new Map<string, RecordedGuaranteeCredit>();
  let updateError: Error | null = null;
  let nextId = 1;

  return {
    projects,

    get recordedEventIds() {
      return [...events.keys()];
    },

    get guaranteeCreditKeys() {
      return [...guaranteeCredits.keys()];
    },

    get processedEventIds() {
      return [...events.entries()]
        .filter(([, event]) => event.status === 'processed')
        .map(([eventId]) => eventId);
    },

    failNextUpdate(error) {
      updateError = error;
    },

    async createProject(record: NewProjectRecord) {
      const timestamp = now();
      const project: StoredProject = {
        ...record,
        id: `project-${nextId++}`,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      projects.push(project);
      return project;
    },

    async findProjectById(id: string) {
      return projects.find((project) => project.id === id) ?? null;
    },

    async findProjectBySubscriptionId(subscriptionId: string) {
      return projects.find((project) => project.subscriptionId === subscriptionId) ?? null;
    },

    async findProjectByPaymentIntentId(paymentIntentId: string) {
      return (
        projects.find(
          (project) =>
            project.depositPaymentIntentId === paymentIntentId ||
            project.finalPaymentIntentId === paymentIntentId,
        ) ?? null
      );
    },

    async listProjects(limit: number) {
      return [...projects]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, limit);
    },

    async updateProject(id: string, update: ProjectUpdate) {
      if (updateError) {
        const error = updateError;
        updateError = null;
        throw error;
      }

      const index = projects.findIndex((project) => project.id === id);
      if (index === -1) return null;

      /*
       * `null` clears, matching the Mongo repository's `$unset`. Spreading the update
       * straight in would leave a literal null on a field typed `Date | undefined`,
       * which is a shape the real store can never produce — and a fake that can produce
       * states the real thing cannot is a fake that hides bugs rather than finding them.
       */
      const cleaned: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(update)) {
        if (value === null) cleaned[key] = undefined;
        else if (value !== undefined) cleaned[key] = value;
      }

      const updated = {
        ...(projects[index] as StoredProject),
        ...cleaned,
        updatedAt: now(),
      } as StoredProject;

      projects[index] = updated;
      return updated;
    },

    async claimEvent(eventId: string, type: string) {
      const existing = events.get(eventId);
      if (!existing) {
        events.set(eventId, { type, status: 'processing', claimedAt: now() });
        return true;
      }

      // Same rule as the Mongo repository: a processed event is a duplicate; a
      // still-`processing` claim older than the stale window belonged to a dead handler.
      const stale =
        existing.status === 'processing' &&
        now().getTime() - existing.claimedAt.getTime() >= STALE_CLAIM_MS;
      if (stale) {
        existing.claimedAt = now();
        return true;
      }
      return false;
    },

    async markEventProcessed(eventId: string) {
      const event = events.get(eventId);
      if (event) event.status = 'processed';
    },

    async releaseEvent(eventId: string) {
      events.delete(eventId);
    },

    async claimGuaranteeCredit(record) {
      const key = `${record.projectId}:${record.month}`;
      const existing = guaranteeCredits.get(key);
      if (!existing) {
        guaranteeCredits.set(key, {
          remedy: record.remedy,
          amountCents: record.amountCents,
          status: 'processing',
          claimedAt: now(),
        });
        return true;
      }

      const stale =
        existing.status === 'processing' &&
        now().getTime() - existing.claimedAt.getTime() >= STALE_CLAIM_MS;
      if (stale) {
        existing.claimedAt = now();
        existing.remedy = record.remedy;
        return true;
      }
      return false;
    },

    async completeGuaranteeCredit(projectId: string, month: string, stripeReference: string) {
      const credit = guaranteeCredits.get(`${projectId}:${month}`);
      if (credit) {
        credit.status = 'processed';
        credit.stripeReference = stripeReference;
      }
    },

    async releaseGuaranteeCredit(projectId: string, month: string) {
      guaranteeCredits.delete(`${projectId}:${month}`);
    },

    async findGuaranteeCredit(projectId: string, month: string) {
      const credit = guaranteeCredits.get(`${projectId}:${month}`);
      if (!credit) return null;
      const stored: StoredGuaranteeCredit = {
        projectId,
        month,
        remedy: credit.remedy,
        amountCents: credit.amountCents,
        stripeReference: credit.stripeReference,
        createdAt: credit.claimedAt,
      };
      return stored;
    },
  };
}

export interface FakeStripeClient extends StripeClient {
  readonly checkoutRequests: CheckoutSessionRequest[];
  /** What `verifyWebhook` returns next; tests set this before calling the handler. */
  nextEvent: VerifiedStripeEvent | null;
  failNextVerification(): void;
  /** Makes the next `createCheckoutSession` reject, to exercise Stripe API failure. */
  failNextCheckout(error: Error): void;
  /** Makes the next balance credit reject, to exercise guarantee retry recovery. */
  failNextBalanceCredit(error: Error): void;
  /** What each price id charges, in cents. Tests set these to simulate the dashboard. */
  setPriceAmount(priceId: string, unitAmountCents: number | null, currency?: string): void;
  readonly portalRequests: { customerId: string; returnUrl: string }[];
  readonly balanceCredits: {
    customerId: string;
    amountCents: number;
    currency: string;
    description: string;
  }[];
  readonly subscriptionRefunds: { subscriptionId: string; amountCents: number }[];
}

export function createFakeStripeClient(): FakeStripeClient {
  const checkoutRequests: CheckoutSessionRequest[] = [];
  const portalRequests: { customerId: string; returnUrl: string }[] = [];
  const balanceCredits: FakeStripeClient['balanceCredits'] = [];
  const subscriptionRefunds: FakeStripeClient['subscriptionRefunds'] = [];
  const priceAmounts = new Map<string, { unitAmountCents: number | null; currency: string }>();
  let failVerification = false;
  let checkoutError: Error | null = null;
  let balanceCreditError: Error | null = null;
  let nextSession = 1;

  const client: FakeStripeClient = {
    checkoutRequests,
    portalRequests,
    balanceCredits,
    subscriptionRefunds,
    nextEvent: null,

    failNextVerification() {
      failVerification = true;
    },

    failNextCheckout(error) {
      checkoutError = error;
    },

    failNextBalanceCredit(error) {
      balanceCreditError = error;
    },

    setPriceAmount(priceId, unitAmountCents, currency = 'usd') {
      priceAmounts.set(priceId, { unitAmountCents, currency });
    },

    async createCheckoutSession(request: CheckoutSessionRequest) {
      if (checkoutError) {
        const error = checkoutError;
        checkoutError = null;
        throw error;
      }

      checkoutRequests.push(request);
      return {
        id: `cs_test_${nextSession++}`,
        url: `https://checkout.stripe.example/session/${nextSession}`,
      };
    },

    async getPriceAmount(priceId: string) {
      const amount = priceAmounts.get(priceId);
      if (!amount) throw new Error(`No amount configured on the fake for "${priceId}".`);
      return amount;
    },

    async createBillingPortalSession(params: { customerId: string; returnUrl: string }) {
      portalRequests.push(params);
      return { url: `https://billing.stripe.example/portal/${portalRequests.length}` };
    },

    async createCustomerBalanceCredit(params) {
      if (balanceCreditError) {
        const error = balanceCreditError;
        balanceCreditError = null;
        throw error;
      }
      balanceCredits.push({ ...params });
      return { id: `cbtxn_test_${balanceCredits.length}` };
    },

    async refundSubscriptionCharge(params) {
      subscriptionRefunds.push({ ...params });
      return { id: `re_test_${subscriptionRefunds.length}` };
    },

    verifyWebhook() {
      if (failVerification) {
        failVerification = false;
        throw new Error('Signature verification failed.');
      }
      if (!client.nextEvent) throw new Error('No event queued on the fake.');
      return client.nextEvent;
    },
  };

  return client;
}
