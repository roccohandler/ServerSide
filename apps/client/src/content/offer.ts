import {
  buildScope,
  currentPrice,
  deposit,
  flagship,
  foundingOffer,
  growthPartner,
  hasFoundingDiscount,
  money,
  saving,
  yearOneTotal,
} from '../config/pricing';
import { site } from './site';
import type {
  BuildPricing,
  CommercialTerm,
  CommercialTermGroup,
  ComparisonRow,
  GuaranteeItem,
  JourneyStep,
  MarketComparisonRow,
  OfferGroup,
  PlanScopeGroup,
  ProcessStep,
  ProcessWeek,
  SystemComponent,
} from '../types/content';

/*
 * ============================================================================
 * THE OFFER — ONE SOURCE OF TRUTH
 * ============================================================================
 *
 * Everything that describes what is being sold lives in this file: the name of the
 * offer, its components, the optional ongoing service, the prices, the published terms,
 * the guarantees. Sections on the homepage and the services page render whatever is
 * here, so testing a different offer is an edit to one file rather than a hunt through
 * components.
 *
 * ## The commercial shape, stated once
 *
 * Two purchases, two jobs, never blurred:
 *
 *   1. **The build** — a one-time project at a published price. It stands on its own:
 *      the client owns the site, and can run it themselves afterwards.
 *   2. **Growth Partner** — the optional monthly service after launch. It starts on
 *      launch day *only if the client chooses it*, and declining it never costs them
 *      the website.
 *
 * The previous version of this file said both "the ongoing plan is optional" and
 * "monthly management starts on launch day" as step five of the process. A reader
 * cannot hold both, and the ambiguity is resolved in the optional direction — which is
 * also what the business's own stated principle requires ("a project that only makes
 * sense with a subscription attached is a project priced dishonestly").
 *
 * Four rules this file follows, and must keep following:
 *
 *   1. Nothing here promises a result. Rankings, lead volume, revenue and conversion
 *      rates all depend on the market, the price and the phone being answered. What is
 *      promised is work: what gets built, what gets maintained, what gets improved.
 *   2. This is the only file in the content layer allowed to state a price. Everything
 *      else interpolates `prices`, and `content.test.ts` fails the build on any figure
 *      that appears anywhere else.
 *   3. Build deliverables and Growth Partner deliverables never appear in the same
 *      list without being labelled. That mixing is how the old "What you get" section
 *      sold monthly work inside a one-time price, and a test now enforces the split.
 *   4. The voice is first person plural — JobForge speaks as the company — while the
 *      founder-scale facts stay stated plainly (one build at a time, no account
 *      managers, the builder answers for the work), because they are true and they sell.
 * ============================================================================
 */

/**
 * The name of the flagship product: the thing a client actually buys first.
 *
 * ## Three names, and why it landed on this one
 *
 * It was "The Customer Conversion System" — an umbrella over ten components where six
 * belonged to the monthly service, which quietly defined the offer as including a
 * subscription the site elsewhere called optional. Then "The Customer Conversion
 * Website", moving the name onto the thing actually bought.
 *
 * It is **"Customer Conversion Build"** now, and the word that changed is the one that
 * was doing the damage. A *website* is the artefact, and the artefact is the half of this
 * that a template also has — so putting it in the product's name invited the single
 * comparison the offer cannot win. "Build" names the engagement instead: still concrete,
 * still comprehensible to somebody who has never bought one, and not a thing you can
 * price against a $12-a-month subscription.
 *
 * "Website" has not been banished. It moved to where it explains rather than defines —
 * `flagship.statement`, the tagline's second clause, the FAQ — because the buyer arrives
 * with that word and a page that refuses to use it is a page they cannot place. Outcome
 * first, mechanism second, and the mechanism named in plain English.
 *
 * Derived rather than typed: the config is the source of truth for what the product is
 * called, so the name cannot drift between the pricing card and the page heading.
 */
export const offerName = flagship.name;

/**
 * The name of the recurring service's monthly deliverable.
 *
 * Hoisted to the top of the file because five different sections interpolate it — the
 * after-launch timeline, the relationship diagram, the plan's scope, the guarantee and the
 * comparison table — and a product whose name is typed five times is a product that ends up
 * with two names. `websiteReport.name` below is this constant; the full definition of what
 * the artefact contains lives with the recurring service.
 */
const websiteReportName = 'Website Performance Report';

/**
 * The positioning statement, in one sentence, in the outcome's terms.
 *
 * Rendered wherever the offer has to introduce itself without a price beside it. The
 * mechanism is in the second half on purpose — a reader who cannot picture what they are
 * buying does not get to the outcome, and a reader who meets the mechanism first files it
 * under "website" and stops reading.
 */
export const positioning = {
  outcome: 'Turn more of the people already finding your business into calls and quote requests.',
  mechanism:
    'JobForge builds the website, the paths that lead to your phone, and the measurement that shows what happened — then keeps improving it, if you want us to.',
} as const;

/* ------------------------------------------------------------------ the problem */

/**
 * The reframe, placed immediately after the hero.
 *
 * It exists to make the reader recognise the problem in their own terms before any
 * solution is offered. Each need is written as something their current website either
 * does or does not do, so the section reads as a checklist rather than as a claim.
 */
export const reframe = {
  heading: "You don't need another website.",
  intro:
    'One that looks like the safe choice, explains what you do, and makes getting in touch effortless. Open yours on your phone and count how many of these it manages.',

  needs: [
    {
      id: 'trust',
      title: 'Look like a business worth calling',
      detail: 'A stranger decides in seconds whether you look like the safe pair of hands.',
    },
    {
      id: 'clarity',
      title: 'Explain your services clearly',
      detail: 'If they cannot tell whether you do the job they need, they keep scrolling.',
    },
    {
      id: 'capture',
      title: 'Turn visitors into calls and quote requests',
      detail: 'One obvious next step on every screen, and a number that dials with one tap.',
    },
    {
      id: 'mobile',
      title: 'Work properly on a phone',
      detail: 'Most of your customers only ever see it on a phone, often on one bar of signal.',
    },
    {
      id: 'maintained',
      title: 'Stay maintained',
      detail: 'Forms break quietly, certificates expire, plugins go stale. Nobody tells you.',
    },
    {
      id: 'improved',
      title: 'Keep getting better',
      detail: 'The version you launch should not be the best it ever is.',
    },
  ],

  closing:
    'The build covers the first four. The last two are what Growth Partner is for — your call, after launch.',
} as const;

/* ------------------------------------------------------------------ the system */

/**
 * The components of the whole approach, in the order they happen.
 *
 * Four of them are the build: a one-time project. The other six are Growth Partner: the
 * optional monthly service. They are one array with a `phase` because the sequence is
 * how the reader understands it — but the phase labels now say out loud which half is
 * the project and which half is the optional service, because implying the second half
 * is included in the first is the exact confusion this rewrite removes.
 */
