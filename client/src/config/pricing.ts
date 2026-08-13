/*
 * ============================================================================
 * MONEY. ALL OF IT, IN ONE FILE.
 * ============================================================================
 *
 * Every figure the site publishes is derived from this file. Nothing else in the
 * repository states a price, and `content.test.ts` sweeps the whole content layer and
 * fails the build on any currency figure that is not produced here.
 *
 * The failure that guard exists to prevent is specific and invisible in review: $4,900 on
 * the homepage and $4,500 in an FAQ answer written six months later, discovered by a
 * customer. Prices are declared as **numbers** and formatted on the way out, so the same
 * figure cannot be typed twice and disagree with itself.
 *
 * `docs/business-offer.md` is authoritative on every decision here. These are commercial
 * commitments, not implementation details — changing one is the owner's call, and the two
 * files must be changed together.
 *
 * ============================================================================
 * WHY THERE IS NO "WAS $7,500" ON THIS SITE
 * ============================================================================
 *
 * The FTC's Guides Against Deceptive Pricing (16 CFR 233.1) allow a former-price
 * comparison only where the former price was **an actual, bona fide price, offered to the
 * public on a regular basis, for a reasonably substantial period.** Setting a high
 * "original" price the business never actually sold at, in order to make the discount
 * look larger, is deceptive under §5 of the FTC Act. Strike-through pricing is the visual
 * grammar of "was", and carries the same risk as saying it in words.
 *
 * **This business has never charged the standard prices below.** They are a rate card
 * being established now, not a price history. So:
 *
 *   - the standard price is labelled **"Standard project price"** and never "was",
 *     "regularly", "normally", or "reg."
 *   - it is **never rendered with a strike-through**, because that is a former-price
 *     claim made with CSS instead of words;
 *   - the saving is the difference between **two prices that are both available today**,
 *     one of them conditional — which is a present, qualified discount rather than a
 *     comparison with a past that did not happen;
 *   - the condition is real and is stated next to the number.
 *
 * There is no countdown, no deadline and no invented scarcity anywhere in this file, and
 * `pricing.test.ts` fails the build if the words that would imply one appear.
 * ============================================================================
 */

/** Whole dollars. Formatted on the way out — see `money()`. */
export type Dollars = number;

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

/** `4900` → `"$4,900"`. The only way a dollar figure reaches the page. */
export function money(amount: Dollars): string {
  return usd.format(amount);
}

/* ------------------------------------------------------------------ the project tiers */

export type ProjectTierId = 'foundation' | 'growth' | 'dominate';

export interface ProjectTier {
  readonly id: ProjectTierId;
  /** Display order, low to high. */
  readonly order: number;
  readonly name: string;
  /** Who this is the right size for, in the buyer's terms rather than in scope terms. */
  readonly bestFor: string;
  /**
   * The rate card. What the work is priced at outside the founding-client offer.
   *
   * **Not a former price.** See the note at the top of this file before rendering it.
   */
  readonly standard: Dollars;
  /** The price available now, to a client who meets `foundingOffer.qualification`. */
  readonly founding: Dollars;
  /** Exactly one tier carries this. A test enforces that. */
  readonly recommended: boolean;
  /** What is actually delivered. Each line is a deliverable, not an adjective. */
  readonly includes: readonly string[];
  /** Scope limits that belong beside the price rather than in a footnote. */
  readonly terms: string;
}

/**
 * Three sizes of the same system.
 *
 * They are not good/better/best versions of one deliverable — each one is scoped to a
 * different situation, and the middle one is where most local service businesses land,
 * which is why it is the recommended tier rather than a merchandising decision.
 */
