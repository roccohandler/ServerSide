import type { TradeSlug } from '../config/trades';

/**
 * Shapes for everything in `src/content`.
 *
 * These exist so that editing marketing copy is guided by the compiler: a missing FAQ
 * answer or a portfolio item without an industry is a type error, not a blank space
 * discovered on the live site.
 */

export interface CallToAction {
  readonly label: string;
  /** Internal route path, e.g. `/contact`. */
  readonly to: string;
}

export interface NavItem {
  readonly label: string;
  readonly to: string;
}

export interface SocialLink {
  readonly label: string;
  readonly href: string;
}

export interface ServiceArea {
  /** Used mid-sentence, e.g. "serving the Greater Seattle area". */
  readonly label: string;
  /** Used in headings and metadata, e.g. "Greater Seattle". */
  readonly short: string;
  readonly region: string;
  readonly cities: readonly string[];
  readonly note: string;
}

/**
 * The covered business week.
 *
 * This is not decoration. The response guarantee in `content/growth.ts` promises a reply
 * within a number of *business hours*, so these values define when the clock runs — and
 * the guarantee copy is generated from them rather than repeated by hand. Changing the
 * window here changes it everywhere it is stated, including the terms page.
 */
export interface BusinessHours {
  /** e.g. `'Monday to Friday'`. */
  readonly days: string;
  readonly opens: string;
  readonly closes: string;
  /** e.g. `'Pacific'`. Used in copy, not for arithmetic. */
  readonly timezone: string;
  /** The whole thing as one line, e.g. `'Monday to Friday, 8am–6pm Pacific'`. */
  readonly label: string;
  /** What pauses the clock. Rendered wherever the response window is explained. */
  readonly excludes: string;
}

export interface SiteContact {
  readonly phone: string;
  readonly email: string;
  /**
   * The address a response-guaranteed request has to arrive at.
   *
   * Separate from `email` on purpose: the public address can change for marketing reasons
   * without silently moving a contractual channel, and moving the guarantee to a proper
   * domain mailbox later is one line here rather than a search through the terms.
   */
  readonly supportEmail: string;
  /** Shown next to the phone number, e.g. when calls are answered. */
  readonly availability: string;
  readonly hours: BusinessHours;
  /**
   * What happens outside those hours. Deliberately worded as best effort — it sits next
   * to a guarantee, and anything firmer here would quietly become part of it.
   */
  readonly outOfHours: string;
}

/**
 * The headline offer. Turning `freeReview.enabled` off removes every promise of a free
 * review from the site — the primary call to action falls back to `cta.primaryFallback`.
 */
export interface Offer {
  readonly freeReview: {
    readonly enabled: boolean;
    readonly name: string;
    readonly summary: string;
    readonly includes: readonly string[];
    readonly caveat: string;
    /** Lead-in for the link to the sample review. See content/site.ts. */
    readonly sampleLede: string;
    readonly sampleLabel: string;
  };
}

/**
 * Which hero a visitor gets.
 *
 * `form` puts a two-step lead form on the first screen, so somebody who arrived already
 * convinced never has to navigate to act. `cta` is the original: buttons and a product
 * illustration, with the form a click away on the contact page.
 *
 * The two exist as a switch rather than as a rewrite because there is no data yet about
 * which converts better for this audience, and guessing in a commit message is not the
 * same as knowing. Flip the value, watch `hero_form_started` against `cta_clicked`.
 */
export type HeroVariant = 'form' | 'cta';

export interface SiteConfig {
  readonly name: string;
  readonly ownerName: string;
  readonly tagline: string;
  readonly description: string;
  readonly contact: SiteContact;
  readonly serviceArea: ServiceArea;
  readonly offer: Offer;
  readonly hero: { readonly variant: HeroVariant };
  readonly cta: {
    readonly primary: CallToAction;
    /** Used in place of `primary` when the free assessment offer is switched off. */
    readonly primaryFallback: CallToAction;
    readonly secondary: CallToAction;
    /**
     * A shorter label for the same action, used only in the sticky header.
     *
     * The destination is always the resolved primary call to action — this is wording, not
     * a second offer, and a test asserts it stays shorter than the full label so the
     * reason it exists cannot quietly stop being true.
     */
    readonly navLabel: string;
  };
  readonly nav: readonly NavItem[];
  readonly footerNav: readonly NavItem[];
  readonly social: readonly SocialLink[];
  readonly seo: {
    readonly titleSuffix: string;
    readonly defaultTitle: string;
    readonly defaultDescription: string;
    /** Path within `public/`. Replace with a 1200x630 PNG before launch — see README. */
    readonly ogImage: string;
    readonly ogImageType: string;
    readonly locale: string;
  };
}

