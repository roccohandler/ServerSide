/*
 * ============================================================================
 * THE ECONOMIC ANCHOR — WHY ANY OF THIS IS WORTH PAYING FOR
 * ============================================================================
 *
 * Everything in `content/offer.ts` describes what is sold and `content/value.ts`
 * describes why a better website helps. This file answers the question that sits between
 * them and was previously answered only in passing, in the fourth section of the About
 * page: what is one more customer actually worth, and how does that compare with what
 * this costs?
 *
 * ## Three rules, and the first one is a build constraint
 *
 *   1. **No currency figure appears in this file, or anywhere else in the content layer.**
 *      `content.test.ts` sweeps every string reachable from `content/index.ts` for a `$`
 *      figure and fails the build on anything that is not one of the five sanctioned
 *      prices. That guard exists to stop the published price drifting, and it is not
 *      being widened to let marketing copy invent numbers. The consequence is deliberate
 *      and useful: the argument here has to be made in *relationships* — "more than a
 *      year of management" — rather than in figures invented for a business nobody has
 *      met. The arithmetic on real numbers happens in the audit, where the numbers belong
 *      to the person reading them.
 *
 *   2. **No claim that the website causes the extra customer.** Whether a website is what
 *      is holding a business back is exactly what the free assessment exists to find out, and
 *      saying so is more persuasive than asserting the opposite. The closing line says it
 *      outright.
 *
 *   3. **No percentage, no benchmark, no projection.** Those belong next to a named
 *      source in `content/evidence.ts`, not in an argument about the reader's own money.
 * ============================================================================
 */

export const opportunity = {
  eyebrow: 'What it is worth',
  heading: 'What is one more customer worth to you?',

  lede: 'Most of the argument for a better website is not about the website. It is about the fact that in this trade, a single extra customer is usually worth more than a year of looking after the site they found you on — which is what makes the difference between a page that converts and one that does not worth caring about at all.',

  /*
   * The three steps of the argument, in the order somebody works it out on their own.
   *
   * Each `figure` is a relationship rather than a number, for the reason in rule 1. They
   * are all defensible for the market described in `config/market.ts` — a business where
   * a customer is worth considerably more than the monthly fee is the stated condition
   * for this service being worth buying, so this is the same claim the qualification
   * section already makes, said in the reader's terms instead of as a filter.
   */
  steps: [
    {
      id: 'value',
      figure: 'One job',
      title: 'Start with what a customer is worth',
      body: 'Not the enquiry — the finished job, and the ones that follow it if they call you again. For most of the trades this is built for, that number is large enough that the rest of this section is arithmetic rather than persuasion.',
    },
    {
      id: 'cost',
      figure: 'A year',
      title: 'Hold it against what this costs',
      body: 'The published monthly fee is on this page. For a business where one job is worth what it usually is, a single extra customer covers considerably more than twelve months of it — which is the honest reason ongoing work on the website is worth paying for rather than a nice idea.',
    },
    {
      id: 'leak',
      figure: 'Already paid for',
      title: 'Then look at the visitors you already have',
      body: 'The people finding you this month are already found. You have already paid for them, in advertising, in a van with your name on it, or in the years it took to earn the referrals. Whatever share of them gives up before getting in touch is the part of that spend that produced nothing.',
    },
  ],

  /*
   * The honest limit, stated immediately after the argument rather than in a footnote.
   *
   * This is the sentence that makes the section credible to somebody who has been sold a
   * revenue projection before. It also happens to be true, and it is what the free assessment
   * is for.
   */
  caveat: {
    heading: 'What this is not',
    body: 'This is not a projection, and nothing on this page claims a redesign produces an extra customer. Traffic, pricing, your market, your capacity and whether the phone gets answered all matter at least as much as the website does. What the website decides is how many of the people who already reached you give up before they get in touch — and that is the part I can look at, change, and measure.',
  },

  closing:
    'If it turns out the website is not what is holding your business back, that is a useful answer too, and you will get it from me for free.',
} as const;
