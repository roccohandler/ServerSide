import { readFileSync, readdirSync } from 'node:fs';
import { join, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import { INQUIRY_TYPES } from '../types/api';
import { routes, sections } from '../config/routes';
import { industryPath, tradesWithPages } from '../config/trades';
import {
  currentPrice,
  foundingOffer,
  hasFoundingDiscount,
  projectTiers,
  recommendedTier,
  sanctionedFigures,
  saving,
} from '../config/pricing';
import { containsPlaceholder, isPlaceholder } from '../lib/placeholders';
import { faqItems } from './faq';
import { inquiryOptions } from './contact';
import {
  cancellation,
  carePricing,
  commercialTerms,
  conversion,
  guarantee,
  offerStack,
  prices,
  pricing,
  systemComponents,
  systemPhases,
} from './offer';
import { entryPaths } from './entry';
import { control, demos, valueEducation } from './value';
import { abTesting, campaignAlignment, managementCategories, responseGuarantee } from './growth';
import { pages } from './pages';
import { portfolioProjects } from './portfolio';
import { site } from './site';
import { testimonials } from './testimonials';
import { evidence } from './evidence';
import { audit } from './audit';
import { audience } from './home';
import { privacyContent } from './legal';
import { playbook } from './playbook';
import { ADVERTISING_BENCHMARK_LABEL, industries } from './industries';
import { teardown } from './teardown';
import * as barrel from './index';

/*
 * The sweep corpus.
 *
 * The barrel is no longer the sole discovery mechanism — the four lazy-route content
 * modules are deliberately absent from it so they stay out of the chunk every page
 * preloads (see the note at the bottom of `content/index.ts`). They are imported here
 * explicitly instead, and 'covers every content module' below asserts each one is
 * genuinely in the corpus, so dropping one fails the build rather than quietly narrowing
 * what is checked.
 *
 * `scripts/check-budget.ts` is the other half of that arrangement: this file makes sure
 * the four modules are still *checked*, and the budget makes sure they are still *split*.
 */
const content = { ...barrel, industries, teardown, playbook, audit };

/*
 * Guards on the content layer.
 *
 * These are not tests of React — they protect the things that silently break a
 * content-driven site: a contract that drifts out of sync with the server, a demo
 * project that quietly loses the label saying it is not client work, an unfinished
 * price that ships as a number, and marketing copy that grows a promise nobody can keep.
 */

describe('the inquiry options', () => {
  it('use exactly the slugs the API accepts', () => {
    // The server has the mirror of this assertion. If one side changes, both fail.
    expect(inquiryOptions.map((option) => option.value)).toEqual([...INQUIRY_TYPES]);
  });

  it('give every option a label a business owner would recognise', () => {
    for (const option of inquiryOptions) {
      expect(option.label.length).toBeGreaterThan(3);
    }
  });
});

describe('the portfolio', () => {
  it('marks every example that is not client work', () => {
    // Nothing on this site may read as a real customer project unless it is one.
    for (const project of portfolioProjects) {
      expect(project.isDemo).toBe(true);
    }
  });

  it('gives every example meaningful alternative text', () => {
    for (const project of portfolioProjects) {
      expect(project.imageAlt.length).toBeGreaterThan(20);
      expect(project.imageAlt.toLowerCase()).not.toMatch(/^image of/);
    }
  });

  /*
   * Today no demo has a URL, so the branch below is dormant — which is the point of
   * writing it now rather than the afternoon somebody publishes one. Two things have to
   * be true of a demo link: it goes somewhere real, and it does not go back into this
   * site. A "demo" served from a path of the marketing site is a page of the marketing
   * site, and calling it a demonstration website would be a small lie that reads as a
   * large one once somebody clicks it.
   */
  it('never links to a demo that has not been published, or to itself', () => {
    for (const project of portfolioProjects) {
      if (project.demoUrl === undefined) continue;

      expect(project.demoUrl).toMatch(/^https:\/\//);
      expect(project.demoUrl.startsWith('/')).toBe(false);
      expect(containsPlaceholder(project.demoUrl)).toBe(false);
    }
  });

  it('covers more than one trade, so the site does not read as HVAC-only', () => {
    const industries = new Set(portfolioProjects.map((project) => project.industry));
    expect(industries.size).toBeGreaterThanOrEqual(4);
  });
});

describe('page metadata', () => {
  it('covers every route in the application', () => {
    const documented = new Set(pages.map((page) => page.path));
    for (const path of Object.values(routes)) {
      expect(documented.has(path)).toBe(true);
    }
  });

  it('gives every page a unique title and a usable description length', () => {
    const titles = pages.map((page) => page.title);
    expect(new Set(titles).size).toBe(titles.length);

    for (const page of pages) {
      // Search engines truncate around 160 characters; below 50 wastes the space.
      expect(page.description.length).toBeGreaterThan(50);
      expect(page.description.length).toBeLessThanOrEqual(200);
    }
  });

  /*
   * ==========================================================================
   * NO ORPHAN ROUTES
   * ==========================================================================
   *
   * The site ran a `/playbook/get` for months: a page carrying the same email form as
   * `/playbook`, bound to the same hook and the same endpoint, that nothing on the site
   * linked to. Every test passed. It was in the sitemap, it had a title, its own tests
   * were green, and no visitor could reach it except by being read the URL down a phone.
   *
   * A route is reachable or it is deliberately hidden. There is no third case, and
   * "somebody forgot to link it" should not be able to masquerade as the second one — so
   * every hidden route has to be named here, with the reason, in a diff.
   * ==========================================================================
   */
  it('links every route from the footer, or documents why it is unreachable', () => {
    const linked = new Set<string>([
      ...site.nav.map((item) => item.to),
      ...site.footerNav.map((item) => item.to),
    ]);

    const deliberatelyUnlinked = new Map<string, string>([
      /*
       * The five industry pages are search landing pages, not browse destinations. They
       * are reachable from the trade chips on the homepage — asserted by
       * `HomePage.test.tsx`, which checks each chip's href against the industry's own
       * path — and putting five more links in the footer would be navigation nobody
       * asked for. See `docs/VALUE-PER-SECOND.md` §4.
       */
      ...tradesWithPages.map((trade): [string, string] => [
        industryPath(trade.slug),
        'search landing page, linked from the homepage trade chips',
      ]),
      [
        routes.workbook,
        'noindex production tool: opened by the owner to print the workbook to PDF',
      ],
    ]);

    for (const path of Object.values(routes)) {
      const reason = deliberatelyUnlinked.get(path);
      expect(
        linked.has(path) || reason !== undefined,
        `"${path}" is in the route table but nothing links to it. Either add it to ` +
          '`site.footerNav`, or add it to `deliberatelyUnlinked` above with the reason.',
      ).toBe(true);

      // And a hidden route cannot be both: that combination is the state nobody meant.
      if (reason !== undefined) {
        expect(linked.has(path), `"${path}" is listed as unlinked but is in the nav`).toBe(false);
      }
    }
  });

  /*
   * ==========================================================================
   * NO ANCHORS THAT GO NOWHERE
   * ==========================================================================
   *
   * The same check one level down. `sections` carried a `contact: 'contact'` that no
   * component rendered and nothing linked to — a named fragment for a section that did
   * not exist, which is the dead `management.categories` failure the conversion plan
   * opened by deleting, in a different file.
   *
   * Read from source rather than from the DOM on purpose. These anchors are spread across
   * the homepage, the contact page and the PlayBook, two of which are lazy routes; mounting
   * all three to look for an `id` attribute would be a slow test that mostly proves the
   * router works. What is actually being protected is that every constant here has a
   * render site, and that is a fact about the source.
   *
   * Not every anchor is linked from the site, and the test does not require it. An `id` is
   * also a URL somebody pastes into an email. Naming one that resolves to nothing is the
   * only failure.
   * ==========================================================================
   */
  it('renders every fragment identifier it names', () => {
    const source = readdirSync(join(import.meta.dirname, '..'), { recursive: true })
      .map(String)
      .filter((name) => name.endsWith('.tsx') && !name.endsWith('.test.tsx'))
      .map((name) => readFileSync(join(import.meta.dirname, '..', name), 'utf8'))
      .join('\n');

    for (const key of Object.keys(sections)) {
      expect(
        source.includes(`id={sections.${key}}`),
        `\`sections.${key}\` is declared but no component renders it as an id. Either ` +
          'render it on the section it names, or delete it — see the note above `sections` ' +
          'in config/routes.ts.',
      ).toBe(true);
    }
  });
});

/*
 * The placeholder system only recognises `[BRACKETED]` values, so a field filled in
 * with the *wrong kind* of real value sails straight through it. Typing a name into
 * the email field produces a broken `mailto:` link in the header, the footer and the
 * contact page, and puts that value into the structured data published to search
 * engines. These assertions turn that into a failed build.
 */
describe('the contact details', () => {
  const { phone, email, supportEmail } = site.contact;

  it('has an email address that is either still a placeholder or actually an address', () => {
    for (const address of [email, supportEmail]) {
      if (!isPlaceholder(address)) {
        expect(address).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/);
      }
    }
  });

  /*
   * The support address is a contractual channel: the response guarantee is measured
   * against messages arriving there. Publishing one nobody is watching would make the
   * guarantee unkeepable through no fault of the client.
   */
  it('names a support address for the response guarantee', () => {
    expect(supportEmail).toBeTruthy();
    expect(containsPlaceholder(supportEmail)).toBe(false);
  });

  /*
   * The covered business week. The response guarantee's copy is generated from these, so
   * an incoherent window would publish an incoherent commitment.
   */
  it('describes a business week the guarantee can be measured against', () => {
    const { hours } = site.contact;

    expect(hours.label).toContain(hours.days);
    expect(hours.label).toContain(hours.opens);
    expect(hours.label).toContain(hours.closes);
    expect(hours.excludes.length).toBeGreaterThan(0);
  });

  it('has a phone number that is either still a placeholder or actually dialable', () => {
    if (!isPlaceholder(phone)) {
      const digits = phone.replace(/\D/g, '');
      expect(digits.length).toBeGreaterThanOrEqual(10);
      expect(digits.length).toBeLessThanOrEqual(15);
    }
  });

  it('never leaves a half-replaced placeholder in a contact field', () => {
    for (const value of [phone, email, site.name, site.ownerName]) {
      // e.g. "Call [PHONE_NUMBER] today" — real-looking, but still unfinished.
      expect(containsPlaceholder(value) && !isPlaceholder(value)).toBe(false);
    }
  });
});

/*
 * The homepage trade chips. Five of the eight link to an industry page; the other three
 * are trades with no page, which is a fact about what has been written rather than a
 * judgement about the trade.
 */
describe('the trades on the homepage', () => {
  it('links every chip that claims a page to one that exists', () => {
    const known = new Set(industries.map((industry) => industry.slug));
    const linked = audience.industries.filter((entry) => entry.slug !== undefined);

    expect(linked.length).toBe(industries.length);

    for (const entry of linked) {
      expect(known.has(entry.slug as (typeof industries)[number]['slug'])).toBe(true);
    }
  });

  it('keeps listing trades that have no page of their own', () => {
    const unlinked = audience.industries.filter((entry) => entry.slug === undefined);

    // Most local service businesses are not in the five named trades — see config/trades.ts.
    expect(unlinked.length).toBeGreaterThan(0);
    expect(audience.note).toMatch(/not on the list/i);
  });
});

describe('the site configuration', () => {
  it('points every navigation item at a real route', () => {
    const known = new Set<string>(Object.values(routes));
    for (const item of [...site.nav, ...site.footerNav]) {
      expect(known.has(item.to)).toBe(true);
    }
  });

  it('has a primary and a fallback call to action so the offer can be switched off', () => {
    expect(site.cta.primary.label).toBeTruthy();
    expect(site.cta.primaryFallback.label).toBeTruthy();
    expect(site.cta.primary.label).not.toBe(site.cta.primaryFallback.label);
  });

  /*
   * The primary actions carry a fragment as well as a path — they point at the form on
   * the contact page rather than at the top of it — so the route is whatever comes
   * before the `#`.
   */
  it('sends both primary calls to action at a real route', () => {
    const known = new Set<string>(Object.values(routes));
    const pathOf = (to: string) => to.split('#')[0] ?? to;

    expect(known.has(pathOf(site.cta.primary.to))).toBe(true);
    expect(known.has(pathOf(site.cta.primaryFallback.to))).toBe(true);
  });

  it('lands the primary action on the form rather than on the page holding it', () => {
    expect(site.cta.primary.to).toContain(`#${sections.request}`);
    expect(site.cta.primaryFallback.to).toContain(`#${sections.request}`);
  });
});

/*
 * The offer is the product. These assertions keep its shape intact: six components in
 * order, priced in two parts, with nothing half-finished rendered as though it were
 * final.
 */
describe('the offer', () => {
  it('is numbered in order, with supporting detail on every component', () => {
    const ids = systemComponents.map((component) => component.id);
    expect(new Set(ids).size).toBe(ids.length);

    systemComponents.forEach((component, index) => {
      expect(component.step).toBe(String(index + 1).padStart(2, '0'));
      expect(component.details.length).toBeGreaterThan(0);
      expect(component.summary.length).toBeGreaterThan(20);
    });
  });

  /*
   * The shape of the lifecycle is the shape of the business model: a one-off phase and a
   * repeating one. If the ongoing half ever stops outnumbering the launch half, the page
   * has quietly gone back to selling websites.
   */
  it('splits into a phase that happens once and a phase that repeats', () => {
    const phases = systemComponents.map((component) => component.phase);
    const launch = phases.filter((phase) => phase === 'launch');
    const ongoing = phases.filter((phase) => phase === 'ongoing');

    expect(launch.length).toBeGreaterThan(0);
    expect(ongoing.length).toBeGreaterThan(launch.length);

    // The launch phase must come first and stay contiguous, or the numbering lies.
    expect(phases.indexOf('ongoing')).toBe(launch.length);
    expect(phases.lastIndexOf('launch')).toBe(launch.length - 1);

    for (const phase of systemPhases) {
      expect(phases).toContain(phase.id);
    }
  });

  it('carries the ongoing work that justifies a recurring fee', () => {
    const ids = systemComponents.map((component) => component.id);

    for (const expected of ['maintain', 'refresh', 'align', 'test', 'improve', 'support']) {
      expect(ids).toContain(expected);
    }
  });

  /*
   * The funnel's whole argument is the line it draws: one step before the visitor arrives,
   * six the website owns, three that belong to the business. The handoff paragraph is the
   * most persuasive block in the section precisely because it is a list of things this
   * business does not do — and it states the count in words.
   *
   * A hand-counted number in rendered copy is the failure this project has already made
   * twice (the FAQ's "eleven principles", the offer's "six components"). It is correct
   * today; this is what keeps it correct when somebody adds a step.
   */
  it('counts the steps the website owns, and says the same number out loud', () => {
    const owned = conversion.journey.filter((step) => step.owner === 'website').length;

    const words = [
      'zero',
      'one',
      'two',
      'three',
      'four',
      'five',
      'six',
      'seven',
      'eight',
      'nine',
      'ten',
    ];

    const claimed = conversion.handoff.body.match(
      new RegExp(`\\b(${words.join('|')})\\s+steps\\b`, 'i'),
    );

    expect(claimed, 'the handoff no longer states how many steps the website owns').not.toBeNull();
    expect(words.indexOf((claimed?.[1] ?? '').toLowerCase())).toBe(owned);
  });

  /*
   * The other half of the same claim: every step past the handoff has to be owned by the
   * business, or the diagram is drawing a boundary the copy then steps over.
   */
  it('marks every step after the handoff as somebody else’s', () => {
    const owners = conversion.journey.map((step) => step.owner);
    const lastWebsite = owners.lastIndexOf('website');

    expect(lastWebsite).toBeGreaterThan(0);
    for (const owner of owners.slice(lastWebsite + 1)) {
      expect(owner).toBe('business');
    }
  });

  it('describes the stack in groups that each list what they include', () => {
    expect(offerStack.groups.length).toBeGreaterThanOrEqual(2);
    for (const group of offerStack.groups) {
      expect(group.includes.length).toBeGreaterThan(0);
    }
  });

  /*
   * The offer is a one-time project and a separate recurring plan. It used to be a single
   * launch tier and a single management tier in one list; the project now has three sizes
   * and the recurring service moved to `carePricing`, so this asserts the *shape* rather
   * than two strings in one array — that the project is priced per project, that the
   * recurring plan is priced monthly, and that they are not the same object.
   */
  it('prices the project once and the care plan monthly, as separate offers', () => {
    for (const tier of pricing.tiers) {
      expect(tier.cadence.toLowerCase()).toContain('one-time');
    }

    for (const plan of carePricing.plans) {
      expect(plan.price).toMatch(/\/mo$/);
    }

    // Buying a project must not silently require the recurring plan.
    expect(carePricing.optOut.length).toBeGreaterThan(40);
  });

  /*
   * Exactly one recommended tier.
   *
   * Two would make the recommendation meaningless and none would leave the reader to rank
   * three prices unaided, which is the decision the middle tier exists to make for them.
   */
  it('recommends exactly one project tier', () => {
    expect(pricing.tiers.filter((tier) => tier.emphasis)).toHaveLength(1);
  });

  /*
   * ==========================================================================
   * THE FOUNDING-CLIENT PRICE IS NOT A FORMER PRICE
   * ==========================================================================
   *
   * 16 CFR 233.1 permits a former-price comparison only where the former price was
   * actually charged, publicly, on a regular basis, for a substantial period. **This
   * business has never charged the standard prices** — they are a rate card being
   * established now.
   *
   * So the site may say the standard price *is* higher. It may not say it *was* higher.
   * The words below are the ones that make it a claim about the past, and every one of
   * them is banned from the pricing copy. The visual equivalent — a strike-through — is
   * banned in `PricingTier`'s doc comment and by the markup test in `HomePage.test.tsx`.
   * ==========================================================================
   */
  it('never describes the standard price as a former price', () => {
    const pricingCopy = [
      pricing.heading,
      pricing.lede,
      pricing.note,
      pricing.founding.label,
      pricing.founding.standardLabel,
      pricing.founding.body,
      pricing.founding.remainingLabel,
      ...pricing.tiers.flatMap((tier) => [tier.summary, tier.priceNote, tier.terms ?? '']),
    ].join(' ');

    for (const claim of [
      /\bwas\s+\$/i,
      /\bnormally\b/i,
      /\bregularly\s+\$/i,
      /\breg\.\s*\$/i,
      /\breduced from\b/i,
      /\bmarked down\b/i,
      /\bused to (?:be|cost)\b/i,
    ]) {
      expect(pricingCopy, `"${claim}" makes the standard price a claim about the past`).not.toMatch(
        claim,
      );
    }
  });

  /*
   * No manufactured urgency. The offer is limited by a count and by a qualification, both
   * of which are real; anything time-based would have to be invented, and an invented
   * deadline is the cheapest way to lose a sceptical buyer permanently.
   */
  it('creates no deadline it cannot keep', () => {
    const copy = JSON.stringify(pricing.founding).toLowerCase();

    for (const word of [
      'expires',
      'ends soon',
      'today only',
      'hurry',
      'last chance',
      'countdown',
    ]) {
      expect(copy, `"${word}" invents urgency this offer does not have`).not.toContain(word);
    }

    // And the discount has a stated condition, which is what makes it a real discount.
    expect(pricing.founding.body.length).toBeGreaterThan(80);
  });

  /*
   * A price is either an honest placeholder — in which case the UI shows
   * `pricing.unsetLabel` rather than the token — or a real figure. What must never ship
   * is something in between, like "[LAUNCH_PRICE] plus VAT", which reads as a decision
   * that has been made and has not.
   */
  it('never publishes a half-finished price', () => {
    for (const tier of pricing.tiers) {
      if (isPlaceholder(tier.price)) continue;

      expect(containsPlaceholder(tier.price)).toBe(false);
      expect(tier.price).toMatch(/\d/);
    }
  });

  it('publishes the terms a buyer asks about before they get in touch', () => {
    const ids = commercialTerms.items.map((term) => term.id);

    for (const expected of ['minimum', 'cancellation', 'payment', 'revisions', 'ownership']) {
      expect(ids).toContain(expected);
    }

    for (const term of commercialTerms.items) {
      expect(term.detail.length).toBeGreaterThan(30);
    }
  });

  /*
   * The exit terms exist because they are the strongest thing on the page, and because a
   * buyer who has been burned by an agency holding their domain is reading everything
   * else through that memory.
   */
  it('answers what happens on cancellation, including the awkward parts', () => {
    const copy = cancellation.items
      .map((item) => item.description)
      .join(' ')
      .toLowerCase();

    for (const subject of ['domain', 'hosting', 'campaign', 'test', 'refund']) {
      expect(copy).toContain(subject);
    }
  });

  /*
   * Only the launch has a published number. The other two ways in depend on what is
   * already there, and a figure invented for "fixing somebody else's website" would be a
   * guess wearing a price tag.
   */
  it('gives every way in a price or an honest statement that it is quoted', () => {
    expect(entryPaths.paths).toHaveLength(3);

    for (const path of entryPaths.paths) {
      expect(containsPlaceholder(path.price)).toBe(false);
      expect(path.price).toMatch(/\$|quoted/i);
    }
  });
});

/*
 * ============================================================================
 * ONE PRICE, EVERYWHERE
 * ============================================================================
 *
 * The failure this prevents is specific and invisible in review: $299 on the homepage
 * and $149 in an FAQ answer written six months later, discovered by a customer. Only
 * `content/offer.ts` may name a figure; everything else interpolates `prices`.
 * ============================================================================
 */
describe('the prices', () => {
  const SANCTIONED = new Set<string>([
    /*
     * Derived from `config/pricing.ts` rather than listed here.
     *
     * It used to be five hand-written entries. That worked while there was one launch fee
     * and one monthly fee; with three project tiers, each carrying a standard price, a
     * founding price, a deposit and a saving, a hand-written list would have to be kept in
     * step with the config by somebody remembering to — and the first time it fell behind,
     * this guard would start failing on a legitimate price and get widened rather than
     * fixed. Deriving it means adding a tier sanctions its figures automatically, while a
     * figure typed anywhere else still fails the build. That is the property worth having.
     */
    ...sanctionedFigures(),
    /*
     * Not a price. `idealCustomer.revenueGuideline` describes the *customer's* annual
     * revenue — the commercial-fit guideline in `config/market.ts` — and it is the one
     * currency figure on the site that is about somebody else's money. Sanctioned here
     * rather than exempted by pattern, so adding a second one is a deliberate act.
     */
    '$1',
  ]);

  /*
   * Guards the guard. If `sanctionedFigures()` ever returned an empty set — a refactor
   * that broke the derivation — the sweep below would pass on every string on the site.
   */
  it('derives a non-empty set of sanctioned figures from the pricing config', () => {
    expect(sanctionedFigures().size).toBeGreaterThanOrEqual(8);
    expect(sanctionedFigures().has(prices.launch)).toBe(true);
    expect(sanctionedFigures().has(prices.managementDisplay)).toBe(true);
  });

  function collectStrings(value: unknown, found: string[] = []): string[] {
    if (typeof value === 'string') {
      found.push(value);
    } else if (Array.isArray(value)) {
      for (const item of value) collectStrings(item, found);
    } else if (value !== null && typeof value === 'object') {
      for (const item of Object.values(value)) collectStrings(item, found);
    }
    return found;
  }

  it('states one launch fee and one monthly fee, and no other figure anywhere', () => {
    const currency = /\$[\d,]+(?:\.\d{2})?(?:\/mo)?/g;

    for (const text of collectStrings(content)) {
      for (const match of text.match(currency) ?? []) {
        expect(
          SANCTIONED.has(match),
          `"${match}" is not one of the sanctioned prices. It appears in: ${text}`,
        ).toBe(true);
      }
    }
  });

  it('keeps the annual option worth taking, and cheaper than twelve months', () => {
    const toNumber = (value: string) => Number(value.replace(/[^\d.]/g, ''));

    expect(toNumber(prices.annual)).toBeLessThan(toNumber(prices.management) * 12);
    // The deposit is half the fee actually being paid, and the terms say so in words.
    expect(toNumber(prices.deposit) * 2).toBe(toNumber(prices.launch));
  });

  /*
   * ==========================================================================
   * THE ARITHMETIC BEHIND EVERY DISCOUNT CLAIM
   * ==========================================================================
   *
   * A saving printed next to a price is a factual claim about two other numbers. Typed by
   * hand it goes stale the first time a price moves and nobody notices, because a stale
   * saving looks exactly like a correct one.
   *
   * These assert the derivation rather than the values, so changing a price is a one-line
   * edit in the config and these keep holding — while a founding price accidentally set
   * above its standard price, which would make the site advertise a negative discount,
   * fails here.
   * ==========================================================================
   */
  it('derives every saving from two real prices', () => {
    for (const tier of projectTiers) {
      expect(
        tier.founding,
        `${tier.id} costs more than its own standard price`,
      ).toBeLessThanOrEqual(tier.standard);
      expect(saving(tier)).toBe(tier.standard - tier.founding);
      expect(currentPrice(tier)).toBe(foundingOffer.enabled ? tier.founding : tier.standard);
    }
  });

  /*
   * Switching the founding offer off has to remove the *claim*, not just the number. If
   * `hasFoundingDiscount` stayed true with the offer disabled, the page would keep
   * advertising a saving nobody could get.
   */
  it('stops claiming a discount the moment the founding offer is switched off', () => {
    for (const tier of projectTiers) {
      expect(hasFoundingDiscount(tier)).toBe(
        foundingOffer.enabled && tier.founding < tier.standard,
      );
    }
  });

  /*
   * The tiers have to be ordered by price for the middle one to read as the middle one.
   * A recommended tier that is not between the other two is a merchandising accident.
   */
  it('orders the tiers by price, with the recommended one in the middle', () => {
    const ordered = [...projectTiers].sort((a, b) => a.order - b.order);
    const paid = ordered.map(currentPrice);

    expect(paid).toEqual([...paid].sort((a, b) => a - b));
    expect(ordered[1]?.recommended).toBe(true);
  });

  /*
   * ==========================================================================
   * A PUBLISHED FOUNDING PRICE CARRIES ITS CONDITION
   * ==========================================================================
   *
   * `tier.price` is the founding-client price. Printed on its own it reads as *the* price:
   * the reader forms a belief about what this costs before being told what makes it cost
   * that. That is a former-price claim approached from the other side, and it is the defect
   * the strike-through ban exists to prevent — arriving through a different door.
   *
   * It shipped twice. The hero published the figure with the condition eight sections
   * further down, and the services page — the one somebody lands on from a search for what
   * a managed website costs — published all three tiers with no condition anywhere on it.
   * Both were caught by reading the page, which is not a mechanism.
   *
   * So: any component that maps over `pricing.tiers` must also render `standardPrice`,
   * which exists only next to `founding.standardLabel`. A fourth pricing surface cannot be
   * added without the qualification unless somebody deliberately deletes this test.
   * ==========================================================================
   */
  it('never renders a founding price in a component that omits the standard one', () => {
    function componentFiles(dir: string): string[] {
      return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) return componentFiles(path);
        return entry.name.endsWith('.tsx') && !entry.name.includes('.test.') ? [path] : [];
      });
    }

    const undisclosed = componentFiles(join(import.meta.dirname, '..'))
      .map((file) => ({ file, source: readFileSync(file, 'utf8') }))
      .filter(({ source }) => source.includes('pricing.tiers') && !source.includes('standardPrice'))
      .map(({ file }) => file.split(sep).pop());

    expect(
      undisclosed,
      'A component that publishes the founding price without the standard price beside it ' +
        'publishes a conditional number as if it were the price.',
    ).toEqual([]);
  });

  /*
   * The same rule, for the one place a price is published from content rather than from the
   * tier list. `entryPaths` quotes the launch figure in prose, and prose has no card to put
   * a label on — so the qualification is a field on the path, generated from the same flag,
   * and it has to name the standard price rather than gesture at a condition.
   */
  it('qualifies the launch figure wherever it is quoted outside the pricing cards', () => {
    const launchPath = entryPaths.paths.find((path) => path.price === prices.launch);
    expect(launchPath, 'no entry path quotes the launch price any more').toBeDefined();

    if (foundingOffer.enabled) {
      expect(launchPath?.priceNote).toContain(prices.launchStandard);
    } else {
      expect(launchPath?.priceNote).toBeUndefined();
    }
  });
});

