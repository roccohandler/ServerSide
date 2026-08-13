import { useCallback, useMemo, useState } from 'react';
import { playbook } from '../../content/playbook';
import { isTradeSlug, type TradeSlug } from '../../config/trades';
import type { ScorecardBand, ScorecardCategory } from '../../types/content';
import {
  bandFor,
  WEAKEST_COUNT,
  type CategoryScore,
  type ScoreMap,
  type WeakCategory,
} from '../playbook/useWebsiteScore';

/*
 * ============================================================================
 * AUDIT STATE — TRADE, TWENTY SCORES, AND THE VISITOR'S OWN NUMBERS
 * ============================================================================
 *
 * The scoring rules are not reimplemented here. `bandFor`, `WEAKEST_COUNT`, `CategoryScore`
 * and `ScoreMap` all come from `features/playbook/useWebsiteScore`, and the twenty
 * categories come from `playbook.scorecard.categories`, so the audit and the PlayBook's
 * self-assessment can never drift into scoring the same site differently.
 *
 * ## Why the storage is separate
 *
 * `useWebsiteScore` persists to `serviceside.playbook.score.v1`, and the copy rendered
 * beside it promises those answers never leave the browser. That promise is kept. This
 * hook writes to its own key, holds more than scores, and belongs to a surface whose
 * consent line says plainly that sending the audit transmits all of it.
 *
 * Sharing the key would have been tempting — somebody who scored their site on the
 * PlayBook would not have to score it again — and it is exactly the wrong trade: it would
 * silently move answers given under one promise into a form governed by another.
 *
 * ## Why the funnel numbers are `number | null` rather than strings
 *
 * Because "I don't know" is a first-class answer for every one of them, and it has to be
 * distinguishable from zero. A business with no analytics genuinely does not know how
 * many visitors it gets; a business with a broken form genuinely gets zero enquiries.
 * Those are different facts and the scenario treats them differently — `null` suppresses
 * a line, `0` computes with it.
 * ============================================================================
 */

const STORAGE_KEY = 'serviceside.audit.v1';

/** How many extra enquiries a month the scenario models until the visitor moves it. */
const DEFAULT_LEVER = 2;

/** The ceiling on the lever. Not a cap on ambition — a cap on arithmetic that reads as a promise. */
export const MAX_LEVER = 10;

export interface FunnelInputs {
  readonly visitors: number | null;
  readonly enquiries: number | null;
  /** Percentage, 0 to 100. */
  readonly closeRate: number | null;
  readonly jobValue: number | null;
}

/*
 * The key type is exported; a `FUNNEL_FIELDS` array beside it was not — it had no
 * consumers. `AuditFunnel` renders the four inputs explicitly because each one has its own
 * label, hint and suffix, so iterating a list of keys would have bought nothing and cost a
 * lookup per field.
 */
export type FunnelField = keyof FunnelInputs;

/**
 * The computed scenario.
 *
 * Every field is nullable, and that is the design: a visitor who knows their job value
 * but not their traffic gets the lines that arithmetic supports and none of the ones it
 * does not. Filling a gap with an assumed figure would be inventing the visitor's
 * business for them.
 */
export interface Scenario {
  readonly enquiryRate: number | null;
  readonly customers: number | null;
  readonly currentValue: number | null;
  readonly additionalCustomers: number | null;
  readonly additionalValue: number | null;
  readonly additionalValueAnnual: number | null;
  /** False when not enough was entered for any of it to mean anything. */
  readonly hasAnything: boolean;
}

interface StoredAudit {
  readonly trade: TradeSlug | null;
  readonly scores: ScoreMap;
  readonly funnel: FunnelInputs;
  readonly lever: number;
}

const EMPTY_FUNNEL: FunnelInputs = {
  visitors: null,
  enquiries: null,
  closeRate: null,
  jobValue: null,
};

function isCategoryScore(value: unknown): value is CategoryScore {
  return value === 0 || value === 1 || value === 2;
}

/** A finite, non-negative number, or `null`. Anything else in storage is discarded. */
function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