/**
 * The available icons. `components/ui/Icon.tsx` implements this union exhaustively, so
 * adding a name here without drawing it is a compile error rather than a blank space.
 */
export type IconName =
  | 'layout'
  | 'code'
  | 'phone'
  | 'target'
  | 'inbox'
  | 'rocket'
  | 'wrench'
  | 'check'
  | 'bolt'
  | 'shield'
  | 'mail'
  | 'map-pin'
  | 'arrow-right'
  | 'menu'
  | 'close'
  | 'alert';

/**
 * Which half of the lifecycle a component belongs to.
 *
 * `launch` happens once. `ongoing` repeats for as long as the relationship lasts, which
 * is the argument for the monthly fee — so the two are drawn as separate groups rather
 * than as one list that happens to get longer at the end.
 */
export type SystemPhase = 'launch' | 'ongoing';

/**
 * One part of the offer: build, launch, capture, track, then everything that keeps
 * happening afterwards.
 *
 * Deliberately one ordered array rather than a pile of unrelated services — the whole
 * pitch is that they are a single system with one person responsible for all of it.
 */
export interface SystemComponent {
  readonly id: string;
  /** Two-digit position in the system, e.g. `'01'`. Rendered as the step marker. */
  readonly step: string;
  readonly phase: SystemPhase;
  /** The one-word name of the step: `BUILD`, `LAUNCH`, … Used as the visual label. */
  readonly name: string;
  /** The same step as a sentence-case heading, for places a single word is too terse. */
  readonly title: string;
  readonly summary: string;
  readonly details: readonly string[];
  readonly icon: IconName;
}

/**
 * A group of ongoing work — "keep it running", "keep it current", "keep it improving".
 * The point of the grouping is that the owner reads a benefit rather than a checklist.
 */
export interface CareCategory {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly items: readonly string[];
  readonly icon: IconName;
}

/**
 * Who owns a step of the journey.
 *
 * This exists so the funnel can draw the line it would otherwise be quietly stepping
 * over. `demand` is everything that happens before a visitor arrives — advertising,
 * referrals, a van with a name on it. `website` is the only stretch this business
 * touches. `business` is what happens after the handoff: quoting, pricing, capacity,
 * whether anybody answers the phone.
 *
 * Marking each step means the diagram can show that the website is one segment of a
 * longer chain rather than the whole of it — which is the argument, and also the reason
 * no step on the `business` side may be written as something the website achieves.
 */
export type JourneyOwner = 'demand' | 'website' | 'business';

/** One step of the journey, from a stranger searching to an invoice being paid. */
export interface JourneyStep {
  readonly id: string;
  readonly label: string;
  readonly detail: string;
  readonly owner: JourneyOwner;
}

/** A column of the offer stack: what is delivered at launch, monthly, and over time. */
export interface OfferGroup {
  readonly id: string;
  /** Two-digit label, so the stack can be scanned as three things rather than twenty. */
  readonly step: string;
  readonly name: string;
  readonly summary: string;
  readonly includes: readonly string[];
  /** The business reason this group exists. Paired with the list, never replacing it. */
  readonly whyItMatters: string;
  readonly icon: IconName;
}

/**
 * A priced part of the offer.
 *
 * `price` holds a `[PLACEHOLDER]` until the business has set a real number. The UI checks
 * for that and shows `pricing.unsetLabel` instead, so an unfinished price can never be
 * published as a figure — the same degrade-honestly rule the contact details follow.
 *
 * `terms` is the small print under the price — a minimum term or a payment schedule. It
 * belongs next to the number rather than in a separate section, because a price a reader
 * has to scroll to qualify is a price they will feel misled by later.
 */
