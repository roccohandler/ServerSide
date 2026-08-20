import type { LeadRepository } from '../features/leads/lead.repository.js';
import type {
  LeadStatus,
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
import type {
  CheckoutSessionRequest,
  InvoiceRequest,
  StripeClient,
} from '../features/billing/stripe.client.js';
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

    async findById(id: string) {
      return leads.find((lead) => lead.id === id) ?? null;
    },

    async listAwaitingReply(limit: number) {
      return leads
        .filter((lead) => lead.status === 'new')
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .slice(0, limit);
    },

    async updateStatus(id: string, status: LeadStatus) {
      const index = leads.findIndex((lead) => lead.id === id);
      if (index >= 0) {
        leads[index] = { ...(leads[index] as StoredLead), status };
      }
    },

    async findUserIdsWithLeads(userIds: readonly string[]) {
      const wanted = new Set(userIds);
      return new Set(
        leads
          .map((lead) => lead.userId)
          .filter((userId): userId is string => Boolean(userId) && wanted.has(userId as string)),
      );
    },

    async hasLeadForUser(userId: string) {
      return leads.some((lead) => lead.userId === userId);
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

/**
 * ============================================================================
 * THE PROJECT STORE IS SHARED WITH THE PROJECT REPOSITORY, OR IT IS A LIE
 * ============================================================================
 *
 * In production `BillingRepository` and `ProjectRepository` read and write the *same* MongoDB
 * collection — the note on `ProjectRepository` says so, and says why: a payment and a
 * milestone are two facts about one project. Two in-memory doubles with two private arrays
 * agree with that interface and disagree with reality, and the disagreement is invisible
 * until something crosses the seam.
 *
 * Something did. The console mints a checkout link for a project resolved by
 * `createProjectAccess` — the *project* repository — and hands the id to `BillingService`,
 * which looks it up in the *billing* one. In production that is one document; in the harness
 * it was two stores and a 404 that looked exactly like the authorization guard working.
 *
 * So `projects` is injectable, and `platformApp.ts` passes the project repository's own array.
 * A test that builds this double on its own still gets a private store, which is right — the
 * billing service tests are about payment state and have no projects feature to share with.
 * ============================================================================
 */
export function createInMemoryBillingRepository(
  options: { now?: () => Date; projects?: StoredProject[] } = {},
): InMemoryBillingRepository {
  const now = options.now ?? (() => new Date());
  const projects: StoredProject[] = options.projects ?? [];
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
        /* A distinct prefix: when the store is shared, two writers must not collide. */
        id: `project-b${nextId++}`,
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
  /**
   * Every invoice the owner path raised. DECISION 041.
   *
   * Recorded rather than counted, because the assertions that matter are about *what was
   * asked for* — that the price came from the verified Price and not from a figure somebody
   * passed, and that the demonstration project reached this array zero times.
   */
  readonly invoiceRequests: InvoiceRequest[];
  /** Addresses `ensureCustomer` was asked about, so "did it search before creating" is testable. */
  readonly customerLookups: { email: string; name?: string | undefined }[];
}

export function createFakeStripeClient(): FakeStripeClient {
  const checkoutRequests: CheckoutSessionRequest[] = [];
  const portalRequests: { customerId: string; returnUrl: string }[] = [];
  const balanceCredits: FakeStripeClient['balanceCredits'] = [];
  const subscriptionRefunds: FakeStripeClient['subscriptionRefunds'] = [];
  const invoiceRequests: InvoiceRequest[] = [];
  const customerLookups: FakeStripeClient['customerLookups'] = [];
  let nextInvoice = 1;
  const priceAmounts = new Map<string, { unitAmountCents: number | null; currency: string }>();
  let failVerification = false;
  let checkoutError: Error | null = null;
  let balanceCreditError: Error | null = null;
  let nextSession = 1;

  const client: FakeStripeClient = {
    checkoutRequests,
    invoiceRequests,
    customerLookups,
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

    /*
     * Returns a stable id per address, so "the same client twice produces one customer" is a
     * property a test can assert rather than a comment. That is the whole reason the real one
     * searches before creating.
     */
    async ensureCustomer(params: { email: string; name?: string | undefined }) {
      customerLookups.push(params);
      return { id: `cus_${params.email.replace(/[^a-z0-9]/gi, '_')}` };
    },

    async createAndSendInvoice(request: InvoiceRequest) {
      invoiceRequests.push(request);
      const id = `in_test_${nextInvoice++}`;
      return { id, url: `https://invoice.stripe.example/${id}`, number: `JF-${id}` };
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
