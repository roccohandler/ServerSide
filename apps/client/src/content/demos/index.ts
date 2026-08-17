import type { DemoSlug } from '../../config/demos';
import type { DemoSite } from './types';

/*
 * ============================================================================
 * THE DEMO CONTENT LOADER — NOT THE CONTENT BARREL
 * ============================================================================
 *
 * **This file must never be re-exported from `content/index.ts`.**
 *
 * That is not a style preference. Every component in this application imports the content
 * barrel, so anything re-exported from it lands in the chunk every visitor downloads
 * before the homepage can paint — and that has already happened once here, to the tune of
 * 236 kB: the whole of the PlayBook, the audit, five industry pages and the teardown rode
 * in the eager bundle for weeks because they were re-exported from the barrel while their
 * *components* were split correctly. Nothing failed. `scripts/check-budget.ts` exists
 * because of it, and it will fail the build if this file ever joins the barrel.
 *
 * ## Why the imports are dynamic, and why the map is static
 *
 * One chunk per trade. A visitor who opens the HVAC demo downloads the shell plus HVAC;
 * they do not download a roofer's service list they will never read.
 *
 * The map is written out rather than built from a template literal — `import(`./${slug}`)`
 * would compile, and Rollup would respond by bundling every module in the directory into
 * one chunk to be safe, silently undoing the split. A static map of arrow functions is
 * what lets the bundler see five separate entry points.
 *
 * ## Why promises are cached
 *
 * `use()` re-invokes this on every render. Without the cache each render would start a new
 * import, return a new promise, and suspend forever.
 * ============================================================================
 */

export const demoLoaders: Readonly<Record<DemoSlug, () => Promise<{ readonly demo: DemoSite }>>> = {
  hvac: () => import('./hvac'),
  plumbing: () => import('./plumbing'),
  roofing: () => import('./roofing'),
  landscaping: () => import('./landscaping'),
  electrical: () => import('./electrical'),
};

/**
 * One trade's content, as a promise.
 *
 * `DemoLayout` does not call this — it wraps `demoLoaders` in `React.lazy`, which is the
 * suspense mechanism this codebase already uses for five routes and which behaves
 * predictably under test. This exists for the tests and for anything that needs the data
 * outside a render.
 */
export function loadDemoSite(slug: DemoSlug): Promise<DemoSite> {
  return demoLoaders[slug]().then((module) => module.demo);
}

export type { DemoSite } from './types';
