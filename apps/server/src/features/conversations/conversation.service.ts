import { AppError } from '../../lib/appError.js';
import { describeError, redactEmail, type Logger } from '../../lib/logger.js';
import type { EmailService } from '../../infrastructure/email/email.service.js';
import type { StoredUser } from '../auth/index.js';
import { scopeOf, type FeedbackService, type StoredComment } from '../feedback/index.js';
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

/** The two fields an account-scoped reply needs in order to reach a person. */
export interface AccountContact {
  readonly email: string;
  readonly name: string;
}

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
  /**
   * Who an account-scoped message belongs to, by id.
   *
   * A closure rather than `AuthRepository`, for the reason the `leads` field above gives about
   * `LeadService`: this feature needs one address and one name, and handing it the credential
   * repository would put password and role operations one autocomplete away from the console's
   * reply path.
   *
   * **Required, not optional.** Every other port in this file defaults to a no-op and the last
   * one that did cost an afternoon: the test harness had never wired a notifier, so "we emailed
   * them" was the largest untested claim in the application and every assertion about it passed
   * by describing the gap. A missing lookup here would mean a customer with no project open is
   * answered into a screen nobody told them to look at.
   */
  readonly findAccount: (userId: string) => Promise<AccountContact | null>;
  readonly emailService: EmailService;
  /**
   * Where a prospect's reply is sent from, in effect: it is the `Reply-To` on the
   * outbound message and the address BCC'd on it. Undefined when no notification address
   * is configured, which makes replying to a prospect fail loudly rather than send mail
   * nobody can answer.
   */
  readonly ownerAddress: string | undefined;
  /**
   * Resolves the demonstration account, when there is one.
   *
   * A closure rather than a repository, and undefined when Demo Mode is off, so this feature
   * gains no new dependency and no knowledge of how a demo account is found. Its whole
   * promise is "everybody waiting on a reply", and a tester is not waiting.
   */
  readonly findDemoOwnerId?: (() => Promise<string | undefined>) | undefined;
  readonly logger: Logger;
}

export function createConversationService(
  dependencies: ConversationServiceDependencies,
): ConversationService {
  const { leads, feedback, projects, findAccount, emailService, ownerAddress, logger } =
    dependencies;
  const findDemoOwnerId = dependencies.findDemoOwnerId ?? (async () => undefined);

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
      const [awaitingLeads, awaitingComments, demoOwnerId] = await Promise.all([
        leads.listAwaitingReply(limit + 1),
        feedback.listAwaitingReply(limit + 1),
        findDemoOwnerId(),
      ]);

      const hasMore = awaitingLeads.length > limit || awaitingComments.length > limit;

      const summaries = [
        ...awaitingLeads.slice(0, limit).map(toProspectSummary),
        ...(await withBusinessNames(awaitingComments.slice(0, limit), projects, demoOwnerId)),
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

    const scope = scopeOf(comment);
    if (!scope) throw notFound();

    /*
     * Straight through to the feature that owns comments. It writes the reply, records
     * the activity entry the customer's timeline shows, and enforces the threading rule
     * a second time. Nothing about a reply is re-implemented here.
     *
     * The subject is loaded for one purpose: so the customer is emailed that they were
     * answered. This is the call site that most needed it — the inbox is where the owner
     * answers somebody who is *waiting*, and a reply sent from here used to reach the
     * customer's portal silently, on the one surface whose whole point is that a person on
     * the other end is expecting to hear something.
     *
     * A subject that cannot be resolved is not an error. `withBusinessNames` already handles
     * a comment whose project has gone by falling back to the person's own name; the same
     * tolerance applies here, and the reply is still written. What is lost is the email, which
     * is the right thing to lose when there is nobody left to name in it.
     */
    const subject = await subjectFor(scope);

    await feedback.addComment({
      scope,
      author: params.author,
      body: params.body,
      parentId: comment.id,
      ...(subject ? { subject } : {}),
    });

    logger.info('conversation.customer_replied', {
      scope: scope.kind,
      commentId: comment.id,
    });
  }

  /**
   * Where a reply goes, for either kind of thread.
   *
   * The two branches resolve different records and produce the same three fields, which is
   * what lets `replyToCustomer` above have one code path. An account thread has no business
   * name — that is the definition of the scope — so the person's own name is used, exactly as
   * a project thread does when its project has been deleted.
   */
  async function subjectFor(
    scope: NonNullable<ReturnType<typeof scopeOf>>,
  ): Promise<{ businessName: string; email: string; contactName: string } | null> {
    if (scope.kind === 'account') {
      const account = await findAccount(scope.userId);
      return account
        ? { businessName: account.name, email: account.email, contactName: account.name }
        : null;
    }

    const project = await projects.findById(scope.projectId);
    return project
      ? {
          businessName: project.businessName,
          email: project.email,
          contactName: project.contactName,
        }
      : null;
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
  demoOwnerId: string | undefined,
): Promise<readonly ConversationSummary[]> {
  if (comments.length === 0) return [];

  /*
   * Only the project-scoped rows need a lookup. An account-scoped message already carries the
   * two things a summary needs — who wrote it and what they said — because there is no third
   * record to join to. That is the scope, not a gap in it.
   */
  const projectIds = comments
    .map((comment) => scopeOf(comment))
    .filter((scope) => scope?.kind === 'project')
    .map((scope) => scope.projectId);

  const found =
    projectIds.length > 0 ? await projects.listByIds([...new Set(projectIds)]) : ([] as const);
  const byId = new Map<string, StoredProject>(found.map((project) => [project.id, project]));

  return (
    comments
      /*
       * The demonstration account is not waiting for a reply.
       *
       * This inbox's whole promise is "everybody waiting on a reply", and a tester poking at a
       * feedback thread on the demo project is not a person the owner owes an answer to. Left
       * in, the demo would put permanent rows at the top of the oldest-first list — which is
       * the position reserved for the customer who has been waiting longest.
       *
       * Both scopes are excluded, and the account scope is the cheaper of the two to check:
       * the message names its own account, so there is no project to resolve first.
       *
       * A comment whose project has gone is still kept, exactly as before: `byId.get` returning
       * nothing means the row survives with the person's own name, because dropping somebody
       * who is genuinely waiting is the failure this list must not have.
       */
      .filter((comment) => {
        if (!demoOwnerId) return true;
        const scope = scopeOf(comment);
        if (scope?.kind === 'account') return scope.userId !== demoOwnerId;
        return byId.get(scope?.projectId ?? '')?.ownerUserId !== demoOwnerId;
      })
      .map((comment) => {
        const scope = scopeOf(comment);
        const project = scope?.kind === 'project' ? byId.get(scope.projectId) : undefined;
        return {
          id: formatConversationId({ source: 'comment', recordId: comment.id }),
          personName: comment.authorName,
          businessName: project?.businessName ?? comment.authorName,
          kind: 'customer' as const,
          lastMessage: toPreview(comment.body),
          receivedAt: comment.createdAt.toISOString(),
          awaitingReply: true,
        };
      })
  );
}
