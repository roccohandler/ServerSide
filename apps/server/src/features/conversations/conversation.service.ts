import { AppError } from '../../lib/appError.js';
import { describeError, redactEmail, type Logger } from '../../lib/logger.js';
import type { EmailService } from '../../infrastructure/email/email.service.js';
import type { StoredUser } from '../auth/index.js';
import type { FeedbackService, StoredComment } from '../feedback/index.js';
import { describeInquiryType, type LeadRepository, type StoredLead } from '../leads/index.js';
import type { ProjectService, StoredProject } from '../projects/index.js';
import { buildProspectReplyEmail } from './conversation.email.js';
import {
  formatConversationId,
  notFound,
  toPreview,
  type ConversationId,
  type ConversationSummary,
  type ConversationPage,
} from './conversation.types.js';

export interface ConversationService {
  /**
   * Everybody waiting on a reply, oldest first, across both sources.
   *
   * `limit` bounds each source rather than the merged list, so a hundred unanswered
   * leads can never push every customer's change request off the end. The console asks
   * for fifty; the true answer to "who is waiting" being fifty deep is a staffing
   * problem, not a pagination one.
   *
   * ## Why it says whether it cut anything
   *
   * Because the console could not tell. It inferred truncation from the count reaching the
   * limit, which is wrong in both directions: exactly fifty people waiting reads as "there
   * are more", and — worse — a source returning fewer than the limit while the *other* one
   * was cut reads as a complete list.
   *
   * A truncated list nobody is told about reads as a complete one, and what is being
   * truncated here is people waiting for an answer. So each source is asked for one more
   * than it needs; if it comes back, there is more and the extra row is dropped. Exact, and
   * it costs no second query.
   */
  list(limit: number): Promise<ConversationPage>;
  /** Sends the owner's reply by whichever route the person on the other end can receive. */
  reply(params: {
    readonly id: ConversationId;
    readonly author: StoredUser;
    readonly body: string;
  }): Promise<void>;
}

export interface ConversationServiceDependencies {
  /**
   * The repository rather than `LeadService`, and for the same reason the admin routes
   * take `AuthRepository`: `LeadService` is the public submission path — honeypot,
   * duplicate window, owner notification — and nothing in the console should be one typo
   * away from filing a lead as though a visitor had submitted it.
   */
  readonly leads: LeadRepository;
  readonly feedback: FeedbackService;
  readonly projects: ProjectService;
  readonly emailService: EmailService;
  /**
   * Where a prospect's reply is sent from, in effect: it is the `Reply-To` on the
   * outbound message and the address BCC'd on it. Undefined when no notification address
   * is configured, which makes replying to a prospect fail loudly rather than send mail
   * nobody can answer.
   */
  readonly ownerAddress: string | undefined;
  readonly logger: Logger;
}

