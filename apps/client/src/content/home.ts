import { hasFoundingDiscount } from '../config/pricing';
import { offerName, prices } from './offer';
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
  /*
   * ==========================================================================
   * THE EYEBROW IS THE CATEGORY. THE HEADLINE IS THE OUTCOME.
   * ==========================================================================
   *
   * "Digital growth systems for local service businesses" was here first — a category label
   * made of words a person who fixes furnaces does not use. It was replaced by "For local
   * service businesses in Greater Seattle", which fixed the vocabulary and lost the category:
   * it said who the page was for and never what the business *is*.
   *
   * That gap is the expensive one. Unbounce's five-second test found **only 6% of visitors
   * could correctly say what a business did** — 94% left confused — and this brand has a
   * specific reason to be in that 94%: a competitor with the same name sells field-service
   * software to the same trades. A first screen that says who it is for and not what it is
   * leaves the reader to guess, and the wrong guess is sitting right there.
   *
   * So the hierarchy is now the one the research asks for: **brand → category → outcome →
   * audience and mechanism → action.** The eyebrow carries the category, the headline stays
   * pure outcome, and Greater Seattle moves down to `trustPoints` — it qualifies the offer
   * rather than defining it, and the About page already says the work is done remotely.
   * ==========================================================================
   */
  eyebrow: 'Customer-conversion websites for local service businesses',
  /*
   * The subject of the sentence is the reader's customers, not the reader's website.
   *
   * The previous heading — "Your website should produce business, not just exist" — was
   * outcome-shaped and grammatically still about the artefact, which quietly conceded that
   * a website is the thing being sold. This one is about the people already trying to hire
   * them, which is the thing they actually care about and the only thing the offer can
   * legitimately claim to affect.
   */
  heading: 'More of the people already finding you should be calling you.',
  /*
   * Two sentences, and it used to be five.
   *
   * The long version listed what gets built, said the improvement was optional, and named
   * six trades — 62 words, six lines on a desktop screen, and roughly 110px of the reason
   * the primary button sat below the fold. Every fact in it survives on the page: the
   * mechanism is the section immediately below, the trades are chips two sections down and
   * the eyebrow above already says who this is for, and "if you want us to" is what the
   * "Optional, after launch" label on the price says in three words.
   *
   * What is left is the diagnosis, which is the only part a first-time reader needs before
   * the price — and the part that makes them recognise their own business.
   */
  /*
   * The third sentence is new, and it is the whole reason this pass touched the hero.
   *
   * The first two diagnose. Neither said what to *do*, so the primary button underneath them
   * arrived unexplained — and a button reading "Get my Website Blueprint" with nothing above
   * it saying what a Blueprint is reads as a newsletter, or a quiz, or an email trap.
   *
   * One sentence turns it into the obvious next step and, more importantly, frames it as the
   * product demonstration rather than a marketing device: the reader is being offered the
   * *thinking* first and the build second, which is the order this whole funnel is arranged
   * in. It also states the price of that first step, which is nothing.
   */
  subheading:
    'Most local service businesses do not have a traffic problem — they have a website that loses people who were ready to get in touch. Tell us how your business actually gets hired and we will show you what your website should do about it, free, in about five minutes.',

  /** The one-line differentiator, shown directly under the hero copy. */
  differentiator:
    'We write the copy, build the pages and set up the measurement. You correct the facts and answer the phone.',

  /*
   * The price, on the first screen.
   *
   * Unusual for this kind of site, and deliberate: a visitor who cannot find a number
   * assumes the answer is "more than I can afford" and leaves without asking. Putting it
   * here disqualifies nobody who was ever going to buy, and it removes the single largest
   * reason a reader stops reading. Interpolated from `content/offer.ts` so it can never
   * drift from the pricing cards.
   *
   * ## Two labelled blocks, not two figures joined by a word
   *
   * "$4,900 plus $299/mo" read as one compound price, which contradicted the page's own
   * claim that the monthly service is optional. The first screen now says what each
   * number is *for* and which one is optional — the reader should leave it knowing the
   * build is a one-time purchase and the monthly service is a separate choice.
   */
  priceBlock: {
    build: {
      label: offerName,
      figure: prices.launch,
      cadence: 'one-time',
      /*
       * The payment split is on the first screen, not two thousand words down.
       *
       * "$4,900" and "$2,450 now, $2,450 at launch" are the same price and a different
       * decision, and the second one is the one a business owner can actually picture
       * agreeing to. It costs eight words here and it removes the largest unspoken question
       * the figure raises.
       */
      note: `${prices.deposit} to start, ${prices.deposit} on the day it goes live.`,
    },
    partner: {
      label: 'Optional, after launch',
      figure: prices.managementDisplay,
      /*
       * Measurement first, hosting nowhere.
       *
       * This note used to read "hosting, updates, monitoring and ongoing improvement" —
       * hosting first, improvement last — which meant the very first thing a visitor
       * associated with the monthly fee was a bill for keeping a server on. On the first
       * screen there is room for one idea about the recurring service, and it should be the
       * one that is actually worth $299.
       */
      note: `Growth Partner: what the site produced, reported every month, and the work that comes out of it.`,
    },
    /*
     * The sentence that settles the question the two figures raise. It is on the first
     * screen because "is the monthly bit compulsory" is the misreading the old layout
     * actively invited.
     */
    /*
     * Ten words, and it used to be thirty-two.
     *
     * The long version explained that you can run the site yourself, that it is yours
     * either way, and restated the monthly figure that is displayed six inches above it.
     * The figure is already on screen and `partner.label` already reads "Optional, after
     * launch" — so the only idea left for this line to carry is ownership, which is the
     * one the two figures genuinely do not settle on their own.
     */
    choice: 'The website is yours either way — Growth Partner is optional.',
    /*
     * The condition travels with the number.
     *
     * The figure on the first screen is the founding-client price. A conditional price
     * published as if it were the price is the same defect as a former-price claim,
     * arrived at from the other direction — so the standard price and the condition are
     * stated here, generated from the same config, and the sentence disappears on its
     * own if the founding offer is ever switched off.
     */
    /*
     * Shortened for the same reason as `choice`, and no further: the condition and the
     * standard price are the two facts that keep a founding price from being a
     * former-price claim, so both stay. "Documented as case studies" is what the
     * founding-client section further down is for.
     */
    foundingNote: hasFoundingDiscount()
      ? `Founding-client pricing on a limited number of projects. Standard price is ${prices.launchStandard}.`
      : null,
    /** The timeline, on the first screen — it is one of the offer's strongest facts. */
    timeline: 'Typically live in 2–4 weeks once we have your materials.',
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
    /*
     * "We draft the copy — you correct the facts" was the first entry here and has been
     * removed: `differentiator` renders directly above this list and says the same thing
     * in the same words. Two lines making one point, six inches apart, read as padding.
     * The point itself is not lost — it is the differentiator's whole second sentence.
     */
    'Domain, hosting and content in your name from day one',
    /*
     * Greater Seattle moved here from the eyebrow, which now carries the category instead.
     *
     * It qualifies the offer rather than defining it — a reader outside the area is not being
     * turned away, which is what an eyebrow reading "for businesses in Greater Seattle" does
     * to somebody in Tacoma reading on a phone. The About page says the work is remote.
     */
    `Built for service businesses around ${site.serviceArea.label}`,
    'Two revision rounds, and 30 days of fixes after launch',
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
      'New services, new photos and new reviews go up when they happen — because with Growth Partner, keeping it current is our job, not another thing on your list.',
    icon: 'wrench',
  },
];

export const finalCta = {
  heading: "Let's find out what your website is costing you.",
  body: 'Send us your website and we will show you the biggest opportunities we see — in what it says, how it converts, and how easy you are to find. If it turns out a website is not what is holding you back, we will tell you that instead.',
} as const;