export const systemComponents: readonly SystemComponent[] = [
  {
    id: 'build',
    step: '01',
    phase: 'launch',
    name: 'Build',
    title: 'Build the website',
    summary:
      'A custom, mobile-first website designed around your business, your services and the customers you want to reach.',
    details: [
      'Structured around the work you actually do, not a template with your logo dropped in',
      'Designed on a phone screen first, then widened for desktop',
      'A page for each service you want to be hired for',
      'Type, colour and layout chosen for legibility rather than decoration',
    ],
    icon: 'layout',
  },
  {
    id: 'launch',
    step: '02',
    phase: 'launch',
    name: 'Launch',
    title: 'Get it live properly',
    summary:
      'We handle the technical setup and get your website live on your own domain, in your name, without making you figure out the details.',
    details: [
      'Domain, hosting and certificates set up under accounts you own',
      'Redirects from your old pages so existing links and listings keep working',
      'Sitemap, indexing and Search Console so the site can actually be found',
      'A walkthrough of how everything works once it is live',
    ],
    icon: 'rocket',
  },
  {
    id: 'capture',
    step: '03',
    phase: 'launch',
    name: 'Capture',
    title: 'Make getting in touch effortless',
    summary:
      'Pages built so a stranger can call you, request a quote, or take the next step without thinking about it.',
    details: [
      'Tap-to-call in the header of every page',
      'Short quote forms that ask only what you need to price the job',
      'One primary action per page, repeated where it makes sense',
      'Submissions emailed to you and stored, so a bounced email never loses a lead',
    ],
    icon: 'inbox',
  },
  {
    id: 'track',
    step: '04',
    phase: 'launch',
    name: 'Track',
    title: 'See what the website is doing',
    summary:
      'The foundational analytics and conversion tracking needed to understand how your website is performing.',
    details: [
      'Analytics installed and configured, not just dropped in',
      'Calls and form submissions counted as conversions rather than guessed at',
      'Search Console connected so you can see what people searched for',
      'Plain-English answers whenever you want to know how it is doing',
    ],
    icon: 'target',
  },
  {
    id: 'maintain',
    step: '05',
    phase: 'ongoing',
    name: 'Maintain',
    title: 'Keep it running',
    summary:
      'Hosting, security, backups, updates, monitoring, bug fixes and website changes — handled, so none of it lands on your to-do list.',
    details: [
      'Hosting, certificates and backups looked after on accounts in your name',
      'Software and security updates applied as they are needed',
      'Forms and uptime monitored, so a silent failure does not cost you a month of enquiries',
      'Content, service and photo changes made when you ask for them',
    ],
    icon: 'shield',
  },
  {
    id: 'refresh',
    step: '06',
    phase: 'ongoing',
    name: 'Refresh',
    title: 'Keep it current with the season',
    summary:
      'The service your customers need this month gets brought to the front, with the messaging and the call to action that go with it.',
    details: [
      'Seasonal services moved forward when they start to matter',
      'Current offers and promotions reflected on the pages people land on',
      'New photographs of finished work as you take them',
      'Business information, hours and service area kept true',
    ],
    icon: 'wrench',
  },
  {
    id: 'align',
    step: '07',
    phase: 'ongoing',
    name: 'Align',
    title: 'Match the marketing you are running',
    summary:
      'When you advertise, the page people land on says what the advert promised — same offer, same words, same next step.',
    details: [
      'Campaign messaging read and matched on the pages it points at',
      'Headlines and calls to action worded the way the advert worded them',
      'Landing pages for the campaigns worth having one',
      'Website work only: we do not run your ads or manage your budgets',
    ],
    icon: 'target',
  },
  {
    id: 'test',
    step: '08',
    phase: 'ongoing',
    name: 'Test',
    title: 'Let visitors settle the arguments',
    summary:
      'Where there is enough traffic to learn something real, two versions go live and the visitors decide which one works.',
    details: [
      'A specific question, and a visitor action that can be counted',
      'Two versions live at once, with nothing else changed between them',
      'A decision made on what happened rather than on whose idea it was',
      'Where the traffic is too thin to learn from, a considered improvement instead — and it gets called that',
    ],
    icon: 'bolt',
  },
  {
    id: 'improve',
    step: '09',
    phase: 'ongoing',
    name: 'Improve',
    title: 'Keep making it work harder',
    summary:
      'Continuous work on the pages, calls to action and local-search foundation that decide whether a visitor gets in touch.',
    details: [
      'Improvements to the pages that bring in the most work',
      'Calls to action refined where the numbers say they should be',
      'Local-search foundation kept current as your services and service area change',
      'Speed and mobile experience monitored rather than assumed',
    ],
    icon: 'bolt',
  },
  {
    id: 'support',
    step: '10',
    phase: 'ongoing',
    name: 'Support',
    title: 'Somebody to ask',
    summary:
      'One person who knows your website, answers your messages, and makes the change rather than logging it.',
    details: [
      'Send a message rather than raising a ticket with a stranger',
      'No account manager standing between you and the work',
      'Changes made by the person who built the thing',
      'Anything larger quoted before it starts, never after',
    ],
    icon: 'phone',
  },
];

/**
 * The two halves of the lifecycle, and the labels the system section groups them under.
 *
 * The labels are load-bearing: the first half is the one-time project, the second is
 * the optional monthly service, and a reader must never come away believing the second
 * is included in the first's price.
 */
export const systemPhases = [
  {
    id: 'launch',
    label: 'Build once',
    summary: 'The project. One price, paid half up front and half at launch.',
  },
  {
    id: 'ongoing',
    label: 'Keep it working — Growth Partner',
    summary: 'The optional monthly service. Starts after launch, only if you choose it.',
  },
] as const;

export const system = {
  eyebrow: 'The growth system',
  heading: 'Build once. Then decide who keeps it working.',
  lede: 'Two separate purchases with two different jobs. The build is a one-time project: four parts that get a conversion-focused website live on your own domain, in your name. Growth Partner is the optional monthly service after launch — the other six parts, for as long as you want them. You can run the site yourself instead, and it is yours either way.',
  closing:
    'One person responsible for all of it, however much of it you take. No handover, no gap, no graveyard.',
} as const;

/* ------------------------------------------------------------------ differentiator */

export const differentiator = {
  heading: "Most web designers build it. Then they're done.",
  body: [
    'Your website should not become another thing on your to-do list.',
    'You work with the person responsible for building your website — and, if you take Growth Partner, the same person stays responsible for it afterwards. When something needs to change, you have somebody to change it. When something breaks, you have somebody to fix it. When there is an opportunity to make it work harder, that is our job too.',
  ],

  /*
   * The two lanes are the whole argument for the monthly service. Set side by side, the
   * ongoing work stops looking like an add-on and starts looking like the part that was
   * missing from every website project the reader has paid for before.
   */
  lanes: [
    {
      id: 'usual',
      label: 'The usual way',
      steps: ['Build', 'Launch', "You're on your own"],
      note: 'Whatever happens next is your problem: the broken form, the out-of-date prices, the pages nobody has looked at since.',
    },
    {
      id: 'here',
      label: 'How this works',
      steps: ['Build', 'Launch', 'Maintain', 'Monitor', 'Improve'],
      note: 'With Growth Partner, the website keeps being somebody’s responsibility after launch day. That somebody is JobForge — and if you would rather run it yourself, it is set up so you can.',
    },
  ],

  closing: 'Build it. Then keep it working — whoever does the keeping.',
} as const;

/* ------------------------------------------------------------------ management */

/*
 * The heading, lede and closing note for the recurring service. The categories the
 * section lists come from `growth.ts` → `managementCategories`.
 */
export const management = {
  eyebrow: 'Growth Partner',
  heading: 'Never wonder who is responsible for the website again.',
  lede: 'Every website needs somebody looking after it. Most local businesses either pay a salary for that, do it themselves at ten at night, or hope nothing goes wrong. Growth Partner is the other option — and it is optional, never a condition of the build.',

  note: 'Everything stays in your name. Managed by JobForge does not mean owned by JobForge — if you ever want to take it elsewhere, or run it yourself, you take the whole thing with you.',
} as const;

/* ------------------------------------------------------------------ conversion */

/*
 * The funnel, drawn end to end — including the parts this business does not touch.
 *
 * ## Why it does not stop at "calls or requests a quote"
 *
 * Because that is where the money starts, not where it arrives, and a diagram that stops
 * at the enquiry invites the reader to supply the missing arithmetic themselves. Ten
 * steps, and the last three are somebody else's.
 *
 * ## Why the last three are marked as somebody else's
 *
 * `owner` is the honest half of this section. Everything from "opens your website" to
 * "calls or requests a quote" is work that can be changed and measured here. Everything
 * after it — whether the quote is competitive, whether there is capacity, whether the
 * phone gets answered — is the client's, and Invoca's answer-rate finding in
 * `content/evidence.ts` says out loud how much of the loss happens there.
 *
 * Two rules follow from that and must not be broken:
 *
 *   1. **No `business`-owned step may be written as something the website achieves.**
 *      "Books the work" describes what happens; it does not claim a page caused it.
 *   2. **The accent stays on the handoff, not on the last step.**
 */
export const conversion = {
  eyebrow: 'The funnel',
  heading: 'How a stranger becomes a phone call.',
  lede: 'A website does not produce customers. It produces the conversation a customer comes out of — one segment of a longer chain. Every step that is missing or weak is somewhere the chain quietly leaks.',

  /** Group labels, rendered where `owner` changes. */
  ownerLabels: {
    demand: 'Before your website',
    website: 'What the website decides',
    business: 'What happens after the handoff',
  },

  journey: [
    {
      id: 'find',
      label: 'Finds you',
      detail: 'A search, a map listing, a recommendation, a van.',
      owner: 'demand',
    },
    {
      id: 'visit',
      label: 'Opens your website',
      detail: 'Usually on a phone, often standing in a driveway.',
      owner: 'website',
    },
    {
      id: 'understand',
      label: 'Understands what you do',
      detail: 'In seconds, without scrolling or guessing.',
      owner: 'website',
    },
    {
      id: 'trust',
      label: 'Trusts your business',
      detail: 'Real photos, real service area, licence details, reviews.',
      owner: 'website',
    },
    {
      id: 'service',
      label: 'Finds the right service',
      detail: 'The exact job they need, described in their words.',
      owner: 'website',
    },
    {
      id: 'action',
      label: 'Takes the next step',
      detail: 'One obvious action, always within reach.',
      owner: 'website',
    },
    {
      id: 'contact',
      label: 'Calls or requests a quote',
      detail: 'A tap on your number, or a quote request in your inbox.',
      owner: 'website',
    },
    {
      id: 'lead',
      label: 'Turns out to be worth quoting',
      detail: 'Somebody who wants the job doing, in your area, for work you take on.',
      owner: 'business',
    },
    {
      id: 'customer',
      label: 'Books the work',
      detail: 'The quote is right, the calendar works, and somebody answered the phone.',
      owner: 'business',
    },
    {
      id: 'revenue',
      label: 'Pays for the job',
      detail: 'Which is where the number at the top of this page came from.',
      owner: 'business',
    },
  ] satisfies readonly JourneyStep[],

  /*
   * The boundary, stated rather than implied. This is the most persuasive paragraph in
   * the section and it is entirely a list of things this business does not do.
   */
  handoff: {
    heading: 'Where our job ends',
    body: 'Everything above that line is work we can change and measure. Everything below it is yours — what you charge, whether you have capacity, whether somebody picks up. What a website can do is stop you losing people in the six steps before that.',
  },

  closing:
    'That is the difference between a website and an online brochure. A brochure describes the business. This is built to hand you the conversation.',
} as const;

