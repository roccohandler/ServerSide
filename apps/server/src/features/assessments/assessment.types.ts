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
} as const;

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
  readonly createdAt: Date;
  readonly updatedAt: Date;
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
}

export function toAssessmentView(assessment: StoredAssessment): AssessmentView {
  return {
    id: assessment.id,
    businessName: assessment.businessName,
    websiteUrl: assessment.websiteUrl,
    score: assessment.score,
    band: assessment.band,
    weakestCategories: assessment.weakestCategories,
    recommendations: assessment.recommendations,
    submittedAt: assessment.submittedAt.toISOString(),
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