/**
 * The one funnel field with a natural ceiling.
 *
 * `closeRate` is a percentage, and nothing was stopping somebody typing 500 into it. The
 * arithmetic downstream is `enquiries * (closeRate / 100)`, so that produced five times as
 * many customers as enquiries — an impossible number, on the one page whose entire
 * credibility rests on the arithmetic being sober. A sceptical owner testing whether the
 * calculator is honest is exactly the person who would try it.
 *
 * Clamped rather than rejected: 100 is the largest truthful answer, and throwing away what
 * they typed would lose the rest of their input to a typo. Applied here, in the hook that
 * owns the model, for the same reason `setLever` clamps here — including on the way out of
 * storage, which is user-writable and survives deploys.
 */
function clampFunnel(field: FunnelField, value: number | null): number | null {
  if (value === null) return null;
  return field === 'closeRate' ? Math.min(value, 100) : value;
}

/**
 * Reads persisted state, discarding anything unrecognised rather than trusting it.
 *
 * Storage is user-writable and survives deploys, so a category renamed in a later release
 * or a hand-edited blob must not be able to poison the total or the scenario.
 */
function readStored(categoryIds: ReadonlySet<string>): StoredAudit {
  const empty: StoredAudit = {
    trade: null,
    scores: {},
    funnel: EMPTY_FUNNEL,
    lever: DEFAULT_LEVER,
  };

  if (typeof window === 'undefined') return empty;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return empty;

    const record = parsed as Record<string, unknown>;

    const scores: Record<string, CategoryScore> = {};
    const storedScores = record['scores'];
    if (typeof storedScores === 'object' && storedScores !== null && !Array.isArray(storedScores)) {
      for (const [id, value] of Object.entries(storedScores)) {
        if (categoryIds.has(id) && isCategoryScore(value)) scores[id] = value;
      }
    }

    const storedFunnel = record['funnel'];
    const funnel: FunnelInputs =
      typeof storedFunnel === 'object' && storedFunnel !== null && !Array.isArray(storedFunnel)
        ? {
            visitors: readNumber((storedFunnel as Record<string, unknown>)['visitors']),
            enquiries: readNumber((storedFunnel as Record<string, unknown>)['enquiries']),
            closeRate: clampFunnel(
              'closeRate',
              readNumber((storedFunnel as Record<string, unknown>)['closeRate']),
            ),
            jobValue: readNumber((storedFunnel as Record<string, unknown>)['jobValue']),
          }
        : EMPTY_FUNNEL;

    const storedLever = readNumber(record['lever']);

    return {
      trade: isTradeSlug(record['trade']) ? record['trade'] : null,
      scores,
      funnel,
      lever: storedLever === null ? DEFAULT_LEVER : Math.min(storedLever, MAX_LEVER),
    };
  } catch {
    // Private browsing, a quota error, or corrupt JSON. An empty audit is a perfectly
    // good starting state; throwing here would take the page down with it.
    return empty;
  }
}

export interface UseAuditResult {
  readonly trade: TradeSlug | null;
  readonly scores: ScoreMap;
  readonly funnel: FunnelInputs;
  readonly lever: number;
  readonly total: number;
  readonly maxTotal: number;
  readonly answered: number;
  readonly categoryCount: number;
  readonly categories: readonly ScorecardCategory[];
  readonly isComplete: boolean;
  readonly hasStarted: boolean;
  readonly band: ScorecardBand | null;
  readonly weakest: readonly WeakCategory[];
  readonly scenario: Scenario;
  setTrade(trade: TradeSlug): void;
  setScore(categoryId: string, score: CategoryScore): void;
  setFunnelField(field: FunnelField, value: number | null): void;
  setLever(value: number): void;
  reset(): void;
}

/**
 * @param initialTrade
 *   A trade carried in from elsewhere — in practice `/audit?trade=roofing`, linked from
 *   the industry pages. It seeds step one *only when storage has none*, so somebody who
 *   has already answered the question is never silently overridden by a link they
 *   followed afterwards. Their own answer wins.
 */
