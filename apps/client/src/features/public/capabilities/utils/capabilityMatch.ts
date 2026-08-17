import type { ServiceModel, Trade, TradeSlug } from '../../../../config/trades';
import type {
  Capability,
  CapabilityAvailability,
  CapabilityCategory,
} from '../../../../types/content';

/*
 * ============================================================================
 * MATCHING CAPABILITIES TO A BUSINESS
 * ============================================================================
 *
 * Every rule about which capabilities suit which business, in one module, as pure
 * functions.
 *
 * ## Why it is not in the components
 *
 * The obvious place to put "show these ones for a roofer" is the component doing the
 * showing, and that is how a recommendation engine ends up existing in four slightly
 * different versions — one in the explorer, one on the industry page, one in the summary
 * card, one in whatever gets built next. They then disagree, and the disagreement is
 * invisible because each looks right on its own screen.
 *
 * So: the rules live here, the components render what they are handed, and
 * `capabilityMatch.test.ts` tests the rules without rendering anything.
 *
 * ## Why nothing here imports the library
 *
 * Every function takes the capabilities it works on as an argument. That is not ceremony —
 * it buys two specific things:
 *
 *   1. **The tests can use fixtures.** A test for "a trade with no matches falls back to
 *      the universal set" needs a capability list with no matches in it. If this module read
 *      `content/capabilities.ts` directly, that test could only be written by editing real
 *      content, and it would start passing or failing for reasons that have nothing to do
 *      with the logic.
 *   2. **It cannot drag the library into an eager chunk.** `content/capabilities.ts` is a
 *      lazy route's content. A module that imported it and was itself imported by something
 *      eager would put the whole library in the chunk every visitor downloads — the exact
 *      failure documented at the bottom of `content/index.ts`. Taking data as a parameter
 *      makes that impossible rather than merely unlikely.
 * ============================================================================
 */

/* ------------------------------------------------------------------ tier predicates */

/*
 * The three booleans the capability shape was first sketched with — `isCore`,
 * `isRecommended`, `isOptional` — as functions of the one `tier` field.
 *
 * Same vocabulary a reader of the original spec would expect, no possibility of an entry
 * being in two groups or in none. See the note on `CapabilityTier` in `types/content.ts`.
 */

/** Part of the foundation: in every build or every plan month. */
export const isCore = (capability: Capability): boolean => capability.tier === 'foundation';

/** Worth putting in front of a business that matches it. */
export const isRecommended = (capability: Capability): boolean => capability.tier === 'recommended';

/** Further out: bigger, later, or dependent on something they may not have. */
export const isOptional = (capability: Capability): boolean => capability.tier === 'advanced';

/**
 * Whether a reader could actually act on this today.
 *
 * Derived from `availability` rather than stored, because "can I buy it" and "how do I get
 * it" are the same fact asked two ways, and storing both is how they come to disagree.
 */
export const isAvailableToday = (capability: Capability): boolean =>
  capability.availability === 'included-build' ||
  capability.availability === 'included-partner' ||
  capability.availability === 'additional-scope';

/** Already paid for by the build or the plan — nothing extra to decide. */
export const isAlreadyIncluded = (capability: Capability): boolean =>
  capability.availability === 'included-build' || capability.availability === 'included-partner';

/* ------------------------------------------------------------------ matching */

/**
 * Does this capability apply to this trade?
 *
 * `'every'` is an explicit value rather than an empty array, so a capability that applies
 * universally says so and one whose list was never filled in matches nothing — which is
 * visible, unlike the reverse.
 */
export function matchesIndustry(capability: Capability, trade: TradeSlug): boolean {
  return capability.industries === 'every' || capability.industries.includes(trade);
}

/** Does this capability apply to any of the ways this business's work is bought? */
export function matchesServiceModel(
  capability: Capability,
  models: readonly ServiceModel[],
): boolean {
  return (
    capability.serviceModels === 'every' ||
    capability.serviceModels.some((model) => models.includes(model))
  );
}

/**
 * How strongly a capability fits a trade. Higher is a better fit.
 *
 * ## The weighting, and why it is shaped this way
 *
 * A capability named for the trade is a deliberate editorial decision — somebody wrote
 * `industries: ['moving', 'photography']` on purpose — so it scores highest. A capability
 * matching the trade's **primary** service model scores next: how the work is bought
 * predicts what a website needs far better than the trade label does, which is why
 * `Trade.serviceModels` is ordered and the first entry counts for more.
 *
 * `'every'` scores lowest deliberately. Universal capabilities are not less important — most
 * of the foundation is universal — but they are not *recommendations*, because they are true
 * of everybody. They reach the reader through the foundation group, which is not ranked.
 *
 * The numbers are ordinal, not measurements. They exist to sort a list, and they are not
 * shown to anybody.
 */
