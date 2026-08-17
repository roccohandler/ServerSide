/*
 * ============================================================================
 * FEEDBACK — THE CONVERSATION, ABOUT ONE WEBSITE OR ABOUT NOTHING IN PARTICULAR
 * ============================================================================
 *
 * A customer looks at their preview and writes "replace the photo in the services
 * section". That sentence needs to arrive attached to their project, be replyable, and
 * be markable as done. That was the entire feature.
 *
 * ## A comment now has a scope, and there are two of them
 *
 * The second one arrived with Phase 6.1. A customer *between* projects — signed up, not yet
 * bought, or finished and thinking about the next one — had no way to reach the owner except
 * the public contact form, which files an existing client as a **prospect** in a list of
 * strangers. That is the wrong list, and it is the list somebody works through by cold-calling.
 *
 * The alternative was a `messages` collection. It was refused for the reason
 * `features/conversations` refuses a model of its own: a second collection is a second
 * definition of "somebody is waiting on a reply", and the console inbox already has one that
 * cost real work to get right. Widening the scope of a comment cost one nullable field and
 * bought the inbox, the threading rule, the author-role rule, the notification direction and
 * the demo exclusion — all of it, unchanged, on the day the field was added.
 *
 * So: **exactly one of `projectId` and `accountUserId` is set.** `scopeOf` is the only thing
 * in the codebase that reads either of them to decide which, and `scopeFields` is the only
 * thing that writes them. Two nullable fields that must agree are two fields that eventually
 * will not — unless nothing but one function can see them, which is the deal here.
 *
 * Existing rows carry `projectId` and no `accountUserId`, which reads as a project scope. No
 * migration.
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

/**
 * What a comment is attached to. Exactly one of the two, always.
 *
 * A discriminated union rather than two optional parameters, so "neither" and "both" are
 * states a caller cannot construct. The storage underneath is two nullable columns; this is
 * the shape everything above the repository speaks.
 */
export type CommentScope =
  | { readonly kind: 'project'; readonly projectId: string }
  | { readonly kind: 'account'; readonly userId: string };

/** The two columns. Nothing outside this file should destructure them. */
export interface CommentScopeFields {
  readonly projectId?: string | undefined;
  readonly accountUserId?: string | undefined;
}

/** Scope → storage. The only writer of either column. */
export function scopeFields(scope: CommentScope): CommentScopeFields {
  return scope.kind === 'project'
    ? { projectId: scope.projectId }
    : { accountUserId: scope.userId };
}

/**
 * Storage → scope. The only reader.
 *
 * Null for a row carrying neither, which cannot happen — the schema requires one and the
 * service writes through `scopeFields` — but is returned rather than thrown because a mapper
 * that throws turns one malformed row into a failed list for everybody else on it.
 */
export function scopeOf(fields: CommentScopeFields): CommentScope | null {
  if (fields.projectId) return { kind: 'project', projectId: fields.projectId };
  if (fields.accountUserId) return { kind: 'account', userId: fields.accountUserId };
  return null;
}

/**
 * Whether a stored comment sits in a given scope.
 *
 * The security-relevant comparison: it is what stops a reply quoting a comment id from
 * another customer's project — or another customer's account thread — from landing where it
 * would be read. See `addComment`.
 */
export function isInScope(fields: CommentScopeFields, scope: CommentScope): boolean {
  const found = scopeOf(fields);
  if (!found) return false;
  return found.kind === 'project' && scope.kind === 'project'
    ? found.projectId === scope.projectId
    : found.kind === 'account' && scope.kind === 'account' && found.userId === scope.userId;
}

export interface NewCommentRecord extends CommentScopeFields {
  /** Null for a root comment; a root comment's id for a reply. Never two deep. */
  readonly parentId?: string | undefined;
  readonly authorUserId: string;
  readonly authorName: string;
  readonly authorRole: CommentAuthorRole;
  readonly body: string;
}

export interface StoredComment extends CommentScopeFields {
  readonly id: string;
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
