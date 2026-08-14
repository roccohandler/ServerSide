import type {
  Capability,
  CapabilityAvailability,
  CapabilityCategory,
  CapabilityIntegration,
  CapabilityMaturity,
  CapabilityTier,
  LifecycleStage,
  ServiceModel,
} from '../types/content';

/*
 * ============================================================================
 * THE CAPABILITY LIBRARY
 * ============================================================================
 *
 * What a website can do for a local service business — every capability this business
 * either delivers today, would build on request, intends to build, or has decided not to
 * offer. All four in one library, each one labelled.
 *
 * ## Why a library and not more offer copy
 *
 * `content/offer.ts` sells the offer: three products, seven build promises, five monthly
 * cadence groups. It is written for somebody deciding whether to buy, and it is
 * deliberately short — a reader deciding does not want forty things, they want to know
 * what they get and what it costs.
 *
 * This is the other question, asked later and by a different reader: *what could my
 * website actually do for my business, and which of it applies to me?* An owner asking
 * that wants breadth, wants to see the thing they came looking for, and wants to be told
 * plainly which parts they already have. Answering it inside the offer would have made the
 * offer worse in exactly the way the last redesign existed to fix.
 *
 * ## The five rules this file is held to
 *
 *   1. **Nothing here is a second description of the offer.** Anything marked
 *      `included-build` or `included-partner` carries an `offerAnchor` pointing at the
 *      `systemComponents`, `flagship.outcomes` or `carePricing.plan.groups` entry that
 *      already says so, and `capabilities.test.ts` resolves every pointer. If the offer
 *      changes, the pointer breaks and the build fails.
 *
 *   2. **Availability is stated, never implied.** Of the entries below, some are in the
 *      build, some are in Growth Partner, some are quotable extra scope, some are a
 *      committed direction with no date, and some are things this business has decided not
 *      to do. A library that presented all five identically would be a brochure for a
 *      company that does not exist.
 *
 *   3. **No numbers.** Not a conversion rate, not a percentage, not a multiple, not a
 *      dollar figure. There is no client data to draw any of it from, and the content
 *      guards fail the build on currency and on hype either way. Every claim below is
 *      qualitative because that is the only honest register available.
 *
 *   4. **The website's remit is drawn, not blurred.** `owner` marks whether a capability
 *      works on demand, on the website, or on the business — and the ones marked `business`
 *      say out loud that the website only hands the customer over. A capability library is
 *      the easiest place to quietly start claiming a website closes jobs.
 *
 *   5. **Named for the job, not the technology.** "Know which pages bring you work", not
 *      "GA4 event configuration". The mechanism goes in `howItWorks`, which is the fifth
 *      field a reader reaches rather than the first.
 *
 * ## Eager-bundle rule
 *
 * This module is a lazy route's content and is **not** exported from `content/index.ts`.
 * The explorer imports it directly. See the note at the bottom of `content/index.ts` for
 * what re-exporting it would cost every visitor to the homepage, and `content.test.ts` for
 * how it stays inside the global copy sweeps anyway.
 * ============================================================================
 */

/* ------------------------------------------------------------------ categories */

export interface CapabilityCategoryMeta {
  readonly id: CapabilityCategory;
  readonly label: string;
  /**
   * The owner's own question, which is how somebody finds their category.
   *
   * Written as a question rather than a description because that is how the reader arrives:
   * they do not want "lead conversion", they want "why isn't anyone calling me?"
   */
  readonly question: string;
}

export const capabilityCategories: readonly CapabilityCategoryMeta[] = [
  {
    id: 'lead-generation',
    label: 'Getting found',
    question: 'How do more of the right people end up on my website?',
  },
  {
    id: 'lead-conversion',
    label: 'Turning visitors into enquiries',
    question: 'People are visiting. Why are so few of them getting in touch?',
  },
  {
    id: 'communication',
    label: 'Not losing the enquiry',
    question: 'Somebody got in touch. What happens in the next ten minutes?',
  },
  {
    id: 'reputation',
    label: 'Reviews and proof',
    question: 'Why should a stranger believe I do good work?',
  },
  {
    id: 'retention',
    label: 'Repeat and recurring work',
    question: 'How do I get a second job out of a customer I already have?',
  },
  {
    id: 'revenue',
    label: 'Bigger jobs, fewer discounts',
    question: 'How do I stop competing on price alone?',
  },
  {
    id: 'operations',
    label: 'Less admin',
    question: 'How does the website stop being another thing I have to look after?',
  },
  {
    id: 'payments',
    label: 'Getting paid',
    question: 'Can the website take money, or at least start the process?',
  },
  {
    id: 'marketing',
    label: 'Campaigns and audience',
    question: 'I am spending on advertising. Is the website holding up its end?',
  },
  {
    id: 'automation',
    label: 'Measurement and automation',
    question: 'How do I know any of this is working?',
  },
];

/* ------------------------------------------------------------------ the lifecycle */

/*
 * Eight stages, and the point of drawing them is the four the website does not touch.
 *
 * `owner` is the existing `JourneyOwner` vocabulary from `types/content.ts` — the same one
 * the audit's funnel diagram uses to show that a website is one segment of a longer chain.
 * Reusing it means there is exactly one place in this repository that decides what counts
 * as the website's responsibility, which is the only way the boundary stays in one place.
 */
export const lifecycleStages: readonly LifecycleStage[] = [
  {
    id: 'find',
    label: 'They find you',
    customerMoment:
      'Something has gone wrong, or something needs doing, and they start looking for somebody local.',
    businessQuestion: 'Am I in front of the people who are already looking?',
    owner: 'demand',
  },
  {
    id: 'decide',
    label: 'They decide whether to bother',
    customerMoment:
      'Thirty seconds on your site, on a phone, working out whether you do the job and whether you look like you would do it well.',
    businessQuestion: 'Can a stranger tell in one screen that I am the right call?',
    owner: 'website',
  },
  {
    id: 'contact',
    label: 'They get in touch',
    customerMoment: 'They tap the number, or fill in the form, or close the tab.',
    businessQuestion: 'Is getting hold of me effortless from every page?',
    owner: 'website',
  },
  {
    id: 'book',
    label: 'You win the job',
    customerMoment: 'They talk to you, get a price, and decide between you and somebody else.',
    businessQuestion: 'How fast do I respond, and does the quote arrive while they still care?',
    owner: 'business',
  },
  {
    id: 'serve',
    label: 'You do the work',
    customerMoment: 'Somebody turns up when they said they would and does what they said.',
    /*
     * The one stage with no capability attached to it anywhere in the library, and that is
     * the honest answer rather than a gap: nothing on a website makes the work good. The
     * band label above it already says "your business, not your website", so the question
     * does not need to repeat it — and `capabilities.test.ts` names this stage explicitly as
     * the only permitted empty one, so a *second* empty stage fails the build.
     */
    businessQuestion: 'Is the job itself any good?',
    owner: 'business',
  },
  {
    id: 'pay',
    label: 'They pay',
    customerMoment: 'An invoice, a card, a deposit — money moves.',
    businessQuestion: 'How long does it take, and how much chasing does it cost me?',
    owner: 'business',
  },
  {
    id: 'advocate',
    label: 'They tell somebody',
    customerMoment:
      'A review, a recommendation over a fence, a name passed on when a neighbour asks.',
    businessQuestion: 'Am I asking, at the one moment they would happily say yes?',
    owner: 'business',
  },
  {
    id: 'return',
    label: 'They come back',
    customerMoment: 'A year later, something else needs doing, and they try to remember your name.',
    businessQuestion: 'Do they still have my details, and did I stay in front of them?',
    owner: 'business',
  },
];

/* ------------------------------------------------------------------ integrations */

/*
 * Twelve systems, described in business terms.
 *
 * `owner` is the field that matters most here and is the easiest one to get quietly wrong.
 * This application already runs Stripe and Resend — for **its own** invoices and its own
 * notification email. That is not the same thing as connecting a client's Stripe account to
 * take deposits on their site, and describing both as "Stripe integration" would let the
 * second borrow credibility from the first.
 *
 * `whyConnect` is a consequence, never a feature. "Your enquiries arrive as email you can
 * reply to" rather than "transactional email API".
 */
