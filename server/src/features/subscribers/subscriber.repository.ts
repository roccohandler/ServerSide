import { SubscriberModel, toStoredSubscriber } from './subscriber.model.js';
import type {
  NewSubscriberRecord,
  StoredSubscriber,
  SubscriberNotificationStatus,
  SubscriptionAsset,
} from './subscriber.types.js';

export interface ExistingSubscriberQuery {
  readonly email: string;
  readonly asset: SubscriptionAsset;
  readonly since: Date;
}

/**
 * Everything the subscriber feature needs from storage.
 *
 * Same shape as `LeadRepository` and for the same reason: the business rules are tested
 * against this interface, so the suite needs no MongoDB.
 */
export interface SubscriberRepository {
  create(record: NewSubscriberRecord): Promise<StoredSubscriber>;
  findExisting(query: ExistingSubscriberQuery): Promise<StoredSubscriber | null>;
  updateNotificationStatus(id: string, status: SubscriberNotificationStatus): Promise<void>;
}

export interface MongoSubscriberRepositoryDependencies {
  /** Idempotent connect. Called before every operation because serverless starts cold. */
  readonly connect: () => Promise<void>;
}

export function createMongoSubscriberRepository(
  dependencies: MongoSubscriberRepositoryDependencies,
): SubscriberRepository {
  const { connect } = dependencies;

  return {
    async create(record) {
      await connect();
      const document = await SubscriberModel.create(record);
      return toStoredSubscriber(document.toObject());
    },

    async findExisting(query) {
      await connect();
      const document = await SubscriberModel.findOne({
        email: query.email,
        asset: query.asset,
        createdAt: { $gte: query.since },
      })
        .sort({ createdAt: -1 })
        .lean()
        .exec();

      return document ? toStoredSubscriber(document) : null;
    },

    async updateNotificationStatus(id, status) {
      await connect();
      await SubscriberModel.updateOne({ _id: id }, { $set: { notificationStatus: status } }).exec();
    },
  };
}
