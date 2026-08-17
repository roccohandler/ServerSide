import { AppError } from '../../lib/appError.js';

/*
 * ============================================================================
 * CONVERSATIONS — ONE LIST OF PEOPLE WAITING ON A REPLY
 * ============================================================================
 *
 * From the owner's side of the desk, a prospect who filled in the contact form and a
 * customer who asked for a change to their preview are the same job: somebody is waiting
 * and the reply comes from here. The console shows them in one list, because the question
 * being answered is "who have I not got back to?" and that question does not care which
 * collection the row came from.
 *
 * ## This is a read model, not a table
 *
 * There is no `conversations` collection and there should not be one. A conversation is a
 * *view* over records that already exist and already have an owner:
 *
 *     lead    ──→ a prospect. No account, no portal. The reply is an email.
 *     comment ──→ a customer. Has a portal. The reply is a comment on their thread.
 *
 * Building a real collection would mean lead intake writing to two places, the feedback
 * feature writing to two places, and a second definition of "unanswered" that can disagree
 * with the first. The read model has one cost — the id has to say which source it came
 * from — and that cost is paid once, here.
 *
 * ## Why the reply is not a third write path
 *
 * Replying to a customer goes through `FeedbackService.addComment`, the same call the
 * admin project route makes. It lands in their portal and their activity feed because
 * that feature already does both. A conversation-shaped copy of that logic would be a
 * second set of rules about what a reply *is*, and the two would drift the first time one
 * of them was fixed.
 *
 * Not built, deliberately: read receipts, assignment, snoozing, threading a prospect's
 * email response back in. The last one needs inbound email, which is a different system.
 * ============================================================================
 */

/**
 * Which record a conversation is a view of.
 *
 * `comment` rather than `project`: a customer with three outstanding change requests is
 * three rows, because that is how the owner works through them — each one is answered on
 * its own thread and marked done on its own.
 */
export const CONVERSATION_SOURCES = ['lead', 'comment'] as const;

export type ConversationSource = (typeof CONVERSATION_SOURCES)[number];

/** What the console calls the person, which is not what the database calls the record. */
export const CONVERSATION_KINDS = ['prospect', 'customer'] as const;

export type ConversationKind = (typeof CONVERSATION_KINDS)[number];

export interface ConversationId {
  readonly source: ConversationSource;
  readonly recordId: string;
}

/**
 * One row of the inbox, as the browser receives it.
 *
 * Built field by field from each source rather than by spreading a stored record — the
 * same rule `toCustomerProjectView` follows, and for the same reason. A lead carries a
 * phone number and a notification status; a comment carries an author id. None of that
 * is the console's business, and a spread is how it would arrive anyway.
 */
export interface ConversationSummary {
  /** Qualified — `lead:<id>` or `comment:<id>`. See `formatConversationId`. */
  readonly id: string;
  readonly personName: string;
  readonly businessName: string;
  readonly kind: ConversationKind;
  readonly lastMessage: string;
  readonly receivedAt: string;
  readonly awaitingReply: boolean;
}

const SEPARATOR = ':';

export function formatConversationId(id: ConversationId): string {
  return `${id.source}${SEPARATOR}${id.recordId}`;
}

/*
 * A record id can never contain the separator: both sources use MongoDB ObjectIds, which
 * are 24 hex characters. Splitting on the first colon is therefore unambiguous, and the
 * check below is what keeps it that way if a third source ever arrives with a different
 * id format.
 */
const RECORD_ID = /^[^:\s]{1,64}$/;

/**
 * Reads a qualified id from a URL, or throws NOT_FOUND.
 *
 * NOT_FOUND rather than VALIDATION_ERROR, and deliberately: to the caller there is no
 * difference between "that is not a conversation id" and "there is no such conversation",
 * and an API that distinguishes them has told somebody which id formats are real. The
 * same reasoning as `authorizeOwnership`.
 */
export function parseConversationId(raw: string): ConversationId {
  const separator = raw.indexOf(SEPARATOR);
  if (separator < 0) throw notFound();

  const source = raw.slice(0, separator);
  const recordId = raw.slice(separator + 1);

  if (!isConversationSource(source) || !RECORD_ID.test(recordId)) throw notFound();

  return { source, recordId };
}

function isConversationSource(value: string): value is ConversationSource {
  return (CONVERSATION_SOURCES as readonly string[]).includes(value);
}

/** One sentence for every way a conversation can fail to exist. Used by the service too. */
export function notFound(): AppError {
  return new AppError('NOT_FOUND', 'There is no conversation with that id.');
}

/**
 * The first line of a message, trimmed to something a list row can hold.
 *
 * Trimmed on the server rather than with CSS because the console should not receive four
 * thousand characters per row to render forty of. An ellipsis is added only when
 * something was actually removed, so a short message never looks truncated.
 */
export const PREVIEW_LENGTH = 240;

export function toPreview(body: string): string {
  const collapsed = body.replace(/\s+/g, ' ').trim();
  return collapsed.length > PREVIEW_LENGTH
    ? `${collapsed.slice(0, PREVIEW_LENGTH - 1).trimEnd()}…`
    : collapsed;
}

/**
 * One page of the inbox.
 *
 * `hasMore` rather than a total, because a total costs two count queries per load to answer a
 * question the console asks once: is this everybody? Fetching one row beyond the limit answers
 * it exactly, and the console's own note explains why an inferred answer was not good enough.
 */
export interface ConversationPage {
  readonly conversations: readonly ConversationSummary[];
  readonly hasMore: boolean;
}
