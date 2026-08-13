import {
  carePlans,
  currentPrice,
  deposit,
  essentialPlan,
  foundingOffer,
  growthTier,
  hasFoundingDiscount,
  money,
  projectTiers,
  saving,
  type ProjectTier,
} from '../config/pricing';
import { site } from './site';
import type {
  CommercialTerm,
  GuaranteeItem,
  JourneyStep,
  OfferGroup,
  PricingTier,
  ProcessStep,
  SystemComponent,
} from '../types/content';

/*
 * ============================================================================
 * THE OFFER — ONE SOURCE OF TRUTH
 * ============================================================================
 *
 * Everything that describes what is being sold lives in this file: the name of the
 * offer, its ten components, the ongoing service, the prices, the published terms, the
 * guarantee. Sections on the homepage and the services page render whatever is here, so
 * testing a different offer is an edit to one file rather than a hunt through components.
 *
 * Four rules this file follows, and must keep following:
 *
 *   1. Nothing here promises a result. Rankings, lead volume, revenue and conversion
 *      rates all depend on the market, the price and the phone being answered. What is
 *      promised is work: what gets built, what gets maintained, what gets improved.
 *   2. This is the only file in the content layer allowed to state a price. Everything
 *      else interpolates `prices`, and `content.test.ts` fails the build on any figure
 *      that appears anywhere else — the "$299 here, $149 there" contradiction is
 *      invisible in review and obvious to a customer.
 *   3. The commercial terms below match the written client agreement. If the agreement
 *      changes, this changes with it, and `docs/business-offer.md` records both.
 *   4. The voice is first person singular, because that is what this business is. If it
 *      ever becomes a team, this file and `content/trust.ts` are the two places that
 *      have to change.
 * ============================================================================
 */

/**
 * The name of the offer. Used wherever the system is referred to by name.
 *
 * It was "The Local Lead-Ready Website System". The word doing the damage there was
 * **website**: it named the artefact rather than the outcome, and the artefact is the part
 * the buyer cares least about. Nobody with a plumbing business wants a website. They want
 * more of the people already finding them to call.
 *
 * "Customer Conversion System" names what the money buys. It also sets the right
 * expectation for the price: three thousand dollars for a website invites comparison with
 * a template; the same figure for the system that turns visitors into calls invites
 * comparison with a month of advertising, which is the comparison that makes it look
 * cheap.
 */
export const offerName = 'The Customer Conversion System';

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
    'You need one that makes your business look like the safe choice, explains what you do, gives someone a reason to pick you, and makes getting in touch effortless. Open yours on your phone and see how many of these it manages.',

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

  closing: 'That is what I take care of — and I keep taking care of it after launch.',
} as const;

/* ------------------------------------------------------------------ the system */

/**
 * The components of the offer, in the order they happen.
 *
 * Four of them get the website live. The other six keep happening — which is the whole
 * case for a monthly fee, and the reason they are one array with a `phase` rather than
 * two lists that imply the second one is optional.
 *
 * `summary` is what the homepage shows; `details` is the depth the services page adds.
 * Both come from here so the two pages can never drift apart.
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
      'I handle the technical setup and get your website live on your own domain, in your name, without making you figure out the details.',
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
      'Website work only: I do not run your ads or manage your budgets',
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

/** The two halves of the lifecycle, and the labels the system section groups them under. */
export const systemPhases = [
  {
    id: 'launch',
    label: 'Get it live',
    summary: 'Once, properly.',
  },
  {
    id: 'ongoing',
    label: 'Keep it working for you',
    summary: 'Every month, for as long as we work together.',
  },
] as const;

export const system = {
  eyebrow: 'The offer',
  heading: offerName,
  lede: 'Ten parts that only work as one thing. Four of them get your website live and built to bring in work. The other six keep happening — which is the difference between owning a website and having one that is looked after.',
  closing: 'One system. One person responsible for all of it. No handover, no gap, no graveyard.',
} as const;

/* ------------------------------------------------------------------ differentiator */