export const capabilityIntegrations: readonly CapabilityIntegration[] = [
  {
    id: 'google-business-profile',
    name: 'Google Business Profile',
    owner: 'client',
    whatItDoes:
      'The free listing that shows your business in Google Maps and in the box beside local search results.',
    whyConnect:
      'For most local service businesses this listing is read more often than the website is. Keeping the two saying the same thing — same services, same area, same hours, same phone number — removes the contradiction that makes a customer hesitate.',
    availability: 'included-build',
    maturity: 'standard',
  },
  {
    id: 'google-search-console',
    name: 'Google Search Console',
    owner: 'client',
    whatItDoes:
      'Google’s own report on how your site appears in search: which words people used, which pages they were shown, and anything Google cannot read.',
    whyConnect:
      'It is the only place the actual search terms come from. Without it, a conversation about what people are looking for is two people guessing.',
    availability: 'included-build',
    maturity: 'standard',
  },
  {
    id: 'google-analytics',
    name: 'Google Analytics',
    owner: 'client',
    whatItDoes:
      'Counts visits, where they came from, which pages were read, and — once it is configured properly — which of them ended in a call or a form.',
    whyConnect:
      'Installed but unconfigured, it counts visitors and tells you nothing about enquiries, which is the number that matters. Configured, it is where the monthly report gets its figures.',
    availability: 'included-build',
    maturity: 'standard',
  },
  {
    id: 'resend',
    name: 'The notification email service',
    owner: 'jobforge',
    whatItDoes:
      'Delivers the email that tells you somebody has filled in a form on your website, within seconds of them pressing send.',
    whyConnect:
      'A form that sends its own email from a web host is a form that lands in spam. This is the piece that makes the enquiry actually arrive — and every submission is also stored, so a bounced email cannot lose you a job.',
    availability: 'included-build',
    maturity: 'standard',
  },
  {
    id: 'google-calendar',
    name: 'Your calendar',
    owner: 'client',
    whatItDoes:
      'Shows a customer which slots are genuinely free and puts the booking straight into the calendar you already keep.',
    whyConnect:
      'It removes the phone call whose only purpose is agreeing a time. That call is the one most likely to happen after hours, and the one most likely not to happen at all.',
    availability: 'additional-scope',
    maturity: 'established',
  },
  {
    id: 'stripe-client',
    name: 'Card payments in your own account',
    owner: 'client',
    whatItDoes:
      'Takes a card payment or a deposit on your website and settles it into your bank account, under your own merchant account.',
    whyConnect:
      'A customer who has paid a deposit has stopped shopping around. For dated work — a move, a shoot, a detail — it is also the difference between a booking and an intention.',
    availability: 'additional-scope',
    maturity: 'established',
  },
  {
    id: 'email-platform',
    name: 'Whichever email list tool you already use',
    owner: 'client',
    whatItDoes:
      'Holds the addresses of people who asked to hear from you, and sends to them without you doing it one at a time.',
    whyConnect:
      'Addresses collected on a website and left in a spreadsheet are addresses nobody ever writes to. Connecting the two is what makes a list worth having — and no, the website choosing the tool is not necessary if you already have one.',
    availability: 'additional-scope',
    maturity: 'established',
  },
  {
    id: 'twilio',
    name: 'Text-message alerts',
    owner: 'jobforge',
    whatItDoes:
      'Sends a text to your phone the moment a form is submitted, rather than relying on you noticing an email.',
    whyConnect:
      'For a trade where the customer is calling three companies in ten minutes, the difference between reading an enquiry now and reading it at six o’clock is the job. This is a committed direction, not something you can buy today.',
    availability: 'roadmap',
    maturity: 'new',
  },
  {
    id: 'jobber',
    name: 'Jobber',
    owner: 'client',
    whatItDoes:
      'Scheduling, quoting and invoicing software many home-service businesses already run their day out of.',
    whyConnect:
      'If you already work in it, an enquiry that arrives as an email you then retype is an enquiry you are handling twice. Passing a form submission straight in would remove that. Intended, not built.',
    availability: 'roadmap',
    maturity: 'new',
  },
  {
    id: 'housecall-pro',
    name: 'Housecall Pro',
    owner: 'client',
    whatItDoes:
      'The same kind of job-management software, popular with the same trades, with its own booking and dispatch.',
    whyConnect:
      'Same reason as above, and the same status: worth doing for a business that already lives in it, and not something this business has built yet.',
    availability: 'roadmap',
    maturity: 'new',
  },
  {
    id: 'servicetitan',
    name: 'ServiceTitan',
    owner: 'client',
    whatItDoes:
      'Field-service software aimed at larger operations, with dispatch, call tracking and reporting built for a team of crews.',
    whyConnect:
      'Genuinely useful and honestly out of scope: a business running ServiceTitan usually has an internal team or an agency handling the website too. If that is you, the assessment is still free and the answer may well be that you do not need us.',
    availability: 'not-offered',
    maturity: 'exploratory',
  },
  {
    id: 'quickbooks',
    name: 'QuickBooks',
    owner: 'client',
    whatItDoes: 'Bookkeeping: invoices, payments, expenses and the numbers your accountant wants.',
    whyConnect:
      'Owners ask, so it is listed rather than left out. The honest answer is that a website is the wrong place to touch your books — your payment provider and your job software already connect to it, and adding a third route in is risk without a return.',
    availability: 'not-offered',
    maturity: 'exploratory',
  },
];

/* ------------------------------------------------------------------ the library */

