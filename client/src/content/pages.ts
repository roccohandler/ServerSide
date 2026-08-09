import { routes } from '../config/routes';
import { site } from './site';
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
      'Website design, development, mobile-first optimisation, contact forms, launch and ongoing maintenance for local service businesses in Greater Seattle.',
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
    path: routes.about,
    title: 'About',
    description: `About ${site.name} — who builds these websites, and why the work focuses on local service businesses in ${site.serviceArea.label}.`,
    sitemapPriority: 0.6,
  },
  {
    path: routes.contact,
    title: 'Contact',
    description:
      'Get a free website review, or ask a question. Call, email, or send a short message and get a direct reply.',
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