/* ------------------------------------------------------------------ local search */

/*
 * Rankings are never promised here, and must never be. What is described is foundation
 * work that is genuinely within our control — structure, metadata, indexing, and telling
 * search engines what the business is and where it works.
 */
export const localSearch = {
  eyebrow: 'Local search',
  heading: 'Being found is not the same as getting traffic.',
  lede: 'The goal is not visitors for the sake of visitors. It is the right person finding the right service at the moment they need it — and that is one part of a system, not a magic tap that gets turned on.',

  /** The chain the section is really about: relevance all the way through to a call. */
  chain: [
    'Somebody searches for the job they need doing',
    'They land on the page about that exact service',
    'It is obvious you do it, and that you cover their area',
    'They call or ask for a quote',
  ],

  items: [
    'Search-friendly page structure and heading order',
    'A page for each service, written the way customers describe it',
    'Service-area and location information where it belongs',
    'Page titles and descriptions written for a human reading a search result',
    'Sitemap, robots and indexing set up at launch',
    'Search Console connected so search performance is visible',
    'Structured business information, including local-business markup',
    'Your Google Business Profile reviewed, with a list of what to fix',
  ],

  caveat:
    'No guarantees of rankings, positions or traffic. For most local service businesses a well-kept Google Business Profile matters more than anything on the website itself, and we will tell you that rather than sell you around it.',
} as const;

/* ------------------------------------------------------------------ launch */

/**
 * The published process: what happens before any money changes hands, the four-week
 * shape of the build, and the choice at the end of it.
 *
 * `target` is a published range rather than a deadline, and the qualifier next to it is
 * not hedging — it is the truth about where these projects actually stall. The build is
 * rarely the slow part; waiting on photos, a service list and a decision is. Stating the
 * dependency up front is what makes the range keepable.
 *
 * The last beat is deliberately a *choice*, not a step. "Monthly management starts on
 * launch day" used to sit here as step five of the process, unconditionally — while the
 * pricing section called the same service optional. It is conditional everywhere now.
 */
export const launch = {
  eyebrow: 'How it works',
  heading: 'Live in two to four weeks.',
  lede: 'The clock starts when we have your business information, photos and service list. The build is rarely the slow part.',
  target: '2–4 weeks' as string | null,
  targetLabel: 'Typical launch',
  targetNote:
    'Measured from when the materials and approvals we need are in our hands. Exact timing depends on how quickly content, access and feedback come back.',

  /** What happens before the project starts — none of it costs anything. */
  before: {
    heading: 'Before any money changes hands',
    steps: [
      {
        id: 'review',
        /*
         * "Start with the free website assessment", not just the offer's name.
         *
         * The name is still interpolated, which is the point — it was typed by hand here once
         * and went stale when the offer was renamed. What changed is that it is no longer the
         * *whole* title: `ReviewOfferSection` heads its block with exactly
         * `site.offer.freeReview.name`, so on the homepage this produced two headings with an
         * identical accessible name. Prefixing it says the same thing and reads better as a
         * process step, which is what this is.
         */
        title: `Start with the ${site.offer.freeReview.name.toLowerCase()}`,
        description:
          'You send us your site, or your Google listing if you do not have one. We send back a short list of what is likely costing you calls.',
      },
      {
        id: 'scope',
        title: 'Scope, price and agreement',
        description:
          'Exactly what is being built, what it costs, and whether you want Growth Partner — in writing, before anything starts.',
      },
      {
        id: 'deposit',
        title: 'Deposit, and you are on the schedule',
        description: `Half the project price to begin — ${money(deposit())} at founding-client pricing. The rest on the day it goes live.`,
      },
    ] satisfies readonly ProcessStep[],
  },

  /** The four-week shape. A shape, not a countdown — the target above carries the range. */
  weeksHeading: 'What the two to four weeks look like',
  weeks: [
    {
      id: 'week1',
      label: 'Week 1',
      title: 'Strategy and design',
      description:
        'We learn the business — your services, your customers, your competitors — then the structure and design take shape around how your customers decide.',
    },
    {
      id: 'week2',
      label: 'Week 2',
      title: 'Build',
      description:
        'The pages, the quote funnel, tap-to-call, the tracking, the local-search foundation. We draft the wording; you correct the facts.',
    },
    {
      id: 'week3',
      label: 'Week 3',
      title: 'Review and polish',
      description: `You look at it on your own phone and send back everything you want changed in one go. That is a revision round, and ${buildScope.revisionRoundsWord} are included.`,
    },
    {
      id: 'week4',
      label: 'Week 4',
      title: 'Launch',
      description:
        'Final QA against the Launch Standard: every form submitted for real, every path to contacting you walked end to end. The site goes live in your name, and the second half is due.',
    },
  ] satisfies readonly ProcessWeek[],

  /*
   * ==========================================================================
   * `launch.after` WAS HERE, AND IT IS NOW SAID ONCE INSTEAD OF THREE TIMES
   * ==========================================================================
   *
   * It held "After launch: your choice" — a heading, a lede, and two side-by-side options
   * titled "Run it yourself" and "Growth Partner — $299/mo". Every word of that is still on
   * the page, twice over and better placed:
   *
   *   - `afterLaunch` draws the whole launch → baseline → day 30 → monthly sequence with the
   *     boundary between what the build includes and what the plan adds, which is the
   *     question this block was gesturing at.
   *   - `carePricing.choice` states the two options at equal weight, immediately above the
   *     plan's own scope and price, which is where a reader is actually deciding.
   *
   * Three renderings of "after launch you choose" on one page is the redundancy this offer
   * redesign exists to remove — and it was not a harmless one. Two of them shared a heading
   * word for word, so a screen-reader user navigating the homepage by heading met "Run it
   * yourself" twice with no way to tell which was which. That is the third duplicate-heading
   * collision found in this pass, so `HomePage.test.tsx` now fails the build on any of them
   * rather than leaving it to a reviewer to notice.
   * ==========================================================================
   */
} as const;

/* ------------------------------------------------------------------ after launch */

/**
 * ============================================================================
 * LAUNCH → BASELINE → 30-DAY REPORT → MONTHLY → ONGOING
 * ============================================================================
 *
 * The question this answers is one the site had no section for: **how will I know whether
 * it worked, and when?**
 *
 * Every part of the answer already existed and none of it was findable. The tracking was a
 * technical bullet in a deliverable list. The 30-day report was the fifth beat of a prose
 * block inside the process section. The monthly measurement was the last line of the plan's
 * scope. A reader assembling "when do I first find out anything" had to visit three places
 * and infer the sequence.
 *
 * Drawn as one sequence it does two things at once: it collapses the perceived time delay —
 * the first real answer is a month after launch, not a year — and it makes the recurring
 * service the obvious continuation of something already in motion rather than an upsell
 * arriving afterwards.
 *
 * Two rules:
 *
 *   1. **The fifth stage is conditional and must always read as conditional.** Stage four
 *      is where the build ends. Everything after it happens only if the client chose Growth
 *      Partner, and a timeline that slides silently from "included" into "subscription" is
 *      the exact defect the offer simplification removed.
 *   2. **Nothing here promises a statistically meaningful conclusion from a month of local
 *      traffic.** Most sites will not have one, and stage three says so.
 * ============================================================================
 */
