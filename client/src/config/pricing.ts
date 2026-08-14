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
 * THE COMMERCIAL SHAPE — ONE BUILD, ONE FIX, ONE OPTIONAL PLAN
 * ============================================================================
 *
 * Three products, and the third one is new. `recommendedAction()` at the bottom of this
 * file has always had three branches — rebuild, fix, leave it alone — and until now only
 * the first of them pointed at something a reader could buy. The middle branch, which is
 * the one most established businesses with a working site actually land in, ended at the
 * words "quoted per site": a diagnosis with no product behind it.
 *
 *   - **Customer Conversion Build** ($4,900 founding / $7,500 standard) — the rebuild.
 *   - **Conversion Fix** (scope published here, price awaiting the owner — see below) —
 *     targeted corrective work on a site that is basically sound.
 *   - **Growth Partner** ($299/mo, optional) — measurement and improvement after launch.
 *
 * This file used to hold three project tiers and two care plans. It holds one build and
 * one plan now, and that was a deliberate simplification rather than a loss:
 *
 *   - **Foundation** ($2,500) described fixing an existing site, which is exactly the
 *     work the site already prices honestly as "quoted per site" — a fixed figure for
 *     unseen work was a guess wearing a price tag.
 *   - **Dominate** ($8,500 one-time) promised *ongoing* work — conversion testing,
 *     analytics reviews, priority response — inside a one-time fee, with no time bound.
 *     That is the recurring service sold twice, once of them unsustainably.
 *   - **Growth Partner Plus** ($499/mo) charged $200/month more for work the $299 scope
 *     already promised in three other places (campaign pages, copy alignments, testing
 *     where traffic supports it), plus an undefined "priority response".
 *
 * What remains is the model the site can actually keep: one flagship build at one price,
 * and one optional monthly service that starts only if the client chooses it. Larger or
 * smaller work is quoted in writing before anything starts.
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
 * **This business has never charged the standard price below.** It is a rate card
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
 * `content.test.ts` fails the build if the words that would imply one appear. The one
 * limitation that is published — one build at a time — is a real capacity constraint,
 * not a marketing device, and it is stated as the reason the timeline is keepable.
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

/* ------------------------------------------------------------------ the build */

/**
 * ============================================================================
 * THE BUILD, GROUPED BY WHAT IT CHANGES FOR THE CUSTOMER'S CUSTOMER
 * ============================================================================
 *
 * The deliverables used to be a flat list of thirteen strings. Eleven of them were
 * features — "Local-search foundation: structure, titles, sitemap, indexing and
 * local-business markup" is five nouns — and a feature list is the artefact a buyer
 * prices against a template, because it is the only thing a template also has.
 *
 * They are grouped now, and the group is the *promise*: the thing that changes for the
 * person deciding whether to call. Each group states the promise, names the mechanism so
 * the buyer knows what they bought, says why it matters in the owner's terms, and only
 * then lists what is delivered. Feature → why it exists → business relevance, every time.
 *
 * **`includes` is derived from the groups rather than typed beside them.** Two lists of
 * the same deliverables is two lists that drift, and the flat one is still needed: the
 * pricing card renders it as a checklist and three guards sweep it. Deriving means the
 * grouped presentation and the commitment cannot disagree.
 *
 * Nothing in any group may describe recurring work — hosting months, seasonal refreshes,
 * ongoing testing — because mixing the two is exactly how the previous three-tier
 * structure ended up selling the monthly service inside a one-time fee. A test enforces
 * the separation, and it sweeps the derived list, so it covers the groups too.
 */
export interface BuildOutcome {
  readonly id: string;
  /**
   * What changes for the visitor, written as something that happens to them rather than
   * as something we install. This is the heading the reader scans.
   */
  readonly promise: string;
  /** The name of the mechanism, so the buyer has a word for the thing they bought. */
  readonly name: string;
  readonly detail: string;
  /**
   * Why it changes anything, in the owner's terms.
   *
   * **Never a claim about a result.** "Gives search engines a clearer account of your
   * services" is defensible; "gets you ranked" is not, and the site answers the ranking
   * question with a flat no four paragraphs later.
   */
  readonly whyItMatters: string;
  /** The deliverables. One-time only. */
  readonly includes: readonly string[];
}

