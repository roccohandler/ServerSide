import type { QueryFilter } from 'mongoose';
import { prefixMatch } from '../../lib/search.js';
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
  /**
   * Most recent first, across every customer. Staff only.
   *
   * `search` matches the business name, the contact name or the address **by prefix**. See
   * `prefixMatch` below for why it is a prefix rather than a substring.
   */
  listAll(limit: number, search?: string | undefined): Promise<readonly StoredProject[]>;
  /**
   * The projects behind a set of ids, in one round trip and in no particular order.
   *
   * For callers that already hold records pointing at projects and need the names to go
   * with them — the console inbox holds change requests and needs to say which business
   * each came from. A `findById` per row is the same query executed N times.
   */
  listByIds(ids: readonly string[]): Promise<readonly StoredProject[]>;
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
  /**
   * Which of these accounts own a project. One query for the batch.
   *
   * The shape `findUserIdsWithRequests` already has on the lead side, and deliberately the
   * same one: both answer "which of these people got as far as X", both are asked by a
   * scheduled job about a whole cohort, and a per-row version of either is fifty round trips
   * to decide whether to send fifty emails.
   */
  findOwnerIdsWithProjects(userIds: readonly string[]): Promise<ReadonlySet<string>>;
  /**
   * The newest project whose contact address is this one.
   *
   * One caller: matching an onboarding submission to the project it is the material for. The
   * address is the only thing the two records share — the welcome form is filled in by a
   * person who has just paid, and it is the same person, on the same afternoon, typing the
   * same address.
   *
   * Newest first, because a client on their second website onboards for the second one.
   */
  findByEmail(email: string): Promise<StoredProject | null>;
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

    async listAll(limit, search) {
      await connect();

      const term = prefixMatch(search);

      const documents = await ProjectModel.find(
        term ? { $or: [{ businessName: term }, { contactName: term }, { email: term }] } : {},
      )
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean()
        .exec();
      return documents.map(toStoredProject);
    },

    async listByIds(ids) {
      await connect();
      /* Anything that is not an ObjectId is dropped rather than sent to the driver. */
      const usable = ids.filter((id) => OBJECT_ID.test(id));
      if (usable.length === 0) return [];

      const documents = await ProjectModel.find({ _id: { $in: usable } })
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

    async findOwnerIdsWithProjects(userIds) {
      await connect();
      if (userIds.length === 0) return new Set();

      /*
       * `distinct` rather than a find: the answer is a set of ids, and pulling whole project
       * documents to derive it would be the entire project list's worth of bytes for a
       * question that is a boolean per row.
       */
      const found = await ProjectModel.distinct('ownerUserId', {
        ownerUserId: { $in: [...userIds] },
      }).exec();
      return new Set(found);
    },

    async findByEmail(email) {
      await connect();
      const document = await ProjectModel.findOne({ email: email.trim().toLowerCase() })
        .sort({ createdAt: -1 })
        .lean()
        .exec();
      return document ? toStoredProject(document) : null;
    },
  };
}
