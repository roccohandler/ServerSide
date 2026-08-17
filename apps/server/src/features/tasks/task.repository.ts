import { TaskModel, toStoredTask } from './task.model.js';
import type { NewTaskRecord, StoredTask } from './task.types.js';

export interface TaskRepository {
  /**
   * Creates a task, or returns null when one of that kind already exists on the
   * project. Null rather than a throw: seeding onboarding twice is an ordinary
   * consequence of Stripe retrying, not an error anybody needs to hear about.
   */
  create(record: NewTaskRecord): Promise<StoredTask | null>;
  findById(id: string): Promise<StoredTask | null>;
  listForProject(projectId: string): Promise<readonly StoredTask[]>;
  /** Open tasks across every project this person has. Drives the dashboard's next action. */
  listOpenForUser(userId: string): Promise<readonly StoredTask[]>;
  /**
   * Marks a task done, and only a task that was open. Returns null when it was already
   * completed, which is what makes a double-click a no-op rather than a second
   * `task.completed` activity entry.
   */
  complete(id: string, completedAt: Date): Promise<StoredTask | null>;
  reopen(id: string): Promise<StoredTask | null>;
}

export interface MongoTaskRepositoryDependencies {
  readonly connect: () => Promise<void>;
}

const OBJECT_ID = /^[a-f\d]{24}$/i;

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000;
}

export function createMongoTaskRepository(
  dependencies: MongoTaskRepositoryDependencies,
): TaskRepository {
  const { connect } = dependencies;

  return {
    async create(record) {
      await connect();
      try {
        const document = await TaskModel.create(record);
        return toStoredTask(document.toObject());
      } catch (error) {
        if (isDuplicateKeyError(error)) return null;
        throw error;
      }
    },

    async findById(id) {
      await connect();
      if (!OBJECT_ID.test(id)) return null;
      const document = await TaskModel.findById(id).lean().exec();
      return document ? toStoredTask(document) : null;
    },

    async listForProject(projectId) {
      await connect();
      const documents = await TaskModel.find({ projectId }).sort({ createdAt: 1 }).lean().exec();
      return documents.map(toStoredTask);
    },

    async listOpenForUser(userId) {
      await connect();
      const documents = await TaskModel.find({ userId, status: 'open' })
        .sort({ createdAt: 1 })
        .lean()
        .exec();
      return documents.map(toStoredTask);
    },

    async complete(id, completedAt) {
      await connect();
      if (!OBJECT_ID.test(id)) return null;

      // The `status: 'open'` filter is the idempotency: a second completion matches
      // nothing and returns null, rather than overwriting the original timestamp.
      const document = await TaskModel.findOneAndUpdate(
        { _id: id, status: 'open' },
        { $set: { status: 'completed', completedAt } },
        { new: true },
      )
        .lean()
        .exec();

      return document ? toStoredTask(document) : null;
    },

    async reopen(id) {
      await connect();
      if (!OBJECT_ID.test(id)) return null;
      const document = await TaskModel.findOneAndUpdate(
        { _id: id, status: 'completed' },
        { $set: { status: 'open' }, $unset: { completedAt: 1 } },
        { new: true },
      )
        .lean()
        .exec();
      return document ? toStoredTask(document) : null;
    },
  };
}