/**
 * The flagship project: one website build at one published price.
 */
export interface ProjectOffer {
  readonly id: 'flagship';
  readonly name: string;
  /** Who this is the right size for, in the buyer's terms rather than in scope terms. */
  readonly bestFor: string;
  /**
   * The one-line statement of what the money buys, in outcome terms.
   *
   * Rendered as the pricing card's main statement, directly under the product name and
   * above the figure — so the reader meets the outcome before the number rather than
   * having to assemble it from the deliverables afterwards.
   */
  readonly statement: string;
  /**
   * The rate card. What the work is priced at outside the founding-client offer.
   *
   * **Not a former price.** See the note at the top of this file before rendering it.
   */
  readonly standard: Dollars;
  /** The price available now, to a client who meets `foundingOffer.qualification`. */
  readonly founding: Dollars;
  /** The deliverables, grouped by the promise each group keeps. */
  readonly outcomes: readonly BuildOutcome[];
  /** Every deliverable, flattened. **Derived from `outcomes` — never typed.** */
  readonly includes: readonly string[];
}

/**
 * Scope quantities, stated once.
 *
 * The previous structure published three different service-page counts — four on
 * Foundation, eight on Growth, "up to six" in the published terms — two of them on the
 * same screen. Every count the copy states now interpolates these, and a test converts
 * the words back to numbers and fails the build on any figure that disagrees.
 */
export const buildScope = {
  /** Service pages included in the flagship build, in addition to home, about and contact. */
  servicePages: 6,
  /** The same number, as prose. A test asserts the two agree. */
  servicePagesWord: 'six',
  revisionRounds: 2,
  revisionRoundsWord: 'two',
} as const;

/**
 * The seven promises the build keeps, in the order the customer's customer meets them.
 *
 * The last two are the ones the previous version of this offer did not have a name for,
 * and they are the reason the recurring service is defensible: a build that records where
 * the enquiry rate started, and hands over a written account of the first month, is a
 * build the monthly service can be judged against. Without them, "ongoing improvement"
 * has no baseline and no first data point, which is why it read as upkeep.
 */
