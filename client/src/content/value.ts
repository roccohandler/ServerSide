import type { DemoExample, ValueStage } from '../types/content';

/*
 * ============================================================================
 * THE BUSINESS CASE — WHY A BETTER WEBSITE IS WORTH ANYTHING
 * ============================================================================
 *
 * Everything in `content/offer.ts` describes what is sold. This file exists to answer
 * the question that comes before it: why should somebody who fixes furnaces for a living
 * care about any of this?
 *
 * Three rules:
 *
 *   1. No jargon as an explanation. "Semantic markup", "Core Web Vitals" and "conversion
 *      rate optimisation" are how the work is done, not why it is worth doing. The owner
 *      should be able to follow every line without knowing one of those terms.
 *   2. Every demonstration is illustrative and labelled as such. There are no customers
 *      yet, so there is no before-and-after of anybody's real website, no measured
 *      percentage, and no invented company.
 *   3. No claim that an improvement causes a result. "Reduces friction" and "gives
 *      visitors a clearer next step" are true and defensible. "Increases conversions by
 *      47%" would be neither.
 * ============================================================================
 */

/* ------------------------------------------------------------------ the business case */

export const valueEducation = {
  eyebrow: 'The business case',
  heading: 'What your website actually does for your business',
  lede: 'A website has one job, and it happens in six steps. Every part of what we do is aimed at one of them — and every step that is missing is somewhere a potential customer quietly gives up.',

  stages: [
    {
      id: 'found',
      stage: 'Get found',
      problem: 'People searching for what you do never see you.',
      improvement:
        'A page for each service, written the way customers describe the job, on a site search engines can actually read.',
      value: 'More of the right people get the chance to discover your business at all.',
      components: ['Build', 'Launch'],
      icon: 'map-pin',
    },
    {
      id: 'understood',
      stage: 'Get understood',
      problem: 'People land on your site and cannot tell what you do or whether you cover them.',
      improvement:
        'A clear headline, plain service descriptions, and your service area where people look for it.',
      value: 'A stranger works out in seconds whether you are the right business to call.',
      components: ['Build'],
      icon: 'layout',
    },
    {
      id: 'trusted',
      stage: 'Build trust',
      problem: 'Nothing on the site says you are the safe choice rather than a risk.',
      improvement:
        'Photos of your own finished work, licence and insurance details, reviews, and a site that is obviously looked after.',
      value: 'Visitors have real reasons to believe you before they have spoken to anybody.',
      components: ['Build', 'Maintain'],
      icon: 'shield',
    },
    {
      id: 'act',
      stage: 'Make it easy to act',
      problem: 'Somebody decides to get in touch and then has to hunt for how.',
      improvement:
        'Tap-to-call in the header of every page, short quote forms, and one obvious next step wherever they are.',
      value: 'An interested visitor gets a clear path instead of a dead end.',
      components: ['Capture'],
      icon: 'phone',
    },
    {
      id: 'opportunities',
      stage: 'Turn visitors into opportunities',
      problem: 'Enquiries go missing, or arrive days after the job was booked elsewhere.',
      improvement:
        'Submissions emailed to you and stored so nothing is lost, with form delivery monitored rather than assumed.',
      value: 'The enquiry reaches you while the customer is still deciding.',
      components: ['Capture', 'Track'],
      icon: 'inbox',
    },
    {
      id: 'relevant',
      stage: 'Stay relevant',
      problem:
        'The website still leads with last season’s service, and says nothing about what you are currently advertising.',
      improvement:
        'Seasonal services brought to the front when they matter, and messaging matched to whatever campaign you are running.',
      value: 'Somebody arriving today sees the thing you actually want to sell today.',
      components: ['Refresh', 'Align'],
      icon: 'wrench',
    },
    {
      id: 'learn',
      stage: 'Learn what works',
      problem: 'Every decision about the website is somebody’s opinion, including yours and ours.',
      improvement:
        'Analytics that count real actions, and — where there is enough traffic to learn from — two versions compared against each other.',
      value: 'Changes get made because of what visitors did, not because of who argued hardest.',
      components: ['Track', 'Test'],
      icon: 'target',
    },
    {
      id: 'improve',
      stage: 'Improve over time',
      problem: 'The website is right on launch day and slowly stops being right after that.',
      improvement:
        'Ongoing management, monitoring and continuous work on the pages that bring in the most enquiries.',
      value: 'The website stays current instead of becoming another forgotten business asset.',
      components: ['Maintain', 'Improve'],
      icon: 'bolt',
    },
  ] satisfies readonly ValueStage[],

  /*
   * The whole page in three lines. It is here rather than in the hero because it only
   * lands once somebody has read the six stages above and recognised a few of them.
   */
  closing: {
    heading: 'Your website only needs to do three things well.',
    items: [
      {
        id: 'arrive',
        title: 'Get relevant people there',
        body: 'Search, your Google listing, referrals, the sign on your van.',
      },
      {
        id: 'convince',
        title: 'Convince them you are worth contacting',
        body: 'Clarity, proof of the work, and a site that behaves like a real business runs it.',
      },
      {
        id: 'contact',
        title: 'Make getting in touch easy',
        body: 'One tap to call, or a quote request that takes a minute to fill in.',
      },
    ],
    note: 'Our job is to make every one of those steps as strong as it can be. Not to promise you what happens after somebody picks up the phone.',
  },
} as const;

