import { LeadModel, toStoredLead } from './lead.model.js';
import type {
  InquiryType,
  LeadStatus,
  NewLeadRecord,
  NotificationStatus,
  StoredLead,
} from './lead.types.js';

export interface RecentDuplicateQuery {
  readonly email: string;
  readonly inquiryType: InquiryType;
  readonly message: string | undefined;
  readonly since: Date;
}

/**
 * Everything the lead feature needs from storage.
 *
 * The service depends on this interface rather than on Mongoose, which is what lets the
 * business rules be tested without a running database.
 */
export interface LeadRepository {
  create(record: NewLeadRecord): Promise<StoredLead>;
  findRecentDuplicate(query: RecentDuplicateQuery): Promise<StoredLead | null>;
  updateNotificationStatus(id: string, status: NotificationStatus): Promise<void>;
  findById(id: string): Promise<StoredLead | null>;
  /**
   * Leads nobody has answered, oldest first.
   *
   * Oldest first is the whole point rather than a default: the person who has been
   * waiting three days is the one the owner owes a reply, and every list in this
   * application that shows newest-first is showing something else.
   */
  listAwaitingReply(limit: number): Promise<readonly StoredLead[]>;
  updateStatus(id: string, status: LeadStatus): Promise<void>;
  /**
   * Which of these accounts has ever sent a request.
   *
   * A set rather than a count, and a batch rather than one call per account, because the
   * only caller is the console's accounts table asking the same question about fifty rows
   * at once. Fifty round trips to answer one column is how a list page becomes the slow
   * page nobody opens.
   */
  findUserIdsWithLeads(userIds: readonly string[]): Promise<ReadonlySet<string>>;
  /** Whether this one account has. The dashboard's version of the question above. */
  hasLeadForUser(userId: string): Promise<boolean>;
}

export interface MongoLeadRepositoryDependencies {
  /** Idempotent connect. Called before every operation because serverless starts cold. */
  readonly connect: () => Promise<void>;
}

/*
 * An id that did not come out of MongoDB is answered as "no such lead" rather than let
 * through to the driver, which throws a CastError that the error handler can only turn
 * into a 500. The same guard as the feedback and project repositories.
 */
const OBJECT_ID = /^[a-f\d]{24}$/i;

export function createMongoLeadRepository(
  dependencies: MongoLeadRepositoryDependencies,
): LeadRepository {
  const { connect } = dependencies;

  return {
    async create(record) {
      await connect();
      const document = await LeadModel.create(record);
      return toStoredLead(document.toObject());
    },

    async findRecentDuplicate(query) {
      await connect();
      const document = await LeadModel.findOne({
        email: query.email,
        inquiryType: query.inquiryType,
        // `null` matches documents where the optional message was never set.
        message: query.message ?? null,
        createdAt: { $gte: query.since },
      })
        .sort({ createdAt: -1 })
        .lean()
        .exec();

      return document ? toStoredLead(document) : null;
    },

    async updateNotificationStatus(id, status) {
      await connect();
      await LeadModel.updateOne({ _id: id }, { $set: { notificationStatus: status } }).exec();
    },

    async findById(id) {
      await connect();
      if (!OBJECT_ID.test(id)) return null;
      const document = await LeadModel.findById(id).lean().exec();
      return document ? toStoredLead(document) : null;
    },

    async listAwaitingReply(limit) {
      await connect();
      const documents = await LeadModel.find({ status: 'new' })
        .sort({ createdAt: 1 })
        .limit(limit)
        .lean()
        .exec();

      return documents.map(toStoredLead);
    },

    async updateStatus(id, status) {
      await connect();
      if (!OBJECT_ID.test(id)) return;
      await LeadModel.updateOne({ _id: id }, { $set: { status } }).exec();
    },

    async findUserIdsWithLeads(userIds) {
      if (userIds.length === 0) return new Set();
      await connect();

      /*
       * `distinct` rather than `find`: the answer is a set of ids and nothing else, so
       * there is no reason to pull whole lead documents across the wire to throw all but
       * one field of each away. It is served by the sparse `userId` index.
       */
      const found = await LeadModel.distinct('userId', { userId: { $in: [...userIds] } }).exec();

      return new Set(found.filter((value): value is string => typeof value === 'string'));
    },

    async hasLeadForUser(userId) {
      await connect();
      /* `exists` stops at the first match; the caller only ever asks whether, never how many. */
      const found = await LeadModel.exists({ userId }).exec();
      return found !== null;
    },
  };
}
