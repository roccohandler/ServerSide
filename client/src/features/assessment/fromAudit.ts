import type { ScorecardCategory } from '../../types/content';
import type { AssessmentAnswer, AssessmentCategory, AssessmentRequest } from '../../types/api';
import { ASSESSMENT_CATEGORIES } from '../../types/api';
import type { CategoryScore, ScoreMap } from '../public/playbook/useWebsiteScore';

/*
 * ============================================================================
 * FROM THE PUBLIC AUDIT TO A STORED ASSESSMENT
 * ============================================================================
 *
 * The audit asks twenty questions on a three-point scale. The stored assessment holds
 * six themes on a five-point one. This is the translation, and it lives here — in the
 * assessment feature — rather than in either the audit or the server, because it is the
 * one piece of knowledge that belongs to both and to neither.
 *
 * ## Why the two vocabularies differ at all
 *
 * They are for different readers. The twenty categories are the *work list*: each one is
 * a specific, checkable thing about a website, and a business owner needs that
 * granularity to act. The six themes are what a conversation is had about — "your site
 * is slow and hard to use on a phone" — and what a stored record should still make sense
 * as in a year, after the twenty have been revised.
 *
 * Collapsing twenty into six loses detail on purpose. The full answers are not lost: the
 * audit keeps them in the browser, and the rendered summary goes to the owner as a lead.
 *
 * ## The mapping is exhaustive by construction
 *
 * `THEME_BY_CATEGORY` has an entry per audit category, and `assessmentCategoriesAreMapped`
 * below is what a test asserts so a twenty-first category cannot be added without
 * deciding which theme it belongs to. An unmapped category would otherwise be silently
 * dropped from the score, which is the failure mode that looks like nothing at all.
 * ============================================================================
 */

/** Which of the six themes each of the audit's twenty categories reports into. */
const THEME_BY_CATEGORY: Readonly<Record<string, AssessmentCategory>> = {
  /* Being found at all. */
  'local-relevance': 'visibility',
  'search-intent': 'visibility',
  'service-pages': 'visibility',
  'message-match': 'visibility',

  /* Understanding what this business does, quickly. */
  clarity: 'clarity',
  'first-screen': 'clarity',
  hierarchy: 'clarity',
  navigation: 'clarity',

  /* How fast it is. */
  speed: 'speed',
  measurement: 'speed',
  'continuous-improvement': 'speed',

  /* Whether it works on the device most visitors are holding. */
  mobile: 'mobile',
  accessibility: 'mobile',
  colour: 'mobile',

  /* Whether it looks like a real business. */
  trust: 'trust',
  proof: 'trust',
  expectations: 'trust',

  /* Whether getting in touch is easy. */
  cta: 'conversion',
  forms: 'conversion',
  friction: 'conversion',
};

/** The audit scores 0–2; the assessment stores 0–4. Doubling is exact, not a rescale. */
const SCALE = 2;

/**
 * Every audit category maps to a theme, and every theme is a real one.
 *
 * Exported so a test can assert it against the live category list — see the note above
 * about what an unmapped category would silently do.
 */
export function assessmentCategoriesAreMapped(categories: readonly ScorecardCategory[]): {
  readonly unmapped: readonly string[];
  readonly unknownThemes: readonly string[];
} {
  const themes = new Set<string>(ASSESSMENT_CATEGORIES);

  return {
    unmapped: categories
      .filter((category) => THEME_BY_CATEGORY[category.id] === undefined)
      .map((category) => category.id),
    unknownThemes: Object.entries(THEME_BY_CATEGORY)
      .filter(([, theme]) => !themes.has(theme))
      .map(([id]) => id),
  };
}

export interface AuditDraftInput {
  readonly businessName: string;
  readonly websiteUrl?: string | undefined;
  readonly trade?: string | undefined;
  readonly scores: ScoreMap;
  readonly categories: readonly ScorecardCategory[];
}

/**
 * Builds the submission from whatever the audit has been answered with.
 *
 * Unanswered categories are omitted rather than scored zero. A blank is "they did not
 * say", and treating it as "not at all" would publish a number about somebody's website
 * that they never claimed — on the one page whose credibility rests on being sober about
 * exactly that.
 */
export function assessmentFromAudit(input: AuditDraftInput): AssessmentRequest | null {
  const answers: AssessmentAnswer[] = [];

  for (const category of input.categories) {
    const score = input.scores[category.id] as CategoryScore | undefined;
    if (score === undefined) continue;

    const theme = THEME_BY_CATEGORY[category.id];
    if (!theme) continue;

    answers.push({ questionId: category.id, category: theme, value: score * SCALE });
  }

  if (answers.length === 0) return null;

  return {
    businessName: input.businessName,
    answers,
    ...(input.websiteUrl ? { websiteUrl: input.websiteUrl } : {}),
    ...(input.trade ? { trade: input.trade } : {}),
  };
}
