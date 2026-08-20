import { hasFoundingDiscount } from '../config/pricing';
import { routes } from '../config/routes';
import { trades } from '../config/trades';
import { offerName, prices } from './offer';

/*
 * ============================================================================
 * THE WEBSITE BLUEPRINT — TWELVE QUESTIONS ABOUT A BUSINESS
 * ============================================================================
 *
 * DECISION 042. A personalised plan for what somebody's website should do, built entirely
 * from what they tell us about **their business** — never from anything about their website,
 * because nothing here has looked at their website.
 *
 * ## The naming problem, resolved first, because it is the one that would have caused damage
 *
 * Five things in this repository were already called *assessment*: the marketing offer ("free
 * website assessment"), the `/audit` Website Score, `features/private/assessment`, the
 * server's `features/assessments`, and the console's assessment queue. This is a **Blueprint**
 * everywhere — in the route, in the copy, in the code, and in conversation.
 *
 * ## Why it is not `/audit` with more questions
 *
 * They answer different questions for different people. `/audit` scores a site that exists,
 * against twenty checks, for somebody who suspects theirs is underperforming. This plans a
 * site for a business, and it works for somebody who has **no website at all** — a population
 * `/audit` cannot serve and which is a large share of this market.
 *
 * ## §32 of the brief, and the rule that follows from it
 *
 * *Never fabricate an audit.* Twelve business answers cannot say anything about somebody's
 * actual website, and hedged phrasing is not a sufficient guard because readers do not parse
 * hedges. So the output has two structurally separate halves — see `rules/` — and **no string
 * in this file may describe the reader's existing site.** Every question is about the business
 * or about what they want; a test asserts it.
 *
 * ## Deliberately absent from `content/index.ts`
 *
 * Same rule as `app.ts`, `capabilities.ts`, `legal.ts` and `pricingPage.ts`. Every marketing
 * component imports the barrel, so a module re-exported from it lands in the chunk every
 * visitor to the homepage downloads. This route is `lazy()`; its content has to be too.
 * ============================================================================
 */

/** One choice. `value` is what the rules match on and must never change once published. */
export interface BlueprintChoice {
  readonly value: string;
  readonly label: string;
}

export interface BlueprintQuestion {
  readonly id: string;
  /** The question, in the second person, as somebody would be asked it out loud. */
  readonly prompt: string;
  /** One line under it. Absent where the question needs nothing. */
  readonly hint?: string;
  readonly choices: readonly BlueprintChoice[];
  /**
   * More than one answer allowed.
   *
   * Two questions are multi-select and both are about *reality* rather than preference — how
   * customers find them, and what gets in the way. Forcing a single answer to either would
   * make somebody choose between two true things, and the rules want both.
   */
  readonly multiple?: boolean;
  /**
   * Skippable, and the label says so.
   *
   * Exactly one question is optional: typical job value. It sharpens the plan considerably and
   * it is the question people most often abandon a form over, so it is asked last, banded
   * rather than open, and visibly skippable. See DECISION 042.
   */
  readonly optional?: boolean;
}

/*
 * The trade list, from the same place the industry pages and the audit's trade question come
 * from, so a sixth trade is one entry in `config/trades.ts` rather than a list somebody
 * remembers to update. "Something else" is last and is a real answer — the rules have a
 * generic path, and a reader whose trade is missing must not be told this is not for them.
 */
const TRADE_CHOICES: readonly BlueprintChoice[] = [
  ...trades.map((trade) => ({ value: trade.slug, label: trade.label })),
  { value: 'other', label: 'Something else' },
];

