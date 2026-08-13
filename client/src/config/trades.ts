/*
 * ============================================================================
 * THE TRADES — ONE TAXONOMY, USED BY THE AUDIT AND THE INDUSTRY PAGES
 * ============================================================================
 *
 * Before this file there was no trade taxonomy anywhere in the repository. The closest
 * thing was `content/portfolio.ts`, where five demonstration projects happen to carry an
 * `industry` string, and `content/home.ts`, where eight trades are listed as chips. Both
 * are prose about trades rather than a set of values anything can branch on.
 *
 * Two things now depend on this being one list: the audit asks which trade you are in and
 * changes its diagnosis accordingly, and the industry pages are generated from it. A
 * second list would mean an audit that knows about a trade with no page, or a page for a
 * trade the audit cannot diagnose.
 *
 * ## Rules
 *
 *   1. **`slug` is a URL and a stored value.** Changing one breaks a published page and
 *      orphans any audit already submitted with it. Add rather than rename.
 *   2. **Nothing here claims anything about a trade that is not obviously true of it.**
 *      "A furnace failure is urgent" is a fact about the job. "HVAC customers are more
 *      price-sensitive" would be an invention, and there is none of that below.
 *   3. **`other` exists and is not a second-class option.** Most of the businesses this
 *      is built for are not in the five named trades — painting, cleaning, pest control,
 *      remodelling, general contracting — and an audit that makes them pick the closest
 *      wrong answer is an audit that gives them the wrong diagnosis.
 * ============================================================================
 */

/** The stored, routable identity of a trade. Never rename one — add instead. */
export type TradeSlug = 'hvac' | 'plumbing' | 'roofing' | 'landscaping' | 'electrical' | 'other';

/*
 * Four fields, and it was six.
 *
 * `name` ("an HVAC company") and `urgency` ('urgent' | 'considered' | 'mixed') were both
 * written here, populated for all six trades, and read by nothing — the same dead-content
 * failure this project's first phase existed to delete from `offer.ts`. Both were removed
 * rather than found a use for.
 *
 * `urgency` in particular looked useful and was not: how long a trade's decision takes is
 * expressed by `IndustryPageContent.decisionWindow`, in a sentence that is actually
 * rendered and says far more than one of three words could. A parallel encoding nobody
 * reads is how two sources of truth start.
 */
export interface Trade {
  readonly slug: TradeSlug;
  /** Sentence-case label for a radio option or a page title. */
  readonly label: string;
  /**
   * How the customer arrives, in one sentence. This is the fact everything else about
   * the trade follows from — an emergency is a different sale from a planned project,
   * and the website has to be a different shape for each.
   */
  readonly buyingContext: string;
  /** Whether a dedicated industry page exists. `other` has none, by design. */
  readonly hasPage: boolean;
}

export const trades: readonly Trade[] = [
  {
    slug: 'hvac',
    label: 'Heating and cooling (HVAC)',
    buyingContext:
      'Heating or cooling has failed and the decision is being made in the next hour, often from a phone, often in an uncomfortable house.',
    hasPage: true,
  },
  {
    slug: 'plumbing',
    label: 'Plumbing',
    buyingContext:
      'Something is leaking, blocked or not producing hot water, and the customer is looking for whoever can come out soonest.',
    hasPage: true,
  },
  {
    slug: 'roofing',
    label: 'Roofing',
    buyingContext:
      'A large, infrequent purchase the customer cannot easily judge, usually compared across several contractors over days or weeks.',
    hasPage: true,
  },
  {
    slug: 'landscaping',
    label: 'Landscaping and yard care',
    buyingContext:
      'A decision made largely with the eyes, and often about recurring work rather than a single job.',
    hasPage: true,
  },
  {
    slug: 'electrical',
    label: 'Electrical',
    buyingContext:
      'Split between work that cannot wait and work that is planned, with licensing and safety carrying more weight than in most trades.',
    hasPage: true,
  },
  {
    slug: 'other',
    label: 'Something else',
    buyingContext:
      'A local customer finds you, forms an impression, and decides whether to make contact — which is the pattern the whole approach is built around.',
    hasPage: false,
  },
];

const bySlug = new Map(trades.map((trade) => [trade.slug, trade]));

/** Resolves a stored or routed slug. Returns `undefined` rather than guessing. */
export function findTrade(slug: string): Trade | undefined {
  return bySlug.get(slug as TradeSlug);
}

/** The five trades with their own page. `other` is deliberately absent. */
export const tradesWithPages = trades.filter((trade) => trade.hasPage);

/**
 * The URL of a trade's industry page, derived rather than typed out.
 *
 * `/hvac-websites` rather than `/industries/hvac` because the reader sees this in a
 * search result, and the flat form says what the page is without a directory word nobody
 * searches for. `content.test.ts` asserts that every trade with `hasPage` has a route
 * constant, a `PageMeta` entry and an `industries` entry at exactly this path — which is
 * what stops the five-file lockstep coming apart when a sixth trade is added.
 */
export function industryPath<S extends TradeSlug>(slug: S): `/${S}-websites` {
  return `/${slug}-websites`;
}

export function isTradeSlug(value: unknown): value is TradeSlug {
  return typeof value === 'string' && bySlug.has(value as TradeSlug);
}
