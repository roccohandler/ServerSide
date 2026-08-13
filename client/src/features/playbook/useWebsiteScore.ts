import { useCallback, useMemo, useState } from 'react';
import { playbook } from '../../content/playbook';
import type { ScorecardBand, ScorecardCategory } from '../../types/content';

/*
 * ============================================================================
 * THE 40-POINT SELF-ASSESSMENT
 * ============================================================================
 *
 * Twenty categories, scored 0, 1 or 2. The total is not the point — the five weakest
 * categories are, because that is a work list somebody can act on rather than a number
 * they can feel bad about.
 *
 * Scores live in `localStorage` and nowhere else. Nothing is sent anywhere, which is why
 * the privacy page does not need a word about it and why the copy can say so plainly. A
 * twenty-category assessment lost to an accidental refresh would be genuinely annoying,
 * and that is the whole reason persistence exists here.
 * ============================================================================
 */

const STORAGE_KEY = 'serviceside.playbook.score.v1';

/** 0, 1 or 2. Anything else in storage is discarded rather than trusted. */
export type CategoryScore = 0 | 1 | 2;

export type ScoreMap = Readonly<Record<string, CategoryScore>>;

export interface WeakCategory {
  readonly category: ScorecardCategory;
  readonly score: CategoryScore;
}

export interface UseWebsiteScoreResult {
  readonly scores: ScoreMap;
  /** Sum of everything scored so far. Meaningless until `isComplete`. */
  readonly total: number;
  readonly maxTotal: number;
  readonly answered: number;
  readonly categoryCount: number;
  readonly isComplete: boolean;
  readonly hasStarted: boolean;
  /** Resolved from the total once every category is scored. */
  readonly band: ScorecardBand | null;
  /** Weakest first, capped at five. Empty until complete, or if nothing scored below 2. */
  readonly weakest: readonly WeakCategory[];
  setScore(categoryId: string, score: CategoryScore): void;
  reset(): void;
}

/** How many categories the work list is capped at. Five is a week, twenty is a burden. */
export const WEAKEST_COUNT = 5;

function isCategoryScore(value: unknown): value is CategoryScore {
  return value === 0 || value === 1 || value === 2;
}

/**
 * Reads persisted scores, discarding anything that is not a known category with a valid
 * score. Storage is user-writable and survives deploys — a category renamed in a later
 * release must not be able to poison the total.
 */
function readStoredScores(categoryIds: ReadonlySet<string>): ScoreMap {
  if (typeof window === 'undefined') return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};

    const clean: Record<string, CategoryScore> = {};
    for (const [id, value] of Object.entries(parsed)) {
      if (categoryIds.has(id) && isCategoryScore(value)) clean[id] = value;
    }
    return clean;
  } catch {
    // Private browsing, a quota error, or corrupt JSON. An unscored assessment is a
    // perfectly good starting state; throwing here would take the page down with it.
    return {};
  }
}

export function bandFor(total: number): ScorecardBand | null {
  return playbook.scorecard.bands.find((band) => total >= band.min && total <= band.max) ?? null;
}

/**
 * All the assessment's state.
 *
 * Deliberately local to this feature. There is no shared client state anywhere in this
 * application and one self-assessment is not a reason to introduce a store.
 */
export function useWebsiteScore(): UseWebsiteScoreResult {
  const categories = playbook.scorecard.categories;

  const categoryIds = useMemo(
    () => new Set(categories.map((category) => category.id)),
    [categories],
  );

  /*
   * Read storage once, during the initial render, via a lazy initialiser.
   *
   * Safe here because the application mounts with `createRoot` rather than `hydrateRoot`.
   * The static HTML written by `build-seo.ts` is a shell with an empty `#root` — React
   * renders the whole tree client-side from scratch, so there is no server markup for a
   * storage-dependent first render to disagree with. Hydrating in an effect instead would
   * cost an extra render and a visible flash of an unscored assessment.
   */
  const [scores, setScores] = useState<ScoreMap>(() => readStoredScores(categoryIds));

  const persist = useCallback((next: ScoreMap) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage full or unavailable. The assessment still works for this visit, which is
      // the part that matters; losing it on refresh is a smaller cost than a crash.
    }
  }, []);

  const setScore = useCallback(
    (categoryId: string, score: CategoryScore) => {
      setScores((current) => {
        const next = { ...current, [categoryId]: score };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const reset = useCallback(() => {
    setScores({});
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing to do. The in-memory state is already cleared, which is what the visitor
      // asked for and what they can see.
    }
  }, []);

  const answered = Object.keys(scores).length;
  const isComplete = answered === categories.length;

  const total = useMemo(
    () => Object.values(scores).reduce((sum: number, score) => sum + score, 0),
    [scores],
  );

  /*
   * The work list. Only produced once everything is scored: a partial assessment would
   * rank the categories somebody happened to answer first, which is worse than no answer
   * because it looks like one.
   */
  const weakest = useMemo(() => {
    if (!isComplete) return [];

    return categories
      .map((category) => ({ category, score: scores[category.id] as CategoryScore }))
      .filter((entry) => entry.score < 2)
      .sort((a, b) => {
        if (a.score !== b.score) return a.score - b.score;
        // Stable tie-break on document order, so the list does not reshuffle on re-render.
        return categories.indexOf(a.category) - categories.indexOf(b.category);
      })
      .slice(0, WEAKEST_COUNT);
  }, [categories, isComplete, scores]);

  return {
    scores,
    total,
    maxTotal: categories.length * 2,
    answered,
    categoryCount: categories.length,
    isComplete,
    hasStarted: answered > 0,
    band: isComplete ? bandFor(total) : null,
    weakest,
    setScore,
    reset,
  };
}