export function fitScore(capability: Capability, trade: Trade): number {
  let score = 0;

  if (capability.industries !== 'every' && capability.industries.includes(trade.slug)) {
    score += 4;
  }

  if (capability.serviceModels !== 'every') {
    const [primary] = trade.serviceModels;
    if (primary !== undefined && capability.serviceModels.includes(primary)) score += 3;
    else if (matchesServiceModel(capability, trade.serviceModels)) score += 2;
  }

  /*
   * A small nudge toward things somebody can actually do something about today. Without it,
   * an aspiration and a purchasable capability with identical tags sort arbitrarily, and the
   * arbitrary order is stable enough to look intentional.
   */
  if (isAvailableToday(capability)) score += 1;

  return score;
}

/* ------------------------------------------------------------------ recommendations */

export interface RecommendationResult {
  /** The trade the recommendation was made for, resolved. */
  readonly trade: Trade;
  /** Foundation capabilities, in library order. Not ranked — everybody gets all of them. */
  readonly foundation: readonly Capability[];
  /** Recommended capabilities that match this trade, best fit first. */
  readonly recommended: readonly Capability[];
  /** Advanced capabilities that match this trade, best fit first. */
  readonly advanced: readonly Capability[];
  /**
   * True when nothing in the library was written for this trade specifically, so the
   * recommendation is the universal set.
   *
   * The presentation layer is expected to say so rather than pass a generic list off as
   * personalisation — `capabilities.test.ts` asserts the copy for it exists. This is the
   * graceful-degradation path, and making it a flag rather than an empty list means the
   * caller cannot fail to notice it.
   */
  readonly isGeneric: boolean;
}

/**
 * The recommendation for one trade.
 *
 * Foundation is never filtered by trade: it is what every build and every plan month
 * includes, and hiding part of it from a cleaner because a tag was missing would be a
 * capability library lying about the offer.
 *
 * Everything else is filtered on industry **or** service model — not both. Requiring both
 * would empty the list for any trade whose entries were tagged one way and not the other,
 * and an empty recommendation is indistinguishable to a reader from having nothing to offer
 * them.
 */
export function recommendFor(
  capabilities: readonly Capability[],
  trade: Trade,
): RecommendationResult {
  const foundation = capabilities.filter(isCore);

  const relevant = capabilities.filter(
    (capability) =>
      !isCore(capability) &&
      (matchesIndustry(capability, trade.slug) ||
        matchesServiceModel(capability, trade.serviceModels)),
  );

  const ranked = [...relevant].sort((a, b) => {
    const difference = fitScore(b, trade) - fitScore(a, trade);
    /*
     * Library order breaks every tie, so the same trade always produces the same order.
     * `Array.prototype.sort` is stable in every engine this ships to, but relying on that
     * for the *primary* ordering would make the output depend on where an entry happens to
     * sit in the file, which is not a decision anybody made.
     */
    if (difference !== 0) return difference;
    return capabilities.indexOf(a) - capabilities.indexOf(b);
  });

  /*
   * "Generic" means nothing was written for this trade by name. It is checked against the
   * whole library rather than against `ranked`, because a trade can match plenty of entries
   * through its service models while having nothing chosen for it specifically — and that is
   * exactly the case the reader deserves to be told about.
   */
  const isGeneric = !capabilities.some(
    (capability) => capability.industries !== 'every' && capability.industries.includes(trade.slug),
  );

  return {
    trade,
    foundation,
    recommended: ranked.filter(isRecommended),
    advanced: ranked.filter(isOptional),
    isGeneric,
  };
}

/* ------------------------------------------------------------------ filtering */

/*
 * Two fields, and there was a third.
 *
 * `trade: TradeSlug | null` was here, `filterCapabilities` honoured it, and it had its own
 * tests — and **nothing ever set it.** The explorer's trade chooser drives `recommendFor`,
 * which is strictly better for the job: it ranks by fit and reports `isGeneric` instead of
 * silently returning a shorter list. So the filter field was a second, worse way to do
 * something already done, kept alive by its own test suite.
 *
 * It also left a dead condition in the explorer's `isFiltered` check, which is how a knob
 * nobody turns starts affecting behaviour that does not depend on it.
 */
export interface CapabilityFilter {
  /** `null` means every category. */
  readonly category: CapabilityCategory | null;
  /** When true, drop everything that cannot be bought today. */
  readonly availableOnly: boolean;
}

export const emptyFilter: CapabilityFilter = {
  category: null,
  availableOnly: false,
};

