import { growthTier, hasFoundingDiscount } from '../config/pricing';
import { prices } from './offer';
import { site } from './site';
import type { AudienceTrade, ValueProposition } from '../types/content';

/*
 * Homepage copy that is not part of the offer itself.
 *
 * Everything describing what is sold — the ten components, the ongoing service, the
 * price structure, the guarantee — lives in `content/offer.ts`. This file holds the
 * hero, who the work is for, what the finished thing does for the business, and the
 * closing call to action.
 *
 * Nothing here claims a result, a statistic, a customer or a length of experience.
 */

export const hero = {
  eyebrow: 'Managed websites for local service businesses',
  heading: 'Turn your website into your best salesperson.',
  subheading:
    'I build and manage websites for HVAC, plumbing, electrical, roofing, landscaping and other service businesses around Greater Seattle — so more of the people who find you online end up calling you.',

  /** The one-line differentiator, shown directly under the hero copy. */
  differentiator:
    'One person builds it. The same person maintains it. The same person keeps improving it.',

  /*
   * The price, on the first screen.
   *
   * Unusual for this kind of site, and deliberate: a visitor who cannot find a number
   * assumes the answer is "more than I can afford" and leaves without asking. Putting it
   * here disqualifies nobody who was ever going to buy, and it removes the single largest
   * reason a reader stops reading. Interpolated from `content/offer.ts` so it can never
   * drift from the pricing cards.
   */
  priceLine: {
    launch: 'to build and launch it',
    /*
     * Both figures, not either.
     *
     * A vertical rule used to sit here. Two large brand-coloured numbers separated by a
     * line is how a reader arrives at "$2,500 *or* $299 a month" in the five seconds they
     * give a first screen — and that reading makes the cheaper number look like the whole
     * price, which is the version they feel misled about later.
     */
    join: 'plus',
    management: 'to look after it and keep improving it',
    /*
     * The condition travels with the number.
     *
     * The figure on the first screen is the founding-client price, and the explanation of
     * what that means was eight sections further down. A conditional price published as if
     * it were the price is the same defect as a former-price claim, arrived at from the
     * other direction: the reader forms a belief about what this costs before being told
     * what makes it cost that.
     *
     * Interpolating the standard price here rather than restating it keeps the two figures
     * incapable of disagreeing — and the sentence disappears on its own if the founding
     * offer is ever switched off, because it is generated from the same config.
     */
    note: hasFoundingDiscount(growthTier)
      ? `Founding-client pricing, on a limited number of projects documented as case studies. Standard project price is ${prices.launchStandard}. The ongoing plan is optional and starts after launch.`
      : 'The ongoing plan is optional and starts after launch, never before.',
  },

  /*
   * Reassurance on the first screen, for a visitor deciding whether to fill anything in.
   *
   * There are no customers yet, so there is no testimonial and no count of businesses
   * served — inventing either is the one thing that would actually cost this business
   * the trust it is trying to build. Every line below is instead a fact about how the
   * work is done, and every one of them is stated somewhere else on the site too.
   */
  trustPoints: [
    'One person, start to finish',
    'Domain, hosting and content in your name',
    // Interpolated for the reason in `offer.ts` → `launch.steps[0]`: the free diagnostic
    // has one name, and this is the first screen a visitor reads it on.
    `${site.offer.freeReview.name} before anything is quoted`,
  ],

  phonePrompt: 'Prefer to talk it through?',
} as const;

/*
 * The trades, as chips on the homepage.
 *
 * Five of the eight now have a page of their own, and those five are links — which is
 * both the homepage's only piece of personalisation and the main internal route into the
 * industry pages. The other three do not, and they are not second-class: most of the
 * businesses this is built for are not in the five named trades, which is why `note`
 * exists and why `config/trades.ts` treats "something else" as a real answer.
 *
 * `slug` is optional rather than a separate list so the chips stay in one order that a
 * reader can scan, instead of splitting into "the ones we wrote pages for" and "the rest".
 * A test asserts every slug present here resolves to a real industry page.
 */
export const audience = {
  heading: 'Built for the trades',
  body: 'The work is the same shape whatever the trade: make it obvious what you do, where you work, and how to reach you — then keep it that way. Five of these have a page of their own, going through how that trade actually gets hired.',
  industries: [
    { label: 'HVAC', slug: 'hvac' },
    { label: 'Plumbing', slug: 'plumbing' },
    { label: 'Electrical', slug: 'electrical' },
    { label: 'Roofing', slug: 'roofing' },
    { label: 'Landscaping', slug: 'landscaping' },
    { label: 'Painting' },
    { label: 'Cleaning' },
    { label: 'General contracting' },
  ] satisfies readonly AudienceTrade[],
  note: 'Not on the list? If customers find you locally and call you to book, the approach still applies.',
} as const;

/**
 * What the finished website does for the business.
 *
 * Outcomes, not features: each one is written as something the owner would notice,
 * rather than as something that appears on an invoice.
 */
export const outcomes: readonly ValueProposition[] = [
  {
    id: 'call',
    title: 'Effortless to call',
    description:
      'Your number is in the header on every page and dials with one tap. No hunting, no typing it out.',
    icon: 'phone',
  },
  {
    id: 'answers',
    title: 'Answers the deciding questions',
    description:
      'What you do, which towns you cover, how you charge, and what happens after they get in touch.',
    icon: 'check',
  },
  {
    id: 'fast',
    title: 'Fast on a phone',
    description:
      'Built light so it opens quickly on a phone in a driveway, not just on office wi-fi.',
    icon: 'bolt',
  },
  {
    id: 'inquiries',
    title: 'Turns interest into a request',
    description:
      'A short form that asks only what you need to quote, and that lands in your inbox straight away.',
    icon: 'inbox',
  },
  {
    id: 'trust',
    title: 'Looks like the safe choice',
    description:
      'Consistent, current and professional, so a stranger has a reason to pick you over the next result.',
    icon: 'shield',
  },
  {
    id: 'current',
    title: 'Never goes stale',
    description:
      'New services, new photos and new reviews go up when they happen — because keeping it current is my job, not another thing on your list.',
    icon: 'wrench',
  },
];

export const finalCta = {
  heading: "Let's find out what your website is costing you.",
  body: 'Send me your website and I will show you the biggest opportunities I see — in what it says, how it converts, and how easy you are to find. If it turns out a website is not what is holding you back, I will tell you that instead.',
} as const;
