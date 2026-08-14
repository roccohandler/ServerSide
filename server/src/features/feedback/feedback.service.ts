import { AppError } from '../../lib/appError.js';
import type { Logger } from '../../lib/logger.js';
import type { ActivityRecorder } from '../activity/index.js';
import type { StoredUser } from '../auth/index.js';
import type { FeedbackRepository } from './feedback.repository.js';
import type { CommentAuthorRole, StoredComment } from './feedback.types.js';

export interface FeedbackService {
  /**
   * Adds a comment or a reply to a project.
   *
   * The caller has already authorized access to the project. The author is taken from
   * the session, never from the body — a request cannot say who wrote it.
   */
  addComment(params: {
    readonly projectId: string;
    readonly author: StoredUser;
    readonly body: string;
    readonly parentId?: string | undefined;
  }): Promise<StoredComment>;
  listForProject(projectId: string): Promise<readonly StoredComment[]>;
  findById(id: string): Promise<StoredComment | null>;
  /** Marks a request done. Only a root comment can be resolved. */
  resolve(params: {
    readonly comment: StoredComment;
    readonly resolvedBy: StoredUser;
  }): Promise<StoredComment>;
  reopen(comment: StoredComment): Promise<StoredComment>;
  countUnresolved(projectId: string): Promise<number>;
}

export interface FeedbackServiceDependencies {
  readonly repository: FeedbackRepository;
  readonly activity: ActivityRecorder;
  readonly logger: Logger;
  readonly now?: () => Date;
}

/** A comment's author role follows the account's role. Staff are `team`; everybody else is the customer. */
function authorRoleFor(user: StoredUser): CommentAuthorRole {
  return user.role === 'admin' ? 'team' : 'customer';
}

export function createFeedbackService(dependencies: FeedbackServiceDependencies): FeedbackService {
  const { repository, activity, logger } = dependencies;
  const now = dependencies.now ?? (() => new Date());

  return {
    async addComment({ projectId, author, body, parentId }) {
      if (parentId) {
        const parent = await repository.findById(parentId);

        /*
         * The parent has to exist, has to be on this project, and has to be a root.
         *
         * The project check is the security-relevant one: without it, somebody could
         * reply to a comment on *another customer's* project by quoting its id, and the
         * reply would be readable there. The two-deep check is what keeps threading flat.
         */
        if (!parent || parent.projectId !== projectId) {
          throw new AppError('NOT_FOUND', 'There is no comment to reply to.');
        }
        if (parent.parentId) {
          throw new AppError('VALIDATION_ERROR', 'Replies cannot themselves be replied to.');
        }
      }

      const comment = await repository.create({
        projectId,
        parentId,
        authorUserId: author.id,
        authorName: author.name,
        authorRole: authorRoleFor(author),
        body,
      });

      logger.info('feedback.comment_added', {
        projectId,
        commentId: comment.id,
        isReply: Boolean(parentId),
      });

      await activity.record({
        type: parentId ? 'feedback.replied' : 'feedback.created',
        summary: parentId
          ? `${comment.authorName} replied to a comment.`
          : `${comment.authorName} left a comment.`,
        audience: 'customer',
        projectId,
        /*
         * The stream belongs to the project's customer, not to whoever wrote the
         * comment — a reply from the team has to appear in the customer's activity.
         * The project's owner is filled in by the caller when it differs; here the
         * author is used only when they are the customer.
         */
        userId: comment.authorRole === 'customer' ? author.id : undefined,
      });

      return comment;
    },

    listForProject: (projectId) => repository.listForProject(projectId),
    findById: (id) => repository.findById(id),

    async resolve({ comment, resolvedBy }) {
      if (comment.parentId) {
        throw new AppError(
          'VALIDATION_ERROR',
          'Only the original comment can be marked as done, not a reply to it.',
        );
      }

      const resolved = await repository.resolve(comment.id, resolvedBy.id, now());

      // Already resolved. Return what is stored rather than recording it twice.
      if (!resolved) return comment;

      await activity.record({
        type: 'feedback.resolved',
        summary: 'A change request was marked as done.',
        audience: 'customer',
        projectId: resolved.projectId,
      });

      return resolved;
    },

    async reopen(comment) {
      const reopened = await repository.reopen(comment.id);
      return reopened ?? comment;
    },

    countUnresolved: (projectId) => repository.countUnresolvedRoots(projectId),
  };
}