export const buildOutcomes: readonly BuildOutcome[] = [
  {
    id: 'designed',
    promise: 'It is built around how your customers decide',
    name: 'Research before design',
    detail:
      'Your competitors, and the actual sequence somebody goes through before they pick up the phone — established first, then designed to.',
    whyItMatters:
      'A stranger can tell within seconds that you do the job they need, and that you look like the safe pair of hands.',
    includes: [
      'Competitor and customer-journey research before design starts',
      'Custom, mobile-first design built around how customers decide',
    ],
  },
  {
    id: 'found',
    promise: 'Your customers find you',
    name: 'Local-search foundation',
    detail:
      'Search structure, page titles, sitemap, indexing and local-business markup, plus redirects that keep what you have already earned.',
    whyItMatters:
      'Search engines get a clearer account of what you do and where you do it, and the links and listings that already point at you keep working.',
    includes: [
      'Local-search foundation: structure, titles, sitemap, indexing and local-business markup',
      'Redirects from your old pages, so existing links keep working',
    ],
  },
  {
    id: 'understood',
    promise: 'Your customers understand what you do',
    name: 'A page per service',
    detail: `Home, about and contact, plus up to ${buildScope.servicePagesWord} service pages written the way customers describe the job.`,
    whyItMatters:
      'The people already searching for your trade find the exact service they need and can see straight away that you cover their area.',
    includes: [
      `Home, about and contact pages, plus up to ${buildScope.servicePagesWord} service pages written for what people search`,
    ],
  },
  {
    id: 'trusted',
    promise: 'Your customers trust you',
    name: 'Trust architecture',
    detail:
      'Photographs of your finished work, licence and insurance details, service area and reviews, placed at the point the doubt actually happens.',
    whyItMatters:
      'The reason somebody does not call a business they have never used is doubt, and doubt is answered where it occurs rather than on an about page.',
    includes: ['Trust signals and proof placed where the decision happens'],
  },
  {
    id: 'contacted',
    promise: 'Your customers contact you',
    name: 'Conversion paths',
    detail:
      'A quote request built as a funnel rather than a form, tap-to-call in the header of every page, and one obvious next step wherever the reader is.',
    whyItMatters:
      'Somebody who has already decided to get in touch never has to work out how — which is where a surprising share of the people you already paid for give up.',
    includes: [
      'A quote request flow designed as a funnel, not a form',
      'Tap-to-call and one obvious next step, on every screen',
    ],
  },
  {
    id: 'measured',
    promise: 'You can see what it produced',
    name: 'Your enquiry baseline',
    detail:
      'Calls and quote requests configured as countable events, verified with real submissions, and the starting figure written down on launch day.',
    /*
     * The baseline is the deliverable this offer was missing, and it is worth being clear
     * about why it is here rather than in the plan: it is the *opening balance*. Without a
     * number recorded at launch, every later claim about improvement is an assertion, and
     * "ongoing optimisation" is indistinguishable from upkeep. It is one-time work — the
     * measuring of it afterwards is what Growth Partner is.
     */
    whyItMatters:
      'Month one has a number instead of an impression, and anything changed later has something honest to be judged against.',
    includes: [
      'Analytics and conversion tracking configured and verified with real events',
      'Your enquiry baseline recorded in writing on launch day',
    ],
  },
  {
    id: 'launched',
    promise: 'It launches properly, in your name',
    name: 'The Launch Standard, and the first 30 days',
    detail:
      'Eight published checks it has to pass before it is called finished, accounts in your name from the start, and the first month after launch included.',
    whyItMatters:
      'You own everything from day one, and "finished" is a checklist you could verify yourself rather than an opinion we hold.',
    includes: [
      'Domain, hosting and launch setup on accounts in your name',
      'Launch QA against the published Launch Standard',
      // The count is guarded by the words-to-numbers test against `buildScope`.
      'Two revision rounds within the agreed scope',
      /*
       * Time-bounded on purpose: 30 days is part of the build, not a soft opening of the
       * monthly service. It restores a deliverable the previous $4,900 tier documented
       * ("30 days of post-launch improvement") and is flagged for owner confirmation in
       * docs/owner-decisions-required.md — see DECISION 007.
       */
      '30 days of checks, fixes and small improvements after launch',
      /*
       * The day-30 report. Previously this existed only as the fifth beat of a prose
       * section; naming it as a deliverable is what makes it a thing the client notices
       * arriving — and notices not arriving, which is the property that makes it worth
       * anything. DECISION 007 covers whether it is genuinely deliverable every time.
       */
      'A written 30-day report: what happened, what was changed, and what we would do next',
    ],
  },
];

export const flagship: ProjectOffer = {
  id: 'flagship',
  /*
   * "The Customer Conversion Website" → "Customer Conversion Build".
   *
   * The word doing the damage was the last one. A *website* is the artefact, and the
   * artefact is the half of this a template also has — so naming the product after it
   * invited the one comparison the offer cannot win. "Build" names the engagement rather
   * than the object, keeps the sentence concrete enough for somebody who has never bought
   * one, and leaves "website" to do its real job in the statement underneath, where it
   * explains rather than defines.
   */
  name: 'Customer Conversion Build',
  bestFor:
    'A local service business people already find — through search, referrals, or a van with your name on it — whose website is not turning enough of them into calls.',
  statement:
    'A website built to turn more of the people already finding you into calls and quote requests — measured from launch day.',
  standard: 7_500,
  founding: 4_900,
  outcomes: buildOutcomes,
  includes: buildOutcomes.flatMap((outcome) => outcome.includes),
};

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
 *  2. **The cap is real.** `taken` is a number the owner edits by hand as agreements are
 *     signed. When it reaches `total`, the founding price disappears from the site
 *     automatically and the standard price becomes the price. There is deliberately no
 *     live "X of 10 still open" counter rendered anywhere — a hand-maintained
 *     availability claim is one missed edit away from being a false statement.
 *  3. **The standard price is the price afterwards.** If the business never intends to
 *     charge the standard price, it is not a standard price and this whole block has
 *     to go.
 *
 * Set `enabled: false` and every trace of founding pricing disappears from the site —
 * the standard price becomes the price, and nothing anywhere is left claiming a discount
 * that is no longer offered.
 * ============================================================================
 */
