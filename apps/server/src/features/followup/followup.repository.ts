import { FollowUpSendModel, SuppressionModel } from './followup.model.js';
import type { SuppressionReason } from './followup.types.js';

export interface FollowUpRepository {
  /**
   * Which rules each of these accounts has already had.
   *
   * One query for the whole batch rather than one per candidate — the run looks at everybody
   * who signed up in the last fortnight, and a lookup per person is the shape that quietly
   * becomes a timeout the month the business starts working.
   */
  sentRulesFor(userIds: readonly string[]): Promise<ReadonlyMap<string, ReadonlySet<string>>>;
  /**
   * Claims a send. **True means it is yours to send; false means somebody already has it.**
   *
   * Written before the mail rather than after — see the note on the unique index in
   * `followup.model.ts`. A duplicate key is the expected outcome on an overlapping run and is
   * not an error.
   */
  claimSend(userId: string, ruleKey: string, sentAt: Date): Promise<boolean>;
  /** Releases a claim whose mail then failed, so the next run may try again. */
  releaseSend(userId: string, ruleKey: string): Promise<void>;
  /** Addresses that must receive nothing but transactional mail. Lowercased by the caller. */
  suppressed(emails: readonly string[]): Promise<ReadonlySet<string>>;
  isSuppressed(email: string): Promise<boolean>;
  /** Idempotent: unsubscribing twice is one row and the second is not an error. */
  suppress(email: string, reason: SuppressionReason, at: Date): Promise<void>;
}

export interface MongoFollowUpRepositoryDependencies {
  readonly connect: () => Promise<void>;
}

/** MongoDB's duplicate-key code. The one error here that means "working as intended". */
const DUPLICATE_KEY = 11000;

function isDuplicateKey(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error
    ? (error as { code?: unknown }).code === DUPLICATE_KEY
    : false;
}

export function createMongoFollowUpRepository(
  dependencies: MongoFollowUpRepositoryDependencies,
): FollowUpRepository {
  const { connect } = dependencies;

  return {
    async sentRulesFor(userIds) {
      await connect();
      if (userIds.length === 0) return new Map();

      const rows = await FollowUpSendModel.find({ userId: { $in: [...userIds] } })
        .select({ userId: 1, ruleKey: 1 })
        .lean()
        .exec();

      const byUser = new Map<string, Set<string>>();
      for (const row of rows) {
        const set = byUser.get(row.userId) ?? new Set<string>();
        set.add(row.ruleKey);
        byUser.set(row.userId, set);
      }
      return byUser;
    },

    async claimSend(userId, ruleKey, sentAt) {
      await connect();
      try {
        await FollowUpSendModel.create({ userId, ruleKey, sentAt });
        return true;
      } catch (error) {
        if (isDuplicateKey(error)) return false;
        throw error;
      }
    },

    async releaseSend(userId, ruleKey) {
      await connect();
      await FollowUpSendModel.deleteOne({ userId, ruleKey }).exec();
    },

    async suppressed(emails) {
      await connect();
      if (emails.length === 0) return new Set();

      const found = await SuppressionModel.distinct('email', {
        email: { $in: [...emails] },
      }).exec();
      return new Set(found);
    },

    async isSuppressed(email) {
      await connect();
      return (await SuppressionModel.exists({ email })) !== null;
    },

    async suppress(email, reason, at) {
      await connect();
      /*
       * Upsert rather than insert. Somebody clicking the link twice — or a mail client
       * prefetching it and the person then clicking — must be one row and one success, not a
       * duplicate-key error rendered as "something went wrong" on an unsubscribe page.
       */
      await SuppressionModel.updateOne(
        { email },
        { $setOnInsert: { email, reason, createdAt: at } },
        { upsert: true },
      ).exec();
    },
  };
}
