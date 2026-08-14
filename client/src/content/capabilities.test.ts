import { describe, expect, it } from 'vitest';
import { flagship, growthPartner } from '../config/pricing';
import { trades } from '../config/trades';
import { carePricing, systemComponents } from './offer';
import {
  availabilityLabels,
  capabilities,
  capabilityCategories,
  capabilityIntegrations,
  capabilityPage,
  capabilityTiers,
  findCapability,
  findIntegration,
  findLifecycleStage,
  lifecycleStages,
  maturityLabels,
  serviceModelLabels,
} from './capabilities';
import { isAlreadyIncluded, isAvailableToday } from '../lib/capabilityMatch';

/*
 * ============================================================================
 * GUARDS ON THE CAPABILITY LIBRARY
 * ============================================================================
 *
 * A library of forty entries describing what a business can do for you is the single easiest
 * place in this repository to start selling things that do not exist. Every guard below
 * protects one specific way that happens:
 *
 *   - An aspiration acquires an "included" badge because somebody edited one field.
 *   - An entry claims to be part of the offer and the offer never mentions it.
 *   - A dependency, integration or lifecycle id stops resolving and renders as a blank.
 *   - A trade is added to `config/trades.ts` and silently receives no recommendations.
 *   - A number appears in the copy, and there is no client data behind any number here.
 *
 * These are content guards, not tests of React. The rendering is covered by
 * `CapabilitiesPage.test.tsx` and the matching rules by `lib/capabilityMatch.test.ts`.
 * ============================================================================
 */

/** Every id an `offerAnchor` is allowed to point at, gathered from the offer itself. */
const offerAnchors = new Set<string>([
  ...systemComponents.map((component) => component.id),
  ...flagship.outcomes.map((outcome) => outcome.id),
  ...carePricing.plan.groups.map((group) => group.id),
]);

