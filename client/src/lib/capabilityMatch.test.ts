import { describe, expect, it } from 'vitest';
import { trades } from '../config/trades';
import type { Trade } from '../config/trades';
import type { Capability, CapabilityAvailability, CapabilityTier } from '../types/content';
import { capabilities as realLibrary, capabilityCategories } from '../content/capabilities';
import {
  byCategory,
  byLifecycleStage,
  countByAvailability,
  emptyFilter,
  filterCapabilities,
  fitScore,
  groupByTier,
  isAlreadyIncluded,
  isAvailableToday,
  isCore,
  isOptional,
  isRecommended,
  matchesIndustry,
  matchesServiceModel,
  recommendFor,
  resolveDependencies,
  usingIntegration,
} from './capabilityMatch';

/*
 * ============================================================================
 * THE MATCHING RULES
 * ============================================================================
 *
 * Every test below except the last block runs on **fixtures**, not on the real library, and
 * that is the whole reason `capabilityMatch.ts` takes its data as an argument.
 *
 * The cases that matter most are the awkward ones: a trade with nothing written for it, a
 * dependency that does not resolve, a circular chain, a filter combination that matches
 * nothing. None of those exist in the real content — they must not — so a test suite reading
 * the real library could only cover the happy path, and would start failing for reasons that
 * have nothing to do with the logic the moment somebody edited a capability.
 *
 * The final block is the exception: a handful of assertions that the real library still
 * behaves sensibly through these functions, which is a different question from whether the
 * functions are correct.
 * ============================================================================
 */

/* ------------------------------------------------------------------ fixtures */

function stub(
  id: string,
  overrides: Partial<Capability> & { readonly tier?: CapabilityTier } = {},
): Capability {
  return {
    id,
    name: `Capability ${id}`,
    category: 'lead-conversion',
    tier: 'recommended',
    shortDescription: 'A short description.',
    businessOutcome: 'An outcome.',
    problemSolved: 'A problem.',
    howItWorks: ['One', 'Two', 'Three'],
    customerValue: 'Customer value.',
    businessValue: 'Business value.',
    recommendedFor: 'Somebody.',
    industries: 'every',
    serviceModels: 'every',
    lifecycle: ['decide'],
    owner: 'website',
    integrations: [],
    dependencies: [],
    maturity: 'established',
    availability: 'additional-scope',
    ...overrides,
  };
}

function trade(slug: Trade['slug'], models: Trade['serviceModels']): Trade {
  return {
    slug,
    label: `Trade ${slug}`,
    buyingContext: 'A context.',
    serviceModels: models,
    hasPage: false,
  };
}

const roofer = trade('roofing', ['project', 'consultative']);
const cleaner = trade('cleaning', ['recurring', 'scheduled']);

/* ------------------------------------------------------------------ tier predicates */

describe('the tier predicates', () => {
  it('put every capability in exactly one group', () => {
    /*
     * The property the single `tier` field exists to guarantee, and the reason it replaced
     * three booleans. With `isCore`, `isRecommended` and `isOptional` stored independently, an
     * entry could be in two groups or in none, and neither would throw — it would render
     * twice, or vanish.
     */
    for (const tier of ['foundation', 'recommended', 'advanced'] as const) {
      const capability = stub('x', { tier });
      const matches = [isCore, isRecommended, isOptional].filter((predicate) =>
        predicate(capability),
      );
      expect(matches.length, `tier "${tier}" matched ${String(matches.length)} predicates`).toBe(1);
    }
  });

  it('treats the three purchasable availabilities as available and the other two as not', () => {
    const cases: readonly (readonly [CapabilityAvailability, boolean])[] = [
      ['included-build', true],
      ['included-partner', true],
      ['additional-scope', true],
      ['roadmap', false],
      ['not-offered', false],
    ];

    for (const [availability, expected] of cases) {
      expect(isAvailableToday(stub('x', { availability })), availability).toBe(expected);
    }
  });

  it('counts only the two included availabilities as already paid for', () => {
    expect(isAlreadyIncluded(stub('a', { availability: 'included-build' }))).toBe(true);
    expect(isAlreadyIncluded(stub('b', { availability: 'included-partner' }))).toBe(true);
    /* Extra scope is available and is *not* included — the distinction the whole page rests
       on, and the one a reader would be misled by if these collapsed. */
    expect(isAlreadyIncluded(stub('c', { availability: 'additional-scope' }))).toBe(false);
  });
});

