import { AppError } from '../../lib/appError.js';
import type { Logger } from '../../lib/logger.js';
import type { ActivityRecorder } from '../activity/index.js';
import type { StoredUser } from '../auth/index.js';
import { noopNotifier, type Notifier } from '../notifications/index.js';
import type { FeedbackRepository } from './feedback.repository.js';
import {
  isInScope,
  scopeFields,
  type CommentAuthorRole,
  type CommentScope,
  type StoredComment,
} from './feedback.types.js';

export interface FeedbackService {
  /**
   * Adds a comment or a reply to a project.
   *
   * The caller has already authorized access to the project. The author is taken from
   * the session, never from the body — a request cannot say who wrote it.
   */
  addComment(params: {
    /** A website, or a person with no website open. See `CommentScope`. */
    readonly scope: CommentScope;
    readonly author: StoredUser;
    readonly body: string;
    readonly parentId?: string | undefined;
    /**
     * Enough about the other side to write to them. Optional, and its absence means the
     * comment is written and nobody is told — which is the correct behaviour for a caller that
     * genuinely has no subject in hand, and is never the case for the real ones.
     */
    readonly subject?: FeedbackSubject | undefined;
  }): Promise<StoredComment>;
  listForProject(projectId: string): Promise<readonly StoredComment[]>;
  /** One person's account-scoped messages, oldest first. */
  listForAccount(userId: string): Promise<readonly StoredComment[]>;
  /**
   * Every customer request still waiting on an answer, across every project, oldest
   * first. Staff only — see `listAwaitingTeamReply` on the repository for the bound.
   */
  listAwaitingReply(limit: number): Promise<readonly StoredComment[]>;
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
  /**
   * How the other side of the conversation finds out.
   *
   * Optional and no-op by default, like every other consumer of this port. Before it existed,
   * a reply written in the console was stored, attributed and activity-recorded — and the
   * customer discovered it only if they happened to sign in. A conversation where one side
   * cannot tell they have been answered is not a conversation.
   */
  readonly notifier?: Notifier | undefined;
  readonly logger: Logger;
  readonly now?: () => Date;
}

/**
 * The one thing this service needs about a project in order to write to somebody about it.
 *
 * Taken as a parameter rather than loaded, and the reason is a dependency edge: `ProjectService`
 * already depends on nothing here, but `conversation.service.ts` depends on both, and giving
 * feedback a project repository would put a second definition of "which project is this" one
 * import away from a feature whose entire design note is about not having one.
 *
 * The callers all have it: the customer route resolves the project through `createProjectAccess`
 * before it reaches here, and so does the admin route.
 */
export interface FeedbackSubject {
  readonly businessName: string;
  /** Where a customer-bound notification goes. */
  readonly email: string;
  readonly contactName: string;
}

/** A comment's author role follows the account's role. Staff are `team`; everybody else is the customer. */
function authorRoleFor(user: StoredUser): CommentAuthorRole {
  return user.role === 'admin' ? 'team' : 'customer';
}

