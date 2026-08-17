/*
 * ============================================================================
 * FEEDBACK — THE CONVERSATION ABOUT ONE WEBSITE
 * ============================================================================
 *
 * A customer looks at their preview and writes "replace the photo in the services
 * section". That sentence needs to arrive attached to their project, be replyable, and
 * be markable as done. That is the entire feature.
 *
 * ## One level of nesting, on purpose
 *
 * A comment has replies. A reply does not. Arbitrary threading is where comment systems
 * go to become products of their own, and the thing being discussed here is a list of
 * changes to a website — which is a flat list of requests, each with a conversation
 * about it. `parentId` being nullable and never two-deep is enforced in the service.
 *
 * ## Resolution is on the top-level comment
 *
 * "Done" applies to the request, not to a sentence in the middle of discussing it. So
 * only a root comment can be resolved, and resolving it is what takes the request off
 * the outstanding list.
 *
 * Not built, deliberately: real-time delivery, typing indicators, reactions, mentions,
 * read receipts. This is a change list, not a chat product.
 * ============================================================================
 */

/** Who wrote it. Derived from the authenticated session, never from the request body. */
export const COMMENT_AUTHOR_ROLES = ['customer', 'team'] as const;

export type CommentAuthorRole = (typeof COMMENT_AUTHOR_ROLES)[number];

export const COMMENT_FIELD_LIMITS = {
  body: 4000,
  authorName: 120,
} as const;

export interface NewCommentRecord {
  readonly projectId: string;
  /** Null for a root comment; a root comment's id for a reply. Never two deep. */
  readonly parentId?: string | undefined;
  readonly authorUserId: string;
  readonly authorName: string;
  readonly authorRole: CommentAuthorRole;
  readonly body: string;
}

export interface StoredComment {
  readonly id: string;
  readonly projectId: string;
  readonly parentId?: string | undefined;
  readonly authorUserId: string;
  readonly authorName: string;
  readonly authorRole: CommentAuthorRole;
  readonly body: string;
  readonly resolvedAt?: Date | undefined;
  readonly resolvedByUserId?: string | undefined;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/** One request, with its conversation, as the browser receives it. */
export interface CommentThreadView {
  readonly id: string;
  readonly body: string;
  readonly authorName: string;
  readonly authorRole: CommentAuthorRole;
  readonly resolved: boolean;
  readonly resolvedAt?: string | undefined;
  readonly createdAt: string;
  readonly replies: readonly CommentReplyView[];
}

export interface CommentReplyView {
  readonly id: string;
  readonly body: string;
  readonly authorName: string;
  readonly authorRole: CommentAuthorRole;
  readonly createdAt: string;
}

function toReplyView(comment: StoredComment): CommentReplyView {
  return {
    id: comment.id,
    body: comment.body,
    authorName: comment.authorName,
    authorRole: comment.authorRole,
    createdAt: comment.createdAt.toISOString(),
  };
}

/**
 * Assembles flat rows into threads.
 *
 * Done here rather than with an aggregation because a project's whole comment list is
 * tens of rows, not thousands, and one indexed read plus a group in memory beats a
 * pipeline nobody can debug.
 */
export function toThreadViews(comments: readonly StoredComment[]): readonly CommentThreadView[] {
  const repliesByParent = new Map<string, CommentReplyView[]>();

  for (const comment of comments) {
    if (!comment.parentId) continue;
    const list = repliesByParent.get(comment.parentId) ?? [];
    list.push(toReplyView(comment));
    repliesByParent.set(comment.parentId, list);
  }

  return comments
    .filter((comment) => !comment.parentId)
    .map((comment) => ({
      id: comment.id,
      body: comment.body,
      authorName: comment.authorName,
      authorRole: comment.authorRole,
      resolved: Boolean(comment.resolvedAt),
      resolvedAt: comment.resolvedAt?.toISOString(),
      createdAt: comment.createdAt.toISOString(),
      replies: repliesByParent.get(comment.id) ?? [],
    }));
}
