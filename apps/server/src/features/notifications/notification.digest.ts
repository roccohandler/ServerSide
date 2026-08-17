import mongoose, { Schema, type Model } from 'mongoose';
import type { EmailService } from '../../infrastructure/email/email.service.js';
import { describeError, type Logger } from '../../lib/logger.js';
import { escapeHtml } from '../../lib/html.js';
import { emailTheme as t } from '../../lib/emailTheme.js';
import type { DigestQueue } from './notification.service.js';
import { NOTIFICATION_KINDS, type NotificationKind } from './notification.types.js';

/*
 * ============================================================================
 * ONE EMAIL A DAY FOR EVERYTHING THAT IS NOT URGENT
 * ============================================================================
 *
 * DECISION 028.1 chose an immediate email on every account creation, and said so with its own
 * expiry date attached: *"At this volume every account is worth knowing about; if that stops
 * being true the answer is a digest, not a flag."* A public launch is that moment, and this is
 * that digest.
 *
 * ## Why the queue is a collection when almost nothing else here is
 *
 * `features/conversations` refused a collection and was right to: a conversation is a *view*
 * over records that already exist, so storing one would have been a second definition of
 * something already defined.
 *
 * A pending digest line is the opposite. It is not a view of anything — it is a message that has
 * been composed and not yet sent, and there is nowhere else in the system that fact lives. The
 * alternative is reconstructing the day's summary at send time by querying six features for
 * "things that happened since yesterday", which means six new time-range queries, six chances to
 * disagree with what the notifier would have said, and a digest that silently changes if a
 * record is edited after the fact.
 *
 * So: the line is written when the event happens, in the words the event chose, and the cron
 * reads and clears. What it stores is genuinely new information with a genuinely short life.
 *
 * ## Nothing here is a customer's data
 *
 * Every row is a message addressed to the owner. There is no per-recipient routing, no
 * preferences table and no subscription state — the digest has exactly one reader, and the day
 * it has two is the day this needs a `recipient` column and a different name.
 * ============================================================================
 */

/**
 * How long an unsent line survives.
 *
 * Seven days, enforced by a TTL index rather than by the cron, so a deployment whose scheduled
 * job is broken accumulates a week of rows and then stops rather than growing without bound.
 * That is the failure this guards against: a cron that silently stops firing is not obvious, and
 * the symptom without a TTL would be a collection nobody is watching.
 *
 * Seven rather than one, because the point of a bound is to survive an outage and still deliver.
 * A queue that dropped everything after 24 hours would turn one missed run into one lost day of
 * the owner's only summary.
 */
const PENDING_TTL_SECONDS = 7 * 24 * 60 * 60;

interface PendingDigestDocument {
  readonly kind: NotificationKind;
  readonly subject: string;
  readonly lines: readonly string[];
  readonly createdAt: Date;
}

const pendingDigestSchema = new Schema<PendingDigestDocument>(
  {
    kind: { type: String, required: true, enum: [...NOTIFICATION_KINDS] },
    subject: { type: String, required: true, maxlength: 200 },
    lines: { type: [String], required: true },
    /*
     * The TTL's anchor, and the reason it is declared here rather than left to `timestamps`.
     * `expires` on the field is what creates the index; a timestamp Mongoose manages would work
     * equally well as a date and not at all as an expiry.
     */
    createdAt: {
      type: Date,
      required: true,
      default: () => new Date(),
      expires: PENDING_TTL_SECONDS,
    },
  },
  { collection: 'pending_digest_entries' },
);

/* Existing model first, matching every other one here: hot reload must not redefine a compiled one. */
const PendingDigestModel: Model<PendingDigestDocument> =
  (mongoose.models['PendingDigestEntry'] as Model<PendingDigestDocument> | undefined) ??
  mongoose.model<PendingDigestDocument>('PendingDigestEntry', pendingDigestSchema);

export interface DigestService extends DigestQueue {
  /**
   * Sends one digest covering everything queued, and clears what it sent.
   *
   * Returns how many entries were included, so the caller can report it and so a scheduled run
   * that found nothing is distinguishable from one that failed.
   */
  sendPending(): Promise<number>;
}

export interface DigestServiceDependencies {
  readonly connect: () => Promise<unknown>;
  readonly emailService: EmailService;
  /** Undefined switches the digest off entirely rather than composing mail for nobody. */
  readonly ownerAddress: string | undefined;
  readonly siteUrl: string;
  /**
   * Whether an address has said stop. Optional, defaulting to "nobody has".
   *
   * The digest is the *other* non-transactional message this system sends — a summary
   * somebody asked for, which is exactly the kind a person is entitled to end. Wiring the
   * same suppression list `features/followup` owns is what makes "one unsubscribe, honoured
   * everywhere" true rather than a sentence in a document; a second list would be a second
   * answer to whether we may write to somebody.
   *
   * A closure rather than the repository, so this feature gains no knowledge of how
   * suppression is stored, and optional so the existing digest tests keep their shape.
   */
  readonly isSuppressed?: ((email: string) => Promise<boolean>) | undefined;
  readonly logger: Logger;
}