describe('the guarantee', () => {
  it('promises something, and says what it is', () => {
    expect(guarantee.items.length).toBeGreaterThan(0);
    for (const item of guarantee.items) {
      expect(item.description.length).toBeGreaterThan(30);
    }
  });

  /*
   * The whole section only works because it is about work rather than results. A
   * promise about a result would be unkeepable, and the first one added would be added
   * here.
   */
  it('never promises a result', () => {
    const copy = [guarantee.lede, guarantee.note, ...guarantee.items.map((i) => i.description)]
      .join(' ')
      .toLowerCase();

    for (const word of ['ranking', 'more leads', 'revenue', 'roi', 'first page']) {
      expect(copy).not.toContain(word);
    }
  });
});

/*
 * The value-education layer explains why any of the offer is worth paying for. Two
 * things have to stay true about it: it must keep pointing at the same six components
 * the rest of the site sells, and none of its demonstrations may drift into looking
 * like a customer's real website.
 */
describe('the business case', () => {
  it('maps every stage onto components that actually exist', () => {
    const names = new Set(systemComponents.map((component) => component.name));

    for (const stage of valueEducation.stages) {
      expect(stage.components.length).toBeGreaterThan(0);
      for (const component of stage.components) {
        expect(names.has(component)).toBe(true);
      }
    }
  });

  it('covers the whole journey, from being found to being improved', () => {
    const ids = valueEducation.stages.map((stage) => stage.id);
    expect(ids[0]).toBe('found');
    expect(ids.at(-1)).toBe('improve');
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('says what goes wrong, what changes, and what that is worth — every time', () => {
    for (const stage of valueEducation.stages) {
      expect(stage.problem.length).toBeGreaterThan(20);
      expect(stage.improvement.length).toBeGreaterThan(20);
      expect(stage.value.length).toBeGreaterThan(20);
    }
  });
});

describe('the demonstrations', () => {
  it('are labelled as illustrations rather than as work', () => {
    // The word itself is rendered on every panel; this pins the word.
    expect(demos.disclaimer.toLowerCase()).toContain('illustrative');
  });

  it('pair every problem with a change and a reason it matters', () => {
    for (const demo of demos.items) {
      expect(demo.problem.length).toBeGreaterThan(20);
      expect(demo.change.length).toBeGreaterThan(20);
      expect(demo.whyItMatters.length).toBeGreaterThan(20);
    }
  });

  /*
   * A percentage in this section would be a fabricated case study. The claims are
   * allowed to be about friction and clarity; they are not allowed to be about results.
   */
  it('never claims a measured result', () => {
    for (const demo of demos.items) {
      const copy = [demo.problem, demo.change, demo.whyItMatters, demo.note ?? ''].join(' ');
      expect(copy).not.toMatch(/\d+\s?%/);
      expect(copy).not.toMatch(/\b(doubled|tripled|increased .* by)\b/i);
    }
  });
});

describe('what is and is not promised', () => {
  it('keeps the limitations at least as specific as the promises', () => {
    expect(control.canControl.length).toBeGreaterThan(3);
    expect(control.cannotControl.length).toBeGreaterThan(3);
  });

  it("puts Google's algorithm on the side nobody controls", () => {
    const cannot = control.cannotControl.join(' ').toLowerCase();
    expect(cannot).toContain('google');

    const can = control.canControl.join(' ').toLowerCase();
    expect(can).not.toContain('ranking');
  });
});

/*
 * The recurring service is the easiest part of this offer to oversell, so it gets the
 * strictest guards. Every one of these exists because the honest version of the claim is
 * a sentence away from the dishonest one.
 */
describe('the recurring service', () => {
  it('covers the running of it, the aligning of it, and the learning from it', () => {
    const ids = managementCategories.map((category) => category.id);

    for (const expected of [
      'working',
      'current',
      'aligned',
      'improving',
      'learning',
      'supported',
    ]) {
      expect(ids).toContain(expected);
    }

    for (const category of managementCategories) {
      expect(category.items.length).toBeGreaterThan(0);
    }
  });

  /*
   * A local business with forty visitors a week cannot run a meaningful controlled
   * experiment. Saying "we constantly A/B test your website" to that business is a lie,
   * so the eligibility rule is part of the offer rather than fine print — and the copy
   * must never promise a lift.
   */
  it('never claims constant testing or a guaranteed lift', () => {
    expect(abTesting.eligibility.length).toBeGreaterThan(0);

    const copy = [
      abTesting.heading,
      abTesting.lede,
      abTesting.caveat,
      abTesting.example.note,
      ...abTesting.method.map((beat) => beat.body),
    ]
      .join(' ')
      .toLowerCase();

    for (const forbidden of ['constantly', 'always testing', 'guaranteed', 'every test wins']) {
      expect(copy).not.toContain(forbidden);
    }

    expect(copy).not.toMatch(/\d+\s?%/);
  });

  it('says where campaign work stops', () => {
    expect(campaignAlignment.boundary).toMatch(/do not run your ads/i);
  });
});

/*
 * A response-time promise with a fee waiver attached is a commercial term, not a
 * marketing sentence. It is now live, which makes these assertions the guard on it
 * quietly becoming something the business cannot honour — every one of them protects a
 * boundary the owner actually agreed to.
 */
describe('the response guarantee', () => {
  it('promises a response and explicitly refuses to promise a resolution', () => {
    // The single line the whole term rests on. Losing it turns a keepable promise into
    // an SLA on somebody else's hosting company.
    expect(responseGuarantee.promise).toBeTruthy();
    expect(responseGuarantee.distinction).toMatch(/not a resolution/i);
  });

  it('states a remedy in real words rather than a placeholder', () => {
    expect(isPlaceholder(responseGuarantee.remedy)).toBe(false);
    expect(containsPlaceholder(responseGuarantee.remedy)).toBe(false);
    expect(responseGuarantee.remedy).toMatch(/waiv/i);
  });

  it('applies the remedy without the client having to ask for it', () => {
    // A guarantee somebody has to chase is a technicality wearing a guarantee's coat.
    expect(responseGuarantee.remedy).toMatch(/do not have to|automatic|I apply it/i);
  });

  it('never claims round-the-clock support for a business-hours window', () => {
    const copy = [
      responseGuarantee.heading,
      responseGuarantee.lede,
      responseGuarantee.promise,
      responseGuarantee.distinction,
      responseGuarantee.windowNote,
      responseGuarantee.publicNote,
    ].join(' ');

    if (responseGuarantee.businessHoursOnly) {
      expect(copy).not.toMatch(/24\s*\/\s*7/);
    }
  });

  /*
   * The window is generated from the business hours, not typed twice. If the two ever
   * disagree, the site is publishing one commitment and the terms page another.
   */
  it('measures the window against the published business hours', () => {
    expect(responseGuarantee.unit).toContain('business');
    expect(responseGuarantee.windowNote).toContain(site.contact.hours.days);
    expect(responseGuarantee.windowNote).toContain(site.contact.hours.opens);
  });

  it('names its exclusions on the page rather than only in the contract', () => {
    expect(responseGuarantee.exclusions.length).toBeGreaterThan(3);
  });

  it('limits qualifying channels to ones that leave a timestamp', () => {
    expect(responseGuarantee.channels.length).toBeGreaterThan(0);
    expect(responseGuarantee.channels.length).toBeLessThanOrEqual(3);
  });

  /*
   * §17. The disclosure is what makes the guarantee credible instead of weakening it,
   * and it is the first thing that would be quietly dropped in a copy edit.
   */
  it('says out loud what it does not guarantee', () => {
    const body = responseGuarantee.notGuaranteed.body.toLowerCase();
    for (const word of ['leads', 'rankings', 'revenue', 'traffic']) {
      expect(body).toContain(word);
    }
  });
});

describe('social proof', () => {
  /*
   * Empty is a valid state and the section renders nothing while it is. What is not
   * valid is a half-attributed quote — a testimonial with no name is indistinguishable
   * from an invented one.
   */
  it('is either absent or fully attributed', () => {
    for (const testimonial of testimonials) {
      expect(testimonial.quote.length).toBeGreaterThan(20);
      expect(testimonial.author).toBeTruthy();
      expect(testimonial.business).toBeTruthy();
      expect(testimonial.location).toBeTruthy();
    }
  });
});

describe('the FAQ', () => {
  it('answers the cost and timeline questions people ask first', () => {
    const questions = faqItems.map((item) => item.question.toLowerCase()).join(' ');
    expect(questions).toMatch(/cost/);
    expect(questions).toMatch(/how long/);
  });

  it('answers the ranking question with a straight no', () => {
    const ranking = faqItems.find((item) => /ranking/i.test(item.question));
    expect(ranking).toBeDefined();
    expect(ranking?.answer).toMatch(/^no\b/i);
  });

  it('explains what happens after launch, which is what is being sold', () => {
    const ids = faqItems.map((item) => item.id);
    expect(ids).toContain('after-launch');
  });

  /*
   * The full set of questions a buyer asks before they will make contact. Each id maps
   * to something somebody would otherwise have to email to find out — and an unanswered
   * one is a reason not to bother emailing at all.
   */
  it('covers every question a buyer asks before getting in touch', () => {
    const ids = new Set(faqItems.map((item) => item.id));

    for (const required of [
      'cost',
      'launch-includes',
      'management-includes',
      'contract',
      'timeline',
      'existing-site',
      'domain',
      'ownership',
      'cancel',
      'ads',
      'more-leads',
      'rankings',
      'response-guarantee',
      'qualifying-response',
      'ab-testing',
      'low-traffic',
      'refresh',
      'landing-pages',
      'area',
      'playbook',
      'audit',
    ]) {
      expect(ids.has(required), `the FAQ is missing "${required}"`).toBe(true);
    }
  });

  /*
   * The FAQ said "eleven principles" while the PlayBook had twenty — a wrong number on a
   * published page, in the answer whose whole job is to make a free resource sound worth
   * reading. The count is interpolated now; this asserts nobody retypes it.
   */
  /*
   * `faq.ts` holds this number as a literal rather than importing the PlayBook, because
   * importing it for one integer pulled a thousand lines of copy into the bundle every
   * homepage visitor downloads. This assertion is what makes the literal safe, and it is
   * exactly as strong as the import was — tests are not bundled, so it costs nothing.
   */
  it('never states a count of the PlayBook improvements that disagrees with the PlayBook', () => {
    const actual = playbook.principles.length;

    const stated = faqItems
      .filter((item) => /playbook|self-assessment|checks the playbook/i.test(item.answer))
      .flatMap((item) => [...item.answer.matchAll(/\b(\d+)\s+(?:improvements|checks)\b/g)])
      .map((match) => Number(match[1]));

    expect(stated.length, 'no FAQ answer states the count any more').toBeGreaterThan(0);
    for (const value of stated) expect(value).toBe(actual);

    /*
     * Spelling the number out is how it went wrong the first time, and a spelled-out
     * count cannot be interpolated — so it is banned outright rather than checked.
     */
    const spelledOut =
      /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)\s+improvements\b/i;

    for (const item of faqItems) {
      if (!/playbook/i.test(item.answer)) continue;

      expect(
        spelledOut.test(item.answer),
        `"${item.question}" spells out a count that cannot be kept in step`,
      ).toBe(false);

      const claimed = item.answer.match(/\b(\d+)\s+improvements\b/)?.[1];
      if (claimed === undefined) continue;

      expect(Number(claimed), `"${item.question}" states the wrong number`).toBe(actual);
    }
  });

  it('gives every answer enough substance to be worth reading', () => {
    for (const item of faqItems) {
      expect(item.answer.length, `"${item.question}" is answered too thinly`).toBeGreaterThan(80);
    }
  });

  it('answers the lead-guarantee question with a straight no', () => {
    const leads = faqItems.find((item) => item.id === 'more-leads');
    expect(leads?.answer).toMatch(/^no\b/i);
  });
});

/*
 * A sweep of every string in the content layer for the claims this business has decided
 * not to make. They are the phrases that turn up when marketing copy is written in a
 * hurry, and each one is either unprovable or untrue — which is exactly why the guard
 * lives next to the copy rather than in somebody's memory.
 */
describe('the copy', () => {
  const FORBIDDEN: readonly (readonly [RegExp, string])[] = [
    [
      /guaranteed\s+(?:leads?|rankings?|revenue|customers?|sales|results?|traffic)/i,
      'a guaranteed result',
    ],
    [/#\s?1\s+on\s+google/i, 'a promised Google position'],
    [/(?:page one|first page|top) of google/i, 'a promised Google position'],
    [/dominate\s+(?:google|search|your\s+market|the\s+competition)/i, 'hype'],
    [/\b10x\b/i, 'hype'],
    [/revolutionary/i, 'hype'],
    [/secret\s+(?:system|formula|sauce|method)/i, 'hype'],
    [/\bAI[- ]powered\b/i, 'selling the tooling rather than the outcome'],
  ];

  function collectStrings(value: unknown, found: string[] = []): string[] {
    if (typeof value === 'string') {
      found.push(value);
    } else if (Array.isArray(value)) {
      for (const item of value) collectStrings(item, found);
    } else if (value !== null && typeof value === 'object') {
      for (const item of Object.values(value)) collectStrings(item, found);
    }

    return found;
  }

  const everyString = collectStrings(content);

  it('reads a meaningful amount of copy, so this guard cannot pass by walking nothing', () => {
    expect(everyString.length).toBeGreaterThan(200);
  });

  /*
   * The barrel used to be the sole discovery mechanism for these sweeps, and a module
   * missing from it was silently exempt from all of them. Four modules are now deliberately
   * outside the barrel — they are lazy-route content, and re-exporting them put the whole
   * of it in the chunk every page preloads.
   *
   * That trade is only safe while the corpus above still contains them, so this asserts a
   * known sentence from each. Dropping one from the corpus fails the build here rather than
   * quietly halving what the currency, placeholder and forbidden-claim sweeps look at.
   */
  it('covers every content module, including the ones outside the barrel', () => {
    const corpus = everyString.join('\n');

    const witnesses: readonly (readonly [string, string])[] = [
      ['industries', industries[0]?.heading ?? ''],
      ['teardown', teardown.disclosure],
      ['playbook', playbook.scorecard.storageNote],
      ['audit', audit.send.consent],
      ['offer (barrel)', guarantee.lede],
    ];

    for (const [name, witness] of witnesses) {
      expect(witness, `no witness string for ${name}`).toBeTruthy();
      expect(corpus.includes(witness), `${name} is not in the sweep corpus`).toBe(true);
    }
  });

  it('makes none of the claims this business has decided not to make', () => {
    for (const text of everyString) {
      for (const [pattern, reason] of FORBIDDEN) {
        expect(pattern.test(text), `${reason}: ${text}`).toBe(false);
      }
    }
  });

  /*
   * ==========================================================================
   * THE FREE DIAGNOSTIC HAS ONE NAME
   * ==========================================================================
   *
   * It was renamed from "review" to "assessment" when the primary call to action was, and
   * the rename reached the button, the contact page and `site.offer.freeReview.name` — but
   * not step one of the published launch process, and not the hero's own trust points. So
   * the first screen promised a free *review*, the button offered a free *assessment*, and
   * the process described a third thing with the first name.
   *
   * A reader does not know those are the same offer. Nothing signals an unserious supplier
   * faster than a site that cannot keep its own product names straight — which is written,
   * verbatim, in a comment in `site.ts` that had been true and unenforced for a phase.
   *
   * Both call sites interpolate the name now. This is what stops the next one from not.
   * ==========================================================================
   */
  it('never calls the free assessment by its old name', () => {
    /*
     * Two patterns, because the first version of this guard only caught the first one and
     * four pieces of rendered copy walked straight past it.
     *
     * `free website review` was the old product name. **`the review` is the same drift one
     * word shorter** — the contact form's email hint said "Where I will send the review",
     * the teardown said "that is what the review says", and both are the product being
     * called something the rest of the site does not call it.
     *
     * The bare phrase is banned outright rather than exempted case by case, which forces
     * the *other* meaning — a customer's review of the business — to be written
     * unambiguously as "the customer review". That sentence is clearer anyway, and one
     * rule with no exemption list is worth more than a rule with one.
     */
    const oldNames: readonly RegExp[] = [/free\s+(website\s+)?review\b/i, /\bthe review\b/i];

    for (const text of everyString) {
      for (const pattern of oldNames) {
        expect(
          pattern.test(text),
          `the free diagnostic is "${site.offer.freeReview.name}" everywhere else — and ` +
            `"the review" is ambiguous with a customer's review. Say which one: ${text}`,
        ).toBe(false);
      }
    }
  });

  /*
   * Every commercial decision is made, so no `[TOKEN]` may reach a visitor. This is the
   * strongest guard in the file: it does not care which placeholder is added or where,
   * only that one has been, and the message names the string so it is findable.
   */
  it('carries no unreplaced placeholder anywhere in the content layer', () => {
    for (const text of everyString) {
      expect(containsPlaceholder(text), `unreplaced placeholder in: ${text}`).toBe(false);
    }
  });

  /*
   * The contradictions §41 warns about, each one a thing a customer would find and the
   * business would then have to argue about.
   */
  it('never offers unlimited revisions alongside a two-round policy', () => {
    for (const text of everyString) {
      expect(text).not.toMatch(/unlimited revisions?/i);
      expect(text).not.toMatch(/(?:repeats?|loop).{0,20}until you(?:'re| are) happy/i);
    }
  });

  it('never claims round-the-clock availability for a business-hours promise', () => {
    for (const text of everyString) {
      expect(text).not.toMatch(/24\s*\/\s*7\s+(?:support|availability|response)/i);
      expect(text).not.toMatch(/7 days a week/i);
    }
  });

  /*
   * The recurring service is sold as management and growth. Describing it as maintenance
   * is the specific way this offer quietly collapses back into a commodity care plan —
   * so the word is allowed only where the copy is explicitly drawing that contrast.
   */
  /*
   * ==========================================================================
   * THE BORROWED NUMBERS
   * ==========================================================================
   *
   * Everything below guards the same failure from three directions: a statistic somebody
   * else published being read as a claim about this business, or as a measurement of
   * something it did not measure.
   *
   * It is a structural sweep rather than a wording one. Anything anywhere in the content
   * layer that carries a `conversionRate` or a LocaliQ attribution has to carry the label
   * too — so a benchmark added to a new file, in a shape nobody anticipated, still fails
   * the build if it arrives naked.
   * ==========================================================================
   */
  function collectObjects(
    value: unknown,
    found: Record<string, unknown>[] = [],
  ): Record<string, unknown>[] {
    if (Array.isArray(value)) {
      for (const item of value) collectObjects(item, found);
    } else if (value !== null && typeof value === 'object') {
      found.push(value as Record<string, unknown>);
      for (const item of Object.values(value)) collectObjects(item, found);
    }

    return found;
  }

  const everyObject = collectObjects(content);

  it('never publishes an advertising figure without the sentence saying what it is', () => {
    const advertising = everyObject.filter((entry) => {
      const source = entry['source'];
      return typeof source === 'string' && /localiq/i.test(source);
    });

    // The guard must not pass by finding nothing — the five industry pages each carry one.
    expect(advertising.length).toBeGreaterThanOrEqual(industries.length);

    for (const entry of advertising) {
      expect(
        entry['label'],
        `an advertising figure from ${String(entry['source'])} is unlabelled`,
      ).toBe(ADVERTISING_BENCHMARK_LABEL);
    }
  });

  it('labels anything shaped like a published conversion rate', () => {
    const rates = everyObject.filter((entry) => entry['conversionRate'] !== undefined);

    expect(rates.length).toBeGreaterThan(0);

    for (const entry of rates) {
      expect(entry['label']).toBe(ADVERTISING_BENCHMARK_LABEL);
      expect(typeof entry['limitation']).toBe('string');
      expect(typeof entry['sourceUrl']).toBe('string');
    }
  });

  it('does not let the sanctioned label be softened into something vaguer', () => {
    expect(ADVERTISING_BENCHMARK_LABEL).toContain('Search advertising benchmark');
    expect(ADVERTISING_BENCHMARK_LABEL).toContain('not a website conversion benchmark');
  });

  it('does not let the recurring service be described as merely maintenance', () => {
    for (const text of everyString) {
      if (!/maintenance/i.test(text)) continue;

      const isDrawingTheContrast =
        /not a maintenance plan|ordinary website maintenance|maintenance keeps a website alive|floor rather than the offer|more than (?:just )?maintenance/i.test(
          text,
        );

      /*
       * The PlayBook uses real trades as examples, and "maintenance plans" is a thing an
       * HVAC business genuinely sells. That is the customer's service list, not a
       * description of this one, and the guard has no business policing it.
       */
      const isSomebodyElsesService = /maintenance plans?/i.test(text);

      expect(
        isDrawingTheContrast || isSomebodyElsesService,
        `"maintenance" used without distinguishing it from the managed service: ${text}`,
      ).toBe(true);
    }
  });
});

/*
 * ============================================================================
 * PUBLISHED RESEARCH
 * ============================================================================
 *
 * `EvidenceCitation` already makes `limitation` a required field, so an uncaveated
 * citation is a compile error. What the type cannot check is whether the caveat says
 * anything — `limitation: 'n/a'` satisfies the compiler perfectly. These do that part.
 * ============================================================================
 */
describe('the published research', () => {
  it('quotes something, so this guard cannot pass by citing nothing', () => {
    expect(evidence.citations.length).toBeGreaterThan(0);
  });

  it('states what every citation does not establish, at length', () => {
    for (const citation of evidence.citations) {
      // Long enough to be an actual sentence about scope rather than a token disclaimer.
      expect(citation.limitation.length, `"${citation.id}" is caveated too thinly`).toBeGreaterThan(
        80,
      );
      expect(citation.dataset.length).toBeGreaterThan(30);
      expect(citation.whyItMatters.length).toBeGreaterThan(30);
    }
  });

  it('links every citation to something the reader can go and check', () => {
    const ids = evidence.citations.map((citation) => citation.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const citation of evidence.citations) {
      expect(citation.sourceUrl).toMatch(/^https:\/\//);
      expect(containsPlaceholder(citation.sourceUrl)).toBe(false);
      // An attribution that names nobody is not an attribution.
      expect(citation.source.length).toBeGreaterThan(5);
    }
  });

  /*
   * The whole section works because none of it is presented as a result this business
   * produced. The first sentence that blurred that would be added here.
   */
  it('never turns somebody else’s finding into a claim about this business', () => {
    const copy = [
      evidence.lede,
      evidence.closing,
      ...evidence.citations.flatMap((citation) => [
        citation.claim,
        citation.whyItMatters,
        citation.limitation,
      ]),
    ]
      .join(' ')
      .toLowerCase();

    for (const forbidden of ['my clients', 'our clients', 'clients see', 'we achieved']) {
      expect(copy).not.toContain(forbidden);
    }
  });

  /*
   * §14 of the brief: the reason this section is persuasive is that two of the three
   * findings are about parts of the job this business does not touch. Losing that turns
   * it into three statistics arranged to sell a website.
   */
  it('keeps saying that the website is only one of the places demand leaks', () => {
    expect(evidence.closing.length).toBeGreaterThan(60);
    expect(evidence.lede.toLowerCase()).toContain('not the website');
  });
});

/*
 * ============================================================================
 * THE ILLUSTRATIVE SCENARIO
 * ============================================================================
 *
 * The audit multiplies the visitor's own figures by an improvement the visitor chose. It
 * is defensible precisely because of those two facts, and it stops being defensible the
 * moment the copy around it starts sounding like a forecast.
 * ============================================================================
 */
describe('the audit scenario', () => {
  it('calls itself illustrative in the heading, not only in the small print', () => {
    expect(audit.scenario.heading.toLowerCase()).toContain('illustrative');
    expect(audit.scenario.disclaimer.toLowerCase()).toContain('illustrative');
    expect(audit.scenario.disclaimer.toLowerCase()).toContain('not a forecast');
  });

  it('says out loud that the arithmetic is the visitor’s own assumption', () => {
    const copy = [audit.scenario.lede, audit.scenario.disclaimer, audit.funnel.lever.hint]
      .join(' ')
      .toLowerCase();

    expect(copy).toContain('your');
    expect(copy).toContain('not my estimate');
  });

  it('never promises that any piece of work produces the modelled outcome', () => {
    const copy = JSON.stringify(audit.scenario).toLowerCase();

    for (const forbidden of ['you will get', 'we predict', 'expected return', 'guaranteed']) {
      expect(copy).not.toContain(forbidden);
    }
  });
});

/*
 * ============================================================================
 * THE PRIVACY PAGE HAS TO DESCRIBE THIS SITE
 * ============================================================================
 *
 * The failure guarded against here is specific and easy to commit: a surface is added
 * that stores or transmits something, and the privacy page — written before it existed —
 * carries on describing a smaller site. It stops being wrong in the abstract and starts
 * being a published claim that is not true.
 *
 * The audit is exactly that case. It sends a generated summary of somebody's scores and
 * their own business figures through the `message` field, which the page previously
 * described only as "any message you write".
 * ============================================================================
 */
describe('the privacy page', () => {
  const everySection = privacyContent.sections.map((section) => section.body).join(' ');

  it('names every surface that transmits something', () => {
    expect(everySection).toMatch(/contact form/i);
    expect(everySection).toMatch(/audit/i);
    expect(everySection).toMatch(/playbook/i);
  });

  /*
   * The audit sends more than a typed message, and somebody who scored their own site
   * harshly is entitled to see that written down somewhere other than the button they
   * pressed.
   */
  it('says what the audit actually transmits, not just that it transmits', () => {
    const what = privacyContent.sections.find((section) => section.id === 'what');

    expect(what).toBeDefined();
    expect(what?.body).toMatch(/score/i);
    expect(what?.body).toMatch(/weakest/i);
  });

  /*
   * Two surfaces write to `localStorage`. A page that enumerates transmitted data while
   * staying silent about stored data is describing a smaller site than this one.
   */
  it('accounts for what never leaves the browser', () => {
    const browser = privacyContent.sections.find((section) => section.id === 'browser');

    expect(browser).toBeDefined();
    expect(browser?.body).toMatch(/local storage|your own browser/i);
    expect(browser?.body).toMatch(/clear/i);
  });

  /*
   * The claim in this section is true only while `lib/analytics.ts` has no sink. If a
   * provider is ever wired into `index.html`, this page has to change in the same commit
   * — which is what the note at the top of `content/legal.ts` says, and what this pins.
   */
  it('still claims no tracking, which is still true', () => {
    const tracking = privacyContent.sections.find((section) => section.id === 'tracking');

    expect(tracking?.body).toMatch(/no analytics product/i);
    expect(tracking?.body).toMatch(/if that ever changes/i);
  });
});

/*
 * The teardown's subject is a composite, and the sentence saying so is the difference
 * between a demonstration and a fabricated case study.
 */
describe('the teardown', () => {
  it('discloses the composite before anything is shown', () => {
    const disclosure = teardown.disclosure.toLowerCase();

    expect(disclosure).toContain('composite');
    expect(disclosure).toContain('not a real business');
    expect(disclosure).toContain('not a client');
  });

  it('describes the sample review as illustrative rather than as a client document', () => {
    expect(teardown.reviewSample.disclaimer.toLowerCase()).toContain('illustrative');
    expect(JSON.stringify(teardown.reviewSample).toLowerCase()).not.toContain('redact');
  });
});

/*
 * ============================================================================
 * WHERE THE ASSESSMENT LEADS
 * ============================================================================
 *
 * The audit used to end at its findings list: somebody scored twenty categories, read
 * five diagnoses, and was offered a form with nothing connecting what they had just
 * learned to what is for sale. It was the strongest asset on the site and it pointed
 * nowhere.
 *
 * `recommendedTier` closes that. What is pinned here is the branch that makes it
 * trustworthy rather than the branches that make money.
 * ============================================================================
 */
describe('the assessment recommendation', () => {
  const OUT_OF = 40;

  it('sends a badly scoring site to the tier that rebuilds it', () => {
    expect(recommendedTier(0, OUT_OF)?.id).toBe('growth');
    expect(recommendedTier(20, OUT_OF)?.id).toBe('growth');
  });

  it('sends a mostly-working site to the smaller tier', () => {
    expect(recommendedTier(28, OUT_OF)?.id).toBe('foundation');
    expect(recommendedTier(33, OUT_OF)?.id).toBe('foundation');
  });

  /*
   * The one that matters.
   *
   * A recommender that always recommends buying is not a recommender, and every reader
   * knows it. Telling somebody who scored well that they probably do not need a rebuild
   * costs an occasional sale and is the entire reason the other two recommendations are
   * worth reading. If this ever starts returning a tier, the feature has become an advert.
   */
  it('tells a site that scored well that it probably does not need rebuilding', () => {
    expect(recommendedTier(35, OUT_OF)).toBeNull();
    expect(recommendedTier(40, OUT_OF)).toBeNull();

    // And the copy for that branch exists, and recommends nothing.
    const none = audit.diagnosis.recommendation.none;
    expect(none.body.length).toBeGreaterThan(120);
    for (const tier of projectTiers) {
      expect(none.body).not.toContain(tier.name);
    }
  });

  /*
   * Thresholds are fractions, not raw scores, so growing the audit past twenty categories
   * cannot silently re-band everybody who has already taken it.
   */
  it('scales with the number of categories rather than assuming forty points', () => {
    expect(recommendedTier(10, 20)?.id).toBe(recommendedTier(20, 40)?.id);
    expect(recommendedTier(18, 20)).toBe(recommendedTier(36, 40));
  });

  it('never recommends anything from an impossible denominator', () => {
    expect(recommendedTier(10, 0)).toBeNull();
  });
});

/*
 * ============================================================================
 * NO DUPLICATE SELECTORS INSIDE ONE CSS MODULE
 * ============================================================================
 *
 * CSS modules scope by *file*, not by rule. Writing `.careList { … }` a second time in a
 * 2,100-line stylesheet does not create a second scoped class — it overrides the first
 * one, for every component already using it.
 *
 * That happened. A new care-plan grid reused a class name that `ManagementSection` and
 * `GrowthSection` were already rendering, and silently reformatted both of their bullet
 * lists into two columns above 48rem. Nothing failed. It is invisible in review because
 * the two definitions were 1,150 lines apart.
 *
 * Two things are deliberately NOT flagged, because both are correct CSS:
 *
 *   - **The same class inside a media query.** That is how a responsive override is
 *     written.
 *   - **A comma-grouped rule followed by single-class refinements**, e.g.
 *     `.a, .b, .c { shared }` then `.a { width: 85% }`. That is a shared base plus a
 *     specialisation, and it is the idiomatic way to write it.
 *
 * So the signature is narrower than "the name appears twice": both occurrences must be
 * *standalone, single-selector* rules at the top level. That is the shape of two unrelated
 * components fighting over one name, and it is the only shape that is always a mistake.
 * ============================================================================
 */
describe('the stylesheets', () => {
  function moduleFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return moduleFiles(path);
      return entry.name.endsWith('.module.css') ? [path] : [];
    });
  }

  it('never defines the same class twice at the top level of one file', () => {
    const collisions: string[] = [];

    for (const file of moduleFiles(join(import.meta.dirname, '..'))) {
      const lines = readFileSync(file, 'utf8').split('\n');
      const seen = new Map<string, number>();
      let depth = 0;

      lines.forEach((line, index) => {
        /*
         * Column zero means top level, and a trailing `{` means the rule opens here.
         *
         * The previous line matters: the *last* selector in a comma group also ends in
         * `{`, so `.a,\n.b,\n.c {` would otherwise record `.c` as standalone. A preceding
         * line ending in a comma means this is a group tail, and group members are exempt
         * for the reason in the note above.
         */
        const continuesGroup = /,\s*$/.test(lines[index - 1] ?? '');
        const match =
          depth === 0 && !continuesGroup ? line.match(/^\.([a-zA-Z][\w-]*)\s*\{/) : null;

        if (match?.[1]) {
          const previous = seen.get(match[1]);
          if (previous !== undefined) {
            collisions.push(
              // basename, on either path separator — this runs on Windows and on CI.
              `${file.split(sep).pop()}: .${match[1]} at line ${index + 1} ` +
                `overrides the definition at line ${previous}`,
            );
          } else {
            seen.set(match[1], index + 1);
          }
        }

        depth += (line.match(/\{/g) ?? []).length - (line.match(/\}/g) ?? []).length;
      });
    }

    expect(
      collisions,
      'A class defined twice in one CSS module silently overrides itself for every ' +
        'component already using it. Rename the newer one.',
    ).toEqual([]);
  });

  /*
   * ==========================================================================
   * NO CLASS THAT NOTHING RENDERS
   * ==========================================================================
   *
   * CSS is the one place in this repository where dead code costs bytes on every visit —
   * the stylesheet is a single eager file with its own payload budget, and an unused rule
   * is indistinguishable from a used one until somebody checks.
   *
   * The offer rebuild left six rules behind: an "Or pay annually" panel was replaced by a
   * line inside the card that prices it, and `.annual`, `.annualLabel`, `.annualPrice`,
   * `.annualCadence`, `.annualSaving` and `.annualNote` stayed where they were. Nothing
   * failed, and the next person to read that file would reasonably have assumed they were
   * load-bearing.
   *
   * The check is a text search for the class name as a quoted string, which is how every
   * component in this codebase reaches one. `Button` indexes with a variable —
   * `styles[variant]` — and is covered anyway, because the four variant names are written
   * as string literals in its own union type. If a component ever composes a class name at
   * runtime, that name has to be added to a literal somewhere or exempted here explicitly.
   * ==========================================================================
   */
  it('defines no class that nothing renders', () => {
    function sourceFiles(dir: string): string[] {
      return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) return sourceFiles(path);
        return /\.tsx?$/.test(entry.name) ? [path] : [];
      });
    }

    const root = join(import.meta.dirname, '..');
    const source = sourceFiles(root)
      .map((file) => readFileSync(file, 'utf8'))
      .join('\n');

    const dead: string[] = [];

    for (const file of moduleFiles(root)) {
      const css = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
      const names = new Set<string>();

      // A leading letter is required, so `padding: .5rem` is not mistaken for a selector.
      for (const [, name] of css.matchAll(/\.([a-zA-Z][A-Za-z0-9_-]*)/g)) {
        if (name) names.add(name);
      }

      for (const name of names) {
        if (source.includes(`'${name}'`) || source.includes(`"${name}"`)) continue;
        dead.push(`${file.split(sep).pop()}: .${name}`);
      }
    }

    expect(
      dead,
      'A CSS module class nothing renders ships on every visit and reads as load-bearing. ' +
        'Delete it, or reference it.',
    ).toEqual([]);
  });

  /*
   * ==========================================================================
   * NO RULE THAT A LATER, WIDER-MATCHING RULE ALWAYS BEATS
   * ==========================================================================
   *
   * The second half of the same failure, and the one that actually shipped twice.
   *
   *   @media (min-width: 64rem) { .priceList { grid-template-columns: repeat(3, 1fr) } }
   *   …800 lines…
   *   @media (min-width: 48rem) { .priceList { grid-template-columns: repeat(2, 1fr) } }
   *
   * At 64rem and wider **both** queries match. The selectors have equal specificity, so the
   * one written later wins, and the three-column rule never applies at any viewport. Three
   * pricing tiers rendered two-plus-an-orphan on every desktop screen, in two different
   * files, and nothing failed — a media query reads like a scope and is not one.
   *
   * The signature is exact: the same selector setting the same property, where the earlier
   * rule sits in a *narrower* query than the later one. Equal min-widths are skipped, since
   * `.a, .b { padding: 4 }` followed by `.a { padding: 8 }` is a deliberate refinement and
   * the idiomatic way to write one. Anything that is not a plain `min-width` query —
   * `max-width`, `prefers-reduced-motion`, `print` — is skipped rather than guessed at.
   * ==========================================================================
   */
  it('never writes a responsive rule that a later, wider query always overrides', () => {
    /** Blocks, with the selector they open, where they start, and their media floor. */
    type Block = { readonly prelude: string; readonly line: number };

    /** `null` means "not a plain min-width context" — analysed as unknown, so skipped. */
    function mediaFloor(ancestors: readonly Block[]): number | null {
      let floor = 0;

      for (const block of ancestors) {
        if (!block.prelude.startsWith('@')) continue;
        const width = block.prelude.match(/^@media\s*\(\s*min-width:\s*([\d.]+)rem\s*\)$/);
        if (!width?.[1]) return null;
        floor = Math.max(floor, Number(width[1]));
      }

      return floor;
    }

    const dead: string[] = [];

    for (const file of moduleFiles(join(import.meta.dirname, '..'))) {
      // Comments blanked rather than removed, so reported line numbers stay true.
      const css = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, (block) =>
        block.replace(/[^\n]/g, ' '),
      );

      const stack: Block[] = [];
      const declared = new Map<string, { floor: number; line: number }[]>();
      let buffer = '';
      let line = 1;

      for (const character of css) {
        if (character === '\n') line += 1;

        if (character === '{') {
          stack.push({ prelude: buffer.trim().replace(/\s+/g, ' '), line });
          buffer = '';
          continue;
        }

        if (character !== '}') {
          buffer += character;
          continue;
        }

        const block = stack.pop();
        const floor = mediaFloor(stack);

        // At-rules carry no declarations of their own; only rules are recorded.
        if (block && !block.prelude.startsWith('@') && floor !== null) {
          for (const selector of block.prelude.split(',')) {
            for (const declaration of buffer.split(';')) {
              const property = declaration.split(':')[0]?.trim();
              if (!property || !/^[a-z-]+$/.test(property)) continue;

              const key = `${selector.trim()}|${property}`;
              const previous = declared.get(key) ?? [];

              for (const earlier of previous) {
                if (earlier.floor <= floor) continue;
                dead.push(
                  `${file.split(sep).pop()}: ${selector.trim()} { ${property} } at line ` +
                    `${earlier.line} never applies — the rule at line ${block.line} is later ` +
                    `and matches from ${floor}rem, so it wins at every width the first one covers`,
                );
              }

              declared.set(key, [...previous, { floor, line: block.line }]);
            }
          }
        }

        buffer = '';
      }
    }

    expect(
      dead,
      'A rule inside a narrower media query, written before a later rule of equal ' +
        'specificity in a wider one, never applies at any viewport. Move it after.',
    ).toEqual([]);
  });
});
