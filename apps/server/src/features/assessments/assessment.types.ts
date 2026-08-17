/*
 * ============================================================================
 * THE FREE ASSESSMENT
 * ============================================================================
 *
 * The top of the funnel. Somebody answers twenty questions about their website, gets a
 * score and five findings, and — at the point of *keeping* the result — creates an
 * account.
 *
 * ## Why the account is asked for at the end and not the start
 *
 * Because the assessment is the thing being given away. A signup wall in front of it
 * asks somebody to pay before they have seen anything, and the honest version of that
 * page is "give us your email and we will tell you if your website is bad". Asking at
 * submission asks for something in exchange for something.
 *
 * The mechanical consequence is that answers exist before an owner does. They are held
 * in the browser until submission and posted with it, which means:
 *
 *   - An abandoned assessment costs nothing and stores nothing.
 *   - The answers survive a signup, a sign-in, and a "you already have an account"
 *     detour, because they never left the tab.
 *   - Nothing anonymous is ever written to the database, so there is no orphan sweep to
 *     run and no anonymous record that could later be claimed by the wrong person.
 *
 * The server owns scoring. The browser sends answers; a score it also sent would be a
 * number a visitor could type, and this one ends up in a sales conversation.
 * ============================================================================
 */

/**
 * The twenty checks, grouped. Mirrors the client's audit categories — the client owns
 * the wording a visitor reads, this owns the identity of each check and its weight.
 */
export const ASSESSMENT_CATEGORIES = [
  'speed',
  'mobile',
  'clarity',
  'trust',
  'conversion',
  'visibility',
] as const;

export type AssessmentCategory = (typeof ASSESSMENT_CATEGORIES)[number];

/** Answers are a 0–4 scale: 0 is "not at all", 4 is "completely". */
export const ANSWER_MIN = 0;
export const ANSWER_MAX = 4;

export const ASSESSMENT_STATUSES = ['submitted'] as const;

export type AssessmentStatus = (typeof ASSESSMENT_STATUSES)[number];

export const ASSESSMENT_FIELD_LIMITS = {
  questionId: 60,
  businessName: 200,
  websiteUrl: 2048,
  trade: 60,
  note: 2000,
  /** Twenty questions today; the cap is what stops a request storing a thousand. */
  answers: 60,
  reportSummary: 4000,
  findingTitle: 200,
  findingDetail: 2000,
  reportRecommendation: 1000,
  preparedBy: 100,
  /** Enough for a thorough review; not enough to be a document store. */
  findings: 20,
  reportRecommendations: 20,
} as const;

/*
 * ============================================================================
 * THE OWNER'S REVIEW
 * ============================================================================
 *
 * Everything above this line is the *self-scored* result: twenty answers, a number, and
 * the generic advice attached to whichever categories came out weakest. It is honest and
 * it is automatic, and it is not what the call to action promises.
 *
 * What "Get my free website assessment" promises is that somebody looks at the website.
 * That thing had no representation in this system at all — it happened in an inbox, and
 * the portal showed the machine's score as though it were the deliverable.
 *
 * ## Draft and delivered are different states, and only one is visible
 *
 * A half-written review is worse than no review. `deliveredAt` is the whole distinction:
 * absent means the owner is still working, and the customer's page says a review is being
 * prepared; present means it has been published, notified and written into the activity
 * stream, and it never becomes invisible again.
 *
 * That is why delivery is a separate operation rather than a field on the save. Saving is
 * something an operator does eight times; publishing is something they do once and cannot
 * take back, and the two should not share a button.
 * ============================================================================
 */

/**
 * How much a finding matters, worst first.
 *
 * Three values rather than a number, because a severity a reader has to interpret is one
 * they will interpret differently from the person who set it. These map to three words a
 * business owner already understands.
 */
export const ASSESSMENT_FINDING_SEVERITIES = ['critical', 'important', 'minor'] as const;

export type AssessmentFindingSeverity = (typeof ASSESSMENT_FINDING_SEVERITIES)[number];