describe('the capability library', () => {
  it('gives every capability a unique id', () => {
    const ids = capabilities.map((capability) => capability.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('fills in every field a card renders, with real prose rather than a stub', () => {
    for (const capability of capabilities) {
      /*
       * Length floors rather than truthiness. A field containing "TBD" is truthy and is the
       * failure this is actually guarding against — every one of these is rendered to a
       * customer, and a three-word `businessOutcome` is a card that says nothing.
       */
      expect(capability.name.length, `${capability.id}: name`).toBeGreaterThan(8);
      expect(
        capability.shortDescription.length,
        `${capability.id}: shortDescription`,
      ).toBeGreaterThan(30);
      expect(
        capability.businessOutcome.length,
        `${capability.id}: businessOutcome`,
      ).toBeGreaterThan(30);
      expect(capability.problemSolved.length, `${capability.id}: problemSolved`).toBeGreaterThan(
        30,
      );
      expect(capability.customerValue.length, `${capability.id}: customerValue`).toBeGreaterThan(
        15,
      );
      expect(capability.businessValue.length, `${capability.id}: businessValue`).toBeGreaterThan(
        15,
      );
      expect(capability.recommendedFor.length, `${capability.id}: recommendedFor`).toBeGreaterThan(
        20,
      );

      /* Three steps minimum: two reads as a summary rather than as an explanation. */
      expect(capability.howItWorks.length, `${capability.id}: howItWorks`).toBeGreaterThanOrEqual(
        3,
      );
      for (const step of capability.howItWorks) {
        expect(step.length, `${capability.id}: a howItWorks step`).toBeGreaterThan(20);
      }

      /* A capability touching no stage cannot appear in the lifecycle at all. */
      expect(capability.lifecycle.length, `${capability.id}: lifecycle`).toBeGreaterThan(0);
    }
  });

  /*
   * ==========================================================================
   * THE HONESTY FIELDS
   * ==========================================================================
   *
   * These four are the load-bearing ones. Each protects a different way that a thing this
   * business does not do could come to look like a thing it does.
   * ==========================================================================
   */

  it('makes anything claiming to be included point at the offer that includes it', () => {
    for (const capability of capabilities) {
      if (!isAlreadyIncluded(capability)) {
        /*
         * The reverse direction matters as much. An `offerAnchor` on something that is *not*
         * included is a pointer that reads as an inclusion to the next person who edits this
         * file, so it is forbidden rather than merely unused.
         */
        expect(
          capability.offerAnchor,
          `${capability.id} is ${capability.availability} but carries an offerAnchor`,
        ).toBeUndefined();
        continue;
      }

      expect(
        capability.offerAnchor,
        `${capability.id} claims to be included and names no offer artefact`,
      ).toBeDefined();

      expect(
        offerAnchors.has(capability.offerAnchor ?? ''),
        `${capability.id} anchors to "${capability.offerAnchor ?? ''}", which is not a ` +
          `systemComponents, flagship.outcomes or carePricing group id`,
      ).toBe(true);
    }
  });

  it('reserves "done on every project" for work that is actually in a price', () => {
    /*
     * `standard` maturity and `included-*` availability are two different axes, and this is
     * the one combination that cannot be honest in isolation: something described as done on
     * every project, that nobody is paying for on any project, is a claim with no purchase
     * behind it.
     */
    for (const capability of capabilities) {
      if (capability.maturity !== 'standard') continue;
      expect(
        isAlreadyIncluded(capability),
        `${capability.id} says it is done on every project but is ${capability.availability}`,
      ).toBe(true);
    }
  });

  it('never lets something unavailable claim a settled implementation', () => {
    for (const capability of capabilities) {
      if (capability.availability !== 'roadmap' && capability.availability !== 'not-offered') {
        continue;
      }
      expect(
        ['new', 'exploratory'],
        `${capability.id} is ${capability.availability} yet claims ${capability.maturity} maturity`,
      ).toContain(capability.maturity);
    }
  });

  it('labels all five availability values and all four maturity values', () => {
    /*
     * `Record<Union, …>` already makes a missing key a compile error. What this adds is that
     * the *labels themselves* say something — a value labelled with an empty string, or with
     * a `meaning` too short to explain anything, compiles fine and renders a badge that
     * discloses nothing.
     */
    for (const [value, label] of Object.entries(availabilityLabels)) {
      expect(label.label.length, `${value}: label`).toBeGreaterThan(3);
      expect(label.meaning.length, `${value}: meaning`).toBeGreaterThan(40);
    }

    for (const [value, label] of Object.entries(maturityLabels)) {
      expect(label.length, `${value}: maturity label`).toBeGreaterThan(8);
    }

    /* Exactly the three that mean "you can get this" are marked purchasable. */
    const purchasable = Object.entries(availabilityLabels)
      .filter(([, label]) => label.purchasable)
      .map(([value]) => value)
      .sort();

    expect(purchasable).toEqual(['additional-scope', 'included-build', 'included-partner']);
  });

  it('says out loud that some of the library cannot be bought', () => {
    /*
     * The counts are derived and rendered, so they cannot go stale — but the *page* could
     * stop framing them. This asserts the honesty block still names all four statuses and
     * still says plainly that some of them are unavailable, which is the sentence that makes
     * the rest of the page readable rather than misleading.
     */
    expect(capabilityPage.honesty.keys.length).toBe(4);

    const framing = [capabilityPage.lede, capabilityPage.honesty.body].join(' ').toLowerCase();
    expect(framing).toContain('do not offer');

    const keys = capabilityPage.honesty.keys.join(' ').toLowerCase();
    expect(keys).toContain('cannot buy');

    /* And there genuinely is something in each of the four buckets, or the framing is a
       description of a page that no longer exists. */
    for (const availability of [
      'included-build',
      'included-partner',
      'additional-scope',
      'not-offered',
    ] as const) {
      expect(
        capabilities.some((capability) => capability.availability === availability),
        `nothing in the library is ${availability}, so the honesty block is describing a page that no longer exists`,
      ).toBe(true);
    }
  });

  /*
   * ==========================================================================
   * NO NUMBERS
   * ==========================================================================
   *
   * There is no client data behind any figure this page could print. The global currency
   * sweep in `content.test.ts` already catches money; this catches the subtler version —
   * a percentage, a multiple, or a count of results — which would read as evidence.
   *
   * Small integers written as words ("two revision rounds") are fine and are why this looks
   * for digits rather than for quantity.
   * ==========================================================================
   */
  it('quotes no figure, because there is no data behind one', () => {
    const strings = capabilities.flatMap((capability) => [
      capability.name,
      capability.shortDescription,
      capability.businessOutcome,
      capability.problemSolved,
      capability.customerValue,
      capability.businessValue,
      capability.recommendedFor,
      ...capability.howItWorks,
    ]);

    for (const text of strings) {
      expect(text, `a percentage in: ${text}`).not.toMatch(/\d+\s?%/);
      expect(text, `a multiple in: ${text}`).not.toMatch(/\b\d+x\b/i);
      expect(text, `a currency figure in: ${text}`).not.toMatch(/[$£€]\s?\d/);
    }
  });

  /*
   * ==========================================================================
   * THE WEBSITE'S REMIT
   * ==========================================================================
   *
   * `owner: 'business'` marks a capability that helps with something the website hands over
   * rather than does — asking for a review, taking a deposit, chasing an invoice. The risk is
   * that its copy quietly promotes it into a website outcome, which is the overclaim the
   * whole layer exists to avoid.
   *
   * The check is deliberately narrow: it looks for a sentence asserting the *website* does
   * the closing. A broad keyword ban would fail on honest sentences like "the website hands
   * over", which is the thing being encouraged.
   * ==========================================================================
   */
  it('never claims the website does the part the business does', () => {
    const OVERCLAIM =
      /\b(?:the |your )?(?:website|site|page)\s+(?:closes|books|wins|converts|collects|chases|retains)\b/i;

    for (const capability of capabilities) {
      if (capability.owner !== 'business') continue;

      const copy = [
        capability.businessOutcome,
        capability.customerValue,
        capability.businessValue,
        capability.shortDescription,
      ].join(' ');

      expect(
        OVERCLAIM.test(copy),
        `${capability.id} sells a business outcome as a website one`,
      ).toBe(false);
    }
  });

  /*
   * ==========================================================================
   * EVERY POINTER RESOLVES
   * ==========================================================================
   */

  it('resolves every integration, dependency and lifecycle id', () => {
    for (const capability of capabilities) {
      for (const id of capability.integrations) {
        expect(findIntegration(id), `${capability.id} names integration "${id}"`).toBeDefined();
      }

      for (const id of capability.dependencies) {
        expect(findCapability(id), `${capability.id} depends on "${id}"`).toBeDefined();
        expect(id, `${capability.id} depends on itself`).not.toBe(capability.id);
      }

      for (const id of capability.lifecycle) {
        expect(findLifecycleStage(id), `${capability.id} names stage "${id}"`).toBeDefined();
      }
    }
  });

  it('has no circular dependencies', () => {
    const byId = new Map(capabilities.map((capability) => [capability.id, capability]));

    /*
     * `resolveDependencies` survives a cycle by design — it carries a `seen` set so a bad
     * library still renders. That is the runtime safety net, and it would also hide a cycle
     * forever. This is the check that fails the build instead.
     */
    const walk = (id: string, path: readonly string[]): void => {
      const capability = byId.get(id);
      if (capability === undefined) return;

      for (const next of capability.dependencies) {
        expect(path.includes(next), `dependency cycle: ${[...path, next].join(' → ')}`).toBe(false);
        walk(next, [...path, next]);
      }
    };

    for (const capability of capabilities) walk(capability.id, [capability.id]);
  });

  it('never makes something purchasable depend on something that is not', () => {
    /*
     * The failure this catches is specific and would be invisible: an "extra scope" capability
     * whose dependency is a roadmap item is not extra scope, it is a roadmap item with a
     * misleading badge. A reader could buy the first and find the second does not exist.
     */
    for (const capability of capabilities) {
      if (!isAvailableToday(capability)) continue;

      for (const id of capability.dependencies) {
        const dependency = findCapability(id);
        if (dependency === undefined) continue;

        expect(
          isAvailableToday(dependency),
          `${capability.id} is ${capability.availability} but needs ${dependency.id}, ` +
            `which is ${dependency.availability}`,
        ).toBe(true);
      }
    }
  });

  /*
   * ==========================================================================
   * COVERAGE
   * ==========================================================================
   */

  it('uses every category it declares', () => {
    for (const category of capabilityCategories) {
      expect(
        capabilities.some((capability) => capability.category === category.id),
        `no capability is in the "${category.id}" category, so its filter option returns nothing`,
      ).toBe(true);
    }
  });

  /*
   * ==========================================================================
   * ONE STAGE IS DELIBERATELY EMPTY
   * ==========================================================================
   *
   * The first version of this asserted every stage had at least one capability, and it failed
   * on `serve` — correctly, and for the best possible reason: **nothing on a website makes the
   * work good.** There is no honest entry to add there, and adding one to satisfy a test is
   * how a library starts asserting things nobody decided.
   *
   * So the rule is inverted. The set of untouched stages must be *exactly* the declared one.
   * A second stage losing its last capability — a real regression, and invisible otherwise —
   * fails here, while the one intentional gap is recorded in a diff rather than exempted by a
   * loosened threshold.
   * ==========================================================================
   */
  it('touches every lifecycle stage except the one nothing can help with', () => {
    const DELIBERATELY_EMPTY: readonly string[] = ['serve'];

    const untouched = lifecycleStages
      .filter(
        (stage) => !capabilities.some((capability) => capability.lifecycle.includes(stage.id)),
      )
      .map((stage) => stage.id);

    expect(untouched).toEqual(DELIBERATELY_EMPTY);
  });

  it('names an integration only if something uses it, or it is there to be refused', () => {
    for (const integration of capabilityIntegrations) {
      const used = capabilities.some((capability) =>
        capability.integrations.includes(integration.id),
      );

      /*
       * An unused integration is allowed in exactly one case: it is `not-offered`, and it is
       * listed so the answer to "do you connect to this" is findable rather than awkward.
       * Anything else unused is a row promising a connection nothing makes.
       */
      if (!used) {
        expect(
          integration.availability,
          `${integration.id} is unused and not marked as a refusal`,
        ).toBe('not-offered');
      }
    }
  });

  it('gives every trade something to be recommended', () => {
    /*
     * The failure mode this catches: a trade added to `config/trades.ts` with an empty
     * `serviceModels`, which produces a recommendation of nothing at all. An empty list looks
     * to a reader like a business with nothing to offer them, and it would never throw.
     */
    for (const trade of trades) {
      expect(trade.serviceModels.length, `${trade.slug} has no service models`).toBeGreaterThan(0);

      for (const model of trade.serviceModels) {
        expect(serviceModelLabels[model], `no label for service model "${model}"`).toBeTruthy();
      }
    }
  });

  it('writes something for every trade that has a page of its own', () => {
    /*
     * Weaker than "every trade", deliberately. `isGeneric` exists precisely so a trade with
     * nothing written for it gets told so, and forcing an entry per trade would mean inventing
     * trade-specific claims to satisfy a test — which is how a library starts asserting things
     * nobody decided.
     *
     * The five trades with their own industry page are different: each of those pages links
     * here carrying its slug, so landing on a generic recommendation from a page written
     * entirely about that trade is a broken promise rather than an honest gap.
     */
    for (const trade of trades.filter((entry) => entry.hasPage)) {
      expect(
        capabilities.some(
          (capability) =>
            capability.industries !== 'every' && capability.industries.includes(trade.slug),
        ),
        `${trade.slug} has an industry page linking here and nothing written for it`,
      ).toBe(true);
    }
  });

  it('resolves every industry a capability names', () => {
    const known = new Set(trades.map((trade) => trade.slug));

    for (const capability of capabilities) {
      if (capability.industries === 'every') continue;
      expect(
        capability.industries.length,
        `${capability.id} has an empty industry list`,
      ).toBeGreaterThan(0);

      for (const slug of capability.industries) {
        expect(known.has(slug), `${capability.id} names unknown trade "${slug}"`).toBe(true);
      }
    }
  });

  /*
   * ==========================================================================
   * THE TIERS
   * ==========================================================================
   */

  it('declares three tiers and puts something in each', () => {
    expect(capabilityTiers.map((tier) => tier.id)).toEqual([
      'foundation',
      'recommended',
      'advanced',
    ]);

    for (const tier of capabilityTiers) {
      expect(
        capabilities.some((capability) => capability.tier === tier.id),
        `the "${tier.id}" group is empty`,
      ).toBe(true);
      expect(tier.summary.length, `${tier.id}: summary`).toBeGreaterThan(60);
    }
  });

  it('keeps the foundation entirely inside the offer', () => {
    /*
     * The tier and the availability are separate fields and could disagree. The one
     * disagreement that would be a lie is a foundation capability nobody is paying for:
     * `capabilityTiers[0].summary` tells the reader the foundation is "what every build and
     * every plan month includes", and an `additional-scope` entry sitting in that group would
     * make that sentence false.
     */
    for (const capability of capabilities.filter((entry) => entry.tier === 'foundation')) {
      expect(
        isAlreadyIncluded(capability),
        `${capability.id} is in the foundation group but is ${capability.availability}`,
      ).toBe(true);
    }
  });

  /*
   * ==========================================================================
   * THE LIFECYCLE IS HONEST ABOUT WHO OWNS WHAT
   * ==========================================================================
   */

  it('gives the website fewer than half the stages', () => {
    /*
     * Not an arbitrary threshold — it is the section's entire claim, written in
     * `capabilityPage.lifecycle.lede`: a website is in charge of some of the journey and not
     * most of it. If a later edit marked six of eight `website`, the diagram would be making
     * the opposite argument while the copy above it made this one.
     */
    const ours = lifecycleStages.filter((stage) => stage.owner === 'website');
    expect(ours.length).toBeLessThan(lifecycleStages.length / 2);
    expect(ours.length).toBeGreaterThan(0);
  });

  it('gives every stage a customer moment and a question the business would recognise', () => {
    for (const stage of lifecycleStages) {
      expect(stage.customerMoment.length, `${stage.id}: customerMoment`).toBeGreaterThan(40);
      expect(stage.businessQuestion.length, `${stage.id}: businessQuestion`).toBeGreaterThan(25);
      expect(stage.businessQuestion, `${stage.id}: businessQuestion is not a question`).toMatch(
        /\?$/,
      );
    }
  });

  it('labels all three ownership bands', () => {
    for (const owner of ['demand', 'website', 'business'] as const) {
      expect(capabilityPage.lifecycle.ownerLabels[owner].length).toBeGreaterThan(8);
    }
  });

  /*
   * ==========================================================================
   * THE INTEGRATIONS
   * ==========================================================================
   */

  it('describes every integration as a consequence rather than as a connection', () => {
    for (const integration of capabilityIntegrations) {
      expect(integration.whatItDoes.length, `${integration.id}: whatItDoes`).toBeGreaterThan(40);
      expect(integration.whyConnect.length, `${integration.id}: whyConnect`).toBeGreaterThan(60);

      /*
       * The specific failure: an integration row whose benefit is the mechanism. "Two-way
       * sync via webhooks" is not something a business owner wants — not retyping an enquiry
       * is. These four words are the ones that show up when a developer writes the copy.
       */
      for (const jargon of ['API', 'webhook', 'OAuth', 'endpoint']) {
        expect(
          integration.whyConnect.toLowerCase(),
          `${integration.id} explains itself with "${jargon}"`,
        ).not.toContain(jargon.toLowerCase());
      }
    }
  });

  it('says whose account each integration is, and marks the two this service runs', () => {
    const ours = capabilityIntegrations.filter((integration) => integration.owner === 'jobforge');

    /*
     * This is the distinction easiest to blur and most misleading when blurred: this
     * application genuinely runs Stripe and Resend — for **its own** billing and its own
     * notification email. A client connecting their own Stripe account to take deposits is a
     * different thing, and it is `stripe-client`, owned by the client.
     */
    expect(ours.length).toBeGreaterThan(0);
    for (const integration of ours) {
      expect(
        integration.id,
        `${integration.id} is marked as ours; check that is really true`,
      ).not.toBe('stripe-client');
    }

    for (const owner of ['client', 'jobforge'] as const) {
      expect(capabilityPage.integrations.ownerLabels[owner].length).toBeGreaterThan(10);
    }
  });

  /*
   * ==========================================================================
   * ONE NAME PER PRODUCT
   * ==========================================================================
   *
   * The recurring product is Growth Partner and the build is the Customer Conversion Build.
   * This library talks about both constantly, in forty entries, and it is the newest and
   * therefore likeliest place for an old name to reappear — which is the failure the
   * care-plan sweep in `content.test.ts` exists to catch globally. This is the local version,
   * asserting the *right* names are actually used rather than only that the wrong ones are
   * absent.
   * ==========================================================================
   */
  it('calls the two products by the names the offer uses', () => {
    const copy = JSON.stringify({ capabilities, capabilityPage, availabilityLabels });

    expect(copy).toContain(growthPartner.name);
    expect(copy).toContain(flagship.name);
    expect(copy.toLowerCase()).not.toContain('care plan');
  });

  it('prints no price, because prices live in one place', () => {
    /*
     * `config/pricing.ts` is the source of truth and the pricing block is where it renders.
     * A figure here would be a fourth copy. The global currency sweep would catch a `$`, so
     * this catches the version that evades it: the number written out in words.
     */
    const copy = JSON.stringify({ capabilities, capabilityPage }).toLowerCase();

    for (const phrase of ['a month', 'per month', 'monthly fee of', 'costs you']) {
      if (!copy.includes(phrase)) continue;
      /* Mentioning a monthly service is fine; quoting its price is not. */
      expect(copy, `a figure appears next to "${phrase}"`).not.toMatch(
        new RegExp(`${phrase}[^.]{0,20}\\d`),
      );
    }
  });
});
