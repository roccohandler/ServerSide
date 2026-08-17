import type { CareCategory, ProcessStep } from '../types/content';

/*
 * ============================================================================
 * THE RECURRING SERVICE — WHAT THE MONTHLY FEE ACTUALLY BUYS
 * ============================================================================
 *
 * `content/offer.ts` describes the system. This file describes the half of it that
 * never finishes: testing, seasonal work, campaign alignment, and the support terms
 * behind them.
 *
 * The rules that matter here are about restraint, because this is the part of an offer
 * that is easiest to oversell:
 *
 *   1. Testing is a tool, not a promise. A local plumber may never have the traffic for
 *      a meaningful controlled experiment, and saying "we constantly A/B test your site"
 *      to that business is a lie with a straight face. The eligibility rule is part of
 *      the offer, not fine print.
 *   2. No result is promised. Not a conversion rate, not a lift, not a ranking.
 *   3. Commercial terms are not invented. The response guarantee is modelled in full and
 *      switched off, because a promise about response times is a promise somebody has to
 *      keep at 6pm on a Friday — and only the owner can agree to that.
 * ============================================================================
 */

/* ------------------------------------------------------------------ why monthly */

export const whyMonthly = {
  eyebrow: 'The recurring part',
  heading: 'Why Growth Partner is monthly',
  body: [
    'Because you cannot find out whether a website is working by looking at it once. The number it produces moves with the season, with what you are advertising, with what your competitors put up last week — so a single reading tells you almost nothing, and a reading every month tells you what to do next.',
    'And because the things a website has to keep up with are all moving anyway. Your services change. Your prices change. What customers want in February is not what they want in July. A website launched today can be six months out of date without anybody touching it.',
  ],
  closing:
    'The monthly fee is not paying to keep the same website alive — plenty of companies will do that for a fraction of it. It is paying for somebody to measure what the site produces, tell you, and act on it.',
} as const;

/* ------------------------------------------------------------------ what changes */

/*
 * The comparison that separates this from a commodity maintenance plan. The left column
 * is what most "website care" plans actually are, described fairly — overstating what
 * other people sell would undermine the honest column on the right.
 */
export const notJustMaintenance = {
  /*
   * The heading used to be "This is not a maintenance plan".
   *
   * It was true and it lost the argument in its own first four words: a headline that names
   * the thing it is denying hands the reader that frame to think in, and denial is the
   * weakest position from which to describe a product. The comparison underneath draws the
   * distinction far better than a sentence about it can — so the heading now states what is
   * actually different, and the left-hand column carries the contrast.
   *
   * The word "maintenance" is still in the lede and the left column label, both of which
   * satisfy the guard in `content.test.ts` that requires it to appear only where the copy is
   * explicitly drawing this contrast.
   */
  heading: 'The difference is that somebody is watching the number',
  lede: 'Maintenance keeps a website alive. That is worth having, and it is the floor rather than the offer — the fee is for the two rows nobody else is doing.',

  maintenance: {
    label: 'Ordinary website maintenance',
    items: ['Fix what breaks', 'Apply software updates', 'Keep it online', 'Take backups'],
  },

  managed: {
    /*
     * "With Growth Partner", not just the product's name.
     *
     * These two column labels render as headings, and `CarePlans` already heads its own card
     * with exactly `growthPartner.name` — so on `/services`, where both now render, the page
     * had two headings called "Growth Partner" and no way for anybody navigating by heading to
     * tell them apart. Prefixing it reads better as a column header anyway.
     */
    label: 'With Growth Partner',
    items: [
      'The enquiry number measured, and reported to you every month',
      'What changed, and why it was changed',
      'Improvements chosen from what the measurement showed',
      'Conversion opportunities tested where the traffic supports it',
      'Seasonal services brought forward when they matter',
      'Messaging aligned with the marketing you are running',
      'All of the left-hand column too, without you asking',
      'One person to ask when you need something',
    ],
  },
} as const;

/* ------------------------------------------------------------------ the month */

export const monthlyLifecycle = {
  eyebrow: 'Month to month',
  heading: 'What actually happens each month',
  lede: 'Not all of it every month — a quiet month is a quiet month, and inventing work to fill an invoice is how these arrangements go bad. What the monthly service buys is the standing opportunity to do any of it when it is worth doing.',

  steps: [
    {
      id: 'maintain',
      title: 'Maintain',
      description: 'Hosting, certificates, backups, updates and fixes. The floor, handled.',
    },
    {
      id: 'review',
      title: 'Review',
      description: 'A look at what the website is doing and where it is losing people.',
    },
    {
      id: 'align',
      title: 'Align',
      description: 'Website messaging brought in line with whatever you are promoting.',
    },
    {
      id: 'test',
      title: 'Test',
      description: 'Where there is enough traffic to learn something, a real comparison.',
    },
    {
      id: 'refresh',
      title: 'Refresh',
      description: 'Seasonal services, new photos, current offers, new reviews.',
    },
    {
      id: 'improve',
      title: 'Improve',
      description: 'The changes worth making get made, and then it starts again.',
    },
  ] satisfies readonly ProcessStep[],

  loopLabel: 'and round again',
} as const;

