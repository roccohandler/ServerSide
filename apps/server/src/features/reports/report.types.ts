/*
 * ============================================================================
 * THE WEBSITE PERFORMANCE REPORT
 * ============================================================================
 *
 * Growth Partner's headline deliverable, and DECISION 015 calls it a *monthly operational
 * commitment*. Until this feature existed the system had no idea whether one had ever been
 * sent — which is the state a monthly commitment quietly stops in.
 *
 * ## What a report is, and what it is deliberately not
 *
 * It is a short, honest account of one month: how many enquiries the website produced, what
 * was changed, and what happens next. It is **not** an analytics dashboard. There is no chart,
 * no traffic figure, no bounce rate and no session count, and that is a product decision
 * rather than a scoping one — a plumber does not need a funnel visualisation, they need to
 * know whether the phone rang more this month than last and what we did about it.
 *
 * ## The one sentence this feature must never write
 *
 * "Your enquiries went up." Some months they will not, and the month they do not is exactly
 * the month the report is most worth reading. `changeExplanation` is a free-text field an
 * operator writes, and the copy around it — in the console editor and in the customer's view —
 * is careful for the same reason `BillingPage`'s existing wording is careful. Nothing in this
 * feature derives a percentage, a direction or a verdict from `enquiries` and `baseline`; the
 * two numbers are shown and a person explains them.
 *
 * ## Draft and published
 *
 * `publishedAt` is the state machine, exactly as `deliveredAt` is on an assessment review, and
 * for the same reason: a half-written report is worse than no report, and two fields that must
 * agree are two fields that eventually will not.
 * ============================================================================
 */

export const REPORT_FIELD_LIMITS = {
  /** `2026-08`. Fixed width, sortable as a string, and no timezone to get wrong. */
  month: 7,
  changeExplanation: 4000,
  line: 500,
  /** Enough for a thorough month; not enough to be a document store. */
  lines: 20,
  preparedBy: 100,
} as const;

/** `YYYY-MM`. The month a report covers, not the month it was written. */
export const REPORT_MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export interface NewReportRecord {
  readonly projectId: string;
  /** Whose portal it appears in. Denormalised so a customer's list is one query. */
  readonly userId: string;
  readonly month: string;
  /** Enquiries the website produced in this month. Counted by a person. */
  readonly enquiries: number;
  /**
   * What the month before the site launched looked like.
   *
   * Absent is a real state and the common one for the first few reports: a business that
   * had no website, or no way of counting, genuinely has no baseline, and inventing a zero
   * would turn "we do not know" into "you had none", which is a different claim.
   */
  readonly baseline?: number | undefined;
  readonly changeExplanation: string;
  readonly whatWeChanged: readonly string[];
  readonly whatIsNext: readonly string[];
  readonly preparedBy: string;
}

export interface StoredReport extends NewReportRecord {
  readonly id: string;
  /** Absent while it is a draft. Its presence is the publication. */
  readonly publishedAt?: Date | undefined;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/** What a customer sees. Only ever built from a *published* report — see the router. */
export interface ReportView {
  readonly id: string;
  readonly projectId: string;
  readonly month: string;
  /** `August 2026`. Built here so two frontends cannot disagree about it. */
  readonly monthLabel: string;
  readonly enquiries: number;
  readonly baseline?: number | undefined;
  readonly changeExplanation: string;
  readonly whatWeChanged: readonly string[];
  readonly whatIsNext: readonly string[];
  readonly preparedBy: string;
  readonly publishedAt: string;
}

/** Everything a customer sees, plus whether it is out yet. The console's shape. */
export interface AdminReportView extends Omit<ReportView, 'publishedAt'> {
  readonly userId: string;
  readonly published: boolean;
  readonly publishedAt?: string | undefined;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/**
 * `2026-08` → `August 2026`.
 *
 * Built from a table rather than from `Intl.DateTimeFormat`, and the reason is the one
 * `packages/ui/src/intl.test.ts` exists to enforce: a month name is being baked on a server
 * into a payload two frontends and an email will render, so there is no reader whose locale
 * could be asked. A named month is unambiguous in a way `08/2026` is not, and a hard-coded
 * `'en-US'` here would be the fixed locale that guard fails the build on.
 *
 * An unparseable month returns itself. It cannot happen — the schema and the model both pin
 * the shape — and returning the raw string is still better than throwing inside a mapper.
 */
export function monthLabel(month: string): string {
  const [year, index] = month.split('-');
  const name = MONTH_NAMES[Number(index) - 1];
  return name && year ? `${name} ${year}` : month;
}

export function toReportView(report: StoredReport & { publishedAt: Date }): ReportView {
  return {
    id: report.id,
    projectId: report.projectId,
    month: report.month,
    monthLabel: monthLabel(report.month),
    enquiries: report.enquiries,
    baseline: report.baseline,
    changeExplanation: report.changeExplanation,
    whatWeChanged: report.whatWeChanged,
    whatIsNext: report.whatIsNext,
    preparedBy: report.preparedBy,
    publishedAt: report.publishedAt.toISOString(),
  };
}

export function toAdminReportView(report: StoredReport): AdminReportView {
  return {
    id: report.id,
    projectId: report.projectId,
    userId: report.userId,
    month: report.month,
    monthLabel: monthLabel(report.month),
    enquiries: report.enquiries,
    baseline: report.baseline,
    changeExplanation: report.changeExplanation,
    whatWeChanged: report.whatWeChanged,
    whatIsNext: report.whatIsNext,
    preparedBy: report.preparedBy,
    published: report.publishedAt !== undefined,
    publishedAt: report.publishedAt?.toISOString(),
  };
}

/**
 * The month before this one, as a `YYYY-MM` string.
 *
 * Used by the overdue check. Written by hand rather than with `Date`, because constructing a
 * date to subtract a month from it is where "31 March minus one month is 3 March" comes from.
 */
export function previousMonth(month: string): string {
  const [yearPart, indexPart] = month.split('-');
  const year = Number(yearPart);
  const index = Number(indexPart);

  if (!Number.isInteger(year) || !Number.isInteger(index)) return month;

  return index === 1 ? `${year - 1}-12` : `${year}-${String(index - 1).padStart(2, '0')}`;
}

/** The `YYYY-MM` a date falls in, in UTC. The clock the server counts months by. */
export function monthOf(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}
