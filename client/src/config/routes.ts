import { industryPath } from './trades';

/**
 * Every URL in the application, in one place.
 *
 * Components and content reference these constants rather than string literals, so a
 * path can be renamed without hunting through JSX for a stale link.
 */
export const routes = {
  home: '/',
  about: '/about',
  services: '/services',
  portfolio: '/portfolio',
  /**
   * The Website Revenue Audit.
   *
   * Its own route rather than a section of `/playbook`, because the PlayBook's
   * self-assessment promises in rendered copy that its answers never leave the browser —
   * and an audit whose purpose is to be sent cannot live underneath that sentence. The
   * two share their scoring rules and nothing else.
   */
  audit: '/audit',
  /*
   * The five industry pages.
   *
   * Written out rather than generated, because `content.test.ts` walks
   * `Object.values(routes)` to assert every route has page metadata, and a nested object
   * or a computed key would put these outside that sweep. The paths still come from
   * `industryPath()` so they cannot drift from the trade slug they are named for, and a
   * test asserts each one matches.
   */
  hvac: industryPath('hvac'),
  plumbing: industryPath('plumbing'),
  roofing: industryPath('roofing'),
  landscaping: industryPath('landscaping'),
  electrical: industryPath('electrical'),
  /**
   * The teardown of a composite service-business website, plus a sample of what the free
   * review actually looks like when it lands.
   *
   * Its own route rather than a homepage section: it is long, it is the proof asset a
   * sceptical reader goes looking for, and it is the page worth linking to from anywhere
   * the phrase "free website assessment" appears.
   */
  teardown: '/website-teardown',
  playbook: '/playbook',
  /*
   * The printable workbook.
   *
   * A production tool rather than a page: `noindex`, absent from the sitemap, and linked
   * from nowhere on the site. Open it, print to PDF, send the PDF. That is the whole
   * delivery mechanism, and it is why there is no PDF-generation dependency in a
   * repository with three runtime dependencies.
   */
  workbook: '/playbook/workbook',
  /*
   * There was a `/playbook/get` here: a second page carrying the same email form as
   * `/playbook`, bound to the same hook and the same endpoint, so that a salesperson had
   * a short URL to read out on a call.
   *
   * It was removed because it failed its own justification. `/playbook` is shorter to say
   * than `/playbook/get`, the form is already on it, nothing on the site linked to the
   * second page, and it asked a visitor for an email address in exchange for something
   * the page one level up gives away free. The capture itself is untouched — see
   * `PlayBookPdfOffer`, which is where it always really lived.
   */
  contact: '/contact',
  privacy: '/privacy',
  terms: '/terms',
} as const;

export type RoutePath = (typeof routes)[keyof typeof routes];

/**
 * Fragment identifiers for in-page links and for deep links somebody sends by hand.
 *
 * Every entry here must be rendered as an `id` on a section — `content.test.ts` asserts
 * it. There was a `contact: 'contact'` in this list that nothing rendered and nothing
 * linked to: a constant describing an anchor that did not exist, which is the same
 * failure as the dead `management.categories` the conversion plan opened by deleting. The
 * contact *page* is `routes.contact`; there is no fragment on it worth naming, because
 * the only thing anybody wants on that page is the form, and that is `request`.
 *
 * Not every one of these is linked from the site, and that is fine — an `id` is also a
 * URL somebody can paste into an email. What is not fine is naming one that goes nowhere.
 */
export const sections = {
  /** The ten components of the offer. The hero's secondary button points here. */
  system: 'system',
  management: 'management',
  /**
   * Rendered by `LaunchSection`. The id stayed `process` when the section was renamed,
   * because a fragment is a published URL and renaming it breaks every link already sent.
   */
  process: 'process',
  offer: 'offer',
  examples: 'examples',
  faq: 'faq',
  /** The lead form on the contact page. Every primary call to action lands here. */
  request: 'request',
  /** The twenty improvements, on the PlayBook page. */
  plays: 'plays',
  /** The 40-point self-assessment. The PlayBook hero's secondary button points here. */
  assessment: 'assessment',
} as const;
