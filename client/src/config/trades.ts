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
 *   3. **`other` exists and is not a second-class option.** Plenty of the businesses this
 *      is built for are not in the named trades — painting, remodelling, general
 *      contracting, appliance repair — and an audit that makes them pick the closest wrong
 *      answer is an audit that gives them the wrong diagnosis. Adding names to the list
 *      narrows how often that happens; it never removes the need for the last option.
 * ============================================================================
 */

/**
 * The stored, routable identity of a trade. Never rename one — add instead.
 *
 * ## Why there are now twelve rather than six
 *
 * The capability layer maps what a website can do for a business onto the kind of
 * business reading it, and the kinds it needs to name include cleaning, pest control,
 * auto detailing, photography, personal training and moving. Those could have been a
 * second enum inside the capability library, and that would have been the wrong answer:
 * this file's whole reason to exist is that a trade the audit can diagnose and a trade
 * the site can talk about are the same list. Two lists is how you get a capability
 * recommended for a business the audit cannot identify.
 *
 * So they are added here, all with `hasPage: false`, and every surface reads the one
 * array. The consequence, stated rather than discovered: the audit's step-1 radio group
 * is twice as long as it was. That is a real cost on the site's highest-intent page and
 * it is worth paying — the published audience already includes these businesses (see
 * `faq.ts` and `home.ts`), and an owner who has to answer "something else" because their
 * trade is missing has been told the page is not for them.
 */
export type TradeSlug =
  | 'hvac'
  | 'plumbing'
  | 'roofing'
  | 'landscaping'
  | 'electrical'
  | 'cleaning'
  | 'pest-control'
  | 'auto-detailing'
  | 'photography'
  | 'personal-training'
  | 'moving'
  | 'other';

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
/**
 * How the work is bought, which cuts across trade.
 *
 * A failed furnace and a burst pipe are the same *sale* in two different trades; a
 * recurring cleaning round and a recurring pest visit are the same sale too. This is the
 * axis that actually predicts what a website has to do, which is why the capability layer
 * weighs it more heavily than the trade itself — see `lib/capabilityMatch.ts`.
 *
 * It is defined **here** rather than in `types/content.ts` because `types/content.ts`
 * already imports `TradeSlug` from this file, and putting it the other way round would make
 * the two modules import each other. This is also its natural home: it is a fact about how
 * a trade's work is bought, and that is what this file is for.
 */
export type ServiceModel = 'emergency' | 'scheduled' | 'project' | 'recurring' | 'consultative';

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
  /**
   * The same fact as `buyingContext`, in a form logic can branch on.
   *
   * It is not a duplicate source of truth: the sentence is what a reader gets, this is what
   * the recommendation engine gets, and `capabilities.test.ts` asserts every trade has at
   * least one — a trade with an empty list would silently receive no recommendations at all
   * rather than an obviously wrong one, which is the harder failure to notice.
   *
   * Ordered by how much of the trade's work each model accounts for, most first. The
   * recommendation weighs the first one more heavily.
   */
  readonly serviceModels: readonly ServiceModel[];
  /** Whether a dedicated industry page exists. `other` has none, by design. */
  readonly hasPage: boolean;
}

export const trades: readonly Trade[] = [
  {
    slug: 'hvac',
    label: 'Heating and cooling (HVAC)',
    buyingContext:
      'Heating or cooling has failed and the decision is being made in the next hour, often from a phone, often in an uncomfortable house.',
    serviceModels: ['emergency', 'scheduled', 'project', 'recurring'],
    hasPage: true,
  },
  {
    slug: 'plumbing',
    label: 'Plumbing',
    buyingContext:
      'Something is leaking, blocked or not producing hot water, and the customer is looking for whoever can come out soonest.',
    serviceModels: ['emergency', 'scheduled', 'project'],
    hasPage: true,
  },
  {
    slug: 'roofing',
    label: 'Roofing',
    buyingContext:
      'A large, infrequent purchase the customer cannot easily judge, usually compared across several contractors over days or weeks.',
    serviceModels: ['project', 'consultative', 'emergency'],
    hasPage: true,
  },
  {
    slug: 'landscaping',
    label: 'Landscaping and yard care',
    buyingContext:
      'A decision made largely with the eyes, and often about recurring work rather than a single job.',
    serviceModels: ['recurring', 'project', 'scheduled'],
    hasPage: true,
  },
  {
    slug: 'electrical',
    label: 'Electrical',
    buyingContext:
      'Split between work that cannot wait and work that is planned, with licensing and safety carrying more weight than in most trades.',
    serviceModels: ['emergency', 'scheduled', 'project'],
    hasPage: true,
  },
  /*
   * The six below have no page of their own and are not lesser answers. Each
   * `buyingContext` is a fact about how the job is bought, in the same register as the
   * five above — nothing here claims a preference, a price sensitivity or a margin,
   * because none of that is knowable from the trade alone (rule 2).
   */
  {
    slug: 'cleaning',
    label: 'Cleaning services',
    buyingContext:
      'Usually recurring work rather than a single job, and the decision turns on trust in somebody who will be inside the house unsupervised.',
    serviceModels: ['recurring', 'scheduled'],
    hasPage: false,
  },
  {
    slug: 'pest-control',
    label: 'Pest control',
    buyingContext:
      'Something has been seen and the customer wants it gone, then often wants it not to come back — an urgent call that turns into a recurring arrangement.',
    serviceModels: ['emergency', 'recurring', 'scheduled'],
    hasPage: false,
  },
  {
    slug: 'auto-detailing',
    label: 'Auto detailing',
    buyingContext:
      'Judged almost entirely on finished-work photographs, and frequently booked for a specific date rather than as soon as possible.',
    serviceModels: ['scheduled', 'recurring'],
    hasPage: false,
  },
  {
    slug: 'photography',
    label: 'Photography and video',
    buyingContext:
      'The portfolio is the sales pitch, and the enquiry is usually about one date that either is or is not available.',
    serviceModels: ['scheduled', 'consultative', 'project'],
    hasPage: false,
  },
  {
    slug: 'personal-training',
    label: 'Personal training and coaching',
    buyingContext:
      'A recurring commitment bought from a person rather than a company, where the customer wants to know who they would be working with before they enquire.',
    serviceModels: ['recurring', 'consultative', 'scheduled'],
    hasPage: false,
  },
  {
    slug: 'moving',
    label: 'Moving and hauling',
    buyingContext:
      'A dated job with a size the customer cannot describe accurately, so the enquiry is mostly about getting to a number they can compare.',
    serviceModels: ['scheduled', 'project'],
    hasPage: false,
  },
  {
    slug: 'other',
    label: 'Something else',
    buyingContext:
      'A local customer finds you, forms an impression, and decides whether to make contact — which is the pattern the whole approach is built around.',
    /*
     * Every model, because "something else" is genuinely every shape of local service
     * business. The consequence in the recommendation engine is deliberate: a reader who
     * picks this gets the capabilities that apply to everybody and nothing trade-specific,
     * which is the honest answer rather than a guess dressed as personalisation.
     */
    serviceModels: ['emergency', 'scheduled', 'project', 'recurring', 'consultative'],
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