export const capabilities: readonly Capability[] = [
  /* ================================================================ getting found */
  {
    id: 'service-pages',
    name: 'A page for every job you want to be hired for',
    category: 'lead-generation',
    tier: 'foundation',
    shortDescription:
      'One page per service, so somebody searching for that exact job lands on a page about that exact job.',
    businessOutcome:
      'People searching for a specific job arrive somewhere that answers it, instead of on a homepage listing everything you do.',
    problemSolved:
      'Most service-business websites have one Services page listing eight things. Somebody searching for one of those eight lands on a page that is mostly about the other seven.',
    howItWorks: [
      'Your service list becomes the page structure, one page each',
      'Each page is written about that job: what it involves, what it costs to think about, what happens next',
      'Each one carries its own call to action rather than sending the reader back to a general contact page',
      'Internal links connect the related ones, so a reader on the wrong page can get to the right one',
    ],
    customerValue: 'They read about their own problem rather than skimming a list to find it.',
    businessValue:
      'You stop fielding calls that begin "do you even do…", because the page already answered it.',
    recommendedFor:
      'Every business with more than one service. If you genuinely do one thing, one page is the right answer and adding more would be padding.',
    industries: 'every',
    serviceModels: 'every',
    lifecycle: ['find', 'decide'],
    owner: 'website',
    integrations: [],
    dependencies: [],
    maturity: 'standard',
    availability: 'included-build',
    offerAnchor: 'found',
  },
  {
    id: 'local-search-foundation',
    name: 'The groundwork that lets you be found locally',
    category: 'lead-generation',
    tier: 'foundation',
    shortDescription:
      'The structure, titles, service-area information and markup search engines need to understand what you do and where.',
    businessOutcome:
      'Search engines can tell what your business does and where it works, which is the precondition for showing you to anybody.',
    problemSolved:
      'A site can be perfectly readable to a person and close to meaningless to a search engine: no page titles worth showing, no service area stated, no structure, nothing marking it as a local business.',
    howItWorks: [
      'Page titles and descriptions written for somebody reading a search result',
      'Service-area information stated on the pages rather than assumed',
      'Local-business markup, so the details are machine-readable as well as legible',
      'A sitemap, and indexing checked rather than hoped for',
    ],
    customerValue:
      'The result they are shown says what you do and where, so they know before they click.',
    businessValue: 'The foundation is done once and stops being a thing you wonder about.',
    recommendedFor:
      'Everybody. And it is a foundation, not a ranking service — nobody honest can promise a position, and this page will not.',
    industries: 'every',
    serviceModels: 'every',
    lifecycle: ['find'],
    owner: 'website',
    integrations: ['google-search-console'],
    dependencies: [],
    maturity: 'standard',
    availability: 'included-build',
    offerAnchor: 'found',
  },
  {
    id: 'profile-alignment',
    name: 'Your Google listing and your website saying the same thing',
    category: 'lead-generation',
    tier: 'foundation',
    shortDescription:
      'Services, hours, service area and phone number matching between your Google Business Profile and your site.',
    businessOutcome:
      'A customer checking both places finds one consistent business rather than two slightly different ones.',
    problemSolved:
      'The listing says one thing, the website says another, and the phone number on one of them is three years old. Every mismatch is a reason to hesitate, and for many local businesses the listing is read more than the site.',
    howItWorks: [
      'Both are read side by side and the differences written down',
      'The website is corrected where it is wrong, and you are told what to fix on the listing',
      'Categories, services and service area lined up with the pages that exist',
      'What to keep an eye on afterwards, in a form you can act on without us',
    ],
    customerValue: 'The hours, the number and the area they read are the ones that are true.',
    businessValue: 'You find out which of the two has been wrong, which is usually a surprise.',
    recommendedFor:
      'Everybody with a Google listing, which is everybody who should have one. The listing itself stays yours and under your control.',
    industries: 'every',
    serviceModels: 'every',
    lifecycle: ['find', 'decide'],
    owner: 'website',
    integrations: ['google-business-profile'],
    dependencies: ['service-pages'],
    maturity: 'standard',
    availability: 'included-build',
    offerAnchor: 'found',
  },
  {
    id: 'service-area-pages',
    name: 'Pages for the places you actually work',
    category: 'lead-generation',
    tier: 'recommended',
    shortDescription:
      'A real page per town or neighbourhood you serve, written about that place rather than generated from a list.',
    businessOutcome:
      'Somebody searching with their town in the query finds a page that names their town.',
    problemSolved:
      'A single line reading "serving the Greater Seattle area" does not tell a customer in Puyallup whether you come out that far, and it gives a search engine nothing to match.',
    howItWorks: [
      'One page per area worth having one, with the services you actually offer there',
      'Written about the place — travel, typical work, anything specific to it',
      'Linked from the services those customers are looking for',
      'Only for places you genuinely cover, because a lead you have to turn down costs you both time',
    ],
    customerValue: 'They find out whether you come to them without having to ring and ask.',
    businessValue: 'Fewer enquiries from outside your radius, and better ones from inside it.',
    recommendedFor:
      'Businesses covering several distinct towns. Not worth it if you work one city — a dozen thin pages about one place is the spam version of this, and it does not work.',
    industries: 'every',
    serviceModels: 'every',
    lifecycle: ['find'],
    owner: 'website',
    integrations: ['google-business-profile'],
    dependencies: ['service-pages', 'local-search-foundation'],
    maturity: 'established',
    availability: 'additional-scope',
  },
  {
    id: 'seasonal-front',
    name: 'This month’s work at the front',
    category: 'lead-generation',
    tier: 'recommended',
    shortDescription:
      'The service your customers need right now moved to the front of the site, with the message that goes with it.',
    businessOutcome:
      'The first thing a visitor sees is the thing they are most likely to be looking for this month.',
    problemSolved:
      'A website written in March is still leading with March in September. The work you want in the diary now is three scrolls down.',
    howItWorks: [
      'The seasonal service brought forward on the pages people land on',
      'The message and the call to action changed to match it',
      'Current offers reflected rather than left to expire quietly on the page',
      'Changed back when the season turns, without you having to remember',
    ],
    customerValue: 'What they need this month is the first thing on the screen.',
    businessValue:
      'The website starts pulling in the work you want now instead of the work you wanted last spring.',
    recommendedFor:
      'Any business whose work has a season, which is most of them. Four changes a year is what the plan covers.',
    industries: 'every',
    serviceModels: 'every',
    lifecycle: ['find', 'decide'],
    owner: 'website',
    integrations: [],
    dependencies: ['service-pages'],
    maturity: 'standard',
    availability: 'included-partner',
    offerAnchor: 'current',
  },

  /* ==================================================== turning visitors into enquiries */
  {
    id: 'mobile-first',
    name: 'Built for a phone first',
    category: 'lead-conversion',
    tier: 'foundation',
    shortDescription:
      'Designed at phone width and then widened, rather than designed on a desktop and squeezed.',
    businessOutcome: 'The version most of your customers see is the one the site was designed for.',
    problemSolved:
      'Most local service websites are visited on a phone, often on mobile data, and most were designed on a wide monitor. The result works and is unpleasant, and unpleasant on a phone means a closed tab.',
    howItWorks: [
      'Layout, type size and tap targets decided at phone width first',
      'Widened for desktop afterwards, which is the easier direction',
      'Images sized so the page arrives quickly on mobile data rather than office wi-fi',
      'Tested on a phone on a real connection, not only in a resized browser window',
    ],
    customerValue: 'It loads, it is readable, and the buttons are where a thumb is.',
    businessValue:
      'You stop losing people whose only experience of your business is a slow page on one bar of signal.',
    recommendedFor: 'Everybody, without exception.',
    industries: 'every',
    serviceModels: 'every',
    lifecycle: ['decide', 'contact'],
    owner: 'website',
    integrations: [],
    dependencies: [],
    maturity: 'standard',
    availability: 'included-build',
    offerAnchor: 'designed',
  },
  {
    id: 'tap-to-call',
    name: 'A number that dials with one tap',
    category: 'lead-conversion',
    tier: 'foundation',
    shortDescription:
      'Your phone number in the header of every page, as a link that dials rather than text to copy out.',
    businessOutcome:
      'Somebody who has decided to call you can do it from wherever they are on the site.',
    problemSolved:
      'A number written as plain text in a footer is a number somebody has to find, select and retype while holding the phone they would be calling from.',
    howItWorks: [
      'The number in the header on every page, at every screen width',
      'A real telephone link, so one tap opens the dialler with it filled in',
      'Repeated wherever somebody is likely to have made up their mind',
      'The same number as the Google listing, checked rather than assumed',
    ],
    customerValue: 'One tap and it is ringing.',
    businessValue:
      'The easiest enquiry to win stops being the one that takes the most effort to make.',
    recommendedFor:
      'Everybody who wants the phone to ring. If you would rather not take calls, this is the one to say so about early.',
    industries: 'every',
    serviceModels: 'every',
    lifecycle: ['contact'],
    owner: 'website',
    integrations: [],
    dependencies: [],
    maturity: 'standard',
    availability: 'included-build',
    offerAnchor: 'contacted',
  },
  {
    id: 'quote-form',
    name: 'A quote form short enough to finish',
    category: 'lead-conversion',
    tier: 'foundation',
    shortDescription:
      'A form asking only what you need to price the job, for the customer who will not ring.',
    businessOutcome:
      'The people who do not want to phone anybody have a way to reach you they will actually use.',
    problemSolved:
      'Two failures, opposite directions. A form asking fourteen questions gets abandoned; a form with only "message" produces enquiries you cannot price without a phone call.',
    howItWorks: [
      'The fields chosen from what you need to quote, and nothing else',
      'Asked in an order that starts easy — name and contact before job detail',
      'A visible confirmation, so nobody wonders whether it sent',
      'Submissions emailed to you and stored, so a bounced email cannot lose one',
    ],
    customerValue: 'They can get a price started at eleven at night without speaking to anybody.',
    businessValue: 'Enquiries arrive with enough in them to answer properly the first time.',
    recommendedFor:
      'Everybody. It matters most where the customer is comparing several businesses and does not want three phone conversations.',
    industries: 'every',
    serviceModels: 'every',
    lifecycle: ['contact'],
    owner: 'website',
    integrations: ['resend'],
    dependencies: [],
    maturity: 'standard',
    availability: 'included-build',
    offerAnchor: 'contacted',
  },
  {
    id: 'trust-evidence',
    name: 'The reasons to believe you, on the page',
    category: 'lead-conversion',
    tier: 'foundation',
    shortDescription:
      'Licence numbers, insurance, guarantees, how long you have been going — where a stranger looks for them.',
    businessOutcome:
      'A customer who has never heard of you can find a reason to pick you over the next result.',
    problemSolved:
      'The things that make you a safe choice are usually true and usually invisible: on an About page nobody reaches, or nowhere at all.',
    howItWorks: [
      'What you can actually evidence, gathered up — licence, insurance, guarantees, years, memberships',
      'Placed on the pages where the decision happens, not only on About',
      'Written as a fact with a number or a name attached, because unverifiable adjectives persuade nobody',
      'Nothing invented: if there is no evidence for it, it does not go on',
    ],
    customerValue: 'They can check you are real and insured before they let you in the house.',
    businessValue:
      'You stop being compared on price alone, because there is now something else on the page to compare.',
    recommendedFor:
      'Everybody, and most urgently anybody licensed — in some trades the licence is the whole question.',
    industries: 'every',
    serviceModels: 'every',
    lifecycle: ['decide'],
    owner: 'website',
    integrations: [],
    dependencies: [],
    maturity: 'standard',
    availability: 'included-build',
    offerAnchor: 'trusted',
  },
  {
    id: 'work-gallery',
    name: 'Photographs of your own finished work',
    category: 'lead-conversion',
    tier: 'foundation',
    shortDescription: 'Your jobs, on the relevant service pages, sized so they load on a phone.',
    businessOutcome:
      'A customer can see the standard of your work instead of taking your word for it.',
    problemSolved:
      'Stock photography of somebody else’s van tells a customer nothing, and they can usually tell. Meanwhile the photos on your phone from last week are the most persuasive thing you own.',
    howItWorks: [
      'Your own photographs, on the service page they belong to',
      'Before and after where the difference is the point',
      'Compressed and sized so they do not cost you the page load',
      'Described in text as well, so the page still works for a screen reader',
    ],
    customerValue: 'They can see what they would be buying.',
    businessValue:
      'The photographs you already take start doing something other than filling up your phone.',
    recommendedFor:
      'Everybody, and it is close to the whole sale where the work is visual — detailing, landscaping, roofing, photography.',
    industries: 'every',
    serviceModels: 'every',
    lifecycle: ['decide'],
    owner: 'website',
    integrations: [],
    dependencies: ['service-pages'],
    maturity: 'standard',
    availability: 'included-build',
    offerAnchor: 'trusted',
  },
  {
    id: 'online-booking',
    name: 'Letting them book a slot themselves',
    category: 'lead-conversion',
    tier: 'recommended',
    shortDescription:
      'Real availability from your calendar on the website, and the booking landing straight in it.',
    businessOutcome:
      'A customer who knows what they want can book it without a phone call, including at ten at night.',
    problemSolved:
      'For dated, predictable work, the phone call exists only to agree a time. It happens outside working hours, it needs both of you free at once, and often it just does not happen.',
    howItWorks: [
      'Your existing calendar is the source of what is free — no second diary to keep',
      'The customer picks from slots that are genuinely available',
      'The booking appears in your calendar, and both of you get a confirmation',
      'Only for the services where a fixed slot makes sense; the rest stay as enquiries',
    ],
    customerValue: 'They book at a time that suits them, without a conversation.',
    businessValue:
      'The diary fills without the back-and-forth, and outside your hours as well as inside.',
    recommendedFor:
      'Dated, scoped work: detailing, cleaning rounds, shoots, training sessions, inspections. Wrong for emergency work — somebody with a burst pipe should be looking at a phone number.',
    industries: ['cleaning', 'auto-detailing', 'photography', 'personal-training', 'pest-control'],
    serviceModels: ['scheduled', 'recurring', 'consultative'],
    lifecycle: ['contact', 'book'],
    owner: 'website',
    integrations: ['google-calendar'],
    dependencies: ['mobile-first'],
    maturity: 'established',
    availability: 'additional-scope',
  },
  {
    id: 'quote-estimator',
    name: 'A rough price before they have to ask',
    category: 'lead-conversion',
    tier: 'advanced',
    shortDescription:
      'A short set of questions that returns an honest range, so nobody has to ring to find out if you are in budget.',
    businessOutcome:
      'The enquiries you get are from people who already know roughly what it costs and are still interested.',
    problemSolved:
      'Plenty of customers will not enquire at all without a sense of the number, and plenty of your calls are with people who were never going to spend that much.',
    howItWorks: [
      'A handful of questions you choose, about the things that actually move the price',
      'A range rather than a figure, labelled as an estimate, with what would change it',
      'The answers arrive with the enquiry, so you are quoting with the detail already',
      'It only works where your pricing has a shape you can describe — otherwise it invents confidence',
    ],
    customerValue: 'They find out whether this is a conversation worth having.',
    businessValue: 'Fewer calls that end at the number, and the ones you take start further along.',
    recommendedFor:
      'Businesses with describable pricing — moving, detailing, cleaning, shoots. Wrong where every job needs eyes on it first, and saying so is better than a number you have to walk back.',
    industries: ['moving', 'auto-detailing', 'cleaning', 'photography', 'landscaping'],
    serviceModels: ['scheduled', 'project', 'recurring'],
    lifecycle: ['decide', 'contact'],
    owner: 'website',
    integrations: [],
    dependencies: ['quote-form'],
    maturity: 'new',
    availability: 'additional-scope',
  },
  {
    id: 'conversion-improvement',
    name: 'Ongoing work on the pages that bring in jobs',
    category: 'lead-conversion',
    tier: 'recommended',
    shortDescription:
      'Every month, changes to the pages and calls to action that decide whether a visitor gets in touch.',
    businessOutcome: 'The site you launch is not the best version of it that ever exists.',
    problemSolved:
      'A website is usually finished once and then left. Whatever it was getting wrong on launch day, it carries on getting wrong for years, quietly.',
    howItWorks: [
      'The measurement is read first, so the work goes where the numbers point',
      'Improvements to the pages that bring in the most work, not the ones easiest to change',
      'Calls to action, page order and wording refined where the evidence says to',
      'What was changed and why goes in the monthly report, so it is not a mystery',
    ],
    customerValue: 'The site gets easier to use rather than staler.',
    businessValue:
      'Somebody is working on the number every month, instead of you noticing a problem a year late.',
    recommendedFor:
      'Anybody on Growth Partner. It is the first half of what the monthly fee is for.',
    industries: 'every',
    serviceModels: 'every',
    lifecycle: ['decide', 'contact'],
    owner: 'website',
    integrations: ['google-analytics'],
    dependencies: ['conversion-tracking'],
    maturity: 'standard',
    availability: 'included-partner',
    offerAnchor: 'improve',
  },
  {
    id: 'ab-testing',
    name: 'Letting visitors settle the argument',
    category: 'lead-conversion',
    tier: 'advanced',
    shortDescription:
      'Two versions of a page live at once, where there is enough traffic for the answer to mean anything.',
    businessOutcome:
      'A decision about your website gets made on what happened rather than on whose idea it was.',
    problemSolved:
      'Everybody has an opinion about a headline and nobody has evidence. Most of the time the opinion wins because there is no way to check.',
    howItWorks: [
      'One specific question, and a visitor action that can be counted',
      'Two versions live at once with nothing else different between them',
      'Left running until the result means something, rather than until it looks good',
      'Where traffic is too thin to learn from, a considered improvement instead — and it gets called that',
    ],
    customerValue: 'They get the version that worked for people like them.',
    businessValue: 'Arguments about the website end.',
    recommendedFor:
      'Sites with enough traffic for a result to be real. Most local service sites are not there yet, and a test on thin traffic is a coin toss with extra steps.',
    industries: 'every',
    serviceModels: 'every',
    lifecycle: ['decide', 'contact'],
    owner: 'website',
    integrations: ['google-analytics'],
    dependencies: ['conversion-tracking'],
    maturity: 'standard',
    availability: 'included-partner',
    offerAnchor: 'improve',
  },

  /* ============================================================= not losing the enquiry */
  {
    id: 'enquiry-notification',
    name: 'Knowing straight away that somebody enquired',
    category: 'communication',
    tier: 'foundation',
    shortDescription:
      'Every form submission emailed to you within seconds, from a service built to actually arrive.',
    businessOutcome: 'You find out about an enquiry while the customer is still interested.',
    problemSolved:
      'Website forms fail silently and often. They send from the web host, land in spam, or stop working after an update — and nobody finds out for a month.',
    howItWorks: [
      'A delivery service built for it, rather than mail sent by the web server',
      'Sent within seconds of the customer pressing send',
      'Everything they typed in the email, so you can reply without opening anything',
      'Monitored, so a form that stops working is noticed by us rather than by nobody',
    ],
    customerValue: 'The thing they sent gets read.',
    businessValue: 'You are not relying on checking a dashboard nobody checks.',
    recommendedFor: 'Everybody with a form, which is everybody.',
    industries: 'every',
    serviceModels: 'every',
    lifecycle: ['contact'],
    owner: 'website',
    integrations: ['resend'],
    dependencies: ['quote-form'],
    maturity: 'standard',
    availability: 'included-build',
    offerAnchor: 'contacted',
  },
  {
    id: 'enquiry-record',
    name: 'Every enquiry kept, whatever happens to the email',
    category: 'communication',
    tier: 'foundation',
    shortDescription:
      'Submissions stored as well as emailed, so a bounced or deleted notification cannot lose you a job.',
    businessOutcome: 'No enquiry is ever a single email away from not existing.',
    problemSolved:
      'An emailed notification is one deletion, one spam filter or one full mailbox from being gone, and you would never know it had arrived.',
    howItWorks: [
      'The submission is saved first, then the email is sent',
      'If the email fails, the enquiry is still there',
      'Kept for a stated period and then deleted — see the privacy page for how long',
      'Nothing is shared, sold or added to anybody’s list',
    ],
    customerValue: 'What they sent is not lost by an email system they never saw.',
    businessValue: 'You can go back and find the one from three weeks ago.',
    recommendedFor: 'Everybody. It is the same design this application uses for its own forms.',
    industries: 'every',
    serviceModels: 'every',
    lifecycle: ['contact'],
    owner: 'website',
    integrations: [],
    dependencies: ['quote-form'],
    maturity: 'standard',
    availability: 'included-build',
    offerAnchor: 'contacted',
  },
  {
    id: 'auto-acknowledgement',
    name: 'An immediate reply that says you have it',
    category: 'communication',
    tier: 'recommended',
    shortDescription:
      'The customer gets an instant confirmation naming what they asked about and when you will come back.',
    businessOutcome:
      'A customer who has just enquired stops wondering whether it went anywhere — and stops filling in the next form.',
    problemSolved:
      'Silence after sending a form reads as nobody is there. Somebody who has heard nothing in ten minutes enquires elsewhere, and often that is who they end up hiring.',
    howItWorks: [
      'A confirmation sent immediately, in your name, from your address',
      'It repeats what they asked about, so they know the right thing arrived',
      'It states when you will get back to them, and does not promise anything you would not do',
      'It is an acknowledgement and says so — it never pretends to be you answering',
    ],
    customerValue: 'They know it arrived and roughly when they will hear back.',
    businessValue: 'The gap between their enquiry and your reply stops being the risk it is.',
    recommendedFor:
      'Everybody, and most of all any business where the customer is enquiring with several companies at once.',
    industries: 'every',
    serviceModels: 'every',
    lifecycle: ['contact', 'book'],
    owner: 'website',
    integrations: ['resend'],
    dependencies: ['enquiry-notification'],
    maturity: 'new',
    availability: 'additional-scope',
  },
  {
    id: 'sms-alerts',
    name: 'A text when an enquiry arrives',
    category: 'communication',
    tier: 'recommended',
    shortDescription:
      'A message to your phone the moment somebody submits a form, instead of an email you see later.',
    businessOutcome: 'You can respond to an urgent enquiry from a van, without checking email.',
    problemSolved:
      'For urgent work the customer is contacting three businesses within ten minutes and hiring whoever answers first. An email read at six o’clock is not a lead, it is a record of one.',
    howItWorks: [
      'A short text with the name, the number and what they need',
      'Sent at the same moment as the email, not instead of it',
      'To one number or several, whichever matches who actually answers',
      'Not built yet. This is a stated direction, and the honest label for it is "intended"',
    ],
    customerValue: 'Somebody calls them back quickly.',
    businessValue: 'Response time stops depending on whether you happened to be at a desk.',
    recommendedFor:
      'Emergency and same-day trades above all. Less useful where the customer expects to wait a day anyway.',
    industries: ['hvac', 'plumbing', 'electrical', 'pest-control'],
    serviceModels: ['emergency', 'scheduled'],
    lifecycle: ['contact', 'book'],
    owner: 'website',
    integrations: ['twilio'],
    dependencies: ['enquiry-notification'],
    maturity: 'new',
    availability: 'roadmap',
  },

  /* ================================================================ reviews and proof */
  {
    id: 'review-display',
    name: 'Your reviews where the decision happens',
    category: 'reputation',
    tier: 'recommended',
    shortDescription:
      'Real reviews shown on the service pages, attributed, rather than left on a listing the visitor has already left.',
    businessOutcome:
      'A visitor deciding between you and a competitor can read what your customers said without leaving the page.',
    problemSolved:
      'The reviews exist on a Google listing. The customer is now on your website. Asking them to go back and check is asking them to leave.',
    howItWorks: [
      'Real reviews, with the name the reviewer actually used',
      'Placed on the service page they are about, not pooled on a testimonials page nobody visits',
      'Nothing edited into something the reviewer did not say, and nothing invented',
      'Kept current, so the newest one is not from two years ago',
    ],
    customerValue: 'They read other people’s experience at the moment they are deciding.',
    businessValue: 'Work you have already done starts helping you win the next job.',
    recommendedFor:
      'Anybody with reviews worth showing. If you have very few, the honest first step is asking for some — see the next entry.',
    industries: 'every',
    serviceModels: 'every',
    lifecycle: ['decide'],
    owner: 'website',
    integrations: ['google-business-profile'],
    dependencies: ['service-pages'],
    maturity: 'established',
    availability: 'additional-scope',
  },
  {
    id: 'review-request',
    name: 'A one-tap way to ask for a review',
    category: 'reputation',
    tier: 'recommended',
    shortDescription:
      'A short link that opens your customer review box directly, so asking is one message rather than a conversation.',
    businessOutcome:
      'Asking for a review becomes something you can do from the driveway before you pull away.',
    problemSolved:
      'Most happy customers would leave a review and are never asked, because asking means explaining where to go, and the moment passes within a day.',
    howItWorks: [
      'A short link that opens your review form directly — no searching, no navigating',
      'A message you can send by text or email, worded once so you are not writing it each time',
      'Asked at the point the job is finished, which is the only moment it works',
      'The customer chooses what to write. Nothing here influences what a review says',
    ],
    customerValue:
      'If they want to say something nice, it takes them one tap rather than five minutes.',
    businessValue:
      'The reviews start arriving steadily instead of in the two weeks after you remember to care.',
    recommendedFor:
      'Everybody, and it is the highest-value thing on this page for a business with a thin review count.',
    industries: 'every',
    serviceModels: 'every',
    lifecycle: ['advocate'],
    owner: 'business',
    integrations: ['google-business-profile'],
    dependencies: [],
    maturity: 'established',
    availability: 'additional-scope',
  },
  {
    id: 'review-automation',
    name: 'The ask sent for you, every time',
    category: 'reputation',
    tier: 'advanced',
    shortDescription:
      'Your customer review request going out automatically after a job is marked finished, rather than when you remember.',
    businessOutcome: 'Every completed job gets asked, without it depending on anybody remembering.',
    problemSolved:
      'A manual ask is a good habit and habits lapse in a busy week — which is the week you did the most work.',
    howItWorks: [
      'Triggered by the job being marked complete in whatever system you already use',
      'Sent after a delay long enough for the customer to have formed a view',
      'Stops if they have already reviewed you, so nobody gets chased',
      'Requires a connection to your job software, which is why this one is a direction and not an offer',
    ],
    customerValue: 'One polite ask, at a sensible moment, and no repeats.',
    businessValue: 'Reviews accumulate as a by-product of finishing jobs.',
    recommendedFor:
      'Businesses already running job software that knows when work is done. Without that, the one-tap ask above is the practical version.',
    industries: 'every',
    serviceModels: 'every',
    lifecycle: ['advocate'],
    owner: 'business',
    integrations: ['jobber', 'housecall-pro'],
    dependencies: ['review-request'],
    maturity: 'new',
    availability: 'roadmap',
  },

  /* ======================================================== repeat and recurring work */
  {
    id: 'recurring-service-page',
    name: 'A page that sells your recurring service',
    category: 'retention',
    tier: 'recommended',
    shortDescription:
      'The regular arrangement you offer — visits, rounds, seasonal checks — presented as a thing somebody can choose.',
    businessOutcome:
      'The recurring work you would rather have becomes something a customer can find and ask for.',
    problemSolved:
      'Plenty of businesses will happily do regular work and only ever mention it on the phone, so almost nobody buys it. One-off jobs are what the website sells because they are all it describes.',
    howItWorks: [
      'What the arrangement actually is: what happens, how often, what it covers',
      'Written as a choice with a reason, rather than as an upsell',
      'A way to ask for it that is not the same generic contact form',
      'Only for arrangements you genuinely want more of — this fills your diary with them',
    ],
    customerValue: 'They can hand over something they would rather not think about again.',
    businessValue: 'Predictable work, and a customer who is no longer comparing you annually.',
    recommendedFor:
      'Cleaning, pest control, landscaping rounds, training, seasonal HVAC checks. Any business where the same customer needs you more than once.',
    industries: ['cleaning', 'pest-control', 'landscaping', 'personal-training', 'hvac'],
    serviceModels: ['recurring'],
    lifecycle: ['decide', 'return'],
    owner: 'website',
    integrations: [],
    dependencies: ['service-pages'],
    maturity: 'established',
    availability: 'additional-scope',
  },
  {
    id: 'list-capture',
    name: 'A reason to leave an email address',
    category: 'retention',
    tier: 'recommended',
    shortDescription:
      'Something worth having in exchange for an address, and the address going somewhere you will actually use.',
    businessOutcome:
      'Visitors who are not ready to buy today stop being visitors you never hear from again.',
    problemSolved:
      'Most people on your website are not ready this week. Without a reason to leave anything, all of them leave nothing, and the only ones you ever hear from are the ones who were ready.',
    howItWorks: [
      'Something genuinely useful offered — a checklist, a seasonal reminder, a guide',
      'One field, and an explicit statement of what you will send',
      'The address lands in whatever list tool you already use rather than in a spreadsheet',
      'Consent recorded with the date, because that is what makes the list legitimate',
    ],
    customerValue: 'They get something useful and can decide later without losing you.',
    businessValue: 'A list of local people who raised their hand, that you own.',
    recommendedFor:
      'Businesses with a long decision — roofing, remodelling, training, photography. Weak for emergency work, where nobody is joining a mailing list about a burst pipe.',
    industries: ['roofing', 'landscaping', 'photography', 'personal-training', 'moving'],
    serviceModels: ['project', 'consultative', 'recurring'],
    lifecycle: ['decide', 'return'],
    owner: 'website',
    integrations: ['email-platform'],
    dependencies: [],
    maturity: 'established',
    availability: 'additional-scope',
  },
  {
    id: 'return-reminders',
    name: 'Getting back in front of last year’s customers',
    category: 'retention',
    tier: 'advanced',
    shortDescription:
      'A seasonal reminder to people you have already worked for, sent before they start looking.',
    businessOutcome:
      'The customer who liked you last year hears from you before they search for somebody else.',
    problemSolved:
      'A year later they need you again and cannot remember your name, so they search — and now you are competing for a customer you already had.',
    howItWorks: [
      'Your own past customers, on a schedule that matches the work',
      'A short, useful message rather than a campaign',
      'Easy to stop receiving, and stopped immediately when somebody does',
      'Needs a customer list you actually keep, which is why this is a direction rather than an offer',
    ],
    customerValue: 'A reminder about something they were going to forget.',
    businessValue: 'The cheapest work you will ever win is from somebody who already hired you.',
    recommendedFor:
      'Seasonal and repeat trades. Requires you to be keeping customer records, and plenty of businesses are not.',
    industries: ['hvac', 'landscaping', 'pest-control', 'cleaning', 'auto-detailing'],
    serviceModels: ['recurring', 'scheduled'],
    lifecycle: ['return'],
    owner: 'business',
    integrations: ['email-platform'],
    dependencies: ['list-capture'],
    maturity: 'new',
    availability: 'roadmap',
  },

  /* ==================================================== bigger jobs, fewer discounts */
  {
    id: 'service-tiers',
    name: 'Presenting more than one way to buy',
    category: 'revenue',
    tier: 'advanced',
    shortDescription:
      'Two or three levels of the same service, described so the difference is obvious and the choice is theirs.',
    businessOutcome:
      'A customer who wants the better option can find it, rather than being quoted the cheapest thing you offer.',
    problemSolved:
      'One price for one service turns every conversation into yes or no, and the only lever left is discounting. Some of your customers would happily have paid for more and were never shown it.',
    howItWorks: [
      'The levels you actually offer, with the real difference between them stated',
      'Written so the middle one is a genuine choice, not a decoy',
      'The same clarity at every level — nothing hidden in the cheap one to punish it',
      'Only where the levels are real. Inventing tiers to make one look better is a trick, and customers notice',
    ],
    customerValue: 'They choose how much to spend instead of being told.',
    businessValue: 'The conversation moves from whether to which, which is a better conversation.',
    recommendedFor:
      'Businesses with genuinely different levels of service. Wrong if you do one thing one way — then this is theatre.',
    industries: 'every',
    serviceModels: ['scheduled', 'project', 'recurring'],
    lifecycle: ['decide'],
    owner: 'website',
    integrations: [],
    dependencies: ['service-pages'],
    maturity: 'new',
    availability: 'additional-scope',
  },
  {
    id: 'financing-link',
    name: 'A route to financing for the big jobs',
    category: 'revenue',
    tier: 'advanced',
    shortDescription:
      'If you offer finance, the application on the page where the large number is, rather than mentioned on a call.',
    businessOutcome:
      'A customer who cannot pay for the whole job at once has a way forward that is not "no".',
    problemSolved:
      'For roofs, panels and full replacements, the cost is the objection. If finance is only mentioned after they have flinched, most of them have already left.',
    howItWorks: [
      'Your existing finance provider’s application, linked where the price is discussed',
      'What is available described plainly, without dressing up the terms',
      'Presented as an option, never as the default or the recommended route',
      'Only if you already have a provider. This does not arrange finance, and it never will',
    ],
    customerValue: 'They can see whether the job is possible for them at all.',
    businessValue: 'Fewer quotes lost to the number rather than to you.',
    recommendedFor:
      'Roofing, electrical panel work, HVAC replacement, large landscaping — anywhere the job is a significant purchase. Irrelevant for small work.',
    industries: ['roofing', 'electrical', 'hvac', 'landscaping'],
    serviceModels: ['project'],
    lifecycle: ['decide', 'book'],
    owner: 'business',
    integrations: [],
    dependencies: ['service-pages'],
    maturity: 'new',
    availability: 'additional-scope',
  },

  /* ==================================================================== less admin */
  {
    id: 'hosting-and-upkeep',
    name: 'Hosting, certificates, backups and updates handled',
    category: 'operations',
    tier: 'foundation',
    shortDescription:
      'The technical upkeep that keeps a website online and safe, on accounts in your name, off your list.',
    businessOutcome: 'The website stays up and current without becoming your problem.',
    problemSolved:
      'Certificates expire, software goes stale, backups were never set up. None of it announces itself, and the first sign is usually a customer telling you your site is broken.',
    howItWorks: [
      'Hosting, certificates and backups looked after on accounts registered to you',
      'Software and security updates applied as they are needed rather than annually',
      'Uptime watched, so an outage is noticed by somebody whose job it is',
      'You keep the accounts if the plan ends; billing simply reverts to you',
    ],
    customerValue: 'The site is there and secure when they visit it.',
    businessValue: 'None of it is on your list, and none of it is a surprise invoice.',
    recommendedFor:
      'Anybody who does not want to own this. It is the floor of the monthly plan and deliberately not its headline.',
    industries: 'every',
    serviceModels: 'every',
    lifecycle: ['find', 'decide', 'contact'],
    owner: 'website',
    integrations: [],
    dependencies: [],
    maturity: 'standard',
    availability: 'included-partner',
    offerAnchor: 'floor',
  },
  {
    id: 'form-monitoring',
    name: 'Somebody noticing when the form stops working',
    category: 'operations',
    tier: 'foundation',
    shortDescription:
      'The contact and quote forms checked on a schedule, so a silent failure does not cost you a month.',
    businessOutcome: 'A broken form is found in days by us rather than in months by you.',
    problemSolved:
      'A form that has stopped sending looks exactly like a form nobody is using. Businesses lose whole quarters of enquiries this way and conclude the website does not work.',
    howItWorks: [
      'The forms exercised regularly rather than assumed to be fine',
      'A failure raises an alert to us, not a note in a log nobody reads',
      'Fixed as part of the plan rather than quoted as a repair',
      'Reported in the month it happened, including how long it was broken',
    ],
    customerValue: 'The message they send actually goes somewhere.',
    businessValue: 'You stop having to wonder whether the quiet fortnight was the market or a bug.',
    recommendedFor: 'Anybody whose enquiries come through a form, which is nearly everybody.',
    industries: 'every',
    serviceModels: 'every',
    lifecycle: ['contact'],
    owner: 'website',
    integrations: [],
    dependencies: ['quote-form'],
    maturity: 'standard',
    availability: 'included-partner',
    offerAnchor: 'floor',
  },
  {
    id: 'content-changes',
    name: 'Changes made when you ask, by the person who built it',
    category: 'operations',
    tier: 'foundation',
    shortDescription:
      'New services, new photographs, changed hours or prices — sent as a message and done.',
    businessOutcome:
      'The website keeps saying what is true about your business without you learning any software.',
    problemSolved:
      'A site nobody can change goes out of date, and the out-of-date parts are exactly the ones that cost you calls: old prices, a service you dropped, hours that changed.',
    howItWorks: [
      'You send a message. There is no ticket system and no account manager',
      'Content, service and photograph changes are part of the plan',
      'Anything larger is quoted before it starts, never after',
      'The person making the change is the person who built the thing',
    ],
    customerValue: 'What they read is current.',
    businessValue: 'Keeping the site true costs you one message.',
    recommendedFor:
      'Anybody who does not want to edit their own website, and anybody who would but never will.',
    industries: 'every',
    serviceModels: 'every',
    lifecycle: ['decide'],
    owner: 'website',
    integrations: [],
    dependencies: [],
    maturity: 'standard',
    availability: 'included-partner',
    offerAnchor: 'request',
  },
  {
    id: 'job-software-handoff',
    name: 'Enquiries landing in the software you already work from',
    category: 'operations',
    tier: 'advanced',
    shortDescription:
      'A form submission arriving in your scheduling or quoting system rather than as an email you retype.',
    businessOutcome: 'An enquiry is entered once, by the website, instead of twice, by you.',
    problemSolved:
      'If your day runs out of job software, every website enquiry is a copy-and-paste job — which is slow, and which is where details get dropped.',
    howItWorks: [
      'The submission is passed to your system as a new lead or enquiry',
      'The fields are mapped once, to match how you already work',
      'The email still arrives as well, so a failed handoff is visible rather than silent',
      'Not built. It is a stated direction and depends on which system you run',
    ],
    customerValue: 'Nothing they typed gets lost in a retype.',
    businessValue: 'The admin between an enquiry and a scheduled job disappears.',
    recommendedFor:
      'Businesses already running job-management software. If you work from a notebook and a phone, this solves a problem you do not have.',
    industries: 'every',
    serviceModels: 'every',
    lifecycle: ['contact', 'book'],
    owner: 'business',
    integrations: ['jobber', 'housecall-pro'],
    dependencies: ['enquiry-notification'],
    maturity: 'new',
    availability: 'roadmap',
  },
  {
    id: 'accounting-sync',
    name: 'Connecting the website to your books',
    category: 'operations',
    tier: 'advanced',
    shortDescription:
      'Listed because owners ask. The honest answer is that this is the wrong place to do it.',
    businessOutcome:
      'Nothing, from us. Your payment provider and your job software already connect to your accounting, and they are the right route.',
    problemSolved:
      'The problem is real — reconciling payments by hand is miserable. The problem is just not one a website should be solving.',
    howItWorks: [
      'Your card payments already reach your books through your payment provider',
      'Your invoices already reach them through your job software, if you run any',
      'A third connection through the website adds a place for it to go wrong and nothing else',
      'If your accountant disagrees, that is a conversation worth having — with them',
    ],
    customerValue: 'None. This is entirely an internal matter.',
    businessValue:
      'Knowing not to pay somebody to build it is worth more than the integration would be.',
    recommendedFor:
      'Nobody, and that is a decision rather than an omission. It is on this page so the answer is findable.',
    industries: 'every',
    serviceModels: 'every',
    lifecycle: ['pay'],
    owner: 'business',
    integrations: ['quickbooks'],
    dependencies: [],
    maturity: 'exploratory',
    availability: 'not-offered',
  },

  /* ================================================================== getting paid */
  {
    id: 'deposit-payments',
    name: 'Taking a deposit on the website',
    category: 'payments',
    tier: 'recommended',
    shortDescription:
      'A card payment for a deposit or a fixed-price job, into your own merchant account.',
    businessOutcome:
      'A booking becomes a commitment, and dated work stops being cancelled the week before.',
    problemSolved:
      'A verbal booking with nothing behind it is an intention. For dated jobs that is a hole in your diary somebody else could have filled.',
    howItWorks: [
      'Your own merchant account, settling to your own bank — we never hold your money',
      'The amount and what it covers stated before they pay, and a receipt after',
      'Refund and cancellation terms written down rather than left to a conversation',
      'Card details go to the payment provider and never touch your website',
    ],
    customerValue: 'They can secure the date immediately instead of waiting for a call back.',
    businessValue: 'Fewer no-shows, and the awkward money conversation happens up front.',
    recommendedFor:
      'Dated, scoped work — moves, shoots, details, cleans. Not for emergency call-outs, where asking for a card before you arrive costs you the job.',
    industries: ['moving', 'photography', 'auto-detailing', 'cleaning', 'personal-training'],
    serviceModels: ['scheduled', 'project'],
    lifecycle: ['book', 'pay'],
    owner: 'website',
    integrations: ['stripe-client'],
    dependencies: ['mobile-first'],
    maturity: 'established',
    availability: 'additional-scope',
  },
  {
    id: 'invoice-payment-link',
    name: 'A link on the invoice that just pays it',
    category: 'payments',
    tier: 'advanced',
    shortDescription:
      'Letting a finished job be paid by card from a link, rather than by cheque or a phone call.',
    businessOutcome: 'Money arrives sooner and with less chasing.',
    problemSolved:
      'An invoice that needs a bank transfer gets paid when somebody gets round to it. Chasing it is unpaid work you do in the evening.',
    howItWorks: [
      'A link per invoice, paid by card, settling into your own account',
      'A receipt to both of you automatically',
      'Best issued by whatever already produces your invoices, which is usually not the website',
      'Not built here, and for most businesses the payment provider does it already',
    ],
    customerValue: 'They pay in a few seconds from the phone in their hand.',
    businessValue: 'Less chasing, faster settlement, fewer evenings spent on it.',
    recommendedFor:
      'Businesses invoicing after the work. Check what your payment provider already offers first — this may be a feature you own and have not switched on.',
    industries: 'every',
    serviceModels: 'every',
    lifecycle: ['pay'],
    owner: 'business',
    integrations: ['stripe-client'],
    dependencies: ['deposit-payments'],
    maturity: 'new',
    availability: 'roadmap',
  },

  /* =========================================================== campaigns and audience */
  {
    id: 'campaign-landing-pages',
    name: 'A page built for the advert pointing at it',
    category: 'marketing',
    tier: 'recommended',
    shortDescription:
      'When you advertise, somewhere to land that continues the advert instead of restarting the conversation.',
    businessOutcome: 'The money you spend getting a click is not wasted by the page it arrives at.',
    problemSolved:
      'Adverts point at homepages. Somebody who clicked an advert about one specific thing lands on a page about everything, has to find their thing again, and often does not.',
    howItWorks: [
      'One page per campaign worth having one, about the thing being advertised',
      'The same offer and the same words the advert used',
      'One action on the page, and the page is about that action',
      'Website work only: we do not run your adverts, set your budgets or bid',
    ],
    customerValue: 'They arrive at the thing they clicked on rather than at a menu.',
    businessValue: 'Whatever you are already spending goes further.',
    recommendedFor:
      'Anybody running paid advertising. Pointless if you are not — build the service pages first.',
    industries: 'every',
    serviceModels: 'every',
    lifecycle: ['find', 'decide'],
    owner: 'website',
    integrations: [],
    dependencies: ['service-pages'],
    maturity: 'standard',
    availability: 'included-partner',
    offerAnchor: 'align',
  },
  {
    id: 'message-match',
    name: 'The website saying what your advertising promised',
    category: 'marketing',
    tier: 'recommended',
    shortDescription:
      'Campaign copy read and matched on the pages it points at, so the promise survives the click.',
    businessOutcome:
      'A visitor who was interested enough to click does not have to work out whether they are in the right place.',
    problemSolved:
      'The advert says one thing and the page says another — a different offer, a different phrase, a different price. Every mismatch is a moment of doubt at the most expensive point in the funnel.',
    howItWorks: [
      'Your live campaign messaging read, then matched on the landing pages',
      'Headlines and calls to action worded the way the advert worded them',
      'Two alignments a month covered, which do not accumulate if unused',
      'Again: website work only. Nobody here touches your ad accounts',
    ],
    customerValue: 'The page confirms they clicked the right thing.',
    businessValue: 'Your advertising and your website stop being two separate projects.',
    recommendedFor: 'Anybody advertising while on the monthly plan.',
    industries: 'every',
    serviceModels: 'every',
    lifecycle: ['decide'],
    owner: 'website',
    integrations: [],
    dependencies: ['campaign-landing-pages'],
    maturity: 'standard',
    availability: 'included-partner',
    offerAnchor: 'align',
  },

  /* ==================================================== measurement and automation */
  {
    id: 'conversion-tracking',
    name: 'Calls and forms counted, not guessed at',
    category: 'automation',
    tier: 'foundation',
    shortDescription:
      'Analytics configured so a tap on your number and a submitted form are counted as enquiries.',
    businessOutcome:
      'You can answer "how many enquiries did the website produce last month" with a number.',
    problemSolved:
      'Analytics dropped in and left alone counts visits. Visits are not the question. Nobody can tell you which pages produce work without the enquiries being counted, and most sites never count them.',
    howItWorks: [
      'Analytics installed and then actually configured, which is the part usually skipped',
      'Taps on the phone number counted as an action, not just page views',
      'Form submissions counted, and matched against what the site stored',
      'Search Console connected, so the words people searched are visible too',
    ],
    customerValue: 'Nothing directly, and no personal tracking is added on their behalf.',
    businessValue: 'Every conversation about the website stops being two people guessing.',
    recommendedFor:
      'Everybody. It is also the dependency almost everything else on this page rests on.',
    industries: 'every',
    serviceModels: 'every',
    lifecycle: ['decide', 'contact'],
    owner: 'website',
    integrations: ['google-analytics', 'google-search-console'],
    dependencies: [],
    maturity: 'standard',
    availability: 'included-build',
    offerAnchor: 'measured',
  },
  {
    id: 'enquiry-baseline',
    name: 'A written baseline on launch day',
    category: 'automation',
    tier: 'foundation',
    shortDescription:
      'What your enquiries were before the new site went live, recorded in writing at the start.',
    businessOutcome:
      'There is a number to compare against, so "is it working" has an answer rather than an opinion.',
    problemSolved:
      'Without a baseline, every later claim about improvement is unfalsifiable — including ours. A business that cannot check is a business being asked to take it on trust.',
    howItWorks: [
      'What we can measure before launch is measured and written down',
      'What cannot be measured is stated as unknown rather than estimated',
      'Recorded on launch day, not reconstructed later from memory',
      'Yours. You can hold the next twelve months against it, including against us',
    ],
    customerValue: 'Nothing directly. This one is entirely for the owner.',
    businessValue:
      'You get the ability to check, which is the thing most website work quietly avoids giving you.',
    recommendedFor: 'Everybody, and it is included whether or not you take the monthly plan.',
    industries: 'every',
    serviceModels: 'every',
    lifecycle: ['contact'],
    owner: 'website',
    integrations: ['google-analytics'],
    dependencies: ['conversion-tracking'],
    maturity: 'standard',
    availability: 'included-build',
    offerAnchor: 'measured',
  },
  {
    id: 'performance-report',
    name: 'A written report every month',
    category: 'automation',
    tier: 'foundation',
    shortDescription:
      'What the website did last month, what changed, and what we would do next — in plain English.',
    businessOutcome:
      'You know, monthly and without asking, whether the website is producing more enquiries or fewer.',
    problemSolved:
      'Most ongoing website arrangements report nothing. You pay monthly, something presumably happens, and the only way to find out is to ask — so nobody asks, and nobody knows.',
    howItWorks: [
      'The enquiry number for the month, against the baseline and against last month',
      'What was changed on the site, and why',
      'What the numbers suggest doing next, ranked',
      'Sent whether the number went up or down. A report that only arrives in good months is advertising',
    ],
    customerValue: 'Nothing directly. This is the owner’s.',
    businessValue:
      'You stop paying monthly for something you cannot see. It is the reason the fee is not a hosting bill.',
    recommendedFor:
      'Anybody on Growth Partner. Build clients also get one report at thirty days, whether or not they continue.',
    industries: 'every',
    serviceModels: 'every',
    lifecycle: ['decide', 'contact'],
    owner: 'website',
    integrations: ['google-analytics', 'google-search-console'],
    dependencies: ['conversion-tracking', 'enquiry-baseline'],
    maturity: 'standard',
    availability: 'included-partner',
    offerAnchor: 'measure',
  },
  {
    id: 'search-term-insight',
    name: 'The words people actually searched',
    category: 'automation',
    tier: 'foundation',
    shortDescription:
      'What people typed before they found you, which is usually not what you would have guessed.',
    businessOutcome:
      'You find out what your customers call the work, and the site can start using their words.',
    problemSolved:
      'Businesses describe their services in trade language. Customers search in symptoms. The gap between the two is invisible without looking, and it costs you the visit entirely.',
    howItWorks: [
      'Search Console connected and verified as part of launch',
      'The queries people used reviewed rather than left in a dashboard nobody opens',
      'Anything worth a page or a wording change is called out in the report',
      'It shows what people searched, not what will rank. Nothing here promises a position',
    ],
    customerValue: 'The page they land on uses the words they used.',
    businessValue: 'Real language to write with, instead of assumptions about your own trade.',
    recommendedFor: 'Everybody. It is free, it is your own data, and most businesses never look.',
    industries: 'every',
    serviceModels: 'every',
    lifecycle: ['find'],
    owner: 'website',
    integrations: ['google-search-console'],
    dependencies: ['local-search-foundation'],
    maturity: 'standard',
    availability: 'included-build',
    offerAnchor: 'measured',
  },
  {
    id: 'assistant-chat',
    name: 'An assistant answering common questions',
    category: 'automation',
    tier: 'advanced',
    shortDescription:
      'A chat window that answers routine questions from your own pages. Not offered, and here is the reasoning.',
    businessOutcome:
      'None today. This is on the page because it is asked about constantly, and a library that omitted it would look like an oversight rather than a position.',
    problemSolved:
      'The stated problem is repetitive questions. The real problem on most service-business sites is that the answers are not on the pages at all — and a chat window is a worse place to put them than the page is.',
    howItWorks: [
      'It would answer from your own content, so it can only be as good as the pages',
      'Anything it does not know has to hand over to a person, which is the hard part',
      'A confidently wrong answer about a price or a service area costs you the customer and the trust',
      'The honest sequence is: fix the pages, count the questions that remain, then decide',
    ],
    customerValue:
      'Potentially an instant answer. Equally, a machine standing between them and you.',
    businessValue:
      'Not yet demonstrated for a business this size, and this page will not pretend otherwise.',
    recommendedFor:
      'Nobody, for now. If your enquiries are dominated by the same three questions, the first answer is putting them on the page — and that is included in the build.',
    industries: 'every',
    serviceModels: 'every',
    lifecycle: ['decide', 'contact'],
    owner: 'website',
    integrations: [],
    dependencies: ['service-pages'],
    maturity: 'exploratory',
    availability: 'not-offered',
  },
];