export const blueprintQuestions: readonly BlueprintQuestion[] = [
  {
    id: 'trade',
    prompt: 'What kind of work do you do?',
    choices: TRADE_CHOICES,
  },
  {
    id: 'stage',
    prompt: 'How long have you been going?',
    hint: 'It changes what a website has to do most — proving you exist, or standing out.',
    choices: [
      { value: 'new', label: 'Under two years' },
      { value: 'established', label: 'Two to ten years' },
      { value: 'long', label: 'More than ten years' },
    ],
  },
  {
    id: 'size',
    prompt: 'Who does the work?',
    choices: [
      { value: 'solo', label: 'Just me' },
      { value: 'small', label: 'Me and a couple of others' },
      { value: 'crew', label: 'A crew of several' },
    ],
  },
  {
    id: 'area',
    prompt: 'How far do you travel for a job?',
    choices: [
      { value: 'local', label: 'My own town and the ones next to it' },
      { value: 'metro', label: 'Most of the metro area' },
      { value: 'wide', label: 'Wherever the work is' },
    ],
  },
  {
    id: 'sources',
    prompt: 'How do people find you at the moment?',
    hint: 'Pick everything that brings in real work.',
    multiple: true,
    choices: [
      { value: 'search', label: 'They search and find me' },
      { value: 'maps', label: 'My Google listing' },
      { value: 'referrals', label: 'Word of mouth and referrals' },
      { value: 'repeat', label: 'Customers who have used me before' },
      { value: 'ads', label: 'Advertising I pay for' },
      { value: 'signage', label: 'The van, signs, local presence' },
      { value: 'directories', label: 'A directory or lead-buying site' },
    ],
  },
  {
    id: 'want',
    prompt: 'What kind of work do you want more of?',
    choices: [
      { value: 'emergency', label: 'Urgent jobs — people who need somebody today' },
      { value: 'planned', label: 'Planned work people research first' },
      { value: 'contracts', label: 'Repeat or contract work' },
      { value: 'any', label: 'Honestly, more of anything' },
    ],
  },
  {
    id: 'customer',
    prompt: 'Who is the work mostly for?',
    choices: [
      { value: 'homes', label: 'Homeowners' },
      { value: 'business', label: 'Other businesses' },
      { value: 'both', label: 'A mix of both' },
    ],
  },
  {
    id: 'contact',
    prompt: 'How do people get hold of you now?',
    choices: [
      { value: 'phone', label: 'They ring me' },
      { value: 'text', label: 'Mostly texts' },
      { value: 'form', label: 'A form on a website' },
      { value: 'social', label: 'Messages on social media' },
    ],
  },
  {
    id: 'answering',
    prompt: 'What happens when somebody rings while you are on a job?',
    hint: 'This is the single biggest leak in most service businesses, and no website fixes it.',
    choices: [
      { value: 'someone', label: 'Somebody else answers' },
      { value: 'later', label: 'It goes to voicemail and I call back' },
      { value: 'missed', label: 'Honestly, it often gets missed' },
    ],
  },
  {
    id: 'proof',
    prompt: 'What proof of your work do you have?',
    hint: 'Photos and reviews do more for a stranger than anything you can write about yourself.',
    multiple: true,
    choices: [
      { value: 'photos', label: 'Photos of finished jobs' },
      { value: 'reviews', label: 'Reviews people have left' },
      { value: 'licence', label: 'Licence, bonding and insurance' },
      { value: 'years', label: 'Years of doing it' },
      { value: 'none', label: 'Not much I could show somebody' },
    ],
  },
  {
    id: 'blocker',
    prompt: 'What is actually in the way right now?',
    choices: [
      { value: 'volume', label: 'Not enough people getting in touch' },
      { value: 'quality', label: 'Plenty get in touch, but the wrong jobs' },
      { value: 'seasonal', label: 'It goes quiet for months at a time' },
      { value: 'invisible', label: 'People near me do not know I exist' },
    ],
  },
  /*
   * The one money question, and everything about it is deliberate.
   *
   * **Banded, not a number.** A range is answerable in a second by somebody who has never
   * added it up; a box wanting a figure is a box people leave.
   *
   * **Optional, and it looks optional.** It is the question most likely to end the flow, and
   * the plan is worth reading without it.
   *
   * **Last.** By here somebody has answered eleven questions and has a result waiting, which
   * is the point at which one more is cheap.
   *
   * **It never becomes a prediction.** The rules may use it to say what one missed call is
   * worth; they may never use it to say what a website will earn. §53 of the brief, and the
   * same rule the rest of this site has always kept.
   */
  {
    id: 'jobValue',
    prompt: 'Roughly what is a typical job worth to you?',
    hint: 'Optional. It lets the plan be specific about what a missed enquiry costs.',
    optional: true,
    choices: [
      { value: 'under-250', label: 'Under $250' },
      { value: '250-1000', label: '$250 to $1,000' },
      { value: '1000-5000', label: '$1,000 to $5,000' },
      { value: 'over-5000', label: 'More than $5,000' },
      { value: 'varies', label: 'It varies far too much to say' },
    ],
  },
];

