/*
 * ============================================================================
 * THE MARKET — WHO THIS IS FOR, AND WHERE
 * ============================================================================
 *
 * One source of truth for the two facts that decide whether somebody is a fit: where the
 * business works, and what kind of business it works with. Both were previously spread
 * across copy in several files, which is how a site ends up claiming a city nobody serves
 * and describing a customer nobody has.
 *
 * Two rules:
 *
 *   1. Only list a place the business actually intends to serve. A town in the metro area
 *      is not automatically a town you cover, and claiming one you would decline is a
 *      wasted phone call for both of you.
 *   2. The revenue guideline is a *guideline*. It describes who the service is built for,
 *      not who is allowed to buy it. Nothing in the application may use it to reject
 *      anybody — see `content/qualification.ts` for the wording that follows from that.
 * ============================================================================
 */

/** The towns the business genuinely works in. Ordered roughly by proximity and volume. */
export const serviceArea = {
  label: 'the Greater Seattle area',
  short: 'Greater Seattle',
  region: 'Washington',
  cities: [
    'Seattle',
    'Bellevue',
    'Everett',
    'Tacoma',
    'Kent',
    'Renton',
    'Redmond',
    'Kirkland',
    'Auburn',
    'Federal Way',
  ],
  note: 'Work is done remotely, and in person where it helps.',
  /**
   * The site is not geographically restrictive, because the work genuinely is not. What
   * it does not do is claim to turn up on site outside the area.
   */
  remotePolicy:
    'Greater Seattle is the focus, and knowing the area helps when a site has to say which towns you cover. The work itself — the website, the analytics, the search foundation, the ongoing improvement — is done remotely, so a service business elsewhere can absolutely be a fit.',
} as const;

/**
 * The commercial-fit guideline.
 *
 * `revenueGuideline` is stated on the site, quietly and after the description of the
 * profile, because a number in isolation reads as a velvet rope. `showRevenueGuideline`
 * exists so it can be removed in one edit if it ever stops being useful.
 */
export const idealCustomer = {
  showRevenueGuideline: true,
  revenueGuideline: 'around $1M+ in annual revenue',

  /*
   * Why the profile is what it is, in one sentence. This matters more than the number:
   * it is the actual reason, and somebody below the threshold can read it and work out
   * for themselves whether they are close.
   */
  rationale:
    'enough customer volume, and enough value in a customer, for continuous website work to pay for itself several times over',

  /** The qualities that actually predict a good fit. Deliberately longer than the number. */
  signals: [
    'A local service business — the trades, home services, anything a customer finds nearby and then calls',
    'Established and operating, rather than starting out',
    'More than one person doing the work: crews, technicians, employees',
    'Existing demand — the phone rings, even if not as often as it should',
    'Reviews and repeat customers you have already earned',
    'Marketing already running, whether that is adverts, referrals or a van with your name on it',
    'A job value high enough that one extra customer a month matters',
    'Capacity to take on more work if it arrived',
  ],
} as const;