export interface AssessmentFinding {
  readonly title: string;
  readonly detail: string;
  readonly severity: AssessmentFindingSeverity;
}

/**
 * The review itself.
 *
 * `preparedBy` is a name rather than a user id, and deliberately: it is a byline the
 * customer reads, not a foreign key anything resolves. Storing the id would mean the
 * review's attribution changes if that account is renamed, which is the wrong behaviour
 * for a document that was sent on a date.
 */
export interface AssessmentReport {
  readonly summary: string;
  readonly findings: readonly AssessmentFinding[];
  readonly recommendations: readonly string[];
  readonly preparedBy: string;
  /** Absent while it is a draft. Its presence is the publication. */
  readonly deliveredAt?: Date | undefined;
}

/** What the console may save. `deliveredAt` is absent by construction — see `deliver`. */
export interface AssessmentReportDraft {
  readonly summary: string;
  readonly findings: readonly AssessmentFinding[];
  readonly recommendations: readonly string[];
  readonly preparedBy: string;
}

export interface AssessmentAnswer {
  readonly questionId: string;
  readonly category: AssessmentCategory;
  readonly value: number;
}

/** What the browser posts at submission, after validation. */
export interface AssessmentSubmission {
  readonly businessName: string;
  readonly websiteUrl?: string | undefined;
  readonly trade?: string | undefined;
  readonly answers: readonly AssessmentAnswer[];
  readonly note?: string | undefined;
}

/**
 * A score out of 100 and the categories that dragged it down.
 *
 * Computed on the server, from the answers, every time. Storing it is a convenience for
 * reading; recomputing it is what makes it true.
 */
export interface AssessmentResult {
  readonly score: number;
  readonly band: 'strong' | 'workable' | 'costing-you';
  /** Worst first. What the follow-up conversation is actually about. */
  readonly weakestCategories: readonly AssessmentCategory[];
  readonly recommendations: readonly string[];
}

export interface NewAssessmentRecord extends AssessmentSubmission {
  readonly userId: string;
  readonly status: AssessmentStatus;
  readonly score: number;
  readonly band: AssessmentResult['band'];
  readonly weakestCategories: readonly AssessmentCategory[];
  readonly recommendations: readonly string[];
  readonly submittedAt: Date;
}

