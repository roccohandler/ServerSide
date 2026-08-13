import type { ReviewSampleSection, SiteMockSpec, TeardownFinding } from '../types/content';

/*
 * ============================================================================
 * THE TEARDOWN — A COMPOSITE, AND SAID SO IN THE FIRST SENTENCE
 * ============================================================================
 *
 * A teardown of a real, named local business would be the most persuasive page on this
 * site. It is also not going to exist here, and the reasons are worth writing down so
 * nobody adds one later without meeting them:
 *
 *   1. **It is somebody's livelihood used as a bad example** on a stranger's sales page,
 *      published without their knowledge, ranking for their business name.
 *   2. **Nothing about it is checkable by the reader.** A teardown of a site I picked is
 *      a teardown of a site I picked, and a sceptical owner knows that.
 *   3. **The alternative is worse.** A "real" teardown of a business invented for the
 *      purpose is fabricated content about a named third party, which is the single
 *      clearest line this project has drawn.
 *
 * So the subject below is a composite: a first screen assembled out of patterns that turn
 * up on a great many local service-business websites, none of them belonging to anybody in
 * particular. It carries no business name at all — the mock's brand mark is a blank
 * rectangle, which is both honest and, as it turns out, exactly how these sites read.
 *
 * The disclosure is the first thing on the page rather than a footnote, and
 * `content.test.ts` asserts it says the word "composite" and denies being a real business.
 *
 * ## The second half of the page
 *
 * `reviewSample` is the other thing this page exists for: showing what the free website
 * review actually looks like when it lands, so that agreeing to one is not agreeing to an
 * unknown. It is described as a shape — the sections, in order, and what each says — not
 * as a redacted client document, because there are no clients and "redacted" would imply
 * there were.
 * ============================================================================
 */

const before: SiteMockSpec = {
  nav: ['Home', 'Services', 'About', 'Gallery', 'Testimonials', 'Contact'],
  headline: 'Quality Service You Can Trust',
  subline: 'Family owned and operated since 1998. Satisfaction guaranteed on every job.',
  ctaLabel: 'Learn More',
  cards: ['Residential', 'Commercial', 'Repairs', 'Installation', 'Financing', 'Careers'],
  buriedPhone: 'Call us: in the footer',
  cramped: true,
};

const after: SiteMockSpec = {
  nav: ['Repairs', 'Install', 'Areas', 'Contact'],
  headline: 'Heating and cooling repair across Greater Seattle',
  subline:
    'Same-day calls where we can take them. Say what has gone wrong and we will tell you when we can be there.',
  callLabel: 'Call now',
  ctaLabel: 'Request a callback',
  cards: ['No heat', 'No cool air', 'Furnace replacement'],
  trust: ['Licensed and insured', 'Named technician', 'Serving 14 towns'],
};