export const foundingOffer = {
  enabled: true,
  label: 'Founding client pricing',
  /** How many projects are offered at this price, in total. Owner-confirmed number. */
  total: 10,
  /**
   * How many founding projects have been signed. **Owner-edited, by hand, as agreements
   * are signed.** Never derived, never counted down automatically. At `total`, the
   * discount switches itself off.
   */
  taken: 0,
  /** The condition. It is the reason the price is lower, so it is stated beside it. */
  qualification:
    'in exchange for permission to document the work as a case study — the before, the reasoning, and what changed after launch',
  /**
   * Why this exists, in the buyer's terms. Deliberately not "limited time": it is limited
   * by count and by a condition, and saying anything else would be untrue.
   */
  explanation:
    'A new practice needs published work more than it needs full margin. That is the whole trade, and the only reason the number is lower.',
  standardLabel: 'Standard project price',
} as const;

/** `true` while founding projects remain to be taken. */
export function foundingActive(): boolean {
  return foundingOffer.enabled && foundingOffer.taken < foundingOffer.total;
}

/** `true` when the build is genuinely cheaper today than its rate card. */
export function hasFoundingDiscount(): boolean {
  return foundingActive() && flagship.founding < flagship.standard;
}

/** What a client actually pays for the build today. */
export function currentPrice(): Dollars {
  return hasFoundingDiscount() ? flagship.founding : flagship.standard;
}

/**
 * The saving, derived rather than typed.
 *
 * Every "save $2,600" on the site comes from here, so a price change cannot leave a stale
 * saving behind it — which is the specific way a discount claim becomes a false one.
 */
export function saving(): Dollars {
  return hasFoundingDiscount() ? flagship.standard - flagship.founding : 0;
}

/** Half up front, half on launch day. Derived from what is actually being paid. */
export function deposit(): Dollars {
  return Math.round(currentPrice() / 2);
}

/* ------------------------------------------------------------------ the fix */

/**
 * ============================================================================
 * CONVERSION FIX — THE SCOPE IS DECIDED, THE PRICE IS THE OWNER'S
 * ============================================================================
 *
 * `recommendedAction()` sends a site scoring between about 65% and 85% to targeted work
 * rather than a rebuild, because that is the honest answer for a site whose bones are
 * fine. Until now the site's answer to that reader was the phrase "quoted per site",
 * which is honest and is also a dead end: the best-qualified visitor this site gets —
 * somebody who has just scored their own website against twenty checks — was handed a
 * diagnosis and asked to start a conversation from nothing.
 *
 * The fix for a dead end is a product, not a price. So the **scope below is published**,
 * and it is deliberately bounded: a fixed price is only defensible against a fixed
 * boundary, and the boundary is the reason the previous $2,500 "Foundation" tier was
 * removed — it described unseen work at a fixed figure, which is a guess wearing a price
 * tag. What is fixed here is the *method* (the same twenty checks, the five worst findings,
 * the conversion paths, the tracking) rather than an unknown amount of repair.
 *
 * ## The price is not published, and this is the switch
 *
 * `pricePublished` is **false**. While it stays false:
 *
 *   - no figure for this product is rendered anywhere, and `sanctionedFigures()` does not
 *     sanction one — so a figure typed by hand still fails the build;
 *   - the reader is told the work is scoped from their assessment and quoted in writing,
 *     which is true;
 *   - the path is still a product with a name, a published scope, a boundary and a call
 *     to action, so the dead end is gone either way.
 *
 * Setting it to `true` publishes `from` everywhere at once. **That is the owner's
 * decision** — see `docs/owner-decisions-required.md` DECISION 014, which records the
 * recommended figure and the reasoning. Do not flip it in a code change.
 * ============================================================================
 */
