import { ActivityModel, toStoredActivity } from './activity.model.js';
import type { NewActivityRecord, StoredActivity } from './activity.types.js';

export interface ActivityRepository {
  record(record: NewActivityRecord): Promise<StoredActivity>;
  /** Most recent first. `customerVisibleOnly` is what keeps internal notes internal. */
  listForUser(params: {
    readonly userId: string;
    readonly limit: number;
    readonly customerVisibleOnly: boolean;
  }): Promise<readonly StoredActivity[]>;
  listForProject(params: {
    readonly projectId: string;
    readonly limit: number;
    readonly customerVisibleOnly: boolean;
  }): Promise<readonly StoredActivity[]>;
  /**
   * How many entries this account has that it has not seen, capped.
   *
   * `cap` is not pagination — it is the largest number the interface will ever print. A
   * badge saying "99+" and a badge saying "412" are the same message to the reader, and the
   * second one costs a full collection scan to compute. MongoDB stops counting at the limit.
   *
   * `since` is exclusive, so an entry written in the same millisecond as the mark is
   * *not* counted. That is the safe direction of the two: the alternative leaves a
   * permanent phantom "1 new" that catching up cannot clear.
   */
  countForUserSince(params: {
    readonly userId: string;
    readonly since: Date;
    readonly customerVisibleOnly: boolean;
    readonly cap: number;
  }): Promise<number>;
}

export interface MongoActivityRepositoryDependencies {
  readonly connect: () => Promise<void>;
}

export function createMongoActivityRepository(
  dependencies: MongoActivityRepositoryDependencies,
): ActivityRepository {
  const { connect } = dependencies;

  return {
    async record(record) {
      await connect();
      const document = await ActivityModel.create(record);
      return toStoredActivity(document.toObject());
    },

    async listForUser({ userId, limit, customerVisibleOnly }) {
      await connect();
      const documents = await ActivityModel.find({
        userId,
        ...(customerVisibleOnly ? { audience: 'customer' } : {}),
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean()
        .exec();
      return documents.map(toStoredActivity);
    },

    async listForProject({ projectId, limit, customerVisibleOnly }) {
      await connect();
      const documents = await ActivityModel.find({
        projectId,
        ...(customerVisibleOnly ? { audience: 'customer' } : {}),
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean()
        .exec();
      return documents.map(toStoredActivity);
    },

    async countForUserSince({ userId, since, customerVisibleOnly, cap }) {
      await connect();
      return ActivityModel.countDocuments(
        {
          userId,
          createdAt: { $gt: since },
          ...(customerVisibleOnly ? { audience: 'customer' } : {}),
        },
        { limit: cap },
      ).exec();
    },
  };
}