export interface PricingTier {
  readonly id: string;
  /** How the fee recurs, e.g. `'One-time'` or `'Monthly'`. */
  readonly cadence: string;
  readonly name: string;
  readonly summary: string;
  /** What the buyer pays today. This is the figure that must dominate visually. */
  readonly price: string;
  /**
   * The rate card, when a founding-client price is currently lower than it.
   *
   * **Never render this with a strike-through.** It is not a former price — this business
   * has never charged it — and strike-through is how a page claims "was" without writing
   * the word. It is shown small, beside a label that says "Standard project price", so the
   * reader understands it as the other price that exists rather than as a price history.
   * See the note above `pricing` in `content/offer.ts`, and 16 CFR 233.1.
   */
  readonly standardPrice?: string;
  /** True only when `price` is genuinely below `standardPrice` today. */
  readonly hasDiscount?: boolean;
  /** Derived as standard − current. Never typed by hand, so it cannot go stale. */
  readonly saving?: string;
  readonly priceNote: string;
  readonly includes: readonly string[];
  /** Short qualifying line shown under the price, e.g. the minimum term. */
  readonly terms?: string;
  /** Marks the tier the eye should land on first. At most one. */
  readonly emphasis?: boolean;
}

/**
 * One published commercial term: the minimum period, the notice, the revision count.
 *
 * These are on the site rather than only in the contract because every one of them is a
 * question a buyer asks before they will make contact, and answering them up front costs
 * nothing. The written agreement remains what governs; this is the plain-English version.
 */
export interface CommercialTerm {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly detail: string;
}

/**
 * One way into the business.
 *
 * Three exist: a new website, a rescue of an existing one, and taking over a site
 * somebody else built. They are modelled rather than written into a paragraph because
 * only the first has a published price — the other two are quoted, and a reader who
 * cannot find their own situation on the page assumes the answer is no.
 */
export interface EntryPath {
  readonly id: string;
  readonly title: string;
  readonly situation: string;
  readonly response: string;
  /** A published figure, or the phrase used when the work has to be quoted. */
  readonly price: string;
  /**
   * What qualifies the figure above, where one does.
   *
   * Optional because two of the three paths are quoted per site and have nothing to
   * qualify. Where a founding-client price is published, this is where the condition that
   * makes it that price travels with it — a conditional number printed on its own is a
   * claim the reader has no way to check.
   */
  readonly priceNote?: string;
  readonly then: string;
  readonly icon: IconName;
}

/**
 * One stage of the business case: what goes wrong, what gets improved, and what that is
 * worth to the owner. The same three-part shape repeats down the section, which is what
 * makes it scannable in the ten seconds anybody actually gives it.
 */
export interface ValueStage {
  readonly id: string;
  /** The stage in the customer's journey, e.g. "Get found". */
  readonly stage: string;
  /** In the owner's words, not ours. */
  readonly problem: string;
  readonly improvement: string;
  readonly value: string;
  /** Which of the six system components does this work. Names must match `systemComponents`. */
  readonly components: readonly string[];
  readonly icon: IconName;
}

/**
 * A miniature website, rendered to show a difference rather than to be admired.
 *
 * It is a spec rather than an image because the point being made is usually about the
 * *words* — a vague headline against a specific one — and a screenshot of that is
 * unreadable at this size.
 */
export interface SiteMockSpec {
  readonly nav: readonly string[];
  readonly headline: string;
  readonly subline?: string;
  readonly ctaLabel?: string;
  /** A tap-to-call chip in the header. */
  readonly callLabel?: string;
  readonly cards?: readonly string[];
  readonly trust?: readonly string[];
  /** A phone number pushed to the footer, where nobody looks for it. */
  readonly buriedPhone?: string;
  /** Renders unresolved blocks in place of content, for the loading comparison. */
  readonly loading?: boolean;
  /** Tighter type and spacing, for the crowded-mobile comparison. */
  readonly cramped?: boolean;
}

/** One side of a before/after comparison: a mock website, or a route through one. */
export type DemoPanel =
  | { readonly kind: 'mock'; readonly mock: SiteMockSpec }
  | { readonly kind: 'path'; readonly steps: readonly string[] };

/**
 * A before/after demonstration.
 *
 * Every one of these is illustrative. None of them is a customer, and none of them
 * claims a measured result — see the rules at the top of `content/value.ts`.
 */