export const projectTiers: readonly ProjectTier[] = [
  {
    id: 'foundation',
    order: 1,
    name: 'Foundation',
    bestFor:
      'You have a website that looks acceptable and does not bring in work. This rebuilds it around getting contacted.',
    standard: 3_500,
    founding: 2_500,
    recommended: false,
    includes: [
      'Conversion-focused rebuild of your existing site',
      'Mobile-first, because that is where local customers are',
      'Home, about, contact and up to four service pages',
      'Tap-to-call and quote request, on every screen',
      'Technical search foundation so you can be found',
      'Analytics and conversion tracking configured',
      'Two revision rounds within the agreed scope',
    ],
    terms: 'Two revision rounds included. New scope quoted separately.',
  },
  {
    id: 'growth',
    order: 2,
    name: 'Growth',
    bestFor:
      'You want the website to be the thing that brings in work, not the thing customers check after they already heard about you.',
    standard: 7_500,
    founding: 4_900,
    recommended: true,
    includes: [
      'Everything in Foundation',
      'Competitor and customer-journey research before design starts',
      'Custom design built around how your customers actually decide',
      'Up to eight service pages, written for what people search',
      'Local search architecture for your service area',
      'A quote request flow designed as a funnel, not a form',
      'Reviews and proof placed where the decision happens',
      'Launch QA against the Launch Standard',
      '30 days of post-launch improvement after it goes live',
    ],
    terms: 'Two revision rounds included. New scope quoted separately.',
  },
  {
    id: 'dominate',
    order: 3,
    name: 'Dominate',
    bestFor:
      'You have several service lines or service areas, and the website has to keep up with an operation that is already working.',
    standard: 12_000,
    founding: 8_500,
    recommended: false,
    includes: [
      'Everything in Growth',
      /*
       * "built to rank in each one" was here, which promised a search *result*. Nothing on
       * this site is allowed to — rankings depend on competition nobody controls, and the
       * FAQ answers "do you guarantee Google rankings" with a flat no. Describes the work
       * now, which is the part that can actually be delivered.
       */
      'A page per service area, on the same local-search foundation as the rest of the site',
      'Multi-step lead funnels for higher-value jobs',
      'Integration with the tools you already run the business on',
      'Custom functionality where an off-the-shelf answer does not fit',
      'Ongoing conversion testing after launch',
      'Analytics reviews, in plain English',
      'Priority response on everything',
    ],
    terms:
      'Scope is agreed in writing before anything starts, because at this size no two are the same.',
  },
];

/* ------------------------------------------------------------------ the founding offer */

/**
 * ============================================================================
 * THE FOUNDING-CLIENT OFFER — READ BEFORE CHANGING
 * ============================================================================
 *
 * This is the only thing on the site that makes a price lower than the published rate,
 * and it is truthful only while all three of these hold:
 *
 *  1. **The qualification is real.** A founding client actually agrees to the project
 *     being documented as a case study. If the business stops asking for that, the
 *     discount has no condition attached and the standard price stops being the price.
 *  2. **The cap is real.** `remaining` is a number the owner edits by hand as projects
 *     are taken. It is not a timer, it does not tick down on its own, and nothing on the
 *     site pretends it does. Manufactured scarcity is the thing this offer is designed
 *     not to be.
 *  3. **The standard price is the price afterwards.** If the business never intends to
 *     charge the standard prices, they are not standard prices and this whole block has
 *     to go.
 *
 * Set `enabled: false` and every trace of founding pricing disappears from the site —
 * the standard prices become the prices, and nothing anywhere is left claiming a discount
 * that is no longer offered.
 * ============================================================================
 */
export const foundingOffer = {
  enabled: true,
  label: 'Founding client pricing',
  /**
   * How many projects are being taken at this price. **Owner-confirmed number.** Edited by
   * hand; never derived, never counted down automatically.
   */
  total: 10,
  /**
   * How many are left. Rendered only as a plain sentence. If this is ever wrong it is a
   * false statement about availability, so it is better left equal to `total` than
   * guessed at.
   */
  remaining: 10,
  /** The condition. It is the reason the price is lower, so it is stated beside it. */
  qualification:
    'in exchange for permission to document the work as a case study — the before, the reasoning, and what changed after launch',
  /**
   * Why this exists, in the buyer's terms. Deliberately not "limited time": it is limited
   * by count and by a condition, and saying anything else would be untrue.
   */
  explanation:
    'This is a new practice and it needs published work more than it needs full margin on the first ten projects. That is the whole trade, and it is the only reason the number is lower.',
  standardLabel: 'Standard project price',
} as const;

/** `true` when a tier is genuinely cheaper today than its rate card. */
export function hasFoundingDiscount(tier: ProjectTier): boolean {
  return foundingOffer.enabled && tier.founding < tier.standard;
}

/** What a founding client actually pays today. */
export function currentPrice(tier: ProjectTier): Dollars {
  return hasFoundingDiscount(tier) ? tier.founding : tier.standard;
}

/**
 * The saving, derived rather than typed.
 *
 * Every "save $2,600" on the site comes from here, so a price change cannot leave a stale
 * saving behind it — which is the specific way a discount claim becomes a false one.
 */
export function saving(tier: ProjectTier): Dollars {
  return hasFoundingDiscount(tier) ? tier.standard - tier.founding : 0;
}