export const afterLaunch = {
  eyebrow: 'How you will know',
  heading: 'Launch is where the measuring starts, not where it stops.',
  lede: 'Most website projects end with a login and a goodbye, which is why most people never find out whether the last one worked. This is the sequence instead.',

  stages: [
    {
      id: 'launch',
      label: 'Launch day',
      title: 'It goes live, once it passes',
      description:
        'Live on your own domain, in your name, after the eight published Launch Standard checks.',
      owner: 'build',
    },
    {
      id: 'baseline',
      label: 'Launch day',
      title: 'Your baseline is written down',
      description:
        'Calls and quote requests are already counted as real events. The starting figure goes in writing on the day, so everything after it has something to be measured against.',
      owner: 'build',
    },
    {
      id: 'first30',
      label: 'The first 30 days',
      title: 'The real world finds the problems',
      description:
        'Included in the build. We watch what early visitors do and fix the friction that only shows up on a live site. A month of local traffic rarely proves anything, and we will not pretend otherwise.',
      owner: 'build',
    },
    {
      id: 'day30',
      label: 'Day 30',
      title: 'The first report, whoever carries on',
      description: `A written account of the first month: what happened, what changed, and what we would do next. You get it whether or not you take Growth Partner.`,
      owner: 'build',
    },
    {
      id: 'monthly',
      label: 'Every month after that',
      title: `The ${websiteReportName}, if you choose Growth Partner`,
      description:
        'Measure, explain, improve, report — and round again. This is the part that is optional, and it starts only if you choose it.',
      owner: 'partner',
    },
  ],

  /** Where the build's obligation ends, stated on the diagram rather than under it. */
  boundary: {
    buildLabel: 'Included in the build',
    partnerLabel: `${growthPartner.name} — optional, monthly`,
    note: 'The first four happen because you bought the build. The fifth happens only if you choose to carry on.',
  },
} as const;

/* ------------------------------------------------------------------ the relationship */

/**
 * The two purchases as a sequence rather than as two cards side by side.
 *
 * Drawn because the question "why is there a monthly fee at all" is answered by the
 * relationship between the two, and a reader looking at two priced cards has to construct
 * that relationship themselves. Almost all of them construct the wrong one: a website, and
 * then a bill to keep it switched on.
 *
 * Three beats, and the middle one is doing the work — the build does not merely produce a
 * website, it produces a *measured* website, which is the thing the monthly service
 * operates on. Without the baseline there is nothing for Growth Partner to be accountable
 * to, and the fee genuinely would be upkeep.
 */
export const relationship = {
  heading: 'How the two fit together',
  lede: 'One creates the asset. The other operates it. Neither pretends to be the other, and the second one is your choice.',
  steps: [
    {
      id: 'build',
      label: flagship.name,
      cadence: 'One-time',
      role: 'Creates the asset — and the baseline that makes it measurable.',
    },
    {
      id: 'asset',
      label: 'A measured website in your name',
      cadence: 'Yours, permanently',
      role: 'Live, owned by you, with a starting number written down. You can stop here.',
    },
    {
      id: 'partner',
      label: growthPartner.name,
      cadence: 'Monthly, optional',
      role: `Operates and improves it, and reports what it produced — the ${websiteReportName}, every month.`,
    },
  ],
  closing:
    /*
     * This used to end "What you cannot do on your own is find out whether it is working."
     *
     * Which is false, and false in a way the build itself disproves two paragraphs earlier:
     * the build hands over verified conversion tracking, a written baseline and a day-30
     * report, on accounts in the client's name. They can absolutely look. Telling a business
     * owner they cannot understand their own analytics is both untrue and the wrong register
     * for a site whose whole position is that it does not talk down to its market.
     *
     * The honest version is about who does it, not who can: the difference is somebody whose
     * job it is, every month, whether or not it was a good month.
     */
    'The build stands on its own — the site is yours and it keeps working if you never buy anything else. What the monthly fee buys is somebody whose job it is to look every month, including the months you would rather not think about it.',
} as const;

/* ------------------------------------------------------------------ responsibilities */

/**
 * Who does what, stated plainly.
 *
 * The site has always admitted the client's side of the work — the timeline is measured
 * from when their materials arrive. This section turns that admission into a division of
 * responsibility a buyer can check, which is what "done for you" has to mean here.
 */
export const responsibilities = {
  eyebrow: 'Who does what',
  heading: "You don't need to know how to build a website.",
  lede: 'The split of the work, stated plainly — so "done for you" is something you can check rather than a slogan.',

  weHandle: {
    label: 'We handle',
    items: [
      'Strategy and page structure',
      'Design and development',
      'Drafting the copy — we write it, you correct the facts',
      'Technical setup: domain, hosting, certificates',
      'Analytics and conversion tracking',
      'The local-search foundation',
      'QA against the Launch Standard, and the launch itself',
      'Ongoing management — if you choose Growth Partner',
    ],
  },

  youProvide: {
    label: 'You provide',
    items: [
      'Your business knowledge: services, service area, how you charge',
      'Photos of your own finished work — phone photos are usually fine',
      'Corrections to the drafted wording, because you know your trade',
      'Approvals and decisions, reasonably promptly',
      'Access to what we need: your domain, your Google Business Profile',
    ],
  },

  note: 'We draft the structure and the wording; you correct the facts and approve it. The timeline starts when your materials arrive, because that is genuinely where these projects stall.',
} as const;

/* ------------------------------------------------------------------ the stack */

/*
 * The value stack: what the one-time build includes, grouped by the job each part does.
 *
 * **Build deliverables only.** The previous version of this section mixed hosting,
 * monitoring, seasonal refreshes and the response guarantee — all Growth Partner work —
 * into the list a reader uses to decide what the project price buys. The recurring
 * service now has its own block, below the price, labelled as optional, and a test
 * fails the build if recurring language reappears in these lists.
 *
 * `whyItMatters` is not decoration. Each group states its deliverables and then answers
 * "why should the owner of a plumbing business care", which is the question every
 * feature list on every agency website fails to answer.
 */
/**
 * The icon for each build outcome, keyed by its id in `config/pricing.ts`.
 *
 * Separate from the outcomes themselves because an icon is a presentation choice and the
 * deliverables are a commercial commitment — and because `config/pricing.ts` should not
 * have to import the icon union to state what the money buys. `Record` rather than a
 * partial lookup, so adding an outcome without choosing an icon is a compile error rather
 * than a blank square.
 */
const OUTCOME_ICONS: Readonly<Record<string, OfferGroup['icon']>> = {
  designed: 'layout',
  found: 'map-pin',
  understood: 'inbox',
  trusted: 'shield',
  contacted: 'target',
  measured: 'bolt',
  launched: 'rocket',
};

export const offerStack = {
  eyebrow: 'What the build changes',
  /*
   * Not "What the build includes".
   *
   * That heading told the reader to expect a scope document, and then the four groups
   * underneath each answered "why should the owner of a plumbing business care" — the
   * right pattern, arriving to an audience the heading had already put in invoice-reading
   * mode. The list is the same list; the promise above it is what the reader came for.
   */
  heading: 'What changes for the people trying to hire you',
  lede: 'Seven promises, and what each one takes. All of it is the one-time project — what happens after launch is priced separately, below.',

  /*
   * Derived from `buildOutcomes`, so the grouped presentation and the checklist the pricing
   * card renders cannot disagree. Adding a deliverable is one edit in the config.
   */
  groups: flagship.outcomes.map((outcome, index): OfferGroup => ({
    id: outcome.id,
    step: String(index + 1).padStart(2, '0'),
    name: outcome.promise,
    mechanism: outcome.name,
    summary: outcome.detail,
    includes: outcome.includes,
    whyItMatters: outcome.whyItMatters,
    icon: OUTCOME_ICONS[outcome.id] ?? 'check',
  })) satisfies readonly OfferGroup[],

  summary: 'One project, one price, one person building all of it.',
} as const;

/* ------------------------------------------------------------------ included value */

/*
 * Only list something here that the business will genuinely do for every customer.
 * Each item removes a specific obstacle between the buyer and the outcome, and none of
 * them carries an invented dollar value — there is no defensible basis for one, and
 * inflating a bonus to make the total look larger is the thing this offer avoids.
 *
 * Delete any line the business will not actually deliver. An unmet bonus costs more
 * trust than it ever bought.
 */
export const included = {
  heading: 'Included, not sold separately',
  lede: 'Four pieces of work that usually arrive as a separate invoice from somebody else.',

  items: [
    {
      id: 'blueprint',
      title: 'Website Conversion Blueprint',
      description:
        'The highest-value conversion improvements found while building your site: what changed, why, and what to watch after launch.',
      icon: 'target',
    },
    {
      id: 'local',
      title: 'Local Presence Check',
      description:
        'Your Google Business Profile reviewed against what customers and search engines look for, with a plain list of what to fix.',
      icon: 'map-pin',
    },
    {
      id: 'tracking',
      title: 'Conversion Tracking Setup',
      description:
        'Calls and quote requests configured as countable events and verified before launch, so nobody has to guess.',
      icon: 'bolt',
    },
    {
      id: 'framework',
      title: 'Service Page Framework',
      description:
        'A repeatable structure for every service you want to be hired for, so adding one next year is a small job.',
      icon: 'layout',
    },
  ],
} as const;