/**
 * Applies a filter. Order is preserved: filtering is not ranking, and a reader who has
 * narrowed a list expects the remaining rows to be where they were.
 *
 * Applied uniformly to every tier, including the foundation. The explorer used to exempt the
 * foundation on the reasoning that hiding part of what somebody is already paying for would
 * contradict the offer — true of `availableOnly`, and the exemption was still the wrong
 * mechanism: **every foundation capability is `included-*`, so `availableOnly` cannot remove
 * one anyway.** The invariant is guaranteed by the data and asserted by a test
 * (`capabilityMatch.test.ts` → "a foundation that survives the availability filter
 * untouched"), which is where an invariant belongs. The exemption meanwhile made the category
 * filter not work on the foundation, and made the explorer's empty state unreachable.
 */
export function filterCapabilities(
  capabilities: readonly Capability[],
  filter: CapabilityFilter,
): readonly Capability[] {
  return capabilities.filter((capability) => {
    if (filter.category !== null && capability.category !== filter.category) return false;
    if (filter.availableOnly && !isAvailableToday(capability)) return false;
    return true;
  });
}

/*
 * `byCategory` and `byLifecycleStage` were here and are gone. Both were one-line filters
 * with no caller anywhere in the application — their only consumers were their own tests,
 * which is a function testing that `Array.prototype.filter` still works. Speculative surface
 * costs more than it looks: every export is a thing the next reader has to decide whether
 * they should be using.
 */

/** Everything that uses a given integration. The relation is stored once, on the
 * capability, and read back from this side rather than duplicated onto the integration. */
export function usingIntegration(
  capabilities: readonly Capability[],
  integrationId: string,
): readonly Capability[] {
  return capabilities.filter((capability) => capability.integrations.includes(integrationId));
}

/*
 * `groupByTier` and its `TierGroup` were here and are gone, for the same reason as the two
 * filters above: no caller. The reasoning in its docblock — that the foundation →
 * recommended → advanced order is the argument rather than the caller's choice — was worth
 * keeping, so it now lives on `CAPABILITY_TIERS` in `types/content.ts`, where the order is
 * actually declared. Bring the function back in the commit that needs it.
 */

/* ------------------------------------------------------------------ dependencies */

/**
 * The capabilities this one needs first, resolved and in dependency order.
 *
 * Unresolvable ids are **dropped rather than rendered**, which is the graceful-failure rule
 * for this whole layer: a dependency naming a capability that no longer exists is a content
 * bug worth failing a test over, and it must not also be a blank row in front of a customer.
 * `capabilities.test.ts` fails the build on one; this makes sure that if it ever ships
 * anyway, the page still reads correctly.
 *
 * The `seen` set makes a cycle terminate rather than overflow the stack. A cycle is also a
 * test failure — but the same reasoning applies: the guard catches it, this survives it.
 */
export function resolveDependencies(
  capabilities: readonly Capability[],
  capability: Capability,
  seen: ReadonlySet<string> = new Set(),
): readonly Capability[] {
  const byId = new Map(capabilities.map((entry) => [entry.id, entry]));
  const visited = new Set(seen);
  visited.add(capability.id);

  const chain: Capability[] = [];

  for (const id of capability.dependencies) {
    if (visited.has(id)) continue;
    const dependency = byId.get(id);
    if (dependency === undefined) continue;

    visited.add(id);
    for (const nested of resolveDependencies(capabilities, dependency, visited)) {
      if (!chain.some((entry) => entry.id === nested.id)) chain.push(nested);
    }
    if (!chain.some((entry) => entry.id === dependency.id)) chain.push(dependency);
  }

  return chain;
}

/* ------------------------------------------------------------------ counting */

export interface CapabilityCounts {
  readonly total: number;
  readonly includedInBuild: number;
  readonly includedInPartner: number;
  readonly extraScope: number;
  readonly notAvailable: number;
}

/**
 * A count per availability value, for the honesty summary the explorer opens with.
 *
 * Written as one pass over five named fields rather than a `Record<CapabilityAvailability,
 * number>` because the summary collapses `roadmap` and `not-offered` into one number — a
 * reader does not need those apart, and the two things they *do* need apart are "included"
 * and "would cost extra".
 */
export function countByAvailability(capabilities: readonly Capability[]): CapabilityCounts {
  const count = (value: CapabilityAvailability) =>
    capabilities.filter((capability) => capability.availability === value).length;

  return {
    total: capabilities.length,
    includedInBuild: count('included-build'),
    includedInPartner: count('included-partner'),
    extraScope: count('additional-scope'),
    notAvailable: count('roadmap') + count('not-offered'),
  };
}
