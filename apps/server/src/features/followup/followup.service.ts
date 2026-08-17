import { createHmac, timingSafeEqual } from 'node:crypto';
import type { EmailService } from '../../infrastructure/email/email.service.js';
import { describeError, redactEmail, type Logger } from '../../lib/logger.js';
import { buildFollowUpEmail } from './followup.email.js';
import type { FollowUpRepository } from './followup.repository.js';
import { ruleFor, type FollowUpCandidate } from './followup.types.js';

/**
 * How far back a run looks.
 *
 * Fourteen days, against a longest rule of ten. The margin is what makes a missed run
 * recoverable: a scheduler that is down for three days resumes and still finds everybody it
 * owed, rather than silently skipping a cohort forever. Widening it costs one indexed query
 * and buys nothing else — the rule table decides who is actually emailed.
 */
const LOOKBACK_DAYS = 14;

/**
 * How many accounts one run will look at.
 *
 * A ceiling rather than a page size — there is no second page and no cursor, because the
 * next run is tomorrow and the lookback window above is four days wider than the longest
 * rule. An overflowing cohort is therefore caught on the following day rather than lost.
 *
 * Five hundred, which at this business's volume is roughly a year of signups arriving at
 * once. If it is ever genuinely reached, the honest fix is a cursor, not a bigger number —
 * and the log line says `considered`, which is what makes reaching it visible.
 */
export const FOLLOWUP_BATCH = 500;

export interface FollowUpService {
  /**
   * One scheduled pass. Returns how many were sent, for the log.
   *
   * Never throws on a single failed send: one unreachable address must not stop the other
   * forty. It throws only if the candidate query itself fails, which is a real outage.
   */
  run(): Promise<number>;
  /** Signs an address into an unsubscribe link. */
  unsubscribeUrl(email: string): string;
  /**
   * Honours a click. **Returns true whether or not the address was already suppressed** —
   * the page says the same thing either way, because "you were already unsubscribed" is a
   * distinction nobody wants and telling somebody their second click did nothing reads as a
   * failure.
   */
  unsubscribe(email: string, token: string): Promise<boolean>;
  /** Whether an address may receive non-transactional mail. Used by the digest too. */
  isSuppressed(email: string): Promise<boolean>;
}

export interface FollowUpServiceDependencies {
  readonly repository: FollowUpRepository;
  /**
   * Everybody who signed up in the window, already carrying the two booleans.
   *
   * A closure rather than four repositories, and the reason is the one `ConversationService`
   * gives about `LeadRepository`: this feature decides *when to email somebody*, and giving
   * it the auth, lead, project and assessment repositories would put account mutation one
   * autocomplete away from a scheduled job that runs unattended at four in the morning.
   *
   * The composition itself lives in `app.ts`, beside the other one that answers the same
   * question for the console's accounts list — which is what 6.3.3 means by not writing a
   * second `hasRequested`.
   */
  readonly findCandidates: (since: Date) => Promise<readonly FollowUpCandidate[]>;
  readonly emailService: EmailService;
  /**
   * Where links point. The public site origin, without a trailing slash.
   */
  readonly siteUrl: string;
  /**
   * Signs unsubscribe links. See the note on `sign` below for why this is not the cron
   * secret and not optional.
   */
  readonly unsubscribeSecret: string;
  /** Where a reply to a follow-up lands. Undefined uses the transactional sender. */
  readonly ownerAddress?: string | undefined;
  readonly logger: Logger;
  readonly now?: () => Date;
}