/* ------------------------------------------------------------------ testing */

/*
 * The eligibility rule is stated on the page rather than hidden in a contract. A local
 * business with forty visitors a week cannot run a meaningful controlled experiment, and
 * a provider who claims otherwise is either selling noise or not measuring anything.
 */
export const abTesting = {
  enabled: true,
  eyebrow: 'Testing',
  heading: 'The first version is not assumed to be the best version',
  lede: 'When there is enough traffic and a question worth answering, two versions go live and the visitors decide. When there is not, the honest answer is that a test would only be measuring noise — so the work is a considered improvement instead, and it is called that.',

  /** What has to be true before a test is worth running. Shown, not buried. */
  eligibility: [
    'Enough visitors for a difference to mean something',
    'A specific question, not a general urge to change something',
    'A visitor action that can actually be counted',
    'Enough time to let the result settle',
  ],

  /*
   * One test at a time. Running three at once on a local business's traffic does not
   * produce three answers — it produces one unreadable result, because every visitor is
   * simultaneously in all three and nothing can be attributed to anything.
   */
  cadence: {
    label: 'One at a time',
    detail:
      'One active experiment on your site at a time. Two overlapping tests on local traffic do not give you two answers; they give you one you cannot read.',
  },

  /*
   * The honest alternative, said out loud. Most local service businesses will spend most
   * months here, and pretending otherwise is the specific lie this section exists to
   * avoid telling.
   */
  belowThreshold: {
    heading: 'When there is not enough traffic',
    body: 'Most local service businesses will not have the visitor numbers for a statistically useful test in a given month, and we would rather say so than run one and present noise as a finding. In those months the work is evidence-based improvement instead: what the analytics show people doing, where they stop, known usability principles, page speed, and what the phone is telling you.',
    note: 'It gets called what it is. An improvement made on judgement is an improvement made on judgement, not a test result.',
  },

  /** Kept in plain language: these are things an owner recognises on their own site. */
  testTypes: [
    'Headlines',
    'Calls to action',
    'Button wording and placement',
    'Form length and layout',
    'How an offer is presented',
    'Service page structure',
    'The order of sections',
    'Trust signals and proof',
  ],

  /** The four beats of an experiment, explained the way it would be explained on a call. */
  method: [
    {
      id: 'hypothesis',
      title: 'A question worth asking',
      body: '“Would asking for a project estimate instead of a quote get more people to start the form?”',
    },
    {
      id: 'variants',
      title: 'Two versions, live at once',
      body: 'Half the visitors see one, half see the other. Nothing else changes.',
    },
    {
      id: 'measure',
      title: 'One action, counted',
      body: 'Calls, form starts, form submissions — whichever one actually matters for that page.',
    },
    {
      id: 'learn',
      title: 'A decision made on evidence',
      body: 'The version that did better stays. Either way the next question is better informed.',
    },
  ],

  /** An illustrative comparison, not a case study. No result is attached to it. */
  example: {
    label: 'Illustrative example',
    question: 'Does naming the job get more people to start the form?',
    variantALabel: 'Version A',
    variantA: 'Get a free estimate',
    variantBLabel: 'Version B',
    variantB: 'Request your free project estimate',
    measured: 'Form starts and completed quote requests',
    note: 'Which one wins is not something anybody can tell you in advance, and that is the entire point of running it. No result is claimed here because no test has been run here.',
  },

  caveat:
    'No promise of a lift, and no promise that every test produces a winner. Most tests confirm that something did not matter, which is still cheaper than redesigning on a hunch.',
} as const;

/* ------------------------------------------------------------------ seasonal */