export interface FixOffer {
  readonly id: 'conversion-fix';
  readonly name: string;
  readonly bestFor: string;
  /** The one-line statement of what the money buys, in outcome terms. */
  readonly statement: string;
  /**
   * **Owner-gated.** `false` until the figure below is confirmed. See the note above.
   */
  readonly pricePublished: boolean;
  /**
   * The recommended starting figure, rendered only while `pricePublished` is true.
   *
   * "From" rather than a flat price because the diagnostic is fixed and the corrective
   * work is not: the scope below caps what is included, and anything the diagnostic finds
   * outside it is quoted before it starts rather than absorbed or discovered later.
   */
  readonly from: Dollars;
  /** What the reader is told instead, while the figure is unpublished. */
  readonly quotedLabel: string;
  readonly includes: readonly string[];
  /** The boundary. A fixed price without one is an invitation to an argument. */
  readonly excludes: readonly string[];
  readonly timeline: string;
}

export const conversionFix: FixOffer = {
  id: 'conversion-fix',
  name: 'Conversion Fix',
  bestFor:
    'A website that basically works — it loads, it looks reasonable, people arrive — and still loses the people it should be turning into calls.',
  statement:
    'Targeted corrective work on the site you already own: the specific things costing you enquiries, found, fixed and then measured.',
  pricePublished: false,
  from: 1_900,
  quotedLabel: 'Quoted from your assessment',
  includes: [
    'A full diagnostic pass against the same twenty checks the website score uses',
    'Whatever is actually costing you enquiries, put right on the site you own',
    'Conversion path work: tap-to-call, the quote request, one obvious next step',
    'Clarity and trust fixes on the pages that bring in the most work',
    'Speed and mobile fixes within the existing design',
    'Analytics and conversion tracking configured and verified with real events',
    'Your enquiry baseline recorded in writing when the work goes live',
    // Deliberately the same phrase and the same number as the build: one revision policy.
    'Two revision rounds within the agreed scope',
    'A written 30-day report: what was changed, what happened, and what we would do next',
  ],
  excludes: [
    'New pages, new services or a redesign — that is the build, and we will say so',
    'Moving the site to a different platform',
    'Anything outside the twenty checks — quoted before it starts',
    'Work on a site we cannot be given editor access to',
  ],
  timeline: 'Typically 1–2 weeks once we have access and your approvals.',
};

/** What the fix costs, as the site is allowed to state it today. */
export function fixPriceLabel(): string {
  return conversionFix.pricePublished
    ? `From ${money(conversionFix.from)}`
    : conversionFix.quotedLabel;
}

/* ------------------------------------------------------------------ capacity */

/**
 * The real constraint, published as what it is.
 *
 * One person, one build at a time. This is a fact about how the work is fulfilled — it
 * is what keeps the 2–4 week timeline keepable — and it is the only scarcity the site
 * states. It is not a marketing device and must never become a fake counter.
 */
export const capacity = {
  concurrentBuilds: 1,
} as const;

/* ------------------------------------------------------------------ the recurring plan */

/**
 * Growth Partner: the optional service after launch, sold separately and on purpose.
 *
 * It is not bundled into the project price and it is not required to buy the build. A
 * project that only makes sense with a subscription attached is a project priced
 * dishonestly, and the buyer works that out in month four.
 *
 * There is one plan. "Growth Partner Plus" ($499/mo) was removed: the $299 scope already
 * included campaign landing pages, copy alignments and testing-where-traffic-supports-it
 * in three other places on the site, and what remained of Plus was an undefined
 * "priority response". A second plan whose difference cannot be stated in one sentence
 * is a second plan that only exists to make the first look cheaper.
 */