export function createFollowUpService(dependencies: FollowUpServiceDependencies): FollowUpService {
  const { repository, findCandidates, emailService, siteUrl, logger } = dependencies;
  const now = dependencies.now ?? (() => new Date());

  /*
   * ==========================================================================
   * WHY THE UNSUBSCRIBE LINK IS SIGNED
   * ==========================================================================
   *
   * The obvious link is `/unsubscribe?email=someone@example.com`, and it lets anybody on the
   * internet unsubscribe anybody else by typing an address into a URL bar. That is not a
   * data breach and it is worse than it sounds: the victim never finds out, and what they
   * experience is a supplier who stopped writing.
   *
   * So the address is accompanied by an HMAC of itself. The link is still one click with no
   * sign-in — which is the point of an unsubscribe link — but it can only have come from an
   * email we sent to that address.
   *
   * `timingSafeEqual` on the comparison, for the reason `notification.routes.ts` gives at
   * greater length: this specific route is not a realistic timing target, and a credential
   * comparison written the fast way is the one somebody copies next time.
   */
  function sign(email: string): string {
    return createHmac('sha256', dependencies.unsubscribeSecret)
      .update(email.toLowerCase())
      .digest('base64url');
  }

  function tokenMatches(email: string, presented: string): boolean {
    const expected = Buffer.from(sign(email));
    const given = Buffer.from(presented);
    if (expected.length !== given.length) return false;
    return timingSafeEqual(expected, given);
  }

  return {
    unsubscribeUrl(email) {
      const address = email.toLowerCase();
      return `${siteUrl}/api/unsubscribe?email=${encodeURIComponent(address)}&token=${sign(address)}`;
    },

    async unsubscribe(email, token) {
      const address = email.trim().toLowerCase();
      if (!tokenMatches(address, token)) {
        logger.warn('followup.unsubscribe_rejected', { email: redactEmail(address) });
        return false;
      }

      await repository.suppress(address, 'unsubscribed', now());
      logger.info('followup.unsubscribed', { email: redactEmail(address) });
      return true;
    },

    isSuppressed: (email) => repository.isSuppressed(email.trim().toLowerCase()),

    async run() {
      const since = new Date(now().getTime() - LOOKBACK_DAYS * 86_400_000);
      const candidates = await findCandidates(since);

      if (candidates.length === 0) {
        logger.info('followup.run_completed', { considered: 0, sent: 0 });
        return 0;
      }

      /*
       * Two batched reads for the whole cohort, not two per person. The suppression list is
       * checked here rather than inside the loop for the same reason, and checking it at all
       * is what makes this feature legal to run: an address that has said stop is filtered
       * before a rule is even chosen for it.
       */
      const [sentByUser, suppressed] = await Promise.all([
        repository.sentRulesFor(candidates.map((candidate) => candidate.userId)),
        repository.suppressed(candidates.map((candidate) => candidate.email.toLowerCase())),
      ]);

      const at = now();
      let sent = 0;

      for (const candidate of candidates) {
        if (suppressed.has(candidate.email.toLowerCase())) continue;

        const rule = ruleFor({
          candidate,
          alreadySent: sentByUser.get(candidate.userId) ?? new Set(),
          now: at,
        });
        if (!rule) continue;

        /*
         * Claim, then send. A claim that loses the race means another invocation is already
         * dealing with this one — see the note on the unique index — and is silently skipped
         * rather than logged as a failure, because on an overlapping run it is the expected
         * outcome for most of the batch.
         */
        if (!(await repository.claimSend(candidate.userId, rule.key, at))) continue;

        try {
          await emailService.send(
            buildFollowUpEmail({
              to: { email: candidate.email, name: candidate.name },
              rule,
              actionUrl: `${siteUrl}${rule.action.path}`,
              unsubscribeUrl: this.unsubscribeUrl(candidate.email),
              ...(dependencies.ownerAddress ? { replyTo: dependencies.ownerAddress } : {}),
            }),
          );
          sent += 1;
        } catch (error) {
          /*
           * The claim is released so the next run may try again. That is the one place this
           * feature accepts a duplicate risk: if the send actually succeeded and only the
           * acknowledgement failed, somebody gets it twice. A message sent twice is a worse
           * outcome than one not sent — but a *silent permanent* skip caused by a transient
           * network error is worse than both, and this is the only failure mode where the
           * three can be told apart afterwards from a log.
           */
          await repository.releaseSend(candidate.userId, rule.key).catch(() => undefined);
          logger.error('followup.send_failed', {
            rule: rule.key,
            email: redactEmail(candidate.email),
            ...describeError(error),
          });
        }
      }

      logger.info('followup.run_completed', { considered: candidates.length, sent });
      return sent;
    },
  };
}