export const seasonal = {
  enabled: true,
  eyebrow: 'Seasonal',
  heading: 'Your website should not look frozen in January',
  lede: 'What your customers need in February is not what they need in July, and the website should be leading with whichever one is true today. Which services move to the front is your call — putting them there is ours.',

  /** The published quantity. Roughly one a quarter, timed to your trade rather than the calendar. */
  included: {
    count: 'Four a year',
    detail:
      'Roughly one a quarter, timed to when your work actually changes rather than to the calendar. A roofer’s year and a landscaper’s year turn at different points.',
  },

  /*
   * Trade-specific examples. Only ever shown against a trade the business actually works
   * with, and written as things a real service business genuinely leads with.
   */
  seasons: [
    {
      id: 'spring',
      name: 'Spring',
      examples: [
        'System tune-ups before the season',
        'Clean-ups and yard work',
        'Remodel enquiries',
      ],
    },
    {
      id: 'summer',
      name: 'Summer',
      examples: ['Cooling and AC repair', 'Outdoor and exterior work', 'Emergency callouts'],
    },
    {
      id: 'autumn',
      name: 'Autumn',
      examples: [
        'Heating checks before the cold',
        'Gutters and weatherproofing',
        'Roof inspections',
      ],
    },
    {
      id: 'winter',
      name: 'Winter',
      examples: ['Emergency heating and burst pipes', 'Storm damage', 'Off-season booking offers'],
    },
  ],

  note: 'A refresh is the current service moved to the front, the messaging that goes with it, and the call to action that matches. Not a redesign, and not four redesigns a year.',
} as const;

/* ------------------------------------------------------------------ campaigns */

export const campaignAlignment = {
  enabled: true,
  eyebrow: 'Campaigns',
  heading: 'Your website should work with your marketing, not against it',
  lede: 'An advert makes a promise. The page it lands on should carry on the same conversation — same offer, same words, same next step. When it does not, you have paid for the click and lost the customer on arrival.',

  /** The chain the section demonstrates, from the click to the enquiry. */
  flow: [
    'You run an advert',
    'It promises something specific',
    'The page keeps that promise',
    'The next step is obvious',
    'The enquiry arrives',
  ],

  /** What this actually covers, and — just as important — what it does not. */
  includes: [
    'A read of what your campaign is promising',
    'Headlines and supporting copy brought in line with it',
    'Calls to action worded the way the advert worded them',
    'Campaign-specific landing pages where they are worth having',
    'The same offer and terminology from click to enquiry',
  ],

  /*
   * The published quantities. Stated rather than left as "where they are worth having",
   * because an unbounded promise is one somebody eventually tries to cash — and because a
   * buyer comparing providers cannot compare a feeling.
   */
  included: {
    heading: 'What is included each month',
    items: [
      {
        id: 'landing',
        value: 'Up to 1',
        label: 'campaign landing page a month',
        detail:
          'A page built for one campaign, saying what that campaign promised. Unused months do not stack up.',
      },
      {
        id: 'alignment',
        value: 'Up to 2',
        label: 'campaign copy alignments a month',
        detail:
          'Existing pages reworded to match what you are currently running — the offer, the terminology, the call to action.',
      },
    ],
    note: 'More than that in a busy month is quoted before it is built, not added to your bill afterwards.',
  },

  boundary:
    'This is website work, not advertising management. We do not run your ads, set your budgets or manage your bidding — we make the page they land on live up to what they promised.',

  steps: [
    {
      id: 'review',
      title: 'Review the message',
      description: 'What is the advert actually promising?',
    },
    {
      id: 'align',
      title: 'Align the landing experience',
      description: 'Same words, same offer, same call to action.',
    },
    {
      id: 'remove',
      title: 'Remove the friction',
      description: 'Nothing between arriving and getting in touch.',
    },
    {
      id: 'measure',
      title: 'Measure the response',
      description: 'What the page did with the traffic you paid for.',
    },
  ] satisfies readonly ProcessStep[],

  /*
   * The demonstration. An advert, then the two pages it could land on.
   *
   * Illustrative: there is no such plumbing company, no campaign was run, and no result
   * is claimed. What is being shown is the mismatch itself, which is recognisable to
   * anybody who has ever paid for a click.
   */
  example: {
    label: 'Illustrative example',
    adLabel: 'The advert somebody clicks',
    ad: {
      source: 'Search advert',
      headline: '24/7 emergency plumber — Seattle',
      body: 'Burst pipe or blocked drain? A plumber answers, day or night. Call now.',
    },
    mismatchLabel: 'Where the click usually lands',
    mismatch: {
      nav: ['Home', 'About us', 'Our services', 'Testimonials', 'Blog', 'Contact'],
      headline: 'Welcome to Smith Plumbing',
      subline:
        'A family business serving the community for years, committed to quality workmanship and customer satisfaction.',
      cards: ['About us', 'Our story', 'Careers'],
      buriedPhone: 'Contact: (206) 555-0134',
    },
    alignedLabel: 'Where it should land',
    aligned: {
      nav: ['Emergency', 'Service area'],
      headline: '24/7 emergency plumbing in Seattle',
      subline: 'A plumber answers day or night. Most emergency calls seen the same day.',
      callLabel: 'Call now',
      ctaLabel: 'Request a callout',
      cards: ['Burst pipes', 'Blocked drains', 'No hot water'],
      trust: ['Licensed', 'Insured', 'Answers at night'],
    },
    note: 'Same promise, same words, same next step. The visitor never has to work out whether they are in the right place — which is the only thing the click was bought for.',
  },
} as const;