/* ------------------------------------------------------------------ label vocabularies */

/*
 * The labels the reader sees for the two honesty fields, plus tier and service model.
 *
 * They are `Record`s keyed by the union rather than arrays, so adding a value to any of the
 * unions in `types/content.ts` is a **compile error here** until it has a label. That is the
 * mechanism that stops a sixth availability value rendering as an unlabelled aspiration —
 * see the note on `CapabilityAvailability`.
 */

export interface AvailabilityLabel {
  /** The short badge. Must read as a status, not as a feature. */
  readonly label: string;
  /** The sentence under it, saying what a buyer can and cannot do about it. */
  readonly meaning: string;
  /** Whether a reader can act on this today. Drives the tone of the badge. */
  readonly purchasable: boolean;
}

export const availabilityLabels: Record<CapabilityAvailability, AvailabilityLabel> = {
  'included-build': {
    label: 'In the build',
    meaning: 'Part of every Customer Conversion Build. Nothing extra to buy or decide.',
    purchasable: true,
  },
  'included-partner': {
    label: 'In Growth Partner',
    meaning:
      'Part of the optional monthly service, every month, for as long as you keep it. Not part of the build price.',
    purchasable: true,
  },
  'additional-scope': {
    label: 'Extra scope',
    meaning:
      'Genuinely deliverable and not in either price. Quoted separately before any work starts, so you decide with the number in front of you.',
    purchasable: true,
  },
  roadmap: {
    label: 'Intended, not built',
    meaning:
      'A stated direction with no date attached. You cannot buy it today, and nobody will suggest otherwise on a call.',
    purchasable: false,
  },
  'not-offered': {
    label: 'Not offered',
    meaning:
      'A decision rather than an omission. It is listed with the reasoning so the answer is findable instead of awkward.',
    purchasable: false,
  },
};