/* ------------------------------------------------------------------ matching */

describe('matching a capability to a business', () => {
  it("treats 'every' as universal and a list as a closed set", () => {
    expect(matchesIndustry(stub('a'), 'roofing')).toBe(true);
    expect(matchesIndustry(stub('b', { industries: ['roofing'] }), 'roofing')).toBe(true);
    expect(matchesIndustry(stub('c', { industries: ['roofing'] }), 'cleaning')).toBe(false);
  });

  it('matches an empty industry list against nothing at all', () => {
    /*
     * The reason `'every'` is an explicit value rather than an empty array meaning "all". A
     * capability whose list was started and never filled in matches nothing, which is visible
     * on the page. Under the empty-means-all convention it would match *everything*, which is
     * the same mistake and invisible.
     */
    expect(matchesIndustry(stub('a', { industries: [] }), 'roofing')).toBe(false);
  });

  it('matches on any overlapping service model, not all of them', () => {
    const capability = stub('a', { serviceModels: ['recurring', 'emergency'] });
    expect(matchesServiceModel(capability, ['recurring', 'scheduled'])).toBe(true);
    expect(matchesServiceModel(capability, ['project'])).toBe(false);
  });
});

describe('the fit score', () => {
  it('ranks a named trade above a matching service model', () => {
    const named = stub('named', { industries: ['roofing'], serviceModels: 'every' });
    const modelled = stub('modelled', { industries: 'every', serviceModels: ['project'] });

    expect(fitScore(named, roofer)).toBeGreaterThan(fitScore(modelled, roofer));
  });

  it("ranks the trade's primary service model above its secondary ones", () => {
    /*
     * `Trade.serviceModels` is ordered most-first, and the ordering is load-bearing: for a
     * roofer, something built for project work matters more than something built for the
     * consultative half of the same trade.
     */
    const primary = stub('primary', { serviceModels: ['project'] });
    const secondary = stub('secondary', { serviceModels: ['consultative'] });

    expect(fitScore(primary, roofer)).toBeGreaterThan(fitScore(secondary, roofer));
  });

  it('nudges something purchasable above an identical aspiration', () => {
    const buyable = stub('buyable', {
      industries: ['roofing'],
      availability: 'additional-scope',
    });
    const aspiration = stub('aspiration', { industries: ['roofing'], availability: 'roadmap' });

    expect(fitScore(buyable, roofer)).toBeGreaterThan(fitScore(aspiration, roofer));
  });

  it('scores a universal capability lowest, because it is not a recommendation', () => {
    const universal = stub('universal', { availability: 'roadmap' });
    expect(fitScore(universal, roofer)).toBe(0);
  });
});

/* ------------------------------------------------------------------ recommendations */

