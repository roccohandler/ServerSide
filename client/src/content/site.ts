import { routes, sections } from '../config/routes';
import { serviceArea } from '../config/market';
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
 * What is *sold* is described in `content/offer.ts`, not here. This file is identity,
 * contact details, navigation and the calls to action.
 *
 * Search the repository for `[` to find them all, or read the checklist in README.md.
 * ============================================================================
 */

export const site: SiteConfig = {
  /*
   * "ServiceSideSites" became "ServiceSide" at the owner's request: shorter, and easier to
   * remember and to say. The old name stacked three sibilants and repeated itself —
   * "Side" and "Sites" are the same idea twice — which is what made it awkward out loud
   * and on the phone. "ServiceSide" is also what this project has been called all along.
   *
   * **This is a brand decision, not an implementation detail.** It is one line here and
   * one line in `seo.titleSuffix` to change again or to revert; nothing else in the
   * repository holds the name as a literal.
   */
  name: 'ServiceSide',
  ownerName: 'Maxwell Cuenca',

  /*
   * Rendered in exactly one place — under the name in the header — where it has to fit on
   * one line beside five nav items, a phone number and a button. "Managed" is dropped
   * here and carried by every other surface (`offerName`, the services page, the
   * description below), because at this size the words that earn their place are the ones
   * naming who it is for.
   */
  tagline: 'Websites for local service businesses',

  description:
    'A managed website for HVAC, plumbing, electrical, roofing, landscaping and other local service businesses in the Greater Seattle area — built, launched, maintained and improved so local customers can find you and get in touch.',

  /*
   * `hours` is the covered business week, and it is load-bearing rather than decorative:
   * the response guarantee in `content/growth.ts` promises a reply within 24 *business*
   * hours, and its copy is generated from these values. Widen the window here and you
   * have widened a commercial commitment — the terms page will say so on the next build.
   *
   * `supportEmail` is separate from `email` so the public address can change without
   * silently moving a contractual channel.
   */
  contact: {
    phone: '206-973-6798',
    email: 'maxwellacuenca@gmail.com',
    supportEmail: 'maxwellacuenca@gmail.com',
    availability: 'Monday to Friday, 8am–6pm Pacific',
    hours: {
      days: 'Monday to Friday',
      opens: '8am',
      closes: '6pm',
      timezone: 'Pacific',
      label: 'Monday to Friday, 8am–6pm Pacific',
      excludes: 'Weekends and US federal holidays',
    },
    outOfHours:
      'If your website is down or its forms have stopped delivering, get in touch whenever it happens and I will do what I can. That is best effort rather than a promise — the response commitment covers the business week.',
  },

  /*
   * The service area is defined once, in `config/market.ts`, alongside the description of
   * who the service is built for. Both are facts about the market rather than about the
   * website, and both were previously spread across several files — which is how a site
   * ends up claiming a town nobody serves.
   */
  serviceArea,

  offer: {
    freeReview: {
      /*
       * Set to false if a free assessment is not part of the final offer. Doing so removes
       * every mention of it from the site and swaps the primary button for the fallback
       * below — nothing anywhere else needs to change.
       */
      enabled: true,
      /*
       * "Review" became "assessment" when the primary call to action did, because a
       * button reading "Get my free website assessment" that lands on a section headed
       * "Free website review" is two offers as far as the reader is concerned — and the
       * one thing a sceptical buyer notices fastest is a site that cannot keep its own
       * names straight. The thing itself is unchanged.
       */
      name: 'Free website assessment',
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
      /*
       * The link to the sample, shown wherever the assessment is offered.
       *
       * It lives here rather than in `content/teardown.ts` for a bundling reason: the
       * homepage and the contact page render it, and importing the teardown for two
       * strings pulled that whole lazy route's copy into the eager bundle. It also sits
       * more honestly beside the offer it qualifies than beside the page it points at.
       */
      sampleLede: 'Not sure what a free assessment actually gets you?',
      sampleLabel: 'See the six sections it comes back with',
    },
  },

  /*
   * `cta` is the hero the site ships with: headline, illustration and a button that takes
   * the visitor to the form on the contact page.
   *
   * `form` is the other build — the two-step lead form inline on the first screen. It is
   * finished and tested (`features/contact/HeroLeadForm.tsx`), switched off by choice
   * rather than abandoned, so comparing the two is a one-word change here.
   */
  hero: { variant: 'cta' },

  /*
   * One primary action for the whole site. Every button that matters uses `primary`, so
   * testing different wording is a one-line change here rather than a search through JSX.
   *
   * The label is in the visitor's voice — "Get my", not "Get your" — because the button
   * is the thing they are saying, not the thing they are being told.
   *
   * `secondary` is a same-page anchor rather than a route: it drops the reader into the
   * section that explains the system, which is the question a first-time visitor actually
   * has. `ButtonLink` renders anything that is not a `/` path as a plain anchor, so the
   * browser handles the scroll — no router involvement and no scroll-restoration fight.
   */
  cta: {
    /*
     * "Review" became "assessment", and the destination stayed.
     *
     * The word is the change. A *review* is something I do to your site and send back —
     * useful, and it still costs the reader an email and a wait. An *assessment* is what
     * the site already offers on `/audit`: twenty checks they score themselves in about
     * five minutes, with no email address, and a result that is about their business
     * rather than about mine. Both are on offer and this button names the lower-friction
     * one, because the first conversion should never be "decide whether to spend $4,900".
     *
     * The `to` still points at the contact form: somebody who clicks a primary button
     * wants to talk to a person, and the audit is linked from the navigation, the hero and
     * every industry page for the ones who would rather not. Changing the destination is a
     * one-line edit here if that turns out to be wrong.
     */
    primary: {
      label: 'Get my free website assessment',
      to: `${routes.contact}#${sections.request}`,
    },
    primaryFallback: { label: 'Start a conversation', to: `${routes.contact}#${sections.request}` },
    secondary: { label: 'See how it works', to: `#${sections.system}` },
    /*
     * The header's version of the primary action.
     *
     * Same destination, fewer words. The full label is right on a page section where it
     * has a line to itself; in a sticky bar already carrying a name, a tagline, five nav
     * items and a phone number it was wrapping onto two lines and making the button the
     * largest object on the screen. Shortening the button rather than dropping a nav item
     * keeps every route one click away.
     */
    navLabel: 'Get my assessment',
  },

  /*
   * Four destinations and one action, and the four are the four questions a visitor
   * arrives with: what do you do, can you look at mine, is your work any good, who are
   * you. Everything else is reachable from the page that answers one of them.
   *
   * "Contact" used to sit here, pointing at exactly where the call-to-action button
   * already goes — two links to one destination, one of them styled to look ordinary.
   * The footer still carries a Contact link for anyone hunting for one.
   *
   * **"PlayBook" was removed from this bar.** It is the highest-*total*-value page on the
   * site and one of the lowest value-*per-second* for somebody arriving cold: twenty
   * improvements is a reading commitment, offered to a visitor who has not yet decided
   * whether this business is worth two minutes. It stays in the footer, it is linked from
   * the audit result — which is exactly the reader it is written for — and the bar it
   * left is a bar with room in it. See `docs/VALUE-PER-SECOND.md` §4.
   */
  nav: [
    { label: 'Services', to: routes.services },
    /*
     * The audit sits in the navigation because it is the site's lowest-friction offer:
     * it asks for nothing, it returns a diagnosis of the reader's own site, and somebody
     * who completes it is the most qualified visitor this site will ever get.
     */
    { label: 'Free audit', to: routes.audit },
    { label: 'Examples', to: routes.portfolio },
    { label: 'About', to: routes.about },
  ],

  footerNav: [
    { label: 'Home', to: routes.home },
    { label: 'Services', to: routes.services },
    { label: 'Free audit', to: routes.audit },
    { label: 'PlayBook', to: routes.playbook },
    { label: 'Examples', to: routes.portfolio },
    /*
     * The teardown is in the footer rather than the header for the same reason the
     * industry pages are: it is proof somebody goes looking for once they are already
     * interested, not a thing to browse to first.
     */
    { label: 'Teardown', to: routes.teardown },
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
    // Must stay in step with `name` above — a search result reading "ServiceSide |
    // ServiceSideSites" is two businesses as far as the reader is concerned.
    titleSuffix: 'ServiceSide',
    defaultTitle: 'Managed websites for Greater Seattle service businesses',
    defaultDescription:
      'Built, launched, maintained and improved: managed websites for HVAC, plumbing, electrical, roofing and landscaping businesses around Greater Seattle.',
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
