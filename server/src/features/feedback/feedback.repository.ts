import type { QueryFilter } from 'mongoose';
import { CommentModel, type CommentDocument, toStoredComment } from './feedback.model.js';
import type { NewCommentRecord, StoredComment } from './feedback.types.js';

export interface FeedbackRepository {
  create(record: NewCommentRecord): Promise<StoredComment>;
  findById(id: string): Promise<StoredComment | null>;
  /** One project's comments and replies, oldest first. */
  listForProject(projectId: string): Promise<readonly StoredComment[]>;
  /**
   * Resolves a root comment, and only one that is not already resolved. Null on a
   * second attempt, which keeps the activity entry written exactly once.
   */
  resolve(id: string, resolvedByUserId: string, resolvedAt: Date): Promise<StoredComment | null>;
  reopen(id: string): Promise<StoredComment | null>;
  /** Outstanding requests on a project — the number the portal shows. */
  countUnresolvedRoots(projectId: string): Promise<number>;
}

export interface MongoFeedbackRepositoryDependencies {
  readonly connect: () => Promise<void>;
}

const OBJECT_ID = /^[a-f\d]{24}$/i;

export function createMongoFeedbackRepository(
  dependencies: MongoFeedbackRepositoryDependencies,
): FeedbackRepository {
  const { connect } = dependencies;

  return {
    async create(record) {
      await connect();
      const document = await CommentModel.create(record);
      return toStoredComment(document.toObject());
    },

    async findById(id) {
      await connect();
      if (!OBJECT_ID.test(id)) return null;
      const document = await CommentModel.findById(id).lean().exec();
      return document ? toStoredComment(document) : null;
    },

    async listForProject(projectId) {
      await connect();
      const documents = await CommentModel.find({ projectId }).sort({ createdAt: 1 }).lean().exec();
      return documents.map(toStoredComment);
    },

    async resolve(id, resolvedByUserId, resolvedAt) {
      await connect();
      if (!OBJECT_ID.test(id)) return null;

      /*
       * `resolvedAt: null` is the idempotency check, and in MongoDB it matches both
       * shapes that mean unresolved: an explicit null, and a document where the field
       * was never set or has been unset by a reopen.
       */
      const filter: QueryFilter<CommentDocument> = { _id: id, resolvedAt: null };

      const document = await CommentModel.findOneAndUpdate(
        filter,
        { $set: { resolvedAt, resolvedByUserId } },
        { new: true },
      )
        .lean()
        .exec();

      return document ? toStoredComment(document) : null;
    },

    async reopen(id) {
      await connect();
      if (!OBJECT_ID.test(id)) return null;
      const document = await CommentModel.findByIdAndUpdate(
        id,
        { $unset: { resolvedAt: 1, resolvedByUserId: 1 } },
        { new: true },
      )
        .lean()
        .exec();
      return document ? toStoredComment(document) : null;
    },

    async countUnresolvedRoots(projectId) {
      await connect();
      /* Root comments only (no parent), and only the ones still outstanding. */
      const filter: QueryFilter<CommentDocument> = {
        projectId,
        parentId: null,
        resolvedAt: null,
      };
      return CommentModel.countDocuments(filter).exec();
    },
  };
}