/* ------------------------------------------------------------------ pricing */

/*
 * ============================================================================
 * PRICING — DERIVED, NEVER TYPED
 * ============================================================================
 *
 * One build price and one optional monthly price. Every figure comes from
 * `config/pricing.ts`; nothing here is a literal.
 *
 * ## How the founding-client price is presented, and why it is presented that way
 *
 * The FTC's Guides Against Deceptive Pricing (16 CFR 233.1) permit a former-price
 * comparison only where the former price was actually charged, publicly, on a regular
 * basis, for a substantial period. **This business has never charged the standard
 * price.** It is a rate card being established now.
 *
 * So the standard price is rendered as a *labelled, concurrent* price — "Standard
 * project price" — and never as a strike-through. Strike-through is how a page says
 * "was" without typing it, and "was" is the one thing that would not be true. What is
 * shown instead is two prices that both exist today, one of which requires the buyer to
 * qualify for it, and the condition is printed beside the number rather than under it.
 * ============================================================================
 */

/** Every figure the copy interpolates, derived from `config/pricing.ts`. */
export const prices = {
  /** The build, at the price available today. */
  launch: money(currentPrice()),
  /** The rate card. **Never render this as a former price.** */
  launchStandard: money(flagship.standard),
  /** Derived, never typed. */
  launchSaving: money(saving()),
  deposit: money(deposit()),
  management: money(growthPartner.monthly),
  managementDisplay: `${money(growthPartner.monthly)}/mo`,
  annual: money(growthPartner.annual),
  /** Build + twelve months of Growth Partner. Published, not left as homework. */
  yearOne: money(yearOneTotal()),
} as const;

export const pricing = {
  eyebrow: 'What it costs',
  heading: 'One project price. One optional monthly service.',
  lede: 'A one-time project at a published price. Growth Partner is a separate monthly service you choose — or decline — after launch. Every number is agreed in writing first.',

  /**
   * The founding-client offer, as the page states it.
   *
   * `enabled` derives from the config: switch the offer off — or sign the tenth
   * founding project — and every one of these strings leaves the site with it.
   *
   * Deliberately not "limited time", and deliberately no live counter. The offer is
   * limited by a count and a condition; the count is stated in the body, and a
   * hand-maintained "X of 10 still open" string is one missed edit away from being a
   * false availability claim.
   */
  founding: {
    enabled: hasFoundingDiscount(),
    label: foundingOffer.label,
    standardLabel: foundingOffer.standardLabel,
    body: `The first ${foundingOffer.total} projects are priced below the standard rate ${foundingOffer.qualification}. ${foundingOffer.explanation}`,
    savingLabel: 'Save',
  },

  /**
   * The five things a buyer needs before the deliverable list, not after it.
   *
   * Every one of these answers "what does this cost me in effort or risk", which is the
   * question a fifteen-item feature list cannot answer and is the one actually standing
   * between a convinced reader and a phone call. The first line is the strongest sentence in
   * the whole offer and it used to be buried in a "who does what" block eleven sections
   * down: the single most common reason a business owner does not commission a website is a
   * belief that they will have to write it.
   *
   * Interpolated from `buildScope` where a count is stated, so the words-to-numbers guard
   * holds these to the same figures as everything else.
   */
  reassurance: [
    'We draft the copy and the structure — you correct the facts',
    /*
     * The consequence was missing, and the consequence is the whole point.
     *
     * "In your name from day one" is a fact about account registration. The fear it answers is
     * being held hostage by whoever built the site — which is the most common bad experience
     * this market has actually had, and it is not answered by a fact about registration unless
     * the reader completes the inference themselves. Most do not. The clause after the dash is
     * the sentence they came for, and it costs six words.
     *
     * The full block, with the individual assets named, is on `/pricing` where somebody is
     * actively weighing the risk. This is the homepage's version and it stays one line.
     */
    'The domain, hosting and content are in your name from day one — leave whenever you like and you take all of it',
    `${buildScope.revisionRoundsWord[0]?.toUpperCase() ?? ''}${buildScope.revisionRoundsWord.slice(1)} revision rounds within the agreed scope`,
    '30 days of checks and fixes after it goes live',
    'It does not launch until it passes the published Launch Standard',
  ] as readonly string[],

  /** The one build, priced. Rendered by both pricing surfaces from this single object. */
  build: {
    cadence: 'One-time project',
    name: flagship.name,
    statement: flagship.statement,
    summary: flagship.bestFor,
    price: money(currentPrice()),
    /** Rendered small and labelled. **Never with a line through it.** See above. */
    standardPrice: money(flagship.standard),
    hasDiscount: hasFoundingDiscount(),
    saving: money(saving()),
    priceNote: `${money(deposit())} to begin, ${money(deposit())} on the day it goes live. Nothing else is owed on the build.`,
    includes: flagship.includes,
    terms: `Two revision rounds and up to ${buildScope.servicePagesWord} service pages. Larger scope — extra service areas, software integration, a booking system — is quoted in writing first.`,
    timeline: 'Typical launch: 2–4 weeks after we have your materials and approvals.',
  } satisfies BuildPricing,

  /*
   * ==========================================================================
   * THERE WAS A SECOND CARD HERE, AND IT WAS WITHDRAWN
   * ==========================================================================
   *
   * `fix` — Conversion Fix — lived here: a named, scoped, bounded second product for the
   * reader whose site basically works, built to close the dead end the audit's middle
   * branch used to end in.
   *
   * It never got a price. `pricePublished` shipped false and stayed false, so the site
   * published a product it could not quote, with a bounded scope written against a figure
   * nobody had agreed. DECISION 014 asked for the figure; the answer was to withdraw the
   * product. The header of `config/pricing.ts` carries the full reasoning.
   *
   * **The dead end did not come back.** The audit's `fix` branch and the entry section's
   * middle path both now offer the free review of the real site that any fix was always
   * going to be scoped from — see `audit.ts` and `entry.ts`. What is gone is a card selling
   * a second product; what is not gone is an answer for the reader it was written for.
   * ==========================================================================
   */

  /**
   * The real capacity constraint, published as what it is. This is the only scarcity on
   * the site: no counters, no timers, no invented urgency.
   */
  capacity: {
    heading: 'One build at a time',
    body: 'We take on one website build at a time. That is what keeps the two-to-four-week timeline honest.',
  },

  /** Year-one economics, in full. Hiding recurring costs is the move this page refuses. */
  yearOne: {
    heading: 'What the first year actually costs',
    lede: 'Both paths, in full — recurring economics you have to work out yourself are recurring economics being hidden.',
    websiteOnly: {
      label: 'Website only',
      figure: money(currentPrice()),
      note: 'One-time. You own the site and run it yourself after launch.',
    },
    withPartner: {
      label: `Website + ${growthPartner.name}`,
      breakdown: `${money(currentPrice())} build + ${money(growthPartner.monthly)} × 12 months`,
      figure: money(yearOneTotal()),
      note: `If you keep it the whole year. ${growthPartner.minimumMonthsWord[0]?.toUpperCase() ?? ''}${growthPartner.minimumMonthsWord.slice(1)}-month minimum from launch, then month-to-month — you are never signed up for a year.`,
    },
  },

  /** The question underneath the whole structure, answered on the page. */
  whyNotMonthly: {
    question: `Why isn't the website just ${money(growthPartner.monthly)} a month?`,
    answer:
      'Because the website is a one-time project: strategy, design, development, content and launch. The monthly service is what happens afterwards. Pricing them apart is what lets you decline the second without losing the first.',
  },

  /**
   * The annual prepay on the recurring plan, kept deliberately secondary. It is a
   * discount for somebody who would rather pay once, not the option the page steers
   * toward.
   */
  annual: {
    label: 'Or pay annually',
    price: money(growthPartner.annual),
    cadence: 'per year',
    saving: 'About two months back.',
    note: `Cancel part-way through a prepaid year and the unused months are refunded at the ${money(growthPartner.monthly)} monthly rate.`,
  },

  /**
   * What stands in for the deliverable list on the surface that has already printed it.
   *
   * The homepage renders the seven promises immediately above this card, so the card's own
   * expansion of the same array was the section saying one thing twice. See `PricingBlock`.
   */
  includesPointer: 'Everything in the seven promises above, in full.',

  note: 'Every number is fixed in writing before anything starts. Anything materially outside the published scope is quoted before work begins, never after.',

  /**
   * The direct action for a reader who has already decided. It carries context into the
   * contact form (`?intent=build`), so choosing the build never means starting over.
   */
  requestCta: 'Request this build',
} as const;

/* ------------------------------------------------------------------ comparison */

/**
 * The build and the plan, side by side — so the difference between the two purchases is
 * a table a reader can scan rather than a distinction they have to reconstruct.
 */