export const blueprint = {
  eyebrow: 'Website Blueprint',
  heading: 'What should your website actually do?',
  lede: 'Twelve questions about your business — none of them technical, and none of them about your current website. At the end you get a plan for what a site for a business like yours has to do, and which parts matter most for you.',

  /*
   * The promise, stated before the first question and kept by the result.
   *
   * "About five minutes" and "nothing to sign up for" are the two things a reader wants to
   * know before starting, and stating both is what makes the first question cheap to answer.
   */
  intro: {
    time: 'About five minutes',
    cost: 'Free, and there is nothing to sign up for to see it',
    privacy:
      'Your answers stay in this browser until you choose to keep them. Close the tab and nothing is stored anywhere.',
  },

  progressLabel: (step: number, total: number) => `Question ${step} of ${total}`,

  skipLabel: 'Skip this one',
  backLabel: 'Back',
  nextLabel: 'Next',
  finishLabel: 'Show me the plan',

  result: {
    eyebrow: 'Your Blueprint',
    heading: 'What your website needs to do',
    /*
     * The sentence that keeps §32. It is the first thing on the result and it says out loud
     * what the plan is built from — because a reader who thinks we looked at their site will
     * read every line below as a finding about it.
     */
    basis:
      'Built from what you told us about your business. We have not looked at your website — everything below is about what a site for a business like yours has to do.',
    plannedHeading: 'Based on what you told us',
    plannedLede: 'The parts that matter most for how your business actually gets hired.',
    /*
     * The second half, and it is structurally separate rather than differently worded. See
     * `rules/` — nothing derived from an answer may appear under this heading.
     */
    unknownHeading: 'What we would need to look at your site to say',
    unknownLede:
      'None of this can be answered from questions about your business. It needs somebody to open your site on a phone and try to hire you.',
    /*
     * ========================================================================
     * THE STEP THAT WAS MISSING: PLAN → THING THAT BUILDS THE PLAN
     * ========================================================================
     *
     * The result went straight from a personalised strategy to an offer of a *free
     * assessment*. Somebody who had just spent five minutes describing their business and
     * been shown what their website should do was then offered… another free thing.
     *
     * That is a funnel with no floor. The reader is at the highest-intent moment this site
     * produces — they have the strategy and they have just been told, honestly, that nobody
     * has looked at their current site — and the one thing not on the page was the thing
     * that turns the plan into a website.
     *
     * ## It is an offer, not a close
     *
     * The order is diagnosis → explanation → *"if you want this built"* → price → payment →
     * action. The conditional matters: the Blueprint has to be worth having on its own, or
     * the whole exercise reads as an elaborate lead magnet and the recommendations read as
     * sales copy. The reader has already been given the value; this is the implementation
     * offer that naturally follows it, and saying so plainly is what makes it credible.
     *
     * ## The price is here rather than a click away
     *
     * A reader who has to go and find out what it costs is a reader deciding whether to
     * start a negotiation. Both figures, the split and the condition are printed, derived
     * from `config/pricing.ts` like every other figure on the site — the currency sweep in
     * `content.test.ts` covers this module, so a number typed here would fail the build.
     * ========================================================================
     */
    build: {
      eyebrow: 'If you want it built',
      heading: 'This is exactly what we build.',
      lede: `Your Blueprint is the strategy. The ${offerName} is that strategy, built — the pages, the words, the paths to your phone, and the measurement that shows what it produced.`,
      /*
       * Three lines, each answering the question a reader has at this exact moment. Not a
       * feature list: the seven promises are on `/pricing` and the reader can go and read
       * them. What they need here is the shape of the commitment.
       */
      facts: [
        `${prices.launch} at founding-client pricing — ${prices.deposit} to begin, ${prices.deposit} on the day it goes live.`,
        'Typically live in two to four weeks once we have your materials.',
        'The domain, the hosting and everything on it are in your name from day one.',
      ],
      standardNote: hasFoundingDiscount()
        ? `Founding-client pricing on a limited number of projects. The standard price is ${prices.launchStandard}.`
        : null,
      /*
       * The label continues the experience rather than restarting it. "Buy a website" would
       * be a different transaction from the one the reader has just spent five minutes
       * designing; "build this" is the same one, carried forward — which is the whole point
       * of putting the offer at the end of a plan rather than on a separate page.
       */
      cta: { label: 'Have this built for my business', to: `${routes.contact}?intent=build` },
      /*
       * And the way out, stated as plainly as the way in. A reader who is not ready is
       * considerably more likely to come back to a page that said this than to one that
       * only had a button on it.
       */
      note: 'Not ready? The Blueprint is yours either way, and nothing here expires.',
    },
    handoff: {
      heading: 'Want the other half?',
      body: 'The free assessment is a person looking at your actual website and telling you what is costing you calls, in plain English. It is the only way to answer the list above.',
      cta: { label: 'Get my free website assessment', to: routes.getAssessment },
    },
    keep: {
      heading: 'Keep this Blueprint',
      body: 'Create an account and your plan is saved to it. Nothing is charged, and you can come back to it whenever you like.',
      signedIn: 'Save this Blueprint to your account and it will be waiting on your dashboard.',
      cta: 'Create my account and keep this',
      signedInCta: 'Save it to my dashboard',
    },
    /*
     * The honest closing note. It is the sentence that makes everything above it credible, and
     * it is the first thing a conversion-minded edit would remove.
     */
    limits:
      'A plan is not a website and none of this is a promise about what you will earn. How many people call depends on your market, your prices, the season and whether the phone gets answered — and the answering question above is there because it is usually the biggest leak of the lot.',
  },
} as const;
