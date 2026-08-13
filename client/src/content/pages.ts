import { routes } from '../config/routes';
import { site } from './site';
import { industryMeta } from './industryMeta';
import type { PageMeta } from '../types/content';

/*
 * Per-page SEO metadata.
 *
 * Consumed twice: by `useDocumentMeta` when the visitor navigates within the app, and
 * by `scripts/build-seo.ts` at build time, which writes a real HTML file per route with
 * these tags already in the markup. That second pass matters because social-media
 * crawlers do not execute JavaScript — without it, every shared link would preview with
 * the same generic title.
 *
 * Titles are written for a human reading a search result, not stuffed with keywords.
 */
export const pages: readonly PageMeta[] = [
  {
    path: routes.home,
    title: site.seo.defaultTitle,
    description: site.seo.defaultDescription,
    sitemapPriority: 1,
  },
  {
    path: routes.services,
    title: 'Services',
    description:
      'What is included: build, launch, capture, track, maintain and improve — the whole managed website service for local service businesses in Greater Seattle.',
    sitemapPriority: 0.8,
  },
  {
    path: routes.portfolio,
    title: 'Examples',
    description:
      'Demonstration websites for HVAC, plumbing, landscaping, roofing and electrical businesses, showing how each one is built to bring in enquiries.',
    sitemapPriority: 0.8,
  },
  {
    path: routes.audit,
    title: 'Website Revenue Audit',
    description:
      'Score your own website against twenty checks and get the five things most likely costing you calls and quote requests — free, in about five minutes, with no email address required.',
    sitemapPriority: 0.9,
  },
  /*
   * The five industry pages, from `content/industryMeta.ts` — a leaf holding five titles,
   * five descriptions and five paths, and nothing else.
   *
   * This mapped over `content/industries.ts` instead, which read better and put the entire
   * copy of all five industry pages into the eager bundle: `pages.ts` is reached from
   * `useDocumentMeta`, which every page component imports. The component code was
   * code-split correctly, so the split looked like it was working while the copy rode
   * along in the main chunk. See the note at the top of `industryMeta.ts`.
   *
   * High sitemap priority: these are the pages built to be found for "hvac website" style
   * searches, which is the only kind of search this site can realistically expect to be
   * relevant to.
   */
  ...industryMeta.map((industry): PageMeta => ({
    path: industry.path,
    title: industry.metaTitle,
    description: industry.metaDescription,
    sitemapPriority: 0.8,
  })),
  {
    path: routes.teardown,
    title: 'Website teardown',
    description:
      'Six findings on the first screen of a composite service-business website, ordered by what they cost — plus what a free website assessment actually looks like when it arrives.',
    sitemapPriority: 0.7,
  },
  {
    path: routes.playbook,
    title: 'The Service Business Website PlayBook',
    description:
      'A free, practical guide to service-business website conversion: speed, mobile, clarity, trust, calls to action, forms, service pages, message match and measurement.',
    sitemapPriority: 0.7,
  },
  /*
   * The workbook is a production tool, not a page anybody should land on from a search
   * result — the public PlayBook is the thing worth ranking. `noIndex` keeps it out of
   * the sitemap and puts a robots meta tag in the built HTML.
   */
  {
    path: routes.workbook,
    title: 'PlayBook workbook',
    description:
      'The printable workbook: audit sheets, worksheets and checklists for the Service Business Website PlayBook. Print this page or save it as a PDF.',
    noIndex: true,
  },
  {
    path: routes.about,
    title: 'About',
    description: `About ${site.name} — who builds these websites, and why the work focuses on local service businesses in ${site.serviceArea.label}.`,
    sitemapPriority: 0.6,
  },
  {
    path: routes.contact,
    title: 'Contact',
    description:
      'Get a free website assessment, or ask a question about the managed website service. Call, email, or send a short message and get a direct reply.',
    sitemapPriority: 0.9,
  },
  {
    path: routes.privacy,
    title: 'Privacy',
    description:
      'What happens to the information you send through the contact form, why it is collected, and how to ask for a copy or a deletion.',
    sitemapPriority: 0.2,
  },
  {
    path: routes.terms,
    title: 'Terms',
    description:
      'Terms of use for this website, including how demonstration examples are labelled and how project work is agreed in writing beforehand.',
    sitemapPriority: 0.2,
  },
];

/** Metadata for the not-found page. Excluded from the sitemap and marked noindex. */
export const notFoundPage: PageMeta = {
  path: '/404',
  title: 'Page not found',
  description: 'That page does not exist.',
  noIndex: true,
};

export function findPageMeta(path: string): PageMeta | undefined {
  return pages.find((page) => page.path === path);
}

/**
 * Builds the document title. The suffix is skipped when it would simply repeat the
 * page title, so a result never reads "[BUSINESS_NAME] | [BUSINESS_NAME]".
 */
export function buildDocumentTitle(page: PageMeta): string {
  const suffix = site.seo.titleSuffix;
  if (!suffix || page.title === suffix) return page.title;
  return `${page.title} | ${suffix}`;
}