/* ------------------------------------------------------------------ demonstrations */

export const demos = {
  eyebrow: 'See the difference',
  heading: 'Small website problems cost you customers.',
  lede: 'Four things we find on almost every service-business website. Switch between before and after.',

  /** Rendered on every panel. These are not customers and must never look like them. */
  disclaimer: 'Illustrative example',
  beforeLabel: 'Before',
  afterLabel: 'After',

  items: [
    {
      id: 'clarity',
      title: 'A headline that could belong to anyone',
      problem:
        'The first screen says nothing specific. A visitor cannot tell what you do, where, or what to do next.',
      change: 'The headline names the service and the area, and there is one obvious action.',
      whyItMatters: 'Visitors can tell you are the right business without working for it.',
      before: {
        kind: 'mock',
        mock: {
          nav: ['Home', 'About', 'Services', 'Gallery', 'Contact'],
          headline: 'Quality Service You Can Trust',
          subline: 'Family owned and operated. Committed to excellence since day one.',
          cards: ['Residential', 'Commercial', 'Emergencies'],
          buriedPhone: 'Call us: (206) 555-0134',
        },
      },
      after: {
        kind: 'mock',
        mock: {
          nav: ['Services', 'Service area', 'Reviews'],
          headline: 'Heating and cooling repair in Greater Seattle',
          subline: 'Same-day appointments most weekdays. Licensed and insured.',
          callLabel: 'Call now',
          ctaLabel: 'Request service',
          cards: ['Furnace repair', 'AC install', 'Heat pumps'],
          trust: ['Licensed', 'Insured', '24/7 emergencies'],
        },
      },
    },
    {
      id: 'mobile',
      title: 'A phone number nobody can find on a phone',
      problem:
        'Text too small to read in daylight, a menu that needs two taps, and the number in the footer.',
      change:
        'Readable type, the number as a button in the header, the services above everything else.',
      whyItMatters: 'Somebody standing in a driveway can act without fighting the website.',
      before: {
        kind: 'mock',
        mock: {
          nav: ['Home', 'About us', 'Our services', 'Testimonials', 'Blog', 'Contact'],
          headline: 'Welcome to our website',
          subline:
            'We offer a comprehensive range of solutions tailored to meet the needs of every client, delivered with the professionalism you deserve.',
          cards: ['Learn more', 'Our story', 'Latest news'],
          buriedPhone: 'Tel: (206) 555-0134',
          cramped: true,
        },
      },
      after: {
        kind: 'mock',
        mock: {
          nav: ['Services', 'Areas'],
          headline: 'Emergency plumber, Greater Seattle',
          subline: 'Burst pipe or blocked drain? Call and speak to a plumber.',
          callLabel: '(206) 555-0134',
          ctaLabel: 'Request a quote',
          cards: ['Emergency callout', 'Drains', 'Water heaters'],
        },
      },
    },
    {
      id: 'speed',
      title: 'A page that makes people wait',
      problem:
        'Oversized images and a slow host: the useful part arrives last, and the layout jumps while it does.',
      change:
        'A light page — headline, number and services there immediately, nothing moving under your thumb.',
      whyItMatters: 'A visitor who never sees the page cannot decide to call you.',
      note: 'Google publishes targets for this: content visible within 2.5 seconds, response to a tap under 200 milliseconds, almost no layout shift. Google is also explicit that good scores do not buy a ranking.',
      before: {
        kind: 'mock',
        mock: {
          nav: ['Home', 'About', 'Services', 'Contact'],
          headline: '',
          loading: true,
        },
      },
      after: {
        kind: 'mock',
        mock: {
          nav: ['Services', 'Service area'],
          headline: 'Roof repair and replacement in Greater Seattle',
          subline: 'Free inspection. Licensed, bonded and insured.',
          callLabel: 'Call now',
          ctaLabel: 'Book an inspection',
          cards: ['Leak repair', 'Full replacement', 'Storm damage'],
        },
      },
    },
    {
      id: 'path',
      title: 'A route that leads nowhere in particular',
      problem: 'Every page is a destination and none of them asks for anything.',
      change:
        'A service page that follows the order a customer decides in, and ends where they were going anyway.',
      whyItMatters: 'The visitor is guided to the next decision instead of handed a menu.',
      before: {
        kind: 'path',
        steps: ['Home', 'About us', 'Services', 'Contact form', '…maybe'],
      },
      after: {
        kind: 'path',
        steps: [
          'The problem they have',
          'The service that fixes it',
          'Proof you have done it before',
          'What happens after they call',
          'Call or request a quote',
        ],
      },
    },
  ] satisfies readonly DemoExample[],

  /*
   * The bridge from the mocks above to the demonstration sites.
   *
   * Every "after" panel is a deliberately abstract wireframe, and the honest answer to
   * "does the finished version exist" is yes, five times, one route away. The copy makes
   * the same disclosure the portfolio cards do — these are demonstrations, not clients —
   * and the phone screenshot beside it is captured from this repository's own build by
   * `scripts/capture-previews.ts`.
   */
  finished: {
    heading: 'The “after” is not hypothetical',
    lede: 'Five demonstration sites, one for each trade — real pages you can open, scroll and tap around.',
    note: 'Emerald Line Plumbing, a fictional business. On a phone, the call button stays on screen the whole way down.',
    cta: 'See the five examples',
  },
} as const;