describe('recommending for a trade', () => {
  const library: readonly Capability[] = [
    stub('foundation-a', { tier: 'foundation', availability: 'included-build' }),
    stub('foundation-b', { tier: 'foundation', availability: 'included-partner' }),
    stub('for-roofers', { industries: ['roofing'] }),
    /*
     * Both axes narrowed, and that is the point of the fixture rather than an accident. The
     * first version left `serviceModels` at the stub default of `'every'`, so this "cleaners
     * only" entry matched a roofer through the service-model half of the OR — correct engine
     * behaviour, wrong fixture, and a useful reminder that a capability is excluded only when
     * *neither* axis matches.
     */
    stub('for-cleaners', { industries: ['cleaning'], serviceModels: ['recurring'] }),
    stub('for-projects', { serviceModels: ['project'] }),
    stub('advanced-roofing', { tier: 'advanced', industries: ['roofing'] }),
  ];

  it('gives every trade the whole foundation, unfiltered', () => {
    /*
     * Foundation is what every build and every plan month contains. Hiding part of it from a
     * cleaner because a tag was missing would be the library contradicting the offer, so it is
     * never filtered by trade — for either trade, all of it.
     */
    for (const entry of [roofer, cleaner]) {
      const result = recommendFor(library, entry);
      expect(result.foundation.map((c) => c.id)).toEqual(['foundation-a', 'foundation-b']);
    }
  });

  it('includes a capability matching on trade or on service model, not requiring both', () => {
    const result = recommendFor(library, roofer);
    const ids = result.recommended.map((capability) => capability.id);

    expect(ids).toContain('for-roofers');
    /* Matched only through `project`, with no industry tag naming roofing. */
    expect(ids).toContain('for-projects');
    expect(ids).not.toContain('for-cleaners');
  });

  it('ranks the trade-specific entry first', () => {
    const result = recommendFor(library, roofer);
    expect(result.recommended[0]?.id).toBe('for-roofers');
  });

  it('keeps advanced entries out of the recommended group', () => {
    const result = recommendFor(library, roofer);
    expect(result.recommended.map((c) => c.id)).not.toContain('advanced-roofing');
    expect(result.advanced.map((c) => c.id)).toContain('advanced-roofing');
  });

  /*
   * ==========================================================================
   * THE GRACEFUL PATH
   * ==========================================================================
   *
   * This is the case the whole fixture arrangement exists for. A trade with nothing written
   * for it must not silently receive a generic list dressed as personalisation — it must be
   * flagged, so the page can say so.
   * ==========================================================================
   */
  it('flags a recommendation as generic when nothing names the trade', () => {
    const unnamed = trade('photography', ['scheduled']);
    const result = recommendFor(library, unnamed);

    expect(result.isGeneric).toBe(true);
    /* Still useful rather than empty: the foundation is universal and is still returned. */
    expect(result.foundation.length).toBeGreaterThan(0);
  });

  it('does not call a recommendation generic just because the matches came from a model', () => {
    /*
     * `isGeneric` is checked against the whole library rather than against the matches. A
     * trade can match plenty through its service models while having nothing chosen for it by
     * name — and that reader still deserves to be told.
     */
    const modelOnly: readonly Capability[] = [stub('for-projects', { serviceModels: ['project'] })];
    const result = recommendFor(modelOnly, roofer);

    expect(result.recommended.map((c) => c.id)).toContain('for-projects');
    expect(result.isGeneric).toBe(true);
  });

  it('returns empty groups rather than throwing when nothing matches at all', () => {
    const result = recommendFor(
      [stub('for-cleaners', { industries: ['cleaning'], serviceModels: ['recurring'] })],
      roofer,
    );

    expect(result.recommended).toEqual([]);
    expect(result.advanced).toEqual([]);
    expect(result.foundation).toEqual([]);
    expect(result.isGeneric).toBe(true);
  });

  it('produces the same order every time for the same trade', () => {
    /*
     * Two entries with identical tags used to sort by wherever the engine felt like putting
     * them, and an arbitrary order is stable enough within one session to look deliberate.
     * Library position is the documented tie-break.
     */
    const tied: readonly Capability[] = [
      stub('first', { industries: ['roofing'] }),
      stub('second', { industries: ['roofing'] }),
    ];

    expect(recommendFor(tied, roofer).recommended.map((c) => c.id)).toEqual(['first', 'second']);
    expect(recommendFor(tied, roofer).recommended.map((c) => c.id)).toEqual(['first', 'second']);
  });
});

/* ------------------------------------------------------------------ filtering */

describe('filtering', () => {
  const library: readonly Capability[] = [
    stub('a', { category: 'payments', availability: 'included-build' }),
    stub('b', { category: 'payments', availability: 'roadmap' }),
    stub('c', { category: 'reputation', industries: ['roofing'] }),
    /* The only entry in its category, and unavailable — so "retention plus available only" is
       a combination the library genuinely has nothing for. */
    stub('d', { category: 'retention', availability: 'roadmap' }),
  ];

  it('returns everything under the empty filter', () => {
    expect(filterCapabilities(library, emptyFilter)).toHaveLength(4);
  });

  it('narrows by category', () => {
    const result = filterCapabilities(library, { ...emptyFilter, category: 'payments' });
    expect(result.map((c) => c.id)).toEqual(['a', 'b']);
  });

  it('drops what cannot be bought when asked to', () => {
    const result = filterCapabilities(library, { ...emptyFilter, availableOnly: true });
    expect(result.map((c) => c.id)).toEqual(['a', 'c']);
  });

  it('combines filters as an intersection', () => {
    const result = filterCapabilities(library, { category: 'payments', availableOnly: true });
    expect(result.map((c) => c.id)).toEqual(['a']);
  });

  it('returns nothing rather than widening when a combination matches nothing', () => {
    /*
     * The behaviour the explorer's empty state depends on. Silently relaxing a filter to avoid
     * an empty page would make the page pretend it can always help.
     */
    const result = filterCapabilities(library, { category: 'retention', availableOnly: true });
    expect(result).toEqual([]);
  });

  it('preserves order, because filtering is not ranking', () => {
    const result = filterCapabilities(library, { ...emptyFilter, availableOnly: true });
    expect(result.map((c) => c.id)).toEqual(['a', 'c']);
  });
});

