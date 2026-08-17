import { ProjectModel, toStoredProject } from '../projects/index.js';
import {
  BillingEventModel,
  GuaranteeCreditModel,
  toStoredGuaranteeCredit,
} from './billing.model.js';
import type {
  GuaranteeRemedy,
  NewProjectRecord,
  ProjectUpdate,
  StoredGuaranteeCredit,
  StoredProject,
} from './billing.types.js';

/**
 * Everything the billing feature needs from storage.
 *
 * Same shape as `LeadRepository` and for the same reason: the business rules are tested
 * against this interface, so the suite needs no MongoDB and no Stripe account.
 */
export interface BillingRepository {
  createProject(record: NewProjectRecord): Promise<StoredProject>;
  findProjectById(id: string): Promise<StoredProject | null>;
  findProjectBySubscriptionId(subscriptionId: string): Promise<StoredProject | null>;
  /** How a refunded charge finds its project: by the PaymentIntent of either build half. */
  findProjectByPaymentIntentId(paymentIntentId: string): Promise<StoredProject | null>;
  /** Most recent first. The owner's reconciliation view; never public. */
  listProjects(limit: number): Promise<readonly StoredProject[]>;
  updateProject(id: string, update: ProjectUpdate): Promise<StoredProject | null>;
  /**
   * Claims a webhook event for processing, returning `false` when another delivery has
   * already claimed or finished it. The unique index is what makes this race-safe under
   * Stripe's retries. A claim that was neither completed nor released within
   * `STALE_CLAIM_MS` (a crashed handler) is treated as abandoned and can be re-claimed.
   */
  claimEvent(eventId: string, type: string): Promise<boolean>;
  /** Marks a claimed event as fully applied; retries of it are pure duplicates now. */
  markEventProcessed(eventId: string): Promise<void>;
  /**
   * Releases a claim after processing failed, so Stripe's retry can run the event
   * again. Without this, a transient database failure would eat the event forever.
   */
  releaseEvent(eventId: string): Promise<void>;
  /**
   * Claims a response-guarantee remedy for one project-month, returning `false` when
   * that month is already waived (or being waived). The compound unique index makes
   * a double-submission safe; the same claim/complete/release lifecycle as webhook
   * events keeps a failed Stripe call retryable.
   */
  claimGuaranteeCredit(record: {
    readonly projectId: string;
    readonly month: string;
    readonly remedy: GuaranteeRemedy;
    readonly amountCents: number;
  }): Promise<boolean>;
  completeGuaranteeCredit(projectId: string, month: string, stripeReference: string): Promise<void>;
  releaseGuaranteeCredit(projectId: string, month: string): Promise<void>;
  findGuaranteeCredit(projectId: string, month: string): Promise<StoredGuaranteeCredit | null>;
}

export interface MongoBillingRepositoryDependencies {
  /** Idempotent connect. Called before every operation because serverless starts cold. */
  readonly connect: () => Promise<void>;
}

/**
 * How long a `processing` claim may sit before a retry may assume the handler that made
 * it died mid-flight. Serverless functions live for seconds; Stripe's first retry comes
 * minutes later, so five minutes cannot race a handler that is still genuinely running.
 */
export const STALE_CLAIM_MS = 5 * 60 * 1000;

/** A MongoDB duplicate-key error, which is how `claimEvent` detects a concurrent retry. */
function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000;
}

export function createMongoBillingRepository(
  dependencies: MongoBillingRepositoryDependencies,
): BillingRepository {
  const { connect } = dependencies;

  return {
    async createProject(record) {
      await connect();
      const document = await ProjectModel.create(record);
      return toStoredProject(document.toObject());
    },

    async findProjectById(id) {
      await connect();
      // An arbitrary string is not a valid ObjectId; "not found" beats a cast error.
      if (!/^[a-f\d]{24}$/i.test(id)) return null;
      const document = await ProjectModel.findById(id).lean().exec();
      return document ? toStoredProject(document) : null;
    },

    async findProjectBySubscriptionId(subscriptionId) {
      await connect();
      const document = await ProjectModel.findOne({ subscriptionId }).lean().exec();
      return document ? toStoredProject(document) : null;
    },

    async findProjectByPaymentIntentId(paymentIntentId) {
      await connect();
      const document = await ProjectModel.findOne({
        $or: [
          { depositPaymentIntentId: paymentIntentId },
          { finalPaymentIntentId: paymentIntentId },
        ],
      })
        .lean()
        .exec();
      return document ? toStoredProject(document) : null;
    },

    async listProjects(limit) {
      await connect();
      const documents = await ProjectModel.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean()
        .exec();
      return documents.map(toStoredProject);
    },

    async updateProject(id, update) {
      await connect();
      if (!/^[a-f\d]{24}$/i.test(id)) return null;
      const document = await ProjectModel.findByIdAndUpdate(
        id,
        { $set: update },
        { new: true, runValidators: true },
      )
        .lean()
        .exec();
      return document ? toStoredProject(document) : null;
    },

    async claimEvent(eventId, type) {
      await connect();
      try {
        await BillingEventModel.create({ eventId, type, status: 'processing' });
        return true;
      } catch (error) {
        if (!isDuplicateKeyError(error)) throw error;

        /*
         * Someone recorded this event before us. Processed: a true duplicate, skip.
         * Still `processing` after the stale window: the handler that claimed it died
         * before completing or releasing, so this retry adopts the claim. The atomic
         * findOneAndUpdate means exactly one concurrent retry wins the adoption.
         */
        const staleBefore = new Date(Date.now() - STALE_CLAIM_MS);
        const reclaimed = await BillingEventModel.findOneAndUpdate(
          { eventId, status: 'processing', updatedAt: { $lt: staleBefore } },
          { $set: { status: 'processing' } },
          { new: true },
        )
          .lean()
          .exec();
        return Boolean(reclaimed);
      }
    },

    async markEventProcessed(eventId) {
      await connect();
      await BillingEventModel.updateOne({ eventId }, { $set: { status: 'processed' } }).exec();
    },

    async releaseEvent(eventId) {
      await connect();
      await BillingEventModel.deleteOne({ eventId }).exec();
    },

    async claimGuaranteeCredit(record) {
      await connect();
      try {
        await GuaranteeCreditModel.create({ ...record, status: 'processing' });
        return true;
      } catch (error) {
        if (!isDuplicateKeyError(error)) throw error;

        // Same stale-claim adoption as webhook events: a claim whose Stripe call
        // died mid-flight must not block the month's remedy forever.
        const staleBefore = new Date(Date.now() - STALE_CLAIM_MS);
        const reclaimed = await GuaranteeCreditModel.findOneAndUpdate(
          {
            projectId: record.projectId,
            month: record.month,
            status: 'processing',
            updatedAt: { $lt: staleBefore },
          },
          { $set: { status: 'processing', remedy: record.remedy } },
          { new: true },
        )
          .lean()
          .exec();
        return Boolean(reclaimed);
      }
    },

    async completeGuaranteeCredit(projectId, month, stripeReference) {
      await connect();
      await GuaranteeCreditModel.updateOne(
        { projectId, month },
        { $set: { status: 'processed', stripeReference } },
      ).exec();
    },

    async releaseGuaranteeCredit(projectId, month) {
      await connect();
      await GuaranteeCreditModel.deleteOne({ projectId, month }).exec();
    },

    async findGuaranteeCredit(projectId, month) {
      await connect();
      const document = await GuaranteeCreditModel.findOne({ projectId, month }).lean().exec();
      return document ? toStoredGuaranteeCredit(document) : null;
    },
  };
}
