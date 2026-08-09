import { routes } from '../config/routes';
import type { SiteConfig } from '../types/content';

/*
 * ============================================================================
 * BUSINESS IDENTITY — EDIT THIS FILE FIRST
 * ============================================================================
 *
 * Anything written as [LIKE_THIS] is a placeholder for a fact that has not been
 * decided yet. Nothing in this repository invents a business name, a price, a
 * guarantee, a client, a testimonial or a statistic.
 *
 * In development the site shows a banner listing every placeholder that is still
 * in place, and telephone and email links stay inert until they hold real values,
 * so an unreplaced placeholder can never become a broken `tel:` link in public.
 *
 * Search the repository for `[` to find them all, or read the checklist in README.md.
 * ============================================================================
 */

export const site: SiteConfig = {
  name: '[BUSINESS_NAME]',
  ownerName: '[OWNER_NAME]',

  tagline: 'Websites for local service businesses',

  description:
    'Website design and development for HVAC, plumbing, electrical, roofing, landscaping and other local service businesses in the Greater Seattle area.',

  contact: {
    phone: '[PHONE_NUMBER]',
    email: '[BUSINESS_EMAIL]',
    availability: '[CONTACT_HOURS]',
  },

  serviceArea: {
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
  },

  offer: {
    freeReview: {
      /*
       * Set to false if a free review is not part of the final offer. Doing so removes
       * every mention of it from the site and swaps the primary button for the fallback
       * below — nothing anywhere else needs to change.
       */
      enabled: true,
      name: 'Free website review',
      summary:
        'Send me your website — or your Google listing if you do not have one — and I will send back a short, plain-English list of what is likely costing you calls, and what I would do about it.',
      includes: [
        'How the site behaves on a phone',
        'How easy you are to call, and how quickly',
        'Whether it is clear what you do and where you work',
        'Whether a quote request actually reaches you',
        'The two or three changes I would make first',
      ],
      caveat: 'No charge and no obligation. If a new website is not what you need, I will say so.',
    },
  },

  cta: {
    primary: { label: 'Get a free website review', to: routes.contact },
    primaryFallback: { label: 'Start a conversation', to: routes.contact },
    secondary: { label: 'View examples', to: routes.portfolio },
  },

  nav: [
    { label: 'Services', to: routes.services },
    { label: 'Examples', to: routes.portfolio },
    { label: 'About', to: routes.about },
    { label: 'Contact', to: routes.contact },
  ],

  footerNav: [
    { label: 'Home', to: routes.home },
    { label: 'Services', to: routes.services },
    { label: 'Examples', to: routes.portfolio },
    { label: 'About', to: routes.about },
    { label: 'Contact', to: routes.contact },
    { label: 'Privacy', to: routes.privacy },
    { label: 'Terms', to: routes.terms },
  ],

  /*
   * Add profiles here once they exist. An empty list simply hides the section — the
   * site does not link to accounts that have not been created.
   */
  social: [],

  seo: {
    titleSuffix: '[BUSINESS_NAME]',
    defaultTitle: 'Websites for Greater Seattle service businesses',
    defaultDescription:
      'Fast, mobile-first websites for HVAC, plumbing, electrical, roofing, landscaping and other local service businesses around Greater Seattle. Built so customers can find you and get in touch.',
    /*
     * Most social platforms will not render an SVG preview. Before launch, export a
     * 1200x630 PNG, save it as `client/public/og-image.png`, and change these two lines.
     */
    ogImage: '/og-image.svg',
    ogImageType: 'image/svg+xml',
    locale: 'en_US',
  },
};

/** Resolves the primary call to action, honouring the free-review switch above. */
export const primaryCta = site.offer.freeReview.enabled
  ? site.cta.primary
  : site.cta.primaryFallback;