describe('the other selectors', () => {
  const library: readonly Capability[] = [
    stub('a', { category: 'payments', lifecycle: ['pay'], integrations: ['stripe-client'] }),
    stub('b', { category: 'reputation', lifecycle: ['advocate', 'pay'], integrations: [] }),
  ];

  it('selects by category, lifecycle stage and integration', () => {
    expect(byCategory(library, 'payments').map((c) => c.id)).toEqual(['a']);
    expect(byLifecycleStage(library, 'pay').map((c) => c.id)).toEqual(['a', 'b']);
    expect(usingIntegration(library, 'stripe-client').map((c) => c.id)).toEqual(['a']);
    expect(usingIntegration(library, 'nothing-uses-this')).toEqual([]);
  });
});

/* ------------------------------------------------------------------ grouping */

describe('grouping by tier', () => {
  it('always orders foundation, then recommended, then advanced', () => {
    /*
     * The order is not the caller's choice because it is the argument: what you already have,
     * then what to decide about, then what is further off. Input order must not change it.
     */
    const shuffled: readonly Capability[] = [
      stub('c', { tier: 'advanced' }),
      stub('a', { tier: 'recommended' }),
      stub('b', { tier: 'foundation' }),
    ];

    expect(groupByTier(shuffled).map((group) => group.tier)).toEqual([
      'foundation',
      'recommended',
      'advanced',
    ]);
  });

  it('omits an empty group rather than rendering an empty heading', () => {
    const onlyAdvanced = [stub('a', { tier: 'advanced' })];
    expect(groupByTier(onlyAdvanced).map((group) => group.tier)).toEqual(['advanced']);
  });
});

/* ------------------------------------------------------------------ dependencies */

describe('resolving dependencies', () => {
  it('returns the chain deepest-first', () => {
    const library: readonly Capability[] = [
      stub('base'),
      stub('middle', { dependencies: ['base'] }),
      stub('top', { dependencies: ['middle'] }),
    ];

    const top = library.find((c) => c.id === 'top');
    expect(top).toBeDefined();
    expect(resolveDependencies(library, top!).map((c) => c.id)).toEqual(['base', 'middle']);
  });

  it('drops an id that does not resolve instead of rendering a blank', () => {
    /*
     * The graceful-failure rule for this layer. An unresolvable dependency is a content bug
     * that `capabilities.test.ts` fails the build over — and if one ever ships anyway, the row
     * must disappear rather than render an empty bullet to a customer.
     */
    const library: readonly Capability[] = [
      stub('top', { dependencies: ['gone', 'base'] }),
      stub('base'),
    ];
    const top = library[0];
    expect(top).toBeDefined();

    expect(resolveDependencies(library, top!).map((c) => c.id)).toEqual(['base']);
  });

  it('terminates on a cycle rather than overflowing the stack', () => {
    const library: readonly Capability[] = [
      stub('a', { dependencies: ['b'] }),
      stub('b', { dependencies: ['a'] }),
    ];
    const a = library[0];
    expect(a).toBeDefined();

    /* A cycle is also a test failure in `capabilities.test.ts`. This is the runtime net under
       it: the page still renders. */
    expect(() => resolveDependencies(library, a!)).not.toThrow();
    expect(resolveDependencies(library, a!).map((c) => c.id)).toEqual(['b']);
  });

  it('deduplicates a diamond', () => {
    const library: readonly Capability[] = [
      stub('base'),
      stub('left', { dependencies: ['base'] }),
      stub('right', { dependencies: ['base'] }),
      stub('top', { dependencies: ['left', 'right'] }),
    ];
    const top = library.find((c) => c.id === 'top');
    expect(top).toBeDefined();

    const ids = resolveDependencies(library, top!).map((c) => c.id);
    expect(ids.filter((id) => id === 'base')).toHaveLength(1);
  });
});

