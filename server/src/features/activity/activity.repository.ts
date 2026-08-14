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
  };
}