export const comparison = {
  heading: 'Which purchase does what',
  lede: 'Two different jobs. The build creates the asset; Growth Partner keeps it working and improving. Neither pretends to be the other.',
  columns: {
    build: 'The build — one-time',
    partner: `${growthPartner.name} — monthly, optional`,
  },
  rows: [
    { id: 'built', label: 'Website designed, built and launched', build: 'Yes', partner: '—' },
    /*
     * These two rows carry the entire premium, and they used to be the two vaguest cells in
     * a table whose whole purpose is scannable specificity: "Watched and explained" and
     * "Ongoing". A reader comparing providers cannot compare a gerund. Both now name a
     * deliverable with a cadence.
     */
    {
      id: 'tracking',
      label: 'The enquiry number',
      build: 'Measured, and the baseline written down at launch',
      partner: `Reported every month — the ${websiteReportName}`,
    },
    {
      id: 'report',
      label: 'A written account of what happened',
      build: 'Once, at day 30',
      partner: 'Every month, with what changed and why',
    },
    {
      id: 'search',
      label: 'Local-search foundation',
      build: 'Built in',
      partner: 'Kept current',
    },
    {
      id: 'hosting',
      label: 'Hosting and domain',
      build: 'Set up in your name',
      partner: 'Managed, and the costs are covered',
    },
    { id: 'updates', label: 'Security and software updates', build: '—', partner: 'Yes' },
    { id: 'backups', label: 'Backups', build: '—', partner: 'Taken and checked' },
    {
      id: 'monitoring',
      label: 'Uptime and form-delivery monitoring',
      build: '—',
      partner: 'Yes',
    },
    {
      id: 'edits',
      label: 'Website changes',
      build: 'Two revision rounds',
      partner: 'On request, month after month',
    },
    {
      id: 'conversion',
      label: 'Conversion improvements',
      build: 'Designed in, plus the first 30 days',
      partner: 'Every month, chosen from what the report shows',
    },
    { id: 'seasonal', label: 'Seasonal refreshes', build: '—', partner: 'Four a year' },
    {
      id: 'response',
      label: 'Response guarantee',
      build: '—',
      partner: '24 business hours',
    },
    {
      id: 'payment',
      label: 'Payment',
      build: 'Half to start, half at launch',
      partner: 'Monthly from launch; three-month minimum',
    },
  ] satisfies readonly ComparisonRow[],
  note: 'The build stands on its own. Growth Partner starts on launch day only if you choose it, and stopping it never costs you the website.',
} as const;

/**
 * ============================================================================
 * THE MARKET COMPARISON — HEDGED ON PURPOSE, AND NOBODY IS NAMED
 * ============================================================================
 *
 * A buyer's real comparison set is not "JobForge versus another conversion practice". It is
 * a nephew, a template subscription, a freelancer and a local agency, and the site never
 * addressed any of them. The FAQ now answers the platform question directly; this is the
 * scannable version.
 *
 * Three rules, and the first two are what make it publishable at all:
 *
 *   1. **Nobody is named.** Not a builder, not a platform, not a competitor. A named
 *      comparison is a factual claim about somebody else's product that this business has
 *      not measured and could not defend.
 *   2. **Every cell in the left column is hedged, and the hedges are honest.** "Sometimes",
 *      "Varies", "Rarely", "Usually a separate arrangement". Plenty of website projects do
 *      some of these well — the column describes the general market, not a straw man, and
 *      the note underneath says so out loud.
 *   3. **Every cell in the right column is a thing published elsewhere on this site.** No
 *      row may claim something the offer does not commit to; each one is checkable against
 *      the deliverables, the Launch Standard or the plan's scope.
 * ============================================================================
 */
export const marketComparison = {
  heading: 'What usually comes with a website, and what comes with this',
  lede: 'The left column is the general market rather than any particular provider — plenty of website projects do some of this, and none of it is unique to us. What is unusual is having all of it written down before you buy.',
  columns: {
    label: 'What is covered',
    typical: 'A typical website project',
    here: 'Here',
  },
  rows: [
    { id: 'site', label: 'A website', typical: 'Yes', here: 'Yes' },
    {
      id: 'paths',
      label: 'Paths built to produce a call or a quote request',
      typical: 'Sometimes',
      here: 'The point of the build',
    },
    {
      id: 'tracking',
      label: 'Conversion tracking configured and verified',
      typical: 'Varies',
      here: 'Verified with real submissions before launch',
    },
    {
      id: 'baseline',
      label: 'A starting enquiry number, written down',
      typical: 'Rarely',
      here: 'On launch day',
    },
    {
      id: 'standard',
      label: 'A published definition of "finished"',
      typical: 'Varies',
      here: 'Eight checks you can verify yourself',
    },
    {
      id: 'reporting',
      label: 'A monthly account of what the site produced',
      typical: 'Rarely',
      here: `${growthPartner.name} — the ${websiteReportName}`,
    },
    {
      id: 'improvement',
      label: 'Ongoing improvement after launch',
      typical: 'Usually a separate arrangement, if at all',
      here: `${growthPartner.name}, and optional`,
    },
    {
      id: 'ownership',
      label: 'You own the domain, hosting and content',
      typical: 'Varies',
      here: 'In your name from the start',
    },
    {
      id: 'terms',
      label: 'Terms, scope and exit published before you buy',
      typical: 'Rarely',
      here: 'On this page',
    },
  ] satisfies readonly MarketComparisonRow[],
  note: 'No provider is named here, and none of these rows is a measurement of anybody else. They are the questions worth asking whoever you talk to — including us.',
} as const;

/**
 * ============================================================================
 * THE LAUNCH STANDARD
 * ============================================================================
 *
 * Risk reversal that is checkable rather than reassuring.
 *
 * "Satisfaction guaranteed" transfers no risk, because the buyer cannot tell whether it
 * has been met and neither can I. Every line below is a pass/fail somebody could verify on
 * their own site the day it goes live — which is what makes the promise underneath it a
 * commitment rather than a sentiment.
 *
 * **Nothing here promises a business result.** It promises the work meets a published bar
 * before it is called finished. Leads, rankings and revenue depend on the market, the
 * price and the phone being answered, and this file has never claimed otherwise.
 */
export const launchStandard = {
  eyebrow: 'The Launch Standard',
  heading: 'It does not launch until it passes.',
  lede: '"Done" is a list, not an opinion — the same eight checks every time, each one something you could verify yourself on launch day.',

  checks: [
    {
      id: 'mobile',
      title: 'It works on a phone first',
      detail:
        'Checked on real screen sizes, not a desktop browser made narrow. Tap targets reachable one-handed, nothing overflowing sideways.',
    },
    {
      id: 'speed',
      title: 'It loads fast on a bad connection',
      detail:
        'Measured against the thresholds Google grades on, on a mid-range phone rather than an office machine.',
    },
    {
      id: 'forms',
      title: 'Every form actually arrives',
      detail:
        'Each one submitted for real and confirmed received. A quote form that fails silently is worse than no form.',
    },
    {
      id: 'tracking',
      title: 'Calls and enquiries are counted',
      detail:
        'Analytics and conversion tracking verified with real events, so month one has numbers rather than guesses.',
    },
    {
      id: 'search',
      title: 'Search engines can read it',
      detail:
        'Titles, descriptions, sitemap, indexing and redirects from your old pages, all checked rather than assumed.',
    },
    {
      id: 'accessible',
      title: 'It is usable by everyone',
      detail:
        'Keyboard navigable, sensible heading order, real contrast. Roughly one customer in four has a reason to care.',
    },
    {
      id: 'browsers',
      title: 'It works in the browsers your customers use',
      detail: 'Tested across current browsers on both desktop and mobile, not just ours.',
    },
    {
      id: 'paths',
      title: 'Every path to contacting you works',
      detail:
        'Tap-to-call, every form, every button — walked end to end as a customer would, on the live site.',
    },
  ],

  /**
   * The promise. Deliberately about work rather than outcome: I can commit to continuing
   * to work, and I cannot commit to what the market does afterwards.
   */
  promise:
    'If it does not meet the standard, it is not launched, and we keep working until it does.',
  limit: 'What it does not promise is a business result — see what nobody controls, below.',
} as const;