export interface DemoExample {
  readonly id: string;
  readonly title: string;
  readonly problem: string;
  readonly change: string;
  readonly whyItMatters: string;
  readonly before: DemoPanel;
  readonly after: DemoPanel;
  /** Optional factual footnote, e.g. published performance targets. */
  readonly note?: string;
}

/**
 * The six stages a visitor passes through, and the frame the whole PlayBook hangs on.
 *
 * The order is the order it happens in: somebody has to find you before your headline can
 * be unclear at them, and no amount of trust-building matters if the page took nine
 * seconds to arrive. Grouping the twenty improvements this way is what stops them reading
 * as twenty unrelated pieces of advice.
 */
export type PlaybookStage =
  'found' | 'understood' | 'experienced' | 'trusted' | 'contacted' | 'better';

/** One stage of the Lead-Ready system, with the improvements that belong to it. */
export interface PlaybookStageMeta {
  readonly id: PlaybookStage;
  /** Two-digit label, e.g. `'01'`. */
  readonly number: string;
  readonly name: string;
  readonly question: string;
  readonly summary: string;
  readonly icon: IconName;
}

/**
 * One improvement in the PlayBook: what goes wrong, what it costs, and what to do.
 *
 * Every field below `stage` is required, and that is the validation strategy. A principle
 * missing its meta concept or its quick test is a compile error rather than a gap
 * discovered on the live page — which is what §26 of the brief asks for, achieved without
 * a runtime validator that ships to production to check content that cannot change.
 *
 * `metaConcept` is the one sentence somebody remembers a week later. `quickTest` is
 * something they can check on their own website in under five minutes; without it a
 * principle is an opinion. `research` names its source and states what that source
 * actually studied. `serviceNote` is the single, restrained place a principle may mention
 * the paid service — a free resource that sells on every page is an advert, and gets read
 * like one.
 */
export interface PlaybookPrinciple {
  readonly id: string;
  /** Two-digit label, e.g. `'01'`. */
  readonly number: string;
  readonly stage: PlaybookStage;
  readonly name: string;
  readonly heading: string;
  /** The memorable idea underneath the advice. One sentence, no hedging. */
  readonly metaConcept: string;
  readonly uxProblem: string;
  readonly consequence: string;
  readonly principle: string;
  readonly practices: readonly string[];
  /** Something the owner can check on their own site in under five minutes. */
  readonly quickTest: string;
  /** Why this is worth doing, in business terms rather than design terms. */
  readonly whyItMatters: string;
  /** A weak-versus-clearer comparison, where one makes the point faster than prose. */
  readonly example?: {
    readonly weakLabel: string;
    readonly weak: string;
    readonly strongLabel: string;
    readonly strong: string;
    readonly note: string;
  };
  /** An attributed reference, with the limits of what it covers stated. */
  readonly research?: string;
  /** Something to avoid, called out rather than buried in the practices. */
  readonly warning?: string;
  /** A funnel or sequence this play is about. */
  readonly chain?: readonly string[];
  /**
   * Ids of principles this one is deliberately adjacent to.
   *
   * Four pairs genuinely overlap — clarity/first-screen, trust/proof,
   * measurement/continuous-improvement, forms/friction — and pretending otherwise makes
   * the list read as padded. Naming the relationship is more honest than hiding it.
   */
  readonly relatedPrinciples?: readonly string[];
  /** How this play relates to the paid service. `null` where it does not. */
  readonly serviceNote: string | null;
}

/**
 * One row of the self-assessment.
 *
 * `principleId` ties every category back to the improvement that explains it, so a low
 * score always has somewhere to send the reader. A test asserts every id resolves.
 */
export interface ScorecardCategory {
  readonly id: string;
  readonly label: string;
  readonly prompt: string;
  readonly stage: PlaybookStage;
  /** Must match a `PlaybookPrinciple.id`. */
  readonly principleId: string;
}

/** A band of the self-assessment score. Explicitly illustrative — see `content/playbook.ts`. */
export interface ScorecardBand {
  readonly id: string;
  readonly range: string;
  /** Inclusive bounds, so the band for a score can be resolved rather than parsed. */
  readonly min: number;
  readonly max: number;
  readonly title: string;
  readonly body: string;
}

