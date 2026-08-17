import { audit } from '../../../content/audit';
import { MESSAGE_MAX_LENGTH } from '../contact/contactValidation';
import { findTrade, type TradeSlug } from '../../../config/trades';
import type { ScorecardBand } from '../../../types/content';
import type { WeakCategory } from '../playbook/useWebsiteScore';
import type { FunnelInputs } from './useAudit';

/*
 * ============================================================================
 * RENDERING THE AUDIT INTO THE LEAD CONTRACT
 * ============================================================================
 *
 * The completed audit is submitted through the existing `POST /api/leads` endpoint, in
 * the existing optional `message` field. **No server file changes for this feature.**
 *
 * That is not a shortcut, it is the correct fit. `/api/leads` is the only endpoint that
 * already accepts a name, a business name, an email, a phone number, a website *and* a
 * free-text field; its Zod schema trims but deliberately does not collapse whitespace, so
 * the line breaks below survive; and `lead.email.ts` already flags the `Message` row
 * `multiline: true` and renders it through `escapeHtmlWithLineBreaks`, so the summary
 * reaches the owner's inbox as readable, escaped lines with no template work at all.
 *
 * The alternative — a structured `audit` sub-object — touches six server files, four
 * server test files, both halves of a hand-mirrored contract, and the published privacy
 * copy that enumerates exactly what is stored. It buys queryable data nobody has asked
 * for yet. When "average score by trade" becomes a question worth answering, that is the
 * moment to pay for it.
 *
 * ## The one hard constraint
 *
 * `message` is capped at 2000 characters in three independent places: the client
 * validator, the Zod schema and the Mongoose model. There is no server-side truncation —
 * an over-long body is a hard 400, not a silent trim. So this module budgets, and
 * `renderAuditSummary` is written to stay well inside the cap even with all five findings
 * and every funnel figure present.
 * ============================================================================
 */

/** Kept below `MESSAGE_MAX_LENGTH` so an unusually long category label cannot overflow. */
const SUMMARY_BUDGET = MESSAGE_MAX_LENGTH - 100;

export interface AuditSummaryInput {
  readonly trade: TradeSlug | null;
  readonly total: number;
  readonly maxTotal: number;
  /**
   * How many of the categories were actually scored, and how many there are.
   *
   * These are here because leaving them out published a lie. `total` is the sum of what
   * has been answered so far and is meaningless on its own — `useWebsiteScore` says so in
   * as many words — so a visitor who scored five categories at full marks and stopped was
   * emailed to the owner as **"Score: 10/40"**, indistinguishable from somebody who
   * answered all twenty and is failing badly. The on-screen diagnosis has always refused
   * to rank a partial score; the outbound email quietly did not.
   *
   * The send step is deliberately *not* gated on completeness — somebody who bailed at
   * question five and still wants a review is a lead worth having. The summary just has
   * to say which one it is.
   */
  readonly answered: number;
  readonly categoryCount: number;
  readonly band: ScorecardBand | null;
  readonly weakest: readonly WeakCategory[];
  readonly funnel: FunnelInputs;
  readonly lever: number;
}

function formatFunnel(funnel: FunnelInputs, lever: number): readonly string[] {
  const { notProvided } = audit.summary;

  const value = (input: number | null, suffix = '') =>
    input === null ? notProvided : `${input}${suffix}`;

  return [
    `Visitors/month: ${value(funnel.visitors)}`,
    `Enquiries/month: ${value(funnel.enquiries)}`,
    `Close rate: ${value(funnel.closeRate, '%')}`,
    `Average job value: ${value(funnel.jobValue)}`,
    `Modelled uplift: ${lever} more enquiries/month`,
  ];
}

/**
 * Renders a completed audit as plain text for the `message` field.
 *
 * Deliberately terse and label-prefixed rather than prose: this is read in an email
 * client by somebody deciding whether to open the site, and the first two lines have to
 * carry the trade and the score.
 *
 * The leading title line also does the cheapest possible job of provenance. Lead records
 * store a hard-coded `source` of `'website-contact-form'`, so without it an audit and a
 * contact-form enquiry are indistinguishable in the collection.
 */
export function renderAuditSummary(input: AuditSummaryInput): string {
  const { summary } = audit;
  const trade =
    input.trade === null ? summary.notProvided : (findTrade(input.trade)?.label ?? input.trade);

  const isComplete = input.answered >= input.categoryCount;

  const lines: string[] = [summary.title, `${summary.tradeLabel}: ${trade}`];

  /*
   * A partial score is reported as a partial score. Without the qualifier, five categories
   * answered at full marks reads in the inbox as "10/40" — the same figure as twenty
   * categories answered badly, and the owner triages on that number.
   */
  lines.push(
    isComplete
      ? `${summary.scoreLabel}: ${input.total}/${input.maxTotal}`
      : `${summary.scoreLabel}: ${summary.partial(input.answered, input.categoryCount)}`,
  );

  if (input.band) lines.push(`${summary.bandLabel}: ${input.band.title}`);

  if (input.weakest.length > 0) {
    lines.push('', `${summary.weakestLabel}:`);
    for (const { category, score } of input.weakest) {
      lines.push(`- ${category.label} (${score}/2)`);
    }
  }

  lines.push('', `${summary.funnelLabel}:`, ...formatFunnel(input.funnel, input.lever));

  const rendered = lines.join('\n');

  /*
   * Truncation is a last resort that should never fire — the longest possible audit is
   * comfortably inside the budget. It exists because the failure it prevents is a hard
   * 400 that the visitor would experience as "that did not send" after five minutes of
   * work, and a silently shortened summary is a far better outcome than a lost lead.
   */
  return rendered.length <= SUMMARY_BUDGET ? rendered : `${rendered.slice(0, SUMMARY_BUDGET)}\n…`;
}