/* ------------------------------------------------------------------ management groups */

/*
 * ============================================================================
 * THE SIX THINGS THE MONTHLY SERVICE COVERS — AND WHY THIS ORDER
 * ============================================================================
 *
 * The ids are unchanged and a test pins all six, because they are what the rest of the
 * content layer refers to. The **order** has been inverted, and that is the substantive
 * change: this grid used to run working → current → aligned → improving → learning →
 * supported, which is to say it opened on hosting and buried measurement at position five.
 *
 * A reader scanning six card headings and stopping at the second one came away believing
 * they were being sold upkeep. They were reading it correctly — the page was ordered that
 * way — while a section further down was headed "This is not a maintenance plan".
 *
 * It now runs **know → improve → current → aligned → running → supported**. Nothing was
 * added or removed: the same work, in the order that says what it is for. `working` is
 * fifth and its summary now says out loud that it is the floor, which is a stronger claim
 * than pretending it is the headline.
 * ============================================================================
 */
export const managementCategories = [
  {
    id: 'learning',
    /*
     * Retitled from "Keep learning". The old title described our activity; this one names
     * what the client gets, which is the only version that justifies a fee. The id stays
     * `learning` because five other places reference it and a rename buys nothing.
     */
    title: 'Know what it is doing',
    summary:
      'The one number the website is responsible for, measured and explained every month — not an impression, and not a dashboard nobody opens.',
    items: [
      'Calls and quote requests counted as real events',
      'The Website Performance Report, every month, in plain English',
      'Measured against the baseline recorded at launch',
      'Conversion tests where the traffic supports them, and considered improvements — called that — where it does not',
    ],
    icon: 'target',
  },
  {
    id: 'improving',
    title: 'Make it work harder',
    summary:
      'The work that comes out of the measurement, on the parts that decide whether somebody gets in touch.',
    items: [
      'Improvements to the pages that bring in the most work',
      'Calls to action refined where the numbers point',
      'User-experience fixes',
      'Speed and mobile experience monitored',
    ],
    icon: 'bolt',
  },
  {
    id: 'current',
    title: 'Keep it current',
    summary: 'Your business changes through the year. The website should change with it.',
    items: [
      'Business details, hours and service-area updates',
      'New services added, old ones retired',
      'Fresh photos of finished jobs',
      'Seasonal services brought to the front when they matter',
      'Reviews and testimonials added as you collect them',
    ],
    icon: 'wrench',
  },
  {
    id: 'aligned',
    title: 'Keep it aligned',
    summary: 'What the website says should match whatever you are currently promoting.',
    items: [
      'Campaign messaging read and matched',
      'Headlines and calls to action updated to suit',
      'Landing pages for campaigns worth having one',
      'The same offer from advert to enquiry',
    ],
    icon: 'target',
  },
  {
    id: 'working',
    /*
     * Not "Keep it running" — `systemComponents` already has a step titled exactly that, and
     * two headings with the same accessible name on one page is a page a screen-reader user
     * cannot navigate by heading. The services test caught it, which is what that test is for.
     */
    title: 'Kept running in the background',
    /*
     * The summary says "the floor" on purpose. Plenty of companies will keep a website
     * online for a fraction of this fee, and a page that presented upkeep as the headline
     * value would be inviting exactly that comparison. Naming it as the floor is both true
     * and the thing that makes the two categories above it the answer.
     */
    summary:
      'The floor. Worth having, never the reason to pay for this, and something you should never have to think about.',
    items: [
      'Hosting and certificates managed on accounts in your name',
      'Backups taken and checked',
      'Security and software updates applied',
      'Uptime and form delivery monitored',
      'Bugs fixed when they appear',
    ],
    icon: 'shield',
  },
  {
    id: 'supported',
    title: 'Keep you supported',
    summary: 'One person who knows your website, and answers when you need something.',
    items: [
      'Send a message rather than raising a ticket',
      'No account manager in between',
      'Changes made by the person who built it',
      'Larger work quoted before it starts',
    ],
    icon: 'phone',
  },
] satisfies readonly CareCategory[];

/* ------------------------------------------------------------------ response guarantee */