export const differentiator = {
  heading: "Most web designers build it. Then they're done.",
  body: [
    'Your website should not become another thing on your to-do list.',
    'You work with the person responsible for building and maintaining your website — not a salesperson who stops answering once the contract is signed. When something needs to change, you have somebody to change it. When something breaks, you have somebody to fix it. When there is an opportunity to make it work harder, that is my job too.',
  ],

  /*
   * The two lanes are the whole argument for the monthly fee. Set side by side, the
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
      note: 'The website keeps being somebody’s responsibility after launch day. That somebody is me.',
    },
  ],

  closing: 'Build it. Maintain it. Improve it.',
} as const;

/* ------------------------------------------------------------------ management */

/*
 * The heading, lede and closing note for the recurring service.
 *
 * This used to carry its own three-category list as well — "running", "current",
 * "improving" — which nothing ever rendered. `ManagementSection` has always drawn its
 * categories from `growth.ts` → `managementCategories`, which covers the same three and
 * adds "aligned", "learning" and "supported". The dead list was a strictly smaller,
 * strictly older copy of the live one, and two lists of the same thing in two files is
 * how the site ends up describing the monthly service differently in two places.
 *
 * If a category needs adding, it goes in `growth.ts`. A test pins the six ids that live
 * there, and nothing pins anything here.
 */
export const management = {
  eyebrow: 'Ongoing',
  heading: 'Your website manager — without hiring one.',
  lede: 'Every website needs somebody looking after it. Most local businesses either pay a salary for that or hope nothing goes wrong. This is the third option.',

  note: 'Everything stays in your name. Managed by me does not mean owned by me — if you ever want to take it elsewhere, you take the whole thing with you.',
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
 *   2. **The accent stays on the handoff, not on the last step.** The old CSS gave the
 *      payoff colour to `:last-child`, with a comment reading "the last step is the one
 *      that pays". Extending the funnel would have silently moved that highlight onto
 *      "pays for the work" — the site colouring revenue as its own deliverable. It is
 *      now pinned to `contact`, which is the last thing the website actually does.
 */
export const conversion = {
  eyebrow: 'The funnel',
  heading: 'How a stranger becomes a phone call.',
  lede: 'A website does not produce customers. It produces the conversation that a customer comes out of — and it is one segment of a longer chain, with a clear beginning and a clear end. Every step that is missing or weak is somewhere the whole chain quietly leaks.',

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
    heading: 'Where my job ends',
    body: 'Everything above that line is work I can change and measure. Everything below it is yours — what you charge, whether you have the capacity, and whether somebody picks up. A website cannot fix any of those, and a provider who implies otherwise is telling you something about themselves. What it can do is stop you losing people in the six steps before they ever get that far.',
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
    'No guarantees of rankings, positions or traffic. For most local service businesses a well-kept Google Business Profile matters more than anything on the website itself, and I will tell you that rather than sell you around it.',
} as const;

/* ------------------------------------------------------------------ launch */

/**
 * The launch process.
 *
 * `target` is a published range rather than a deadline, and the qualifier next to it is
 * not hedging — it is the truth about where these projects actually stall. The build is
 * rarely the slow part; waiting on photos, a service list and a decision is. Stating the
 * dependency up front is what makes the range keepable.
 */
export const launch = {
  eyebrow: 'How it works',
  heading: 'Live in two to four weeks.',
  lede: 'A streamlined launch process designed to get you live quickly, without months of back-and-forth. The clock starts when I have your business information, photos and service list — the build is rarely the slow part.',
  target: '2–4 weeks' as string | null,
  targetLabel: 'Typical launch',
  targetNote:
    'Measured from when the materials I need are in my hands. Exact timing depends on how quickly content, approvals, access and feedback come back.',

  steps: [
    {
      id: 'review',
      /*
       * Interpolated, not typed.
       *
       * This said "Free website review" for a while after the thing itself was renamed to
       * "Free website assessment" — so the primary button, the contact page section and
       * step one of the published process were offering what read as two different free
       * things. `site.ts` warns about exactly that in a comment three files away, which is
       * evidently not a mechanism. Now the name can only be wrong in one place.
       */
      title: site.offer.freeReview.name,
      description:
        'You send me your site, or your Google listing if you do not have one. I send back a short, plain-English list of what is likely costing you calls. No charge, no obligation.',
    },
    {
      id: 'plan',
      title: 'Scope and price',
      description:
        'We agree exactly what is being built, what is managed afterwards, and what both cost — in writing, before anything starts. The published prices cover the standard launch and management; anything materially outside that gets quoted before it begins, never after.',
    },
    {
      id: 'build',
      title: 'Build and review',
      description:
        'I build it and send you a link. You look at it on your own phone and send back everything you want changed in one go — that is a revision round, and two are included. Work that adds new scope is quoted separately.',
    },
    {
      id: 'launch',
      title: 'Launch',
      description:
        'It goes live on your domain and your hosting, in your name, with tracking and search setup already done.',
    },
    {
      id: 'managed',
      title: 'Managed from here',
      description:
        'Hosting, security, updates, edits and improvements become my job rather than yours. Monthly management starts on launch day. You get on with the work.',
    },
  ] satisfies readonly ProcessStep[],
} as const;

/* ------------------------------------------------------------------ the stack */

/*
 * The value stack, grouped by what each part is *for* rather than by when it happens.
 *
 * An earlier version split this by billing — launch, management, improvement — which is
 * how the invoice is organised, not how a buyer thinks. These four are the jobs the money
 * is doing, and every line inside them is something already promised elsewhere in this
 * file. Nothing here is a new commitment; it is the same commitments, sorted usefully.
 *
 * `whyItMatters` is not decoration either. Each group states its deliverables and then
 * answers "why should the owner of a plumbing business care", which is the question every
 * feature list on every agency website fails to answer.
 */
export const offerStack = {
  eyebrow: 'What you get',
  heading: 'Four jobs, one system',
  lede: 'Not a list of services that happen to be sold together. Four things the money is doing, from the first build to whatever the website needs eighteen months from now.',

  groups: [
    {
      id: 'foundation',
      step: '01',
      name: 'Build the foundation',
      summary: 'A website a stranger can find, read on a phone, and understand in seconds.',
      includes: [
        'Custom, mobile-first website',
        'Up to six service pages, plus home, about and contact',
        'Built light so it opens fast on a phone',
        'Local-search foundation and technical setup',
        'Sitemap, indexing and Search Console connected',
        'Domain, hosting and launch setup in your name',
      ],
      whyItMatters:
        'The people already searching for your trade get the chance to find you at all — and can tell within seconds that you do the job they need.',
      icon: 'layout',
    },
    {
      id: 'convert',
      step: '02',
      name: 'Turn visitors into enquiries',
      summary: 'The work that decides whether somebody who arrived actually gets in touch.',
      includes: [
        'One obvious next step on every screen',
        'Tap-to-call in the header of every page',
        'Short quote forms that ask only what you need to price the job',
        'Trust signals placed where the doubt happens',
        'Service pages written the way customers describe the job',
        'Landing pages that say what your advert promised',
      ],
      whyItMatters:
        'Visitors you already have stop leaking away at the point where they had decided to contact you and could not work out how.',
      icon: 'target',
    },
    {
      id: 'improve',
      step: '03',
      name: 'Keep improving it',
      summary: 'The version you launch is the starting point, not the finished article.',
      includes: [
        'Conversion improvements on the pages that bring in the most work',
        'A/B testing where traffic supports a meaningful result',
        'Evidence-based improvements where it does not',
        'Four seasonal refreshes a year',
        'Service pages improved as the business changes',
        'Speed and mobile experience monitored rather than assumed',
      ],
      whyItMatters:
        'The website gets better at its job every month instead of quietly ageing until the next expensive redesign.',
      icon: 'bolt',
    },
    {
      id: 'handsoff',
      step: '04',
      name: 'Keep you out of the weeds',
      summary: 'All the parts of owning a website that were never your job to begin with.',
      includes: [
        'Hosting, certificates, backups and security updates',
        'Uptime and form-delivery monitoring',
        'Content, service and photo changes when you ask',
        'Campaign messaging matched to what you are running',
        'One person to message, who makes the change rather than logging it',
        '24-hour response guarantee',
      ],
      whyItMatters:
        'You never learn what a certificate renewal is, and you never find out three weeks late that the contact form stopped sending.',
      icon: 'shield',
    },
  ] satisfies readonly OfferGroup[],

  summary: 'One person. One system. One place to go when your website needs something.',
} as const;

/* ------------------------------------------------------------------ included value */

/*
 * Only list something here that the business will genuinely do for every customer.
 * Each of these already appears somewhere in the work described above — they are called
 * out separately because they are the parts a customer would otherwise expect to pay a
 * separate agency for, not because a list of bonuses is persuasive on its own.
 *
 * Delete any line the business will not actually deliver. An unmet bonus costs more
 * trust than it ever bought.
 */
export const included = {
  heading: 'Included, not sold separately',
  lede: 'Four things that usually arrive as a separate invoice from somebody else.',

  items: [
    {
      id: 'review',
      title: 'Website conversion review',
      description:
        'Before anything is quoted: a straight list of what is costing you calls on the website you have now.',
      icon: 'target',
    },
    {
      id: 'local',
      title: 'Local presence check',
      description:
        'A review of your Google Business Profile and the basic business information customers and search engines look for, with what to fix.',
      icon: 'map-pin',
    },
    {
      id: 'tracking',
      title: 'Tracking setup',
      description:
        'Analytics and conversion tracking configured at launch, so nobody has to guess what the website is doing.',
      icon: 'bolt',
    },
    {
      id: 'framework',
      title: 'Service page framework',
      description:
        'A repeatable structure for presenting each service you want to be hired for, so adding one next year is a small job.',
      icon: 'layout',
    },
  ],
} as const;

/* ------------------------------------------------------------------ pricing */

/*
 * ============================================================================
 * PRICING — SET, AND THE ONE SOURCE OF TRUTH
 * ============================================================================
 *
 * Three numbers exist on this site and all three are below. Nowhere else in the content
 * layer may state a price: `content.test.ts` sweeps every string for a currency figure
 * and fails the build on any that is not one of these. That guard exists because the
 * failure it prevents — $299 on the homepage and $149 in an FAQ answer written six
 * months later — is invisible until a customer finds it.
 *
 * `amount` is the raw figure. `price` is how it is displayed. Copy elsewhere interpolates
 * `amount` rather than repeating the number, so changing a price is one edit.
 * ============================================================================
 */

/** The raw figures. Everything that states a price derives from these. */
/**
 * Every figure the copy interpolates, derived from `config/pricing.ts`.
 *
 * These used to be typed here as string literals. They are computed now, because the
 * moment there were three project tiers with a standard price and a founding price each,
 * "the launch price" stopped being one number that could be safely written down twice.
 *
 * `launch` is the **recommended tier's current price** — the headline number the page
 * argues toward. `from` is the entry point, for the sentences that describe a range.
 * Nothing here is hand-typed, so a price change cannot leave a stale figure in an FAQ
 * answer written six months ago.
 */
export const prices = {
  /** The recommended tier, at the price available today. */
  launch: money(currentPrice(growthTier)),
  /** The recommended tier's rate card. **Never render this as a former price.** */
  launchStandard: money(growthTier.standard),
  /** Derived, never typed. */
  launchSaving: money(saving(growthTier)),
  /** The cheapest way in, for "from $2,500" sentences. */
  from: money(currentPrice(projectTiers[0] as ProjectTier)),
  deposit: money(deposit(growthTier)),
  management: money(essentialPlan.monthly),
  managementDisplay: `${money(essentialPlan.monthly)}/mo`,
  annual: money(essentialPlan.annual ?? 0),
} as const;

/**
 * ============================================================================
 * PRICING — DERIVED, NEVER TYPED
 * ============================================================================
 *
 * Three project sizes and a separate plan for what happens afterwards. Every figure comes
 * from `config/pricing.ts`; nothing here is a literal.
 *
 * ## How the founding-client price is presented, and why it is presented that way
 *
 * The FTC's Guides Against Deceptive Pricing (16 CFR 233.1) permit a former-price
 * comparison only where the former price was actually charged, publicly, on a regular
 * basis, for a substantial period. **This business has never charged the standard prices.**
 * They are a rate card being established now.
 *
 * So the standard price is rendered as a *labelled, concurrent* price — "Standard project
 * price" — and never as a strike-through. Strike-through is how a page says "was" without
 * typing it, and "was" is the one thing that would not be true. What is shown instead is
 * two prices that both exist today, one of which requires the buyer to qualify for it, and
 * the condition is printed beside the number rather than under it.
 *
 * That is a real discount with a real condition. The other version would be a fabricated
 * price history, which is the exact thing this site's whole positioning argues against.
 * ============================================================================
 */
export const pricing = {
  eyebrow: 'What it costs',
  heading: 'Three sizes, priced before anything starts',
  lede: 'Which one you need depends on how much of the work your current site already does. Every number is agreed in writing before I begin, and none of them moves unless you ask for something different.',

  /** Shown in place of a price that is still a placeholder. Retained for rescue work. */
  unsetLabel: 'Quoted per project',
  unsetNote: 'Priced once I know what your business needs — never a number invented on a webpage.',

  /**
   * The founding-client offer, as the page states it.
   *
   * `enabled: false` in the config removes every one of these strings from the site along
   * with the discount itself, so nothing is left claiming an offer that is over.
   */
  founding: {
    enabled: foundingOffer.enabled,
    label: foundingOffer.label,
    standardLabel: foundingOffer.standardLabel,
    /**
     * The condition, the count and the reason — in one paragraph, next to the price.
     *
     * Deliberately not "limited time". The offer is limited by a number and by a
     * qualification, and describing it any other way would be inventing urgency that does
     * not exist. There is no timer on this site and there is not going to be one.
     */
    body: `The first ${foundingOffer.total} projects are priced below the standard rate ${foundingOffer.qualification}. ${foundingOffer.explanation}`,
    remainingLabel: `${foundingOffer.remaining} of ${foundingOffer.total} still open`,
    savingLabel: 'Save',
  },

  tiers: projectTiers.map((tier) => ({
    id: tier.id,
    cadence: 'One-time project',
    name: tier.name,
    summary: tier.bestFor,
    price: money(currentPrice(tier)),
    /** Rendered small and labelled. **Never with a line through it.** See above. */
    standardPrice: money(tier.standard),
    hasDiscount: hasFoundingDiscount(tier),
    saving: money(saving(tier)),
    priceNote: `${money(deposit(tier))} to start, ${money(deposit(tier))} on the day it goes live.`,
    includes: tier.includes,
    terms: tier.terms,
    emphasis: tier.recommended,
  })) satisfies readonly PricingTier[],

  /**
   * The annual prepay on the recurring plan, kept deliberately secondary. It is a discount
   * for somebody who would rather pay once, not the option the page steers toward.
   */
  annual: {
    label: 'Or pay annually',
    price: prices.annual,
    cadence: 'per year',
    saving: 'About two months back compared with paying monthly.',
    note: `Cancel part-way through a prepaid year and the unused months are refunded at the ${prices.management} monthly rate.`,
  },

  note: `Every number is fixed before anything starts and none of them moves unless you ask for something different. If what you need is materially outside the tier you pick — many more service pages, a booking system, something bespoke — I quote it before we begin rather than after.`,
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
  eyebrow: 'Risk reversal',
  heading: 'It is not finished because it looks finished',
  lede: 'A website that looks good and loads slowly on a phone is a website that loses work quietly. So "done" is a list, not an opinion — and the same list every time.',

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
        'Measured against the thresholds Google grades on, on a mid-range phone rather than my machine.',
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
      detail: 'Tested across current browsers on both desktop and mobile, not just mine.',
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
    'If it does not meet the standard, it is not launched, and I keep working until it does. That is not a refund policy — it is the definition of the job being finished.',
  limit:
    'What this does not promise is a business result. Leads, rankings and revenue depend on your market, your pricing and your phone being answered, and nobody who tells you otherwise can show you the arithmetic.',
} as const;

/**
 * The service after launch, priced and sold separately.
 *
 * It is not bundled into any project tier and buying a project does not require it. A
 * project that only makes financial sense with a subscription attached is a project priced
 * dishonestly, and the buyer works that out in month four.
 */
export const carePricing = {
  eyebrow: 'After launch',
  heading: 'The website is not finished when it launches',
  /*
   * This said an unmaintained site "starts losing to the ones that are maintained,
   * quietly, from about month three". That is a decay curve with a timeline attached and
   * nothing behind it — an invented statistic in prose, which is the exact thing
   * `content/evidence.ts` exists to prevent anywhere a number appears.
   *
   * What replaced it is a list of things that observably happen, none of which needs a
   * source because the reader has watched all of them happen to somebody.
   */
  lede: 'Services change, photos go stale, certificates expire, and forms break without telling anybody. This is what keeps that from happening — and it is a separate decision from the project, made after it, never a condition of it.',

  plans: carePlans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    price: `${money(plan.monthly)}/mo`,
    annual: plan.annual === undefined ? undefined : money(plan.annual),
    summary: plan.summary,
    includes: plan.includes,
    emphasis: plan.recommended,
  })),

  terms:
    'Three-month minimum from launch, then month-to-month with 30 days’ notice. No annual contract, ever.',
  optOut:
    'You can also take the project and stop there. The website is yours, it is in your name, and it keeps working. I would rather tell you that here than have you find it out afterwards.',
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
 * `docs/business-offer.md` is the authoritative record of all of it.
 * ============================================================================
 */