/*
 * The design half of the same argument, kept short on purpose.
 *
 * "Premium UI/UX" means nothing to somebody buying a website. Each decision paired with
 * the job it does means something to everybody.
 */
export const designDecisions = {
  heading: 'Every design decision has a job',
  lede: 'Good design is not decoration. It is the difference between a customer deciding and a customer leaving.',

  items: [
    { id: 'hierarchy', decision: 'Clear hierarchy', job: 'Visitors know where to look first.' },
    {
      id: 'typography',
      decision: 'Readable typography',
      job: 'The important information is easy to scan.',
    },
    {
      id: 'cta',
      decision: 'Calls to action where the decision happens',
      job: 'Interested visitors know what to do next.',
    },
    {
      id: 'mobile',
      decision: 'Mobile-first layout',
      job: 'The website is comfortable to use from a phone in a driveway.',
    },
    { id: 'speed', decision: 'Fast loading', job: 'Less waiting and less friction.' },
    {
      id: 'navigation',
      decision: 'Simple navigation',
      job: 'People find the page they came for faster.',
    },
    {
      id: 'proof',
      decision: 'Trust signals near the claims',
      job: 'Customers have evidence at the moment they need it.',
    },
  ],
} as const;

/* ------------------------------------------------------------------ what you are buying */

export const whatYoureBuying = {
  eyebrow: 'What this actually is',
  heading: "You're not buying a website.",
  lede: 'You are buying a system built to help more of the right people discover your business, understand what you offer, trust you enough to take the next step, and get in touch without effort.',

  parts: [
    { id: 'website', name: 'The website', role: 'The asset itself.', icon: 'layout' },
    {
      id: 'conversion',
      name: 'A conversion path',
      role: 'The route from visitor to phone call.',
      icon: 'target',
    },
    {
      id: 'search',
      name: 'A local-search foundation',
      role: 'The groundwork for being found nearby.',
      icon: 'map-pin',
    },
    /*
     * These two used to read "Maintenance" and "Optimisation" — the words an agency uses
     * on an invoice. Neither says what the owner gets, and the first one in particular
     * quietly reframes the recurring service as a care plan, which is the thing this
     * whole page exists to argue it is not.
     */
    {
      id: 'looked-after',
      name: 'Somebody looking after it',
      role: 'All of it kept working, current and secure without you asking — Growth Partner, if you choose it.',
      icon: 'shield',
    },
    {
      id: 'improvement',
      name: 'Continuous improvement',
      role: 'Making it better at its job than it was at launch — the other half of Growth Partner.',
      icon: 'bolt',
    },
  ],

  result: 'A website that keeps working for your business.',
} as const;

/* ------------------------------------------------------------------ credibility */

/*
 * The most persuasive thing on the page, and it is a list of limitations.
 *
 * A business owner who has been promised page one by somebody else recognises this
 * immediately. Do not soften it, and do not move anything from the right column to the
 * left one without being able to defend it.
 */
export const control = {
  heading: 'What we control, and what we do not',
  lede: 'Every promise on this page is on the left. Nothing on the right is anybody’s to sell you.',

  canControl: [
    'The quality of the website',
    'How clearly it explains your business',
    'How it behaves on a phone',
    'How fast it loads',
    'How easy it is to contact you',
    'The local-search foundation',
    'How your services are presented',
    'That it keeps working after launch',
    'That it keeps improving',
  ],

  cannotControl: [
    "Google's algorithm",
    'How many people search for your trade',
    'What your competitors do',
    'What you charge',
    'Whether a visitor is ready to buy',
    'Whether your phone gets answered',
    'The state of the market',
  ],

  closing:
    'Which is why there is no promise of rankings or customer numbers anywhere on this site.',
} as const;

/* ------------------------------------------------------------------ objection */

export const alreadyHaveAWebsite = {
  heading: 'But I already have a website.',
  lede: 'Good. Then the assessment is quick, and you get something useful out of it either way.',

  cases: [
    {
      id: 'working',
      condition: 'If it is already doing its job',
      response: 'You will hear that, and we will tell you which parts we would leave alone.',
    },
    {
      id: 'not-converting',
      condition: 'If it gets visitors but not calls',
      response: 'We will point at the places people are most likely giving up.',
    },
    {
      id: 'outdated',
      condition: 'If it is out of date',
      response: 'You get a specific list of what we would change first, in order.',
    },
    {
      id: 'unmanaged',
      condition: 'If you simply do not want to deal with it',
      response: 'That is exactly what Growth Partner exists for.',
    },
  ],
} as const;