export function createConversationService(
  dependencies: ConversationServiceDependencies,
): ConversationService {
  const { leads, feedback, projects, emailService, ownerAddress, logger } = dependencies;

  return {
    async list(limit) {
      /*
       * Both sources at once. They share nothing and neither can fail in a way the other
       * should wait for, so serialising them would only make the console slower.
       *
       * One more than asked for, from each. If it arrives, that source had more to give —
       * which is the only way to tell "fifty people are waiting" from "at least fifty people
       * are waiting" without a second count query.
       */
      const [awaitingLeads, awaitingComments] = await Promise.all([
        leads.listAwaitingReply(limit + 1),
        feedback.listAwaitingReply(limit + 1),
      ]);

      const hasMore = awaitingLeads.length > limit || awaitingComments.length > limit;

      const summaries = [
        ...awaitingLeads.slice(0, limit).map(toProspectSummary),
        ...(await withBusinessNames(awaitingComments.slice(0, limit), projects)),
      ];

      /*
       * Oldest first, and the sort is over the merged list rather than per source —
       * the whole point of one inbox is that a prospect from Tuesday sits above a change
       * request from Thursday.
       */
      return {
        conversations: summaries.sort((a, b) => a.receivedAt.localeCompare(b.receivedAt)),
        hasMore,
      };
    },

    async reply({ id, author, body }) {
      if (id.source === 'lead') {
        await replyToProspect({ leadId: id.recordId, author, body });
        return;
      }

      await replyToCustomer({ commentId: id.recordId, author, body });
    },
  };

  async function replyToProspect(params: {
    readonly leadId: string;
    readonly author: StoredUser;
    readonly body: string;
  }) {
    const lead = await leads.findById(params.leadId);
    if (!lead) throw notFound();

    if (!ownerAddress) {
      /*
       * Refusing is the only honest answer. Without an address the message would go out
       * with the transactional sender as its `Reply-To`, so the prospect's response would
       * arrive nowhere — and the owner would have no copy of what had been sent in their
       * name. A reply nobody can answer is worse than no reply.
       */
      throw new AppError(
        'SERVICE_UNAVAILABLE',
        'No reply address is configured, so this would be sent from an address nobody can answer. Set CONTACT_NOTIFICATION_EMAIL.',
      );
    }

    /*
     * ======================================================================
     * SEND FIRST, THEN MARK — THE OPPOSITE OF LEAD INTAKE, ON PURPOSE
     * ======================================================================
     *
     * `lead.service.ts` persists before it notifies, because there the lead is the asset
     * and a failed email must not lose it. Here the asset is the *delivery*: marking the
     * lead contacted is only a claim that the reply went out. If the mark were written
     * first and the send then failed, the person would drop off the inbox having never
     * heard from anybody — a silent, permanent loss of a customer, and the one failure
     * mode nobody would ever notice.
     *
     * So a delivery failure propagates and nothing is written. The owner sees the error,
     * the row stays in the inbox, and they can try again.
     * ======================================================================
     */
    await emailService.send(
      buildProspectReplyEmail({
        lead,
        body: params.body,
        authorName: params.author.name,
        ownerAddress,
      }),
    );

    try {
      await leads.updateStatus(lead.id, 'contacted');
    } catch (error) {
      /*
       * The reply is already in the prospect's inbox and cannot be unsent. Failing the
       * request now would tell the owner it had not been delivered, and they would send
       * it twice. The cost of swallowing this is one row that reappears in the inbox.
       */
      logger.error('conversation.lead_status_update_failed', {
        leadId: lead.id,
        ...describeError(error),
      });
    }

    logger.info('conversation.prospect_replied', {
      leadId: lead.id,
      email: redactEmail(lead.email),
    });
  }

  async function replyToCustomer(params: {
    readonly commentId: string;
    readonly author: StoredUser;
    readonly body: string;
  }) {
    const comment = await feedback.findById(params.commentId);

    /*
     * A reply has to attach to a root. Answering a reply is not a thing this system does
     * — see the one-level rule in `feedback.types.ts` — and a console request naming one
     * is answered as though the conversation did not exist rather than half-honoured.
     */
    if (!comment || comment.parentId) throw notFound();

    /*
     * Straight through to the feature that owns comments. It writes the reply, records
     * the activity entry the customer's timeline shows, and enforces the threading rule
     * a second time. Nothing about a reply is re-implemented here.
     */

    /*
     * The project, loaded for one purpose: so the customer is emailed that they were answered.
     *
     * This is the call site that most needed it. The inbox is where the owner answers somebody
     * who is *waiting*, and until now a reply sent from here reached the customer's portal
     * silently — the one surface in the system where the whole point is that a person on the
     * other end is expecting to hear something.
     *
     * A missing project is not an error. `withBusinessNames` already handles a comment whose
     * project has gone by falling back to the person's own name; the same tolerance applies
     * here, and the reply is still written. What is lost is the email, which is the right thing
     * to lose when there is no project to name in it.
     */
    const project = await projects.findById(comment.projectId);

    await feedback.addComment({
      projectId: comment.projectId,
      author: params.author,
      body: params.body,
      parentId: comment.id,
      ...(project
        ? {
            subject: {
              businessName: project.businessName,
              email: project.email,
              contactName: project.contactName,
            },
          }
        : {}),
    });

    logger.info('conversation.customer_replied', {
      projectId: comment.projectId,
      commentId: comment.id,
    });
  }
}

function toProspectSummary(lead: StoredLead): ConversationSummary {
  return {
    id: formatConversationId({ source: 'lead', recordId: lead.id }),
    personName: lead.name,
    businessName: lead.businessName,
    kind: 'prospect',
    /*
     * The message if they wrote one, and the reason they got in touch if they did not.
     * A blank row would be the one the owner skips, and "Wants their existing website
     * managed" is more than enough to decide who to call first.
     */
    lastMessage: toPreview(lead.message ?? describeInquiryType(lead.inquiryType)),
    receivedAt: lead.createdAt.toISOString(),
    /* Every lead this query returns is unanswered — that is what the query means. */
    awaitingReply: true,
  };
}

/**
 * Attaches each change request to the business that made it.
 *
 * One query for every project mentioned, not one per row. A project that has been deleted
 * out from under a comment leaves the row in the list with the business name it can still
 * be sure of — the person's own — rather than dropping somebody who is genuinely waiting.
 */
async function withBusinessNames(
  comments: readonly StoredComment[],
  projects: ProjectService,
): Promise<readonly ConversationSummary[]> {
  if (comments.length === 0) return [];

  const found = await projects.listByIds([...new Set(comments.map((c) => c.projectId))]);
  const byId = new Map<string, StoredProject>(found.map((project) => [project.id, project]));

  return comments.map((comment) => ({
    id: formatConversationId({ source: 'comment', recordId: comment.id }),
    personName: comment.authorName,
    businessName: byId.get(comment.projectId)?.businessName ?? comment.authorName,
    kind: 'customer' as const,
    lastMessage: toPreview(comment.body),
    receivedAt: comment.createdAt.toISOString(),
    awaitingReply: true,
  }));
}