export const maturityLabels: Record<CapabilityMaturity, string> = {
  standard: 'Done on every project',
  established: 'Built before, on request',
  new: 'Specified, not yet built',
  exploratory: 'No committed approach',
};

export interface TierMeta {
  readonly id: CapabilityTier;
  readonly label: string;
  /** One line on what the group is, and why it is in this position. */
  readonly summary: string;
}

/*
 * Foundation → Recommended → Advanced, and the middle one is the visually strongest.
 *
 * That ordering is deliberate and slightly unusual: a reader scanning three groups
 * normally weights the first. Foundation is first because it is what you already get and
 * therefore what makes the rest legible — but the group an owner should be *deciding* about
 * is the recommended one, so the presentation emphasises the middle. See
 * `Capabilities.module.css` for how, and `capabilities.test.ts` for the assertion that it
 * stays that way.
 */
export const capabilityTiers: readonly TierMeta[] = [
  {
    id: 'foundation',
    label: 'Foundation',
    summary:
      'What every build and every plan month includes. Not optional, not extra, and the reason the rest of this page is worth reading — none of it works without these.',
  },
  {
    id: 'recommended',
    label: 'Worth considering for you',
    summary:
      'Chosen for your kind of business rather than listed for everybody. Some are in the monthly plan, some are quoted as extra scope, and each one says which.',
  },
  {
    id: 'advanced',
    label: 'Further out',
    summary:
      'Bigger, later, or dependent on something you may not have yet. Several are honestly labelled as intended-not-built, and two are things this business has decided not to do.',
  },
];