/**
 * ============================================================================
 * THE WEBSITE PERFORMANCE REPORT — THE DELIVERABLE THIS OFFER WAS MISSING
 * ============================================================================
 *
 * The recurring fee used to be defended by an activity list: hosting, backups, monitoring,
 * seasonal refreshes, campaign allowances. Activity lists are how care plans are sold,
 * because activity is all a care plan has. The work was never the problem — the problem was
 * that nothing arrived. "Measurement, and what it means in plain English" was the last line
 * of a six-item list and the vaguest sentence on the page, and a customer could not have
 * told you whether they had received it.
 *
 * A named artefact on a schedule is a different kind of promise. It is something the client
 * notices arriving, and — the part that actually makes it worth paying for — something they
 * notice **not** arriving. That is what turns a recurring charge from a subscription into an
 * accountability.
 *
 * ## Three rules, and the second one is the whole reason this is publishable
 *
 *   1. **It reports; it does not promise.** The commitment is measurement, explanation and
 *      improvement work. Nowhere may the copy imply the number goes up — that depends on
 *      demand, pricing, season and whether the phone gets answered, none of which is ours.
 *   2. **The illustrative example shows a month where the number went DOWN.** This is
 *      deliberate and it should not be "fixed". An example showing a rise is an implied
 *      result claim wearing a disclaimer, and every reader has seen one. A month that fell
 *      for a reason outside the website, reported plainly with the reason attached, is the
 *      only version that demonstrates what the client is actually buying: the truth,
 *      monthly, including when it is unflattering.
 *   3. **No currency figure, and no percentage.** Counts only. A percentage in an
 *      illustrative panel is a statistic as far as a reader is concerned, and the currency
 *      sweep in `content.test.ts` fails the build on any figure the pricing config did not
 *      produce.
 *
 * DECISION 015 in `docs/owner-decisions-required.md` is the operational commitment behind
 * this: it has to be produced every month, for every client, or it should not be published.
 * ============================================================================
 */

export const websiteReport = {
  name: websiteReportName,
  eyebrow: 'Every month',
  heading: 'Every month, something arrives.',
  lede: `The first thing Growth Partner delivers, and the reason the rest is worth paying for. Four things, in plain English, every month.`,

  /** What every report contains. This is the commitment, not the example below it. */
  contains: [
    {
      id: 'number',
      label: 'What the website produced',
      detail:
        'Counted as real events rather than estimated — the one number the website is responsible for.',
    },
    {
      id: 'change',
      label: 'Whether it moved',
      detail:
        'Against last month, and against the launch-day baseline — including the months it fell.',
    },
    {
      id: 'changed',
      label: 'What we changed, and why',
      detail: 'Every change made that month, and the reason for each one.',
    },
    {
      id: 'next',
      label: 'What we are looking at next',
      detail: 'The next thing worth investigating, and why it is next.',
    },
  ],

  /*
   * The illustrative example. See rule 2 above before changing any of these numbers.
   *
   * There is no business here, no client, and no measured result. What is being shown is
   * the *shape* of the artefact — and a deliberately awkward month, because that is the
   * month a buyer actually wants to know how their provider behaves in.
   */
  example: {
    label: 'Illustrative example',
    caption: 'What a report looks like when the month goes the wrong way',
    monthLabel: 'Month five',
    metricLabel: 'Calls and quote requests',
    metricValue: '34',
    previousLabel: 'The month before',
    previousValue: '41',
    baselineLabel: 'At launch',
    baselineValue: '22',
    readingLabel: 'What we make of it',
    reading:
      'Down seven on last month, still well above where it started. Both drops are on the emergency page — a mild month for this trade, not something that broke. Two of the three changes below are a week old and too new to judge.',
    changedLabel: 'What we changed',
    changed: [
      'Reworded the service page call to action and moved it above the photographs',
      'Cut the quote form from nine questions to five',
      'Moved tap-to-call above the fold on the emergency page',
    ],
    nextLabel: 'What we are looking at next',
    next: [
      'Quote requests started on a phone and abandoned before the last field',
      'The emergency path, which is where most visitors still stop',
      'Whether the seasonal page should turn over yet',
    ],
    note: 'A made-up month for a made-up business, to show the shape. No real result is claimed, and the number went down on purpose — a sample report where the line always rises is an advert with a disclaimer on it.',
  },

  /** The limit, stated with the promise rather than underneath it. */
  honesty: {
    heading: 'What the report is not',
    body: 'Not a promise that the number goes up. The promise is that it gets measured, that you are told what it did, and that the next thing is named. Demand, your pricing, the season and whether the phone gets answered all move that number more than a website can.',
  },
} as const;

/**
 * The service after launch, priced and sold separately.
 *
 * It is not bundled into the build and buying the build does not require it. A project
 * that only makes financial sense with a subscription attached is a project priced
 * dishonestly, and the buyer works that out in month four.
 */
export const carePricing = {
  eyebrow: 'Optional, after launch',
  /*
   * The heading used to be "The website is not finished when it launches", and the lede
   * opened with services changing, photos going stale and certificates expiring — three
   * upkeep problems. It is a true sentence that sells a care plan. What the plan is for is
   * knowing what the website is doing and making it do more of it; the upkeep is the floor.
   */
  heading: 'After launch, somebody has to be watching the number',
  lede: `Growth Partner measures what the website produces, explains it, and acts on it — starting with the ${websiteReportName} every month. Keeping the site running and secure is the floor, not the point. Optional, and separate from the build.`,

  /** The two honest options, stated side by side. Part of the offer, not fine print. */
  choice: {
    heading: 'Two honest options after launch',
    without: {
      title: 'Run it yourself',
      body: 'Everything is already in your name. You pay hosting and domain directly, and handle changes, updates and monitoring yourself. The site keeps working; the responsibility is yours.',
    },
    with: {
      title: `Take ${growthPartner.name}`,
      body: 'One person stays responsible for keeping it working, current and improving. Hosting and domain renewals are inside the fee.',
    },
  },

  /**
   * The one plan, with its scope grouped by cadence so nothing reads as unlimited.
   *
   * ============================================================================
   * THE ORDER OF THESE GROUPS IS THE COMMERCIAL ARGUMENT
   * ============================================================================
   *
   * This list used to open with "Hosting, certificates, backups and security updates" and
   * close with "Measurement, and what it means in plain English". Every other artefact a
   * reader scans did the same: the first screen's note, the six management categories, the
   * comparison table's substantive rows. So the site argued in prose that the monthly fee
   * is not upkeep — there is a section headed "This is not a maintenance plan" — while
   * every scannable surface put upkeep first and the measurement last, in the vaguest
   * words on the page.
   *
   * Readers scan. Prose loses.
   *
   * The order is now **measure → improve → keep it current → keep it running → on
   * request**, and the first group is a named artefact rather than an abstract noun. Upkeep
   * has not been removed or diminished: it is the floor, it is labelled as the floor, and
   * `notJustMaintenance` in `content/growth.ts` has always said so. It simply stops being
   * the first thing a buyer associates with the fee.
   *
   * Nothing in these lists may be a build deliverable, and a test enforces it.
   * ============================================================================
   */
  plan: {
    name: growthPartner.name,
    price: `${money(growthPartner.monthly)}/mo`,
    annual: money(growthPartner.annual),
    summary:
      'The enquiry number, measured and explained every month — and the work that comes out of it.',

    groups: [
      {
        id: 'measure',
        label: 'Every month, first',
        items: [
          `The ${websiteReportName}: what the website produced, whether it moved, and what we make of it`,
          'Calls and quote requests counted as events rather than estimated',
          'Measured against the baseline recorded at launch, so a change has something to be judged against',
        ],
      },
      {
        id: 'improve',
        label: 'Every month, from what the measurement shows',
        items: [
          'Conversion and user-experience improvements to the pages that bring in the most work',
          'Calls to action, forms and service pages refined where the numbers point',
          'Speed and mobile experience monitored rather than assumed',
          'A/B testing where your traffic supports a meaningful result — and a considered improvement, called that, where it does not',
        ],
      },
      {
        id: 'current',
        label: 'As your business changes',
        items: [
          'Content, service and photo changes when you ask',
          'Business information, hours and service area kept true',
          'A seasonal refresh each quarter: the services your customers need right now moved to the front, with the messaging and call to action that match',
        ],
      },
      {
        id: 'floor',
        label: 'Continuously, and you should never have to think about it',
        items: [
          'Hosting, certificates, backups and security updates',
          'Uptime and form-delivery monitoring, so a broken form is found by us',
          'Bugs fixed when they appear',
        ],
      },
      {
        id: 'request',
        label: 'When you ask',
        items: [
          'Up to one campaign landing page a month',
          'Up to two campaign copy alignments a month',
          'Anything larger, quoted before it starts — never after',
        ],
      },
    ] satisfies readonly PlanScopeGroup[],

    /** The floor, named as the floor rather than left to be inferred from its position. */
    floorNote:
      'The last two groups are the floor: worth having, and not what the fee is for. What you are paying for is the first two.',

    limits:
      'The campaign allowances are monthly and do not accumulate. Nothing here is described as without limits, because nothing is.',
    guarantee: `A reply within 24 business hours to anything you raise, or that month's ${money(growthPartner.monthly)} fee is waived in full — applied by us, without you asking.`,
  },

  /**
   * The action for a reader convinced by this block.
   *
   * Deliberately not "Start Growth Partner". The plan begins on launch day and there is no
   * website yet for most readers of this page, so a button offering to start it would be
   * offering something that cannot happen — which is the honest reason the card had no
   * button at all until now. What it can honestly offer is the conversation, carrying
   * `?intent=partner` so nobody has to explain themselves twice.
   */
  requestCta: 'Ask about Growth Partner',

  // The "Three-month" count is guarded by the words-to-numbers test against the config.
  /*
   * The notice period is interpolated from `growthPartner.noticeDays` rather than typed.
   *
   * The minimum term is protected by the words-to-numbers guard; the notice period never was,
   * so it was the one commercial quantity on this page that could silently disagree with the
   * config — a "30 days' notice" left behind after somebody changed the number to 14 would
   * read as correct and be a false statement in the one paragraph a leaving client reads most
   * carefully.
   */
  terms: `Optional — it starts on launch day only if you choose it. Three-month minimum, then month-to-month with ${growthPartner.noticeDays} days' notice. No annual contract, ever.`,
  optOut: 'You can also take the build and stop there. The website is yours, and it keeps working.',
} as const;