export function createDigestService(dependencies: DigestServiceDependencies): DigestService {
  const { connect, emailService, ownerAddress, siteUrl, logger } = dependencies;
  const isSuppressed = dependencies.isSuppressed ?? (async () => false);

  return {
    async enqueue(entry) {
      await connect();
      await PendingDigestModel.create({
        kind: entry.kind,
        subject: entry.subject,
        lines: [...entry.lines],
        createdAt: new Date(),
      });
    },

    async sendPending() {
      if (!ownerAddress) {
        logger.info('digest.skipped_no_address');
        return 0;
      }

      /*
       * Checked before the queue is read, not after. Draining rows for somebody who has said
       * stop would delete a day of entries into an email nobody sends — the same "read, send,
       * then delete" argument below, arriving one step earlier.
       */
      if (await isSuppressed(ownerAddress)) {
        logger.info('digest.skipped_suppressed');
        return 0;
      }

      await connect();

      /*
       * ==================================================================
       * READ, SEND, THEN DELETE — AND THE ORDER IS THE SAME ARGUMENT
       * ==================================================================
       *
       * `conversation.service.ts` sends a prospect reply *before* it marks the lead contacted,
       * on the grounds that the delivery is the asset and a failed mark must never eat a reply
       * that reached somebody. This is the same shape and the same conclusion: the rows are
       * deleted only after the send resolves, so a failure leaves them queued for tomorrow.
       *
       * The cost is the same too, and it is worth naming: a send that succeeds and a delete that
       * fails means one day's items appear twice. That is a duplicated summary in one inbox —
       * annoying and self-evident — against the alternative, which is a day of the owner's only
       * account of what happened vanishing silently. The noisy failure is the right one.
       *
       * Deleting by the ids read rather than by "everything" is what makes a row enqueued
       * *during* the send survive to the next run instead of being swallowed by it.
       */
      const pending = await PendingDigestModel.find({}).sort({ createdAt: 1 }).limit(500).lean();

      if (pending.length === 0) {
        /*
         * A silent day sends nothing. A daily email that says "nothing happened" is a daily
         * email that trains its own dismissal, and the one that matters then arrives in a
         * folder nobody opens.
         */
        logger.info('digest.nothing_pending');
        return 0;
      }

      const ids = pending.map((entry) => entry._id);

      await emailService.send(
        buildDigestEmail({
          recipient: ownerAddress,
          entries: pending.map((entry) => ({
            subject: entry.subject,
            lines: entry.lines,
          })),
          siteUrl,
        }),
      );

      try {
        await PendingDigestModel.deleteMany({ _id: { $in: ids } });
      } catch (error) {
        // Delivered but not cleared. Tomorrow's digest repeats today's — see the note above.
        logger.error('digest.clear_failed', { count: ids.length, ...describeError(error) });
      }

      logger.info('digest.sent', { count: pending.length });
      return pending.length;
    },
  };
}

/* ------------------------------------------------------------------- email */

/**
 * The day, in one message.
 *
 * Grouped by nothing and sorted oldest-first, deliberately. Grouping by kind would put five
 * headings above five one-line sections; the owner reads this to find out what happened, and
 * what happened has an order.
 */
function buildDigestEmail(params: {
  readonly recipient: string;
  readonly entries: readonly { readonly subject: string; readonly lines: readonly string[] }[];
  readonly siteUrl: string;
}) {
  const count = params.entries.length;

  const items = params.entries
    .map(
      (entry) =>
        `<li style="margin:0 0 14px"><strong>${escapeHtml(entry.subject)}</strong><br>${entry.lines
          .map((line) => escapeHtml(line))
          .join('<br>')}</li>`,
    )
    .join('');

  return {
    to: params.recipient,
    /*
     * The count in the subject, so the inbox itself says whether this one is worth opening. A
     * digest whose subject is always the same string is a digest that gets archived unread.
     */
    subject: `JobForge — ${String(count)} ${count === 1 ? 'update' : 'updates'}`,
    html: [
      `<div style="font-family:${t.font};line-height:1.6;color:${t.ink}">`,
      `<h2 style="margin:0 0 16px;font-size:20px;letter-spacing:-0.02em">What happened</h2>`,
      `<ul style="margin:0 0 20px;padding-left:18px">${items}</ul>`,
      `<p style="margin:0;color:${t.inkMuted}">Anything needing a reply is in the console inbox.</p>`,
      '</div>',
    ].join(''),
    text: [
      'What happened',
      '',
      ...params.entries.flatMap((entry) => [entry.subject, ...entry.lines, '']),
      'Anything needing a reply is in the console inbox.',
      params.siteUrl,
    ].join('\n'),
  };
}