export const serviceModelLabels: Record<ServiceModel, string> = {
  emergency: 'Urgent call-outs',
  scheduled: 'Booked appointments',
  project: 'Larger one-off projects',
  recurring: 'Regular, repeating work',
  consultative: 'Work that starts with a conversation',
};

/* ------------------------------------------------------------------ the page */

/*
 * The copy for the explorer.
 *
 * Two things about the shape of it. First, the honesty note is not a footnote — it is the
 * second thing on the page, above the library, because a reader who discovers halfway down
 * that a third of what they have been reading is not purchasable has been misled by the
 * ordering even if every badge was correct.
 *
 * Second, there is no price anywhere in this object and there must never be one. The
 * commercial figures live in `config/pricing.ts` and are rendered by the pricing block; a
 * capability page that quoted them would be the fourth place they appear, and the currency
 * guard in `content.test.ts` would fail the build on the first one typed here anyway.
 */
export const capabilityPage = {
  eyebrow: 'What a website can do',
  heading: 'What could your website actually do for your business?',
  lede: 'Not a feature list. Every capability below is one of four things: part of the build, part of the monthly service, extra scope we would quote, or something we do not offer — and each one says which. Pick your kind of business and the middle group changes.',

  honesty: {
    heading: 'Read the labels before the list',
    body: 'A page like this is the easiest place in the world to imply a company does more than it does. So every entry carries a status, three of the statuses mean you cannot buy it today, and two entries are things this business has decided not to build at all — with the reasoning, because the reasoning is more useful than the omission.',
    /** The four things a reader should take from the summary counts. */
    keys: [
      'In the build — every project has it, nothing extra to decide.',
      'In Growth Partner — every month of the optional service, not part of the build price.',
      'Extra scope — real, quoted separately, and you see the number before anything starts.',
      'Intended or not offered — you cannot buy it. Nobody will suggest otherwise on a call.',
    ],
  },

  lifecycle: {
    eyebrow: 'The whole journey',
    heading: 'Where a website works, and where it does not',
    lede: 'Eight stages between a stranger needing something and that stranger telling a neighbour about you. Your website is genuinely in charge of four of them. The other four are your business, and no website changes them — which is worth knowing before anybody sells you one as growth.',
    ownerLabels: {
      demand: 'Before your website',
      website: 'Your website’s job',
      business: 'Your business, not your website',
    },
    note: 'The stages marked as your business are still where most of the money is won or lost. Several capabilities below help with them — a review link, a deposit, a reminder — and each one says plainly that the website hands over rather than closes.',
  },

  chooser: {
    heading: 'What kind of business is this?',
    hint: 'It changes which capabilities are recommended, and nothing else. Nothing is hidden from you — the whole library is below either way.',
    fieldLabel: 'Your trade',
    /** Shown when the chosen trade has nothing written for it by name. */
    genericNotice:
      'Nothing in the library is written for this kind of business specifically, so what follows is what applies to everybody. That is the honest answer rather than a generic list presented as a recommendation — and if you tell us what you do, the assessment is still free.',
    genericCtaLabel: 'Get a free assessment instead',
  },

  explorer: {
    eyebrow: 'The library',
    heading: 'Everything, grouped by what it would take',
    lede: 'Foundation first, because it is what you already get and the rest makes no sense without it. Then the group worth deciding about. Then the things that are further off.',
    /** The control that opens one capability. Progressive disclosure, one at a time. */
    expandLabel: 'What this does for your business',
    collapseLabel: 'Close',
    filterHeading: 'Narrow it down',
    categoryFieldLabel: 'Area of the business',
    categoryAllLabel: 'Every area of the business',
    availableOnlyLabel: 'Only show what I could buy today',
    /*
     * There is no `emptyHeading`/`emptyBody` here, and their absence is enforced rather than
     * accidental.
     *
     * Both existed. Neither could ever be read: every foundation capability applies to every
     * trade and is included in a price, so no combination of the explorer's two controls can
     * empty the library. `capabilityMatch.test.ts` now asserts that across every trade and
     * every category — and if it ever fails, the empty state has to come back with it.
     *
     * `clearLabel` survived for a different and better reason: a radio group cannot be
     * un-chosen, so without a reset there is no way back to the whole library once a trade has
     * been picked.
     */
    clearLabel: 'Show everything again',
    /** Field headings inside an expanded capability. Reading order, outcome first. */
    fieldLabels: {
      businessOutcome: 'What changes for you',
      problemSolved: 'The problem it solves',
      howItWorks: 'How it actually works',
      customerValue: 'What your customer gets',
      businessValue: 'What you get',
      recommendedFor: 'Worth it for',
      dependencies: 'Needs first',
      integrations: 'Connects to',
      lifecycle: 'Works on',
    },
  },

  integrations: {
    eyebrow: 'Connections',
    heading: 'The other systems, and whose login they need',
    lede: 'Every one of these is described by what it would do for your business rather than by how it connects. Half of them are accounts you already own and keep — if we stop working together, they stay yours.',
    ownerLabels: {
      client: 'Your account, and you keep it',
      jobforge: 'Part of how the service runs',
    },
  },

  /*
   * The closing block. It sends the reader at the assessment rather than at a price, because
   * somebody who has just read forty capabilities has questions about their own site, not
   * about the invoice — and the assessment is the free thing that answers those.
   */
  closing: {
    heading: 'None of this tells you which ones you need',
    body: 'A list cannot. What tells you is looking at your actual website: what it is doing now, where people are leaving, and which two or three of these would change that. That is what the free assessment is, and it does not require an account.',
  },
} as const;

