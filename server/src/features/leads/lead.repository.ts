import { LeadModel, toStoredLead } from './lead.model.js';
import type { InquiryType, NewLeadRecord, NotificationStatus, StoredLead } from './lead.types.js';

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
}

export interface MongoLeadRepositoryDependencies {
  /** Idempotent connect. Called before every operation because serverless starts cold. */
  readonly connect: () => Promise<void>;
}

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
  };
}