/**
 * A tier of the static priority list.
 *
 * Shown to everybody, including the reader who never scores anything. The personalised
 * version — your own weakest five — comes from the assessment and sits alongside it.
 */
export interface PriorityTier {
  readonly id: string;
  readonly label: string;
  readonly heading: string;
  readonly body: string;
  /** Principle ids, in the order they should be tackled. */
  readonly principleIds: readonly string[];
}

/**
 * One piece of published third-party research, with the limits of what it establishes.
 *
 * Every field is required, and `limitation` in particular. A statistic quoted without
 * what it does not cover is the exact move this site exists to be the opposite of: an
 * advertising conversion rate presented as a website conversion rate, or a call-handling
 * benchmark presented as a promise about a redesign. Making the field required means a
 * citation added in a hurry is a compile error rather than an overclaim discovered by a
 * customer, and `content.test.ts` asserts every one of them is non-trivial.
 *
 * `dataset` says what was actually measured, in the source's own terms. It is separate
 * from `source` because "Invoca" is an attribution and "70 million calls across ten
 * industries" is the thing that makes the number worth reading.
 */
export interface EvidenceCitation {
  readonly id: string;
  /** The finding, as the source stated it. Never rounded, never rephrased into a promise. */
  readonly claim: string;
  /** The organisation, and the title of the work. */
  readonly source: string;
  readonly sourceUrl: string;
  /** What was actually measured, so the number is never mistaken for a different one. */
  readonly dataset: string;
  /** One sentence: why this changes a decision the reader is making. */
  readonly whyItMatters: string;
  /** What it does not establish. Required — see above. */
  readonly limitation: string;
}

/**
 * A published search-advertising conversion rate for one trade.
 *
 * This is a separate type from `EvidenceCitation` for one reason, and it is the reason
 * the brief calls out twice: **an advertising conversion rate is not a website conversion
 * rate.** They are different denominators measuring different things — one is paid clicks
 * that produced a tracked action, the other is everybody who arrived by any route. Quoting
 * the first as though it were the second is the single most common dishonest move in this
 * market, and it is usually made by accident.
 *
 * So the two are not interchangeable in the type system. `label` is required, and
 * `content.test.ts` asserts every instance of it is the one sanctioned sentence — which
 * means the distinction cannot be softened in a copy edit without failing the build.
 *
 * `category` holds the source's own name for the segment rather than mine. LocaliQ
 * publishes "Roofing & Gutters" and "Electricians & Electrical Contractors"; rendering
 * those as "Roofing" and "Electrical" would be quietly widening somebody else's finding.
 */
export interface AdvertisingBenchmark {
  /** The source's own category name. Never the local label for the trade. */
  readonly category: string;
  /** The published figure, verbatim, e.g. `'7.48%'`. Never rounded. */
  readonly conversionRate: string;
  readonly source: string;
  readonly sourceUrl: string;
  /** What was actually measured: how many campaigns, over what window. */
  readonly dataset: string;
  /** The sanctioned label. Required, and pinned to one exact string by a test. */
  readonly label: string;
  /** What a reader should take from it — never "your website should do this". */
  readonly whyItMatters: string;
  readonly limitation: string;
}

/**
 * One trade chip on the homepage.
 *
 * `slug` is present only for the trades with a page of their own, and its absence is not
 * a smaller claim about the trade — see the note in `content/home.ts`.
 */
export interface AudienceTrade {
  readonly label: string;
  readonly slug?: TradeSlug;
}

/** One moment in how a particular trade's customer actually arrives and decides. */
export interface IndustryJourneyStep {
  readonly id: string;
  /** Where the customer physically is, e.g. "Standing in a cold house". */
  readonly moment: string;
  readonly detail: string;
}

/** One place this trade's customers leak, with what it costs and what would change. */
export interface IndustryFriction {
  readonly id: string;
  readonly title: string;
  readonly whatHappens: string;
  readonly whatItCosts: string;
  readonly whatIdChange: string;
}

/** A page this trade genuinely needs, and the search or decision it answers. */
export interface IndustryPageNeed {
  readonly name: string;
  readonly why: string;
}