export interface CarePlan {
  readonly id: 'growth-partner';
  readonly name: string;
  readonly monthly: Dollars;
  /** Annual prepay. Deliberately secondary to monthly. */
  readonly annual: Dollars;
  /** Months from launch before month-to-month begins. */
  readonly minimumMonths: number;
  readonly minimumMonthsWord: string;
  /** Days of notice to end the plan after the minimum. */
  readonly noticeDays: number;
}

export const growthPartner: CarePlan = {
  id: 'growth-partner',
  name: 'Growth Partner',
  monthly: 299,
  annual: 2_990,
  minimumMonths: 3,
  minimumMonthsWord: 'three',
  noticeDays: 30,
};

/**
 * What the first year costs with Growth Partner kept for all twelve months.
 *
 * Published on the site rather than left as arithmetic for the reader — hiding the
 * recurring economics is the move this pricing model exists to be the opposite of.
 */
export function yearOneTotal(): Dollars {
  return currentPrice() + growthPartner.monthly * 12;
}

/* ------------------------------------------------------------------ derived lookups */

/**
 * ============================================================================
 * WHAT THE ASSESSMENT SHOULD POINT SOMEBODY AT
 * ============================================================================
 *
 * The audit scores a website out of forty. This turns that into a starting point.
 *
 * It is a **suggestion made from the reader's own answers**, which is the only kind of
 * recommendation worth anything here — and one of the three branches recommends not
 * buying, which is what makes the other two credible.
 *
 *   - `rebuild` — enough is wrong that patching costs more than rebuilding. The flagship.
 *   - `fix`     — working, with real gaps. **Conversion Fix**, the bounded corrective
 *                 product above. This branch used to end at the words "quoted per site",
 *                 with no product behind them; it now names one, and a test asserts every
 *                 branch resolves to something the reader can act on.
 *   - `none`    — mostly right already. The honest answer is "probably not this".
 *
 * Thresholds are fractions rather than raw scores so the audit can grow past twenty
 * categories without silently re-banding everybody.
 */
export type AuditRecommendation = 'rebuild' | 'fix' | 'none';

export function recommendedAction(score: number, outOf: number): AuditRecommendation {
  if (outOf <= 0) return 'none';

  const fraction = score / outOf;

  // Below two thirds: enough is wrong that patching it costs more than rebuilding it.
  if (fraction < 0.65) return 'rebuild';
  // Working, with real gaps. Targeted work rather than a rebuild.
  if (fraction < 0.85) return 'fix';
  // Mostly right already. The honest answer is "probably not this".
  return 'none';
}

/**
 * Every currency string this configuration can put on a page.
 *
 * `content.test.ts` sweeps the content layer for `$`-figures and fails on anything absent
 * from this set. Deriving it here rather than listing it in the test is what keeps the
 * guard true after a price changes: change a figure and its strings are sanctioned; type
 * a figure by hand anywhere else and the build fails.
 */
export function sanctionedFigures(): ReadonlySet<string> {
  const figures = new Set<string>();

  figures.add(money(flagship.standard));
  figures.add(money(flagship.founding));
  figures.add(money(currentPrice()));
  figures.add(money(deposit()));
  if (saving() > 0) figures.add(money(saving()));

  figures.add(money(growthPartner.monthly));
  figures.add(`${money(growthPartner.monthly)}/mo`);
  figures.add(money(growthPartner.annual));

  figures.add(money(yearOneTotal()));

  /*
   * The fix price is sanctioned only while it is published.
   *
   * This is the same conditional shape as the saving above, and it is doing real work:
   * while `pricePublished` is false the figure is not a sanctioned string, so copy that
   * quotes it — in an FAQ answer, an entry path, a card — fails the currency sweep rather
   * than quietly publishing a price the owner has not agreed to.
   */
  if (conversionFix.pricePublished) figures.add(money(conversionFix.from));

  return figures;
}
