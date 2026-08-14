import type { QueryFilter } from 'mongoose';
import { ProjectModel, type ProjectDocument, toStoredProject } from './project.model.js';
import type { NewProjectRecord, ProjectUpdate, StoredProject } from './project.types.js';

/**
 * Project storage, from the fulfilment side.
 *
 * Overlaps `BillingRepository` on purpose and only where it must: both read and update
 * the same document, because a payment and a milestone are two facts about one project.
 * What is not shared is the *reason* each exists — this interface is what a customer's
 * dashboard needs, and it has the query billing does not (`listByOwner`) and lacks the
 * ones billing needs (subscription and payment-intent lookups).
 */
export interface ProjectRepository {
  create(record: NewProjectRecord): Promise<StoredProject>;
  findById(id: string): Promise<StoredProject | null>;
  /** Most recent first. The only query the customer dashboard makes. */
  listByOwner(userId: string, limit: number): Promise<readonly StoredProject[]>;
  /** Most recent first, across every customer. Staff only. */
  listAll(limit: number): Promise<readonly StoredProject[]>;
  update(id: string, update: ProjectUpdate): Promise<StoredProject | null>;
  /**
   * Attaches an unowned project to an account, and only an unowned one.
   *
   * The filter is the safety property: a project that already belongs to somebody can
   * never be reassigned by this, so a second payment quoting a stale project id cannot
   * move another customer's project into the payer's dashboard.
   */
  claimForOwner(id: string, userId: string): Promise<StoredProject | null>;
  /** Whether this account already has a project, so activation stays idempotent. */
  countForOwner(userId: string): Promise<number>;
}

export interface MongoProjectRepositoryDependencies {
  readonly connect: () => Promise<void>;
}

const OBJECT_ID = /^[a-f\d]{24}$/i;

export function createMongoProjectRepository(
  dependencies: MongoProjectRepositoryDependencies,
): ProjectRepository {
  const { connect } = dependencies;

  return {
    async create(record) {
      await connect();
      const document = await ProjectModel.create(record);
      return toStoredProject(document.toObject());
    },

    async findById(id) {
      await connect();
      if (!OBJECT_ID.test(id)) return null;
      const document = await ProjectModel.findById(id).lean().exec();
      return document ? toStoredProject(document) : null;
    },

    async listByOwner(userId, limit) {
      await connect();
      const documents = await ProjectModel.find({ ownerUserId: userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean()
        .exec();
      return documents.map(toStoredProject);
    },

    async listAll(limit) {
      await connect();
      const documents = await ProjectModel.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean()
        .exec();
      return documents.map(toStoredProject);
    },

    async update(id, update) {
      await connect();
      if (!OBJECT_ID.test(id)) return null;

      /*
       * `null` clears. Only the approval fields use it, and they need it: withdrawing
       * an approval has to remove the timestamp rather than leave a date sitting on a
       * project nobody has approved.
       */
      const set: Record<string, unknown> = {};
      const unset: Record<string, 1> = {};

      for (const [key, value] of Object.entries(update)) {
        if (value === null) unset[key] = 1;
        else if (value !== undefined) set[key] = value;
      }

      const document = await ProjectModel.findByIdAndUpdate(
        id,
        {
          ...(Object.keys(set).length > 0 ? { $set: set } : {}),
          ...(Object.keys(unset).length > 0 ? { $unset: unset } : {}),
        },
        { new: true, runValidators: true },
      )
        .lean()
        .exec();

      return document ? toStoredProject(document) : null;
    },

    async claimForOwner(id, userId) {
      await connect();
      if (!OBJECT_ID.test(id)) return null;

      /*  matches both an explicit null and a project that never
       * had an owner field at all — see the note on the interface. */
      const filter: QueryFilter<ProjectDocument> = { _id: id, ownerUserId: null };

      const document = await ProjectModel.findOneAndUpdate(
        filter,
        { $set: { ownerUserId: userId } },
        { new: true },
      )
        .lean()
        .exec();

      return document ? toStoredProject(document) : null;
    },

    async countForOwner(userId) {
      await connect();
      return ProjectModel.countDocuments({ ownerUserId: userId }).exec();
    },
  };
}