/* ------------------------------------------------------------------ terms */

/*
 * ============================================================================
 * PUBLISHED COMMERCIAL TERMS
 * ============================================================================
 *
 * Every row here is a question a buyer asks before they will pick up the phone, so every
 * row is answered on the page rather than only in the contract. They must match the
 * written client agreement exactly; if the agreement changes, this changes with it.
 *
 * The terms are grouped by which purchase they belong to. The previous flat list put
 * "minimum term: three months" directly under the project price, where it read as a
 * term of the build — it never was, and a grouped presentation is what stops that
 * misreading structurally.
 *
 * `docs/business-offer.md` is the authoritative record of all of it.
 * ============================================================================
 */
export const commercialTerms = {
  eyebrow: 'The terms',
  heading: 'What you are agreeing to',
  lede: 'In plain English, before you get in touch rather than after, and split between the two purchases. The written agreement governs, and it says the same things.',

  groups: [
    {
      id: 'build',
      label: 'The build — one-time project',
      items: [
        {
          id: 'payment',
          label: 'Payment',
          value: `${money(deposit())} then ${money(deposit())}`,
          detail: `Half of the ${money(currentPrice())} project price to start the work, half on the day it goes live. Nothing else is owed on the build.`,
        },
        {
          id: 'timeline',
          label: 'Typical launch',
          value: '2–4 weeks',
          detail:
            'Measured from when the materials and approvals we need are in our hands. The build is rarely the slow part; waiting on photos, a service list and a decision usually is.',
        },
        {
          id: 'revisions',
          label: 'Revisions',
          value: 'Two rounds',
          detail:
            'A round is everything you want changed, sent together. Two are included within the scope we agreed. New pages, new functionality or a change of direction after sign-off is new scope, and gets quoted.',
        },
        {
          id: 'scope',
          label: 'Pages included',
          value: `Up to ${buildScope.servicePagesWord} services`,
          detail: `Plus home, about and contact. That covers the service list of almost every local trade. More than ${buildScope.servicePagesWord} is quoted before it is built.`,
        },
        {
          id: 'ownership',
          label: 'Ownership',
          value: 'Yours, throughout',
          detail:
            'The domain, the hosting account and the content are in your name from the start. If you never take Growth Partner, you simply pay those providers directly and run the site yourself.',
        },
      ] satisfies readonly CommercialTerm[],
    },
    {
      id: 'partner',
      label: `${growthPartner.name} — monthly, optional`,
      items: [
        {
          id: 'optional',
          label: 'Optional',
          value: 'Your choice',
          detail:
            'Never a condition of the build. If you want it, it starts on launch day; if you do not, the website is still yours and still works.',
        },
        {
          id: 'minimum',
          label: 'Minimum term',
          value: 'Three months',
          detail:
            'The first ninety days are what it takes to launch, see what visitors actually do, find the friction and start fixing it. Measuring less than that is measuring noise.',
        },
        {
          id: 'after',
          label: 'After that',
          value: 'Month-to-month',
          detail:
            'No annual contract, ever. Once the minimum is served the arrangement continues month by month for as long as it is worth having.',
        },
        {
          id: 'cancellation',
          label: 'Cancellation',
          value: `${growthPartner.noticeDays} days’ notice`,
          detail:
            'Tell us you are stopping and the service runs for another thirty days, then ends. Nothing is held hostage and nothing has to be argued about.',
        },
        {
          id: 'hosting',
          label: 'Hosting costs',
          value: `Inside the ${money(growthPartner.monthly)}`,
          detail:
            'Hosting and domain renewals are paid by JobForge while the plan is active. If the plan ends, those accounts are already in your name — billing simply moves back to you.',
        },
      ] satisfies readonly CommercialTerm[],
    },
  ] satisfies readonly CommercialTermGroup[],

  note: 'Written into the agreement before any money changes hands. Ask to read it first — that is what it is for.',
} as const;

/** Every term, flattened. For consumers that need the list without the grouping. */
export const commercialTermItems = commercialTerms.groups.flatMap((group) => group.items);

/* ------------------------------------------------------------------ cancellation */

/*
 * What happens when somebody leaves.
 *
 * This section exists because it is the strongest thing on the page. A buyer who has been
 * burned by an agency that held their domain hostage is reading everything else through
 * that memory, and the only way to answer it is to answer it before they ask.
 */
export const cancellation = {
  heading: 'What happens if you cancel',
  lede: 'The honest version, written down before you need it.',

  items: [
    {
      id: 'keep',
      title: 'You keep the website',
      description:
        'The domain, the hosting account and everything on it are already in your name. There is nothing to hand back.',
    },
    {
      id: 'billing',
      title: 'Billing moves back to you',
      description:
        'Renewals sit inside the monthly fee while Growth Partner is active. When it ends you pay those providers directly. The accounts do not move — only the payment method does.',
    },
    {
      id: 'campaigns',
      title: 'Campaign pages stay',
      description:
        'Landing pages built for your campaigns are part of your website and stay part of it. Anything under a non-transferable licence, we tell you about before building it.',
    },
    {
      id: 'tests',
      title: 'Any running test is closed out',
      description:
        'An active A/B test is ended rather than abandoned, and the winning version stays live. You never inherit a site quietly serving two versions of itself.',
    },
    {
      id: 'annual',
      title: 'Prepaid time is refunded',
      description: `If you paid annually, the months you did not use are refunded at the ${money(growthPartner.monthly)} monthly rate.`,
    },
  ],

  closing:
    'Cancelling stops the ongoing work. It does not cost you your website, your domain, your content or your access.',
} as const;

/* ------------------------------------------------------------------ guarantee */

/*
 * ============================================================================
 * BUSINESS COMMITMENT — CONFIRM BEFORE LAUNCH
 * ============================================================================
 *
 * Both promises below are commitments the business will be held to, and both are
 * deliberately about work rather than about results. Read them as a customer would and
 * confirm you will honour them exactly as written — or edit them — before this page is
 * published. If the written client agreement says something different, the agreement is
 * what matters and this section has to match it.
 *
 * What must never appear here: guaranteed rankings, guaranteed leads, guaranteed
 * revenue, or a money-back promise the business has not decided it can fund.
 * ============================================================================
 */
export const guarantee = {
  eyebrow: 'Risk',
  heading: 'We guarantee what we control.',
  lede: 'Four promises about the work, one with money attached — and, at the bottom, everything that is not ours to promise.',

  items: [
    {
      id: 'scope',
      title: 'Built to what we agreed',
      description:
        'If it is not delivered to the requirements we agreed in writing, we keep working until it is.',
    },
    {
      id: 'standard',
      title: 'It does not launch until it passes',
      description: 'Eight published checks. If it does not pass, it does not go live.',
    },
    /*
     * The measurement commitment.
     *
     * This is the one instrument on the page that is about the *outcome* rather than the
     * work — and it is publishable precisely because it promises to measure and report the
     * number rather than to move it. Moving it depends on demand, pricing, season and
     * whether the phone gets answered; measuring it depends only on us.
     *
     * The wording is deliberately careful. "Measured, written down and reported" is a
     * commitment. Anything containing the words rankings, leads or revenue would not be,
     * and a test fails the build on all of them appearing anywhere in this section.
     */
    {
      id: 'measurement',
      title: 'You will always know what it produced',
      description: `Measured from launch day, with a written account at day 30. On ${growthPartner.name}, the ${websiteReportName} every month after that — including the months the number falls.`,
    },
    {
      id: 'breakage',
      title: 'If we break it, we fix it',
      description:
        'If a change we make stops your website working properly, we fix it at no additional charge.',
    },
  ] satisfies readonly GuaranteeItem[],

  note: 'The written agreement says the same things. Ask to see it before you commit.',
} as const;