/* ------------------------------------------------------------------ resolvers */

const capabilityById = new Map(capabilities.map((capability) => [capability.id, capability]));
const integrationById = new Map(
  capabilityIntegrations.map((integration) => [integration.id, integration]),
);
/*
 * Keyed as `string` rather than `LifecycleStageId`, because the whole point of the resolver
 * is to be handed a value that has not been proven to be one — a stage id read out of a URL
 * or a stored record. A map typed to the union would refuse the lookup at compile time and
 * push the caller into a cast, which is the check being deleted rather than performed.
 */
const stageById = new Map<string, LifecycleStage>(
  lifecycleStages.map((stage) => [stage.id, stage]),
);

/**
 * Resolves a capability id. Returns `undefined` rather than guessing.
 *
 * Every caller is expected to handle `undefined` — see `lib/capabilityMatch.ts`, where an
 * unresolvable dependency is dropped from a chain rather than rendered as a blank, and the
 * explorer, which shows a stated "not in the library" panel rather than throwing. An id can
 * arrive from a URL, and a URL is not a promise.
 */
export function findCapability(id: string): Capability | undefined {
  return capabilityById.get(id);
}

export function findIntegration(id: string): CapabilityIntegration | undefined {
  return integrationById.get(id);
}

export function findLifecycleStage(id: string): LifecycleStage | undefined {
  return stageById.get(id);
}