/*
 * ============================================================================
 * RESPONSE GUARANTEE — LIVE
 * ============================================================================
 *
 * `enabled: true`. This is a commercial term with money attached, agreed by the owner and
 * written into the client agreement. Everything below has to match that agreement; if the
 * agreement changes, this changes with it, and `docs/business-offer.md` records both.
 *
 * Three things must never change without a deliberate decision:
 *
 *   1. It promises a *response*, never a resolution. "I have looked at it, here is what
 *      happens next and when" is keepable at any hour. "It will be fixed" is an SLA on
 *      somebody else's hosting company, and nobody can honour that.
 *   2. The window is business hours, defined by `site.contact.hours`. Widening those hours
 *      widens this commitment — the copy is generated from them.
 *   3. The remedy is automatic. The client never has to notice, chase or invoke it. A
 *      guarantee somebody has to argue for is a technicality wearing a guarantee's coat.
 *
 * `content.test.ts` asserts the response/resolution distinction survives, that no `24/7`
 * claim creeps in beside a business-hours window, and that the remedy is a real string.
 * ============================================================================
 */
export const responseGuarantee = {
  enabled: true,

  /** Numeric so the copy can be generated from it rather than repeated by hand. */
  responseWindow: 24,
  unit: 'business hours',
  businessHoursOnly: true,

  eyebrow: 'Risk reversal',
  heading: 'A reply within 24 business hours, or that month is on us.',
  lede: 'The usual complaint about the person who built your website is not bad work. It is that they stopped answering.',

  /** What is promised. Deliberately about the reply, not about the fix. */
  promise:
    'A real reply to anything covered by your active management service: what it is, what happens next, and when.',

  /** The distinction the whole term depends on. Never remove this line. */
  distinction:
    'That is a response, not a resolution — some things are fixed in ten minutes and some wait on a hosting company. What is promised is that you are never left wondering whether anybody saw it.',

  /** The remedy, in the customer's words. Automatic — they never have to ask. */
  remedy:
    'If we miss it, that month’s fee is waived in full. We apply it ourselves — you do not have to notice, chase it or ask.',

  /** What actually counts as a reply, so nobody has to litigate the word. */
  qualifyingResponse: {
    heading: 'What counts as a response',
    items: [
      'We have seen it and said so',
      'An answer, a next step, or what we need from you to get one',
      'From a person, not an automated acknowledgement',
    ],
    note: 'Completing the work is not the promise. Telling you where it stands is.',
  },

  /*
   * Only two channels qualify, and both are things I actually watch. Adding social
   * messages or texts to this list would mean guaranteeing a window on a channel that
   * can silently fail to notify — which is how a guarantee becomes a liability.
   */
  channelsHeading: 'Through these channels',
  channels: ['The support form on your website'],
  /**
   * Rendered with the real address from `site.contact.supportEmail` appended, rather
   * than described as "the address on this site". A client raising something under a
   * guarantee should never have to work out which of the business's addresses counts.
   */
  emailChannelLabel: 'Email to',
  channelsNote:
    'Call any time as well — usually faster — but the guarantee is measured on the channels that leave a timestamp.',

  /** The covered week, in customer-facing words. Generated from `site.contact.hours`. */
  windowHeading: 'When the clock runs',
  windowNote:
    'Monday to Friday, 8am–6pm Pacific. Weekends and US federal holidays pause the clock rather than count against it.',

  /*
   * §17: the disclosure that makes the guarantee credible instead of weakening it. A
   * reader who has been promised leads by three other providers recognises this as the
   * only honest paragraph they have read all week.
   */
  notGuaranteed: {
    heading: 'What this does not guarantee',
    body: 'A promise about responsiveness — not about leads, rankings, sales, traffic, revenue, or any particular problem being solved within 24 hours. Nobody can guarantee those.',
  },

  /*
   * The exclusions, agreed and now published in summary. The full wording lives in the
   * client agreement; what is on the page is the plain-English version of the same thing,
   * because a term a customer only discovers when they try to use it is worse than none.
   */
  exclusionsHeading: 'The exclusions, plainly',
  exclusions: [
    'Requests sent somewhere other than the two channels above',
    'Weekends and US federal holidays, which pause the clock',
    'Outages at a hosting provider, registrar or other third party',
    'Systems you control that we do not have access to',
    'Time spent waiting on information or approval from you',
    'Work outside the agreed scope of the management service',
    'Security incidents where a third party has to act first',
    'Duplicate or automated messages about something already raised',
    'Events outside either of our control',
  ],

  publicNote:
    'The contractual wording of all of it is in the written agreement. Ask to read it before you sign.',
} as const;