export const commercialTerms = {
  eyebrow: 'The terms',
  heading: 'What you are agreeing to',
  lede: 'All of it in plain English, before you get in touch rather than after. The written agreement is what governs, and it says the same things.',

  items: [
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
      value: '30 days’ notice',
      detail:
        'Tell me you are stopping and management runs for another thirty days, then ends. Nothing is held hostage and nothing has to be argued about.',
    },
    {
      id: 'payment',
      label: 'Launch payment',
      value: `${prices.deposit} then ${prices.deposit}`,
      detail: `Half of the ${prices.launch} to start the work, half on the day it goes live. Monthly management begins on launch day.`,
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
      value: 'Up to six services',
      detail:
        'Plus home, about and contact. That covers the service list of almost every local trade. More than six is quoted before it is built.',
    },
    {
      id: 'ownership',
      label: 'Ownership',
      value: 'Yours, throughout',
      detail:
        'The domain, the hosting account and the content are in your name from the start. I pay the hosting and renewal bills while I manage it; if you leave, billing moves back to you and nothing has to be migrated.',
    },
  ] satisfies readonly CommercialTerm[],

  note: 'Written into the agreement before any money changes hands. Ask to read it first — that is what it is for.',
} as const;

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
        'The domain, the hosting account and everything on it are already in your name. There is nothing for me to hand back because none of it was ever mine.',
    },
    {
      id: 'billing',
      title: 'Billing moves back to you',
      description:
        'Hosting and domain renewals are inside the monthly fee while I manage the site. When management ends, those accounts stay where they are and the payment method changes to yours.',
    },
    {
      id: 'campaigns',
      title: 'Campaign pages stay',
      description:
        'Landing pages built for your campaigns are part of your website and remain part of it. The only exception would be something under a third-party licence that cannot be transferred, and I will tell you before building anything like that.',
    },
    {
      id: 'tests',
      title: 'Any running test is closed out',
      description:
        'An active A/B test is ended rather than abandoned, and whichever version is designated the winner stays live. You never inherit a site that is quietly serving two versions of itself.',
    },
    {
      id: 'annual',
      title: 'Prepaid time is refunded',
      description: `If you paid annually, the months you did not use are refunded at the ${prices.management} monthly rate. Keeping a discount for service that was not delivered is not something worth doing to somebody.`,
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
  heading: 'I guarantee what I control.',
  lede: "I cannot control Google's algorithm, your market, your pricing, or whether somebody picks up the phone. I can control the quality of the work, and whether the website does what we agreed it would do.",

  items: [
    {
      id: 'scope',
      title: 'Built to what we agreed',
      description:
        'If your website is not delivered according to the requirements we agreed in writing, I keep working on it until it is.',
    },
    {
      id: 'breakage',
      title: 'If I break it, I fix it',
      description:
        'If a change I make stops your website working properly, I fix it at no additional charge.',
    },
  ] satisfies readonly GuaranteeItem[],

  note: 'Both promises are about the work rather than the result, because the result depends on things neither of us controls. The written agreement is what counts — ask to see it before you commit.',
} as const;
