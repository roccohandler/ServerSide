import { demoPath, DEMO_SLUGS, type DemoSlug } from '../../config/demos';
import type { PageMeta } from '../../types/content';

/*
 * ============================================================================
 * DEMO PAGE METADATA — A LEAF, AND IT HAS TO BE
 * ============================================================================
 *
 * Fifteen titles, fifteen descriptions, fifteen paths. Nothing else.
 *
 * ## Why this is not generated from the demo content
 *
 * Because `content/pages.ts` is imported by `useDocumentMeta`, which every page component
 * imports — so a `pages.ts` that mapped over the actual demo sites would drag all five
 * fictional businesses into the eager bundle every visitor downloads before the homepage
 * paints. That is exactly what happened to the five industry pages, to the tune of about
 * 40 kB gzipped, and `content/industryMeta.ts` exists because of it. Same trap, same
 * shape, same answer: the metadata lives in a leaf both sides can import.
 *
 * The business names are therefore written twice — here, and in each demo module. That is
 * a real cost and it is the smaller one. `demos.test.ts` asserts the two agree, so the
 * duplication cannot drift even though it cannot be removed.
 *
 * ## Why every entry is `noIndex`
 *
 * These are five fictional businesses on the domain of a real one. Indexed, they would
 * compete with `/hvac-websites` and the other four pages that are actually built to rank
 * for trade searches, and a search result reading "Cascade Comfort Heating & Air" pointing
 * at a site that says "not a real business" is a bad result for everybody who clicks it.
 *
 * `noIndex` also keeps them out of `sitemap.xml`. They stay in `pages` regardless, because
 * `vercel.json` has **no SPA fallback** — every route needs a built HTML file or a hard
 * refresh 404s, and `build-seo.ts` writes one file per entry here.
 * ============================================================================
 */

/** The fictional business each demo is for. Asserted against the demo modules by a test. */
const businesses: Readonly<Record<DemoSlug, { readonly name: string; readonly trade: string }>> = {
  hvac: { name: 'Cascade Comfort Heating & Air', trade: 'heating and cooling' },
  plumbing: { name: 'Emerald Line Plumbing', trade: 'plumbing' },
  roofing: { name: 'Rainshadow Roofing', trade: 'roofing' },
  landscaping: { name: 'Alder & Fern Landscaping', trade: 'garden care' },
  electrical: { name: 'Sound Current Electric', trade: 'electrical' },
};

/**
 * The three pages, described once and applied to every trade.
 *
 * Every description opens with "Demonstration site" so that the disclosure survives being
 * read anywhere a description is shown — a link preview, a browser tab's tooltip, a shared
 * message. These are `noIndex`, so no search engine should ever show one; that is a reason
 * to be careful rather than a reason to relax.
 */
const shapes = [
  {
    page: 'home' as const,
    title: (name: string) => name,
    description: (name: string, trade: string) =>
      `Demonstration site. ${name} is a fictional ${trade} business, built to show how a local service website should be structured. Not a real company.`,
  },
  {
    page: 'services' as const,
    title: (name: string) => `${name} — services`,
    description: (name: string, trade: string) =>
      `Demonstration site. The ${trade} service list for ${name}, a fictional business — written the way customers describe the job rather than the way it is invoiced.`,
  },
  {
    page: 'contact' as const,
    title: (name: string) => `${name} — contact`,
    description: (name: string, trade: string) =>
      `Demonstration site. The contact page for ${name}, a fictional ${trade} business. The quote form is inert: nothing entered on it is sent or stored.`,
  },
];

export const demoMeta: readonly PageMeta[] = DEMO_SLUGS.flatMap((slug) => {
  const business = businesses[slug];

  return shapes.map((shape): PageMeta => ({
    path: demoPath(slug, shape.page),
    title: shape.title(business.name),
    description: shape.description(business.name, business.trade),
    noIndex: true,
  }));
});

/** Exported for the test that asserts the names here match the demo modules. */
export const demoBusinessNames: Readonly<Record<DemoSlug, string>> = Object.fromEntries(
  DEMO_SLUGS.map((slug) => [slug, businesses[slug].name]),
) as Record<DemoSlug, string>;