export interface StoredAssessment extends NewAssessmentRecord {
  readonly id: string;
  /** The owner's review, once somebody has started writing one. */
  readonly report?: AssessmentReport | undefined;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/** A delivered review, as the customer receives it. Dates are strings by then. */
export interface AssessmentReportView {
  readonly summary: string;
  readonly findings: readonly AssessmentFinding[];
  readonly recommendations: readonly string[];
  readonly preparedBy: string;
  readonly deliveredAt: string;
}

export interface AssessmentView {
  readonly id: string;
  readonly businessName: string;
  readonly websiteUrl?: string | undefined;
  readonly score: number;
  readonly band: AssessmentResult['band'];
  readonly weakestCategories: readonly AssessmentCategory[];
  readonly recommendations: readonly string[];
  readonly submittedAt: string;
  /**
   * Present only once delivered.
   *
   * A draft is deliberately unrepresentable here — not hidden behind a flag the client is
   * asked to respect, but absent from the payload, so the only way a half-written review
   * could reach a customer is if somebody published it.
   */
  readonly report?: AssessmentReportView | undefined;
}

export function toAssessmentView(assessment: StoredAssessment): AssessmentView {
  const delivered = assessment.report?.deliveredAt;

  return {
    id: assessment.id,
    businessName: assessment.businessName,
    websiteUrl: assessment.websiteUrl,
    score: assessment.score,
    band: assessment.band,
    weakestCategories: assessment.weakestCategories,
    recommendations: assessment.recommendations,
    submittedAt: assessment.submittedAt.toISOString(),
    ...(assessment.report && delivered
      ? {
          report: {
            summary: assessment.report.summary,
            findings: assessment.report.findings,
            recommendations: assessment.report.recommendations,
            preparedBy: assessment.report.preparedBy,
            deliveredAt: delivered.toISOString(),
          },
        }
      : {}),
  };
}

/**
 * What the console sees: everything the customer sees, plus the draft and who it is for.
 *
 * A separate function rather than a flag on the one above, for the reason
 * `toCustomerProjectView` gives about itself — the two audiences are built field by field
 * so that a field added to storage is invisible to both until somebody decides otherwise.
 */
export interface AdminAssessmentView extends AssessmentView {
  readonly userId: string;
  readonly trade?: string | undefined;
  readonly note?: string | undefined;
  /** The report in whatever state it is in, draft included. */
  readonly draft?: AssessmentReportView | undefined;
  readonly delivered: boolean;
}

export function toAdminAssessmentView(assessment: StoredAssessment): AdminAssessmentView {
  const { report } = assessment;

  return {
    ...toAssessmentView(assessment),
    userId: assessment.userId,
    trade: assessment.trade,
    note: assessment.note,
    ...(report
      ? {
          draft: {
            summary: report.summary,
            findings: report.findings,
            recommendations: report.recommendations,
            preparedBy: report.preparedBy,
            deliveredAt: report.deliveredAt?.toISOString() ?? '',
          },
        }
      : {}),
    delivered: report?.deliveredAt !== undefined,
  };
}

/** What each category is called when it appears in a recommendation. */
const CATEGORY_ADVICE: Readonly<Record<AssessmentCategory, string>> = {
  speed:
    'Your website is slow enough to be losing visitors before they see anything. This is usually the cheapest thing to fix and the one that pays back fastest.',
  mobile:
    'Most people looking for a local service business are on a phone. Anything awkward on a small screen costs you calls from the majority of your visitors.',
  clarity:
    'A visitor should know what you do, where you do it, and what to do next, within a few seconds of arriving.',
  trust:
    'Real photographs, real reviews and a real address are what separate you from the sites people bounce off.',
  conversion:
    'Getting in touch has to be obvious and easy from every page — a phone number that dials and a form that is short enough to finish.',
  visibility:
    'A page per service and per area is how people searching for the work you want actually find you.',
};

const WEIGHT_PER_ANSWER = ANSWER_MAX;

/**
 * Scores an assessment.
 *
 * Deliberately simple and deliberately here rather than in the browser: the score is a
 * claim made to a prospective customer, and one the browser computed is one anybody can
 * set to 12 before asking for a discount.
 */
export function scoreAssessment(answers: readonly AssessmentAnswer[]): AssessmentResult {
  if (answers.length === 0) {
    return { score: 0, band: 'costing-you', weakestCategories: [], recommendations: [] };
  }

  const total = answers.reduce((sum, answer) => sum + answer.value, 0);
  const score = Math.round((total / (answers.length * WEIGHT_PER_ANSWER)) * 100);

  const byCategory = new Map<AssessmentCategory, { sum: number; count: number }>();
  for (const answer of answers) {
    const entry = byCategory.get(answer.category) ?? { sum: 0, count: 0 };
    entry.sum += answer.value;
    entry.count += 1;
    byCategory.set(answer.category, entry);
  }

  const weakestCategories = [...byCategory.entries()]
    .map(([category, entry]) => ({ category, average: entry.sum / entry.count }))
    .sort((a, b) => a.average - b.average)
    // Only categories that are actually weak. A site scoring well everywhere should not
    // be handed three "weakest areas" it does not have.
    .filter((entry) => entry.average < WEIGHT_PER_ANSWER * 0.75)
    .slice(0, 3)
    .map((entry) => entry.category);

  return {
    score,
    band: score >= 75 ? 'strong' : score >= 50 ? 'workable' : 'costing-you',
    weakestCategories,
    recommendations: weakestCategories.map((category) => CATEGORY_ADVICE[category]),
  };
}
