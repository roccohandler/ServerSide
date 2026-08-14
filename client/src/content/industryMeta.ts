import { industryPath } from '../config/trades';
import type { TradeSlug } from '../config/trades';

/*
 * ============================================================================
 * INDUSTRY PAGE METADATA — A LEAF, ON PURPOSE
 * ============================================================================
 *
 * Five titles, five descriptions, five paths. Nothing else, and that is the whole point
 * of the file existing separately from `content/industries.ts`.
 *
 * ## What went wrong without it
 *
 * `content/pages.ts` needs a `PageMeta` per industry page, and the obvious way to get one
 * is to map over `industries`. `pages.ts` is imported by `useDocumentMeta`, which is
 * imported by every page component — so that one convenience put the *entire* content of
 * all five industry pages into the eager bundle that every visitor to the homepage
 * downloads. The component code was code-split correctly, which made the split look like
 * it was working while roughly 40 kB gzipped of copy rode along in the main chunk.
 *
 * The same trap caught `faq.ts` importing `playbook.ts` for a single integer.
 *
 * ## The rule
 *
 * **A module reachable from the eager bundle may not import a lazy route's content.** If
 * something eager needs one field from a heavy module, the field moves down here into a
 * leaf that both can import, and the heavy module reads it back — which is why
 * `industries.ts` spreads these entries rather than restating them. There is still exactly
 * one place each title is written.
 * ============================================================================
 */

export interface IndustryMeta {
  readonly slug: TradeSlug;
  /** Always `industryPath(slug)`. A test asserts it. */
  readonly path: string;
  readonly metaTitle: string;
  readonly metaDescription: string;
  /**
   * The trade in two or three words: the footer link, and the page's own eyebrow.
   *
   * It is down here rather than in `industries.ts` because the footer renders on every
   * page — so a footer that read the full industry content pulled all five pages' copy
   * into the chunk every visitor downloads, which is the whole failure this file exists
   * to prevent. `industries.ts` reads it back, so it is still written once.
   */
  readonly navLabel: string;
}

export const industryMeta: readonly IndustryMeta[] = [
  {
    slug: 'hvac',
    navLabel: 'Heating and cooling',
    path: industryPath('hvac'),
    metaTitle: 'Websites for HVAC companies',
    metaDescription:
      'How heating and cooling customers actually decide, where HVAC websites lose the call, and the pages the trade needs — plus a way to score your own site in about five minutes.',
  },
  {
    slug: 'plumbing',
    navLabel: 'Plumbing',
    path: industryPath('plumbing'),
    metaTitle: 'Websites for plumbing companies',
    metaDescription:
      'Emergency callers and remodel customers want different things from a plumbing website. What each one needs, where both get lost, and a free audit of your own site.',
  },
  {
    slug: 'roofing',
    navLabel: 'Roofing',
    path: industryPath('roofing'),
    metaTitle: 'Websites for roofing contractors',
    metaDescription:
      'A roof is compared across several contractors over weeks. What that means for a roofing website, where the evidence has to sit, and a free audit of your own site.',
  },
  {
    slug: 'landscaping',
    navLabel: 'Landscaping and yard care',
    path: industryPath('landscaping'),
    metaTitle: 'Websites for landscaping and yard care businesses',
    metaDescription:
      'Landscaping is decided with the eyes, and split between one-off projects and regular rounds. What that means for the website, plus a way to score your own in about five minutes.',
  },
  {
    slug: 'electrical',
    navLabel: 'Electrical',
    path: industryPath('electrical'),
    metaTitle: 'Websites for electrical contractors',
    metaDescription:
      'Licensing is the whole question in electrical work, and the jobs range from a dead socket to a panel upgrade. What the website has to do, plus a way to score your own site in about five minutes.',
  },
];

const metaBySlug = new Map(industryMeta.map((entry) => [entry.slug, entry]));

/** Resolves the metadata for a trade. Returns `undefined` rather than guessing. */
export function findIndustryMeta(slug: TradeSlug): IndustryMeta | undefined {
  return metaBySlug.get(slug);
}