/** Half up front, half on launch day. Derived from what is actually being paid. */
export function deposit(tier: ProjectTier): Dollars {
  return Math.round(currentPrice(tier) / 2);
}

/* ------------------------------------------------------------------ the recurring plan */

export interface CarePlan {
  readonly id: 'essential' | 'advanced';
  readonly name: string;
  readonly monthly: Dollars;
  /** Annual prepay, where one is offered. */
  readonly annual?: Dollars;
  readonly summary: string;
  readonly includes: readonly string[];
  readonly recommended: boolean;
}

/**
 * The service after launch, sold separately and on purpose.
 *
 * It is not bundled into the project price and it is not required to buy one. A project
 * that only makes sense with a subscription attached is a project priced dishonestly, and
 * the buyer works that out in month four.
 */
export const carePlans: readonly CarePlan[] = [
  {
    id: 'essential',
    name: 'Growth Partner',
    monthly: 299,
    annual: 2_990,
    summary: 'Someone keeping the site running, current, and getting better at bringing in work.',
    includes: [
      'Hosting, certificates, backups and security updates',
      'Uptime and form-delivery monitoring, so a broken form is found by me',
      'Content, service and photo changes when you ask',
      'Conversion and user-experience improvements',
      'Four seasonal refreshes a year',
      'Measurement, and what it means in plain English',
      '24-hour response guarantee',
    ],
    recommended: true,
  },
  {
    id: 'advanced',
    name: 'Growth Partner Plus',
    monthly: 499,
    summary:
      'The same, plus active testing — for a business with enough traffic that a change can be measured rather than argued about.',
    includes: [
      'Everything in Growth Partner',
      'A/B testing where traffic supports a meaningful result',
      'Up to one campaign landing page a month',
      'Up to two campaign copy alignments a month',
      'A monthly performance review you actually receive',
      'Priority response',
    ],
    recommended: false,
  },
];

/* ------------------------------------------------------------------ derived lookups */

export const growthTier: ProjectTier =
  projectTiers.find((tier) => tier.recommended) ?? (projectTiers[1] as ProjectTier);

export const essentialPlan: CarePlan = carePlans[0] as CarePlan;

/**
 * ============================================================================
 * WHAT THE ASSESSMENT SHOULD POINT SOMEBODY AT
 * ============================================================================
 *
 * The audit scores a website out of forty. This turns that into a starting point.
 *
 * It is a **suggestion made from the reader's own answers**, which is the only kind of
 * recommendation worth anything here: the alternative is a pricing page that recommends
 * the middle tier to everybody, which every reader has seen before and correctly discounts.
 *
 * **The top band returns `null` on purpose.** Somebody scoring 34+ has a site that is
 * mostly working, and the honest answer is that they probably do not need a rebuild. Saying
 * so costs an occasional sale and is the reason the other three recommendations are worth
 * reading — a recommender that always recommends buying is not a recommender.
 *
 * Thresholds are fractions rather than raw scores so the audit can grow past twenty
 * categories without silently re-banding everybody.
 */
export function recommendedTier(score: number, outOf: number): ProjectTier | null {
  if (outOf <= 0) return null;

  const fraction = score / outOf;

  // Below two thirds: enough is wrong that patching it costs more than rebuilding it.
  if (fraction < 0.65) return projectTiers.find((tier) => tier.id === 'growth') ?? null;
  // Working, with real gaps. Targeted work rather than a rebuild.
  if (fraction < 0.85) return projectTiers.find((tier) => tier.id === 'foundation') ?? null;
  // Mostly right already. The honest answer is "probably not this".
  return null;
}

/**
 * Every currency string this configuration can put on a page.
 *
 * `content.test.ts` sweeps the content layer for `$`-figures and fails on anything absent
 * from this set. Deriving it here rather than listing it in the test is what keeps the
 * guard true after a price changes: add a tier and its figures are sanctioned; type a
 * figure by hand anywhere else and the build fails.
 */
export function sanctionedFigures(): ReadonlySet<string> {
  const figures = new Set<string>();

  for (const tier of projectTiers) {
    figures.add(money(tier.standard));
    figures.add(money(tier.founding));
    figures.add(money(deposit(tier)));
    if (saving(tier) > 0) figures.add(money(saving(tier)));
  }

  for (const plan of carePlans) {
    figures.add(money(plan.monthly));
    figures.add(`${money(plan.monthly)}/mo`);
    if (plan.annual !== undefined) figures.add(money(plan.annual));
  }

  return figures;
}