/* ------------------------------------------------------------------ counting */

describe('counting by availability', () => {
  it('collapses roadmap and not-offered into one unavailable number', () => {
    const library: readonly Capability[] = [
      stub('a', { availability: 'included-build' }),
      stub('b', { availability: 'included-partner' }),
      stub('c', { availability: 'additional-scope' }),
      stub('d', { availability: 'roadmap' }),
      stub('e', { availability: 'not-offered' }),
    ];

    expect(countByAvailability(library)).toEqual({
      total: 5,
      includedInBuild: 1,
      includedInPartner: 1,
      extraScope: 1,
      notAvailable: 2,
    });
  });

  it('counts an empty library as zero rather than throwing', () => {
    expect(countByAvailability([]).total).toBe(0);
  });
});

/* ------------------------------------------------------------------ the real library */

/*
 * A different question from everything above: not "are the rules right" but "does the real
 * content still behave sensibly through them". Kept small and structural on purpose — a test
 * here that asserted specific ids or counts would fail every time somebody wrote a capability,
 * which trains people to update tests rather than to read them.
 */
describe('the real library through these rules', () => {
  it('gives every trade with its own page a non-empty, non-generic recommendation', () => {
    for (const entry of [
      trade('hvac', ['emergency', 'scheduled']),
      trade('roofing', ['project', 'consultative']),
      trade('cleaning', ['recurring', 'scheduled']),
    ]) {
      const result = recommendFor(realLibrary, entry);
      expect(result.foundation.length, `${entry.slug}: foundation`).toBeGreaterThan(0);
      expect(
        result.recommended.length + result.advanced.length,
        `${entry.slug}: nothing recommended`,
      ).toBeGreaterThan(0);
    }
  });

  it('has a foundation that survives the availability filter untouched', () => {
    /*
     * Every foundation capability is included in a price, so "only show what I could buy
     * today" must never remove one. If this fails, either a foundation entry has become extra
     * scope or the tier and availability fields have drifted apart.
     */
    const foundation = realLibrary.filter(isCore);
    const filtered = filterCapabilities(foundation, { ...emptyFilter, availableOnly: true });

    expect(filtered).toHaveLength(foundation.length);
  });

  /*
   * ==========================================================================
   * THE EXPLORER HAS NO EMPTY STATE, AND THIS IS WHY IT DOES NOT NEED ONE
   * ==========================================================================
   *
   * One was written and could never render. Every foundation capability applies to every trade
   * (`industries: 'every'`) and is included in a price, so at least one card survives any
   * combination of the two controls the explorer offers.
   *
   * **If this test fails, `CapabilityExplorer` needs an empty state again.** That is the whole
   * point of it existing: the alternative was keeping an unreachable branch and two strings
   * nobody could read, which is dead code that looks like diligence.
   * ==========================================================================
   */
  it('cannot be filtered down to nothing, which is why the explorer omits an empty state', () => {
    for (const entry of trades) {
      const result = recommendFor(realLibrary, entry);
      const everything = [...result.foundation, ...result.recommended, ...result.advanced];

      for (const category of capabilityCategories) {
        const remaining = filterCapabilities(everything, {
          category: category.id,
          availableOnly: true,
        });

        expect(
          remaining.length,
          `${entry.slug} + ${category.id} + available-only is empty — the explorer now needs an empty state`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it('resolves every dependency chain in the real library without dropping anything', () => {
    /*
     * `resolveDependencies` drops unresolvable ids silently, which is right at runtime and
     * would hide a broken library. `capabilities.test.ts` asserts every id resolves; this
     * asserts the resolver actually returns them, which is the same fact from the other side.
     */
    for (const capability of realLibrary) {
      const resolved = resolveDependencies(realLibrary, capability);
      expect(
        resolved.length,
        `${capability.id} lost a dependency in resolution`,
      ).toBeGreaterThanOrEqual(capability.dependencies.length);
    }
  });
});
