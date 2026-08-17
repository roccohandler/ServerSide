import mongoose, { Schema, type Model } from 'mongoose';
import {
  COMMENT_AUTHOR_ROLES,
  COMMENT_FIELD_LIMITS,
  type CommentAuthorRole,
  type StoredComment,
} from './feedback.types.js';

export interface CommentDocument {
  /** Set when the comment is about a website. Exactly one of this and `accountUserId`. */
  projectId?: string;
  /**
   * Set when the comment is about nothing in particular — a customer with no project open
   * writing to the owner. Denormalised onto every row in the thread, replies included, which
   * is exactly what `projectId` does for the other scope: it is what makes "this person's
   * messages" one indexed query rather than a root lookup followed by an `$in`.
   */
  accountUserId?: string;
  parentId?: string;
  authorUserId: string;
  authorName: string;
  authorRole: CommentAuthorRole;
  body: string;
  resolvedAt?: Date;
  resolvedByUserId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<CommentDocument>(
  {
    /*
     * Neither is `required`, because exactly one of them is — a condition Mongoose cannot
     * state and the service enforces instead by writing both through `scopeFields`, which
     * cannot produce a row with neither. A `required` on either would reject the other scope.
     */
    projectId: { type: String, maxlength: 64 },
    accountUserId: { type: String, maxlength: 64 },
    parentId: { type: String, maxlength: 64 },
    authorUserId: { type: String, required: true, maxlength: 64 },
    /*
     * Denormalised at write time rather than joined at read time. A comment is a record
     * of what somebody said and who said it *then*; re-deriving the name later would
     * quietly rewrite history when somebody changes their profile.
     */
    authorName: {
      type: String,
      required: true,
      trim: true,
      maxlength: COMMENT_FIELD_LIMITS.authorName,
    },
    authorRole: { type: String, required: true, enum: COMMENT_AUTHOR_ROLES },
    body: { type: String, required: true, trim: true, maxlength: COMMENT_FIELD_LIMITS.body },
    resolvedAt: { type: Date },
    resolvedByUserId: { type: String, maxlength: 64 },
  },
  { timestamps: true },
);

/* The portal's query: one project's comments, oldest first, assembled into threads in memory. */
commentSchema.index({ projectId: 1, createdAt: 1 });
/* The same query for the other scope: one person's messages, oldest first. */
commentSchema.index({ accountUserId: 1, createdAt: 1 });
/*
 * The console's query: unanswered customer requests across every project, oldest first.
 * Equality fields first and the sort field last, so one index both selects and orders.
 */
commentSchema.index({ parentId: 1, resolvedAt: 1, authorRole: 1, createdAt: 1 });

export const CommentModel: Model<CommentDocument> =
  (mongoose.models['Comment'] as Model<CommentDocument> | undefined) ??
  mongoose.model<CommentDocument>('Comment', commentSchema);

export function toStoredComment(document: CommentDocument & { _id: unknown }): StoredComment {
  return {
    id: String(document._id),
    projectId: document.projectId,
    accountUserId: document.accountUserId,
    parentId: document.parentId,
    authorUserId: document.authorUserId,
    authorName: document.authorName,
    authorRole: document.authorRole,
    body: document.body,
    resolvedAt: document.resolvedAt,
    resolvedByUserId: document.resolvedByUserId,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}