export function useAudit(initialTrade: TradeSlug | null = null): UseAuditResult {
  const categories = playbook.scorecard.categories;

  const categoryIds = useMemo(
    () => new Set(categories.map((category) => category.id)),
    [categories],
  );

  /*
   * Read storage once, during the initial render, via a lazy initialiser. Safe because
   * the application mounts with `createRoot` rather than `hydrateRoot` — there is no
   * server markup for a storage-dependent first render to disagree with.
   */
  const [state, setState] = useState<StoredAudit>(() => {
    const stored = readStored(categoryIds);
    return stored.trade === null && initialTrade !== null
      ? { ...stored, trade: initialTrade }
      : stored;
  });

  /*
   * Persistence is a plain function called from the event handlers, not from inside a
   * setState updater. React may invoke an updater more than once, and a side effect in
   * there fires as many times as it does.
   */
  const persist = useCallback((next: StoredAudit) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage full or unavailable. The audit still works for this visit, which is the
      // part that matters; losing it on refresh is a smaller cost than a crash.
    }
  }, []);

  const update = useCallback(
    (change: (current: StoredAudit) => StoredAudit) => {
      setState((current) => {
        const next = change(current);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const setTrade = useCallback(
    (trade: TradeSlug) => update((current) => ({ ...current, trade })),
    [update],
  );

  const setScore = useCallback(
    (categoryId: string, score: CategoryScore) =>
      update((current) => ({ ...current, scores: { ...current.scores, [categoryId]: score } })),
    [update],
  );

  const setFunnelField = useCallback(
    (field: FunnelField, value: number | null) =>
      update((current) => ({
        ...current,
        funnel: { ...current.funnel, [field]: clampFunnel(field, value) },
      })),
    [update],
  );

  const setLever = useCallback(
    (value: number) =>
      update((current) => ({
        ...current,
        lever: Math.max(0, Math.min(Math.round(value), MAX_LEVER)),
      })),
    [update],
  );

  const reset = useCallback(() => {
    setState({ trade: null, scores: {}, funnel: EMPTY_FUNNEL, lever: DEFAULT_LEVER });
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // The in-memory state is already cleared, which is what the visitor asked for.
    }
  }, []);

  const answered = Object.keys(state.scores).length;
  const isComplete = answered === categories.length;

  const total = useMemo(
    () => Object.values(state.scores).reduce((sum: number, score) => sum + score, 0),
    [state.scores],
  );

  /*
   * The work list. Only produced once everything is scored: a partial assessment would
   * rank the categories somebody happened to answer first, which is worse than no answer
   * because it looks like one.
   */
  const weakest = useMemo(() => {
    if (!isComplete) return [];

    const order = new Map(categories.map((category, index) => [category.id, index]));

    return categories
      .map((category) => ({ category, score: state.scores[category.id] as CategoryScore }))
      .filter((entry) => entry.score < 2)
      .sort((a, b) => {
        if (a.score !== b.score) return a.score - b.score;
        return (order.get(a.category.id) ?? 0) - (order.get(b.category.id) ?? 0);
      })
      .slice(0, WEAKEST_COUNT);
  }, [categories, isComplete, state.scores]);

  /*
   * The scenario. Every line is computed only where the inputs for it exist, so a visitor
   * who answered two of the four questions gets two lines rather than four with two of
   * them invented.
   */
  const scenario = useMemo<Scenario>(() => {
    const { visitors, enquiries, closeRate, jobValue } = state.funnel;

    const enquiryRate =
      visitors !== null && visitors > 0 && enquiries !== null ? (enquiries / visitors) * 100 : null;

    const customers =
      enquiries !== null && closeRate !== null ? enquiries * (closeRate / 100) : null;

    const currentValue = customers !== null && jobValue !== null ? customers * jobValue : null;

    const additionalCustomers = closeRate !== null ? state.lever * (closeRate / 100) : null;

    const additionalValue =
      additionalCustomers !== null && jobValue !== null ? additionalCustomers * jobValue : null;

    return {
      enquiryRate,
      customers,
      currentValue,
      additionalCustomers,
      additionalValue,
      additionalValueAnnual: additionalValue === null ? null : additionalValue * 12,
      hasAnything:
        enquiryRate !== null ||
        customers !== null ||
        currentValue !== null ||
        additionalValue !== null,
    };
  }, [state.funnel, state.lever]);

  return {
    trade: state.trade,
    scores: state.scores,
    funnel: state.funnel,
    lever: state.lever,
    total,
    maxTotal: categories.length * 2,
    answered,
    categoryCount: categories.length,
    categories,
    isComplete,
    hasStarted: answered > 0 || state.trade !== null,
    band: isComplete ? bandFor(total) : null,
    weakest,
    scenario,
    setTrade,
    setScore,
    setFunnelField,
    setLever,
    reset,
  };
}