export const teardown = {
  eyebrow: 'Teardown',
  heading: 'What is actually wrong with the average service-business website',
  lede: 'Six findings on one first screen, in the order of what they cost. Nothing here is subtle, and none of it is a matter of taste — each one is a specific thing a customer does when they hit it.',

  /*
   * The disclosure. First, prominent, and unambiguous. A composite presented as a real
   * site would be exactly the fabricated case study this site refuses to publish.
   */
  disclosure:
    'The site below is a composite. It is not a real business, it is not a client, and it is not any particular website — it is a first screen assembled out of the patterns that turn up again and again on local service-business sites. It carries no business name because using a real one would mean publishing criticism of somebody who never asked for it.',

  beforeLabel: 'Before — the composite, as it commonly arrives',
  afterLabel: 'After — the same business, rebuilt around the decision',
  beforeSpec: before,
  afterSpec: after,

  findingsHeading: 'Six findings, ordered by what they cost',
  findingsLede:
    'Ordered by cost rather than by position on the page. Each links to the improvement in the PlayBook that explains it in full, and to the check in the audit that scores it.',

  labels: {
    whatYouSee: 'What you see',
    whatItDoes: 'What it does to a customer',
    whatIdChange: 'What I would change',
    principle: 'The improvement this comes from',
  },

  findings: [
    {
      id: 'no-call-path',
      order: '01',
      title: 'The phone number is in the footer',
      whatYouSee:
        'A header with six navigation items and no phone number. The number appears once, at the bottom of the page, as plain text.',
      whatItDoes:
        'Somebody who has already decided to call has to scroll the entire page to find out how. This is the most expensive moment on any service-business website to lose somebody, because it is the only one where the visitor had already said yes.',
      whatIdChange:
        'A tap-to-call button in the header that stays on screen while they scroll, and a short form beside it for the people who would rather not talk yet.',
      principleId: 'cta',
    },
    {
      id: 'headline',
      order: '02',
      title: 'The headline says nothing about what the business does',
      whatYouSee:
        '"Quality Service You Can Trust." No trade, no place, no problem — a sentence that would fit a dentist, a locksmith or a courier without changing a word.',
      whatItDoes:
        'The visitor spends their first seconds working out what they are looking at instead of deciding about it. Some of them do not finish working it out.',
      whatIdChange:
        'The trade and the area, in the words the customer used to search. It is a worse slogan and a far better headline, and the two are not the same job.',
      principleId: 'clarity',
    },
    {
      id: 'no-area',
      order: '03',
      title: 'Nothing says where the business works',
      whatYouSee:
        'The service area is not on the first screen. It is on an About page, in a paragraph, listed as counties.',
      whatItDoes:
        'A customer who cannot tell whether you come out to them treats that as a no, because checking the next result costs them nothing and asking costs them a phone call.',
      whatIdChange:
        'The towns on the first screen of every page, named as towns rather than as a radius from an address nobody has memorised.',
      principleId: 'local-relevance',
    },
    {
      id: 'six-doors',
      order: '04',
      title: 'Six equal-weight options where there should be two',
      whatYouSee:
        'Residential, Commercial, Repairs, Installation, Financing and Careers, all the same size, all the same colour, all competing to be pressed.',
      whatItDoes:
        'Nothing pulls the eye, so the page gets scanned instead of read, and the visitor makes a decision about the business without having taken anything in.',
      whatIdChange:
        'One obvious primary action and one secondary. Careers is not a customer path and does not belong in the same row as a repair.',
      principleId: 'hierarchy',
    },
    {
      id: 'unverifiable-trust',
      order: '05',
      title: 'The trust signals are phrases every competitor also uses',
      whatYouSee:
        '"Family owned and operated." "Satisfaction guaranteed." No licence number, no named person, no photograph of anybody who works there.',
      whatItDoes:
        'A phrase everybody uses carries no information. The visitor deciding whether to let a stranger into their house finds nothing they can check, and picks whoever gave them something.',
      whatIdChange:
        'Anything verifiable, in place of anything reassuring: a licence number, who the work is insured with, a first name and a face.',
      principleId: 'trust',
    },
    {
      id: 'no-expectations',
      order: '06',
      title: 'Nothing says what happens if they get in touch',
      whatYouSee:
        'A "Learn More" button, and a contact form on another page with no explanation attached to it.',
      whatItDoes:
        'They hover, wonder who calls and when and whether it costs anything, and decide to think about it later. Later usually means somebody else.',
      whatIdChange:
        'Say what happens next in one line beside the button: who replies, how quickly, and whether the first conversation is chargeable.',
      principleId: 'expectations',
    },
  ] satisfies readonly TeardownFinding[],

  /*
   * The honest limit of the exercise, stated on the page. A composite proves the pattern
   * is common; it cannot prove anything about the reader's own site, and the whole point
   * of the free assessment is that somebody has to actually look.
   */
  limits: {
    heading: 'What a teardown like this cannot tell you',
    body: 'That any of it is true of your site. A composite shows that a pattern is common, not that you have it — and the six findings above are the common ones rather than the worst ones. The only way to know which of them applies to you is for somebody to open your site and look, which is the entire content of the free assessment below.',
  },

  /* ------------------------------------------------------------- the sample review */

  reviewSample: {
    heading: 'What the free assessment actually looks like',
    lede: 'Agreeing to a free assessment should not mean agreeing to something unspecified. This is the shape of what comes back — the sections, in order, and what each one contains.',

    /*
     * Labelled a sample rather than a redacted client document, because there are no
     * clients and "redacted" would imply there were. `content.test.ts` asserts the word
     * "illustrative" is present here.
     */
    disclaimer:
      'An illustrative outline of the document, not an extract from a real client review. It describes the sections you get and what goes in each one — the findings themselves are about your site, so nobody can write them in advance.',

    sections: [
      {
        id: 'summary',
        heading: 'The one-paragraph answer',
        body: 'What I think is actually costing you work, in plain language, at the top — including the answer "not much, and here is what I would spend the money on instead" where that is what I found.',
      },
      {
        id: 'phone',
        heading: 'What your site does on a phone',
        body: 'Opened on mobile data rather than on a fast connection, because that is the condition your customers are in. How long before anything is readable, whether the phone number is tappable, and what happens to the form.',
      },
      {
        id: 'first-screen',
        heading: 'The first screen, read as a stranger',
        body: 'Whether it is clear inside a few seconds what you do, where you work, and what to press. This is the section most owners disagree with first and agree with by the end.',
      },
      {
        id: 'contact',
        heading: 'Whether getting in touch actually works',
        body: 'The form gets submitted, so the answer is a fact rather than an assumption. A surprising number of them go nowhere, and nobody finds out until they wonder why the enquiries stopped.',
      },
      {
        id: 'priorities',
        heading: 'The two or three things I would do first',
        body: 'Ordered by what they are likely to be costing you, with the ones you can do yourself marked as such. Some of them are an afternoon and no money.',
      },
      {
        id: 'boundary',
        heading: 'What I would not bother with',
        body: 'The part that makes the rest worth reading. If your website is not the constraint — if the problem is that nobody is finding you at all, or that the phone is not being answered — that is what the assessment says.',
      },
    ] satisfies readonly ReviewSampleSection[],

    note: 'No obligation attached, and nothing about it is automated — it is a person opening your site and writing down what they find.',
  },

  /*
   * The link that points here from wherever the free assessment is offered lives in
   * `site.offer.freeReview` rather than in this file. Two strings are not worth pulling a
   * lazy route’s entire copy into the bundle every homepage visitor downloads, and they
   * sit more honestly beside the offer they qualify than beside the page they point at.
   */

  cta: {
    heading: 'Or find out about your own site instead of a composite',
    body: 'The audit runs the same twenty checks on your website, scored by you, with the five weakest explained in the same shape as the findings above. About five minutes, and no email address needed to see the result.',
  },
} as const;