export function createFeedbackService(dependencies: FeedbackServiceDependencies): FeedbackService {
  const { repository, activity, logger } = dependencies;
  const notifier = dependencies.notifier ?? noopNotifier;
  const now = dependencies.now ?? (() => new Date());

  return {
    async addComment({ scope, author, body, parentId, subject }) {
      if (parentId) {
        const parent = await repository.findById(parentId);

        /*
         * The parent has to exist, has to be in this scope, and has to be a root.
         *
         * The scope check is the security-relevant one: without it, somebody could reply to a
         * comment on *another customer's* project — or in another customer's account thread —
         * by quoting its id, and the reply would be readable there. The two-deep check is what
         * keeps threading flat.
         */
        if (!parent || !isInScope(parent, scope)) {
          throw new AppError('NOT_FOUND', 'There is no comment to reply to.');
        }
        if (parent.parentId) {
          throw new AppError('VALIDATION_ERROR', 'Replies cannot themselves be replied to.');
        }
      }

      const comment = await repository.create({
        ...scopeFields(scope),
        parentId,
        authorUserId: author.id,
        authorName: author.name,
        authorRole: authorRoleFor(author),
        body,
      });

      logger.info('feedback.comment_added', {
        scope: scope.kind,
        ...(scope.kind === 'project' ? { projectId: scope.projectId } : {}),
        commentId: comment.id,
        isReply: Boolean(parentId),
      });

      await activity.record({
        type: parentId ? 'feedback.replied' : 'feedback.created',
        summary: parentId
          ? `${comment.authorName} replied to a comment.`
          : `${comment.authorName} left a comment.`,
        audience: 'customer',
        /*
         * Absent on an account-scoped message, which `NewActivityRecord` has always allowed —
         * "absent for account-level events that predate a project" is the comment on the field,
         * written before there was one. The entry still lands in the person's own stream via
         * `userId` below, which is what the dashboard reads.
         */
        ...(scope.kind === 'project' ? { projectId: scope.projectId } : {}),
        /*
         * The stream belongs to the customer, not to whoever wrote the comment — a reply
         * from the team has to appear in the customer's activity.
         *
         * On a project scope the project's owner is filled in by the caller when it differs,
         * so the author is used only when they are the customer. On an account scope there is
         * nothing to fill in later: the scope *is* the account, so a team reply lands in the
         * right stream here and does not depend on a caller remembering to say so.
         */
        userId:
          scope.kind === 'account'
            ? scope.userId
            : comment.authorRole === 'customer'
              ? author.id
              : undefined,
      });

      /*
       * ==================================================================
       * WHOEVER DID NOT WRITE IT IS THE ONE WHO IS TOLD
       * ==================================================================
       *
       * The author role already decides which direction this goes, and using it here means the
       * suppression is structural rather than a rule somebody has to remember: a `team` comment
       * notifies the customer, a `customer` comment notifies the owner, and neither branch can
       * reach the person who just pressed Send.
       *
       * That matters more than it sounds. Both surfaces confirm a send in the interface already
       * — the console announces "Reply sent" and the portal announces the comment — so an email
       * to the author would be a second confirmation of something they watched happen, from a
       * system they are about to stop trusting to only mail them about things that matter.
       *
       * The owner's copy is a **digest** entry rather than an interruption, and that is the one
       * judgement here worth arguing with. A customer comment is not always urgent: it is often
       * "looks great, one small thing", and it always lands in the console inbox, which is the
       * surface built to answer "who is waiting". `requestChanges` — the same customer saying
       * the same thing through the button that *stops the build* — is immediate. The button is
       * the signal; the sentence is the detail.
       * ==================================================================
       */
      if (subject) {
        if (comment.authorRole === 'team') {
          await notifier.feedbackReplied({
            to: { email: subject.email, name: subject.contactName },
            businessName: subject.businessName,
            ...(scope.kind === 'project' ? { projectId: scope.projectId } : {}),
            authorName: comment.authorName,
            body: comment.body,
          });
        } else if (scope.kind === 'project') {
          await notifier.owner({
            kind: 'owner.comment_received',
            subject: `New comment — ${subject.businessName}`,
            heading: 'A client left a comment',
            lines: [`${comment.authorName} wrote about ${subject.businessName}:`, comment.body],
            replyTo: subject.email,
          });
        } else {
          /*
           * Same kind, different sentence, and deliberately not a new `NotificationKind`.
           *
           * A message with no project attached is still "a client wrote something", which is
           * what that name means and what the digest groups by. Adding `owner.message_received`
           * would buy one more row in the table for the owner to read past, and the two would
           * always be listed together anyway.
           *
           * What does change is the wording. "wrote about Cascade Heating" would be a lie here
           * — the whole point of this scope is that there is no website being discussed — so
           * the line names the person and says so.
           */
          await notifier.owner({
            kind: 'owner.comment_received',
            subject: `New message — ${subject.businessName}`,
            heading: 'A client sent a message',
            lines: [`${comment.authorName} wrote, with no project open:`, comment.body],
            replyTo: subject.email,
          });
        }
      }

      return comment;
    },

    listForProject: (projectId) => repository.listForProject(projectId),
    listForAccount: (userId) => repository.listForAccount(userId),
    listAwaitingReply: (limit) => repository.listAwaitingTeamReply(limit),
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