/**
 * One industry page.
 *
 * The brief was explicit that these must not be a template with the trade name swapped
 * in, so the fields below are the ones where the trades genuinely differ: how the customer
 * arrives, how long they take to decide, what stops them, which pages they need, and what
 * the published advertising data says about their category. Every one of those has a
 * different answer for a burst pipe than for a roof replacement.
 *
 * What is deliberately *not* here is a per-trade version of the offer, the prices, the
 * guarantee or the process. Those are identical for every trade, and five near-copies of
 * them would be five places for the published terms to drift apart.
 */
export interface IndustryPageContent {
  readonly slug: TradeSlug;
  /** Must equal `industryPath(slug)`. A test asserts it. */
  readonly path: string;
  readonly metaTitle: string;
  readonly metaDescription: string;
  readonly eyebrow: string;
  readonly heading: string;
  readonly lede: string;
  /** How long this trade's decision takes. The fact everything else follows from. */
  readonly decisionWindow: string;
  readonly journey: {
    readonly heading: string;
    readonly lede: string;
    readonly steps: readonly IndustryJourneyStep[];
  };
  readonly friction: {
    readonly heading: string;
    readonly lede: string;
    readonly items: readonly IndustryFriction[];
  };
  readonly pages: {
    readonly heading: string;
    readonly lede: string;
    readonly items: readonly IndustryPageNeed[];
    readonly note: string;
  };
  readonly benchmark: AdvertisingBenchmark;
  /** Ids from `evidence.citations` whose dataset genuinely covers this trade. */
  readonly evidenceIds: readonly string[];
  /** Id of the matching `portfolioProjects` entry. A test asserts it resolves. */
  readonly demoId: string;
  readonly cta: {
    readonly heading: string;
    readonly body: string;
    readonly auditLabel: string;
  };
}

/**
 * One finding in the website teardown.
 *
 * `principleId` ties every finding back to the published improvement that explains it, so
 * the teardown can never quietly become a list of opinions the PlayBook does not hold. A
 * test asserts every id resolves.
 */
export interface TeardownFinding {
  readonly id: string;
  /** Two-digit label. The order is by what it costs, not by where it sits on the page. */
  readonly order: string;
  readonly title: string;
  /** What is literally on the screen. */
  readonly whatYouSee: string;
  /** What it does to somebody trying to hire this business. */
  readonly whatItDoes: string;
  readonly whatIdChange: string;
  /** Must match a `PlaybookPrinciple.id`. */
  readonly principleId: string;
}

/** One section of the sample free assessment, shown so the deliverable is not a mystery. */
export interface ReviewSampleSection {
  readonly id: string;
  readonly heading: string;
  readonly body: string;
}

/** A promise about the work. Never about a result — see the notes in `content/offer.ts`. */
export interface GuaranteeItem {
  readonly id: string;
  readonly title: string;
  readonly description: string;
}

/**
 * A real customer's words. There are none yet, and none may be invented — see
 * `content/testimonials.ts`.
 */
export interface Testimonial {
  readonly id: string;
  readonly quote: string;
  readonly author: string;
  readonly business: string;
  /** Town or city, so the reader can place the business. */
  readonly location: string;
}

export interface PortfolioProject {
  readonly id: string;
  readonly industry: string;
  readonly title: string;
  readonly description: string;
  /** Path within `public/`. */
  readonly image: string;
  readonly imageAlt: string;
  readonly highlights: readonly string[];
  /** Omitted until a demo is actually published. Never link to a page that is not live. */
  readonly demoUrl?: string;
  /**
   * True for a site built to demonstrate the approach rather than for a paying client.
   * The UI renders a visible label from this; it is never presented as client work.
   */
  readonly isDemo: boolean;
}

export interface FaqItem {
  readonly id: string;
  readonly question: string;
  readonly answer: string;
}

export interface ProcessStep {
  readonly id: string;
  readonly title: string;
  readonly description: string;
}

export interface ValueProposition {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly icon: IconName;
}

export interface InquiryOption {
  /** Must match one of the slugs the API accepts — see `types/api.ts`. */
  readonly value: string;
  readonly label: string;
}

export interface PageMeta {
  readonly path: string;
  readonly title: string;
  readonly description: string;
  /** Excluded from sitemap.xml and marked noindex. */
  readonly noIndex?: boolean;
  readonly sitemapPriority?: number;
}
