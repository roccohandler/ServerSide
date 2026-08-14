import { idealCustomer, serviceArea } from '../config/market';

/*
 * ============================================================================
 * WHO THIS IS FOR — A RECOMMENDATION, NEVER A REJECTION
 * ============================================================================
 *
 * A managed service with a monthly fee is not right for every business, and pretending
 * otherwise wastes everybody's time — theirs on a call that goes nowhere, yours on a
 * client the arrangement cannot pay for.
 *
 * Three rules, and the third is the one that matters:
 *
 *   1. Lead with the *reason*, not the number. "Enough customer volume for this to pay
 *      for itself" is a fact somebody can check against their own business. "$1M+" is a
 *      velvet rope, and it is the second sentence rather than the first.
 *   2. Describe the profile with qualities, not just revenue. A $700k business with four
 *      crews, good reviews and adverts running is a better fit than a $1.2m one with no
 *      capacity to take more work.
 *   3. **Nobody is ever turned away.** This is a recommendation: below the
 *      profile, the recommendation is the free PlayBook, which is genuinely the same
 *      framework and genuinely free. And there is always a way to say "I still think I am
 *      a fit" and be heard. A business below the profile this year is a client in three.
 *
 * A test asserts no rejection language appears anywhere in this file.
 * ============================================================================
 */

export const qualification = {
  eyebrow: 'Fit',
  heading: 'Who this is built for',

  /*
   * The reason first. Somebody reading this can hold it against their own numbers without
   * being told a threshold, which is a more respectful way to let them self-select.
   */
  lede: `Growth Partner, the ongoing half of the system, is built for established service businesses in ${serviceArea.short} with ${idealCustomer.rationale}. That is the honest condition for it being worth paying for every month rather than once.`,

  signalsHeading: 'That usually looks like',
  signals: idealCustomer.signals,

  /**
   * The number, stated quietly and second. Removed entirely by setting
   * `idealCustomer.showRevenueGuideline` to false — one edit, no other changes.
   */
  revenueNote: idealCustomer.showRevenueGuideline
    ? `In practice that usually means ${idealCustomer.revenueGuideline}. It is a guideline for where the arrangement makes commercial sense, not a rule about who is allowed to get in touch.`
    : null,

  areaNote: serviceArea.remotePolicy,

  /* ---------------------------------------------------------------- below the line */

  /*
   * The path for somebody outside the profile. It has to be genuinely useful, or it is
   * just a polite no — which is why it points at the PlayBook, which is the same
   * framework, complete, free, and requires nothing from them.
   */
  otherwise: {
    heading: 'And if that is not you yet',
    body: 'Then the honest recommendation is to start with the PlayBook. It is the same framework we use when we look at a service-business website, published in full, and there is no email address required to read any of it. Most of what is in it you can do yourself over a few afternoons.',
    ctaLabel: 'Read the PlayBook',
    reviewNote:
      'The free website assessment is also open to anybody, whatever size you are. You send us your site, we send back what we would change first. No obligation and no catch — you get the list either way.',
  },

  /*
   * The exception path. It exists because the profile above is a generalisation and
   * generalisations are wrong about specific businesses all the time.
   */
  exception: {
    heading: 'Think you are a fit anyway?',
    body: 'Then say so. The description above is a generalisation, and generalisations are wrong about individual businesses constantly. If you are outside it and you believe this would work for you, tell us about the business and what you need — we would rather read that than have you talk yourself out of getting in touch.',
    ctaLabel: 'Tell us about your business',
  },
} as const;
