import type { TradeSlug } from './trades';

/*
 * ============================================================================
 * THE DEMONSTRATION SITES — SLUGS, PATHS AND THE PALETTE CONTRACT
 * ============================================================================
 *
 * Five example websites for five trades, served from this application rather than from
 * five deployments. This file holds the parts that are configuration rather than copy:
 * which trades have a demo, what their URLs are, and which palette each one paints.
 *
 * ## Why this is separate from `config/trades.ts`
 *
 * Because having a demo is not a property of a trade. `trades.ts` is the taxonomy the
 * audit branches on and the industry pages are generated from; a demo is a thing that has
 * been *built*, and the honest state of the world is that four of them could exist and the
 * fifth not. `DEMO_SLUGS` is the list of trades a demo has actually been written for, and
 * the portfolio's `demoUrl` is filled from it rather than assumed.
 *
 * ## Rules
 *
 *   1. **A slug here must be a `TradeSlug`.** The type enforces it. A demo for a trade the
 *      audit has never heard of would be a sixth taxonomy.
 *   2. **`other` never gets a demo.** It is not a trade, it is the escape hatch, and there
 *      is nothing to demonstrate for "something else".
 *   3. **Every path this file produces needs four things in lockstep** — a `routes.ts`
 *      constant, a `PageMeta` entry, a route in `App.tsx`, and therefore an HTML file from
 *      `build-seo.ts`. `vercel.json` has no SPA fallback, so a route without a built file
 *      404s on refresh. `content.test.ts` asserts the first two; the third is asserted by
 *      the anchor and outline tests rendering the page at all.
 * ============================================================================
 */

/** The trades a demonstration site has actually been built for. */
export const DEMO_SLUGS = ['hvac', 'plumbing', 'roofing', 'landscaping', 'electrical'] as const;

export type DemoSlug = (typeof DEMO_SLUGS)[number];

/**
 * The three pages every demo has.
 *
 * `home` is the index route and contributes no path segment. The other two are real
 * routes rather than anchors, because the thing being demonstrated is partly that the
 * navigation goes somewhere — a nav bar whose links scroll is a nav bar that has not been
 * tested by the person deciding whether to hire you.
 */
export const DEMO_PAGES = ['home', 'services', 'contact'] as const;

export type DemoPage = (typeof DEMO_PAGES)[number];

/**
 * The URL of a demo page, derived rather than typed out.
 *
 * `/demo/hvac` rather than `/examples/hvac` or `/demo/cascade-comfort`: the word "demo" is
 * in the path itself, so the disclosure survives the URL being pasted into an email with
 * no surrounding context. That matters more here than it does for any other route on the
 * site, because this is the only page that deliberately looks like somebody else's
 * business.
 */
export function demoPath(slug: DemoSlug, page: DemoPage = 'home'): string {
  return page === 'home' ? `/demo/${slug}` : `/demo/${slug}/${page}`;
}

/** Every demo URL, in route-registration order. 15 of them. */
export const demoPaths: readonly string[] = DEMO_SLUGS.flatMap((slug) =>
  DEMO_PAGES.map((page) => demoPath(slug, page)),
);

export function isDemoSlug(value: unknown): value is DemoSlug {
  return typeof value === 'string' && (DEMO_SLUGS as readonly string[]).includes(value);
}

/**
 * Narrows a `TradeSlug` to one that has a demo, or `undefined`.
 *
 * Used by the industry pages, which know their own trade and need to find out whether a
 * demo exists for it without assuming one does.
 */
export function demoForTrade(slug: TradeSlug): DemoSlug | undefined {
  return isDemoSlug(slug) ? slug : undefined;
}

/*
 * ============================================================================
 * THE PALETTE CONTRACT
 * ============================================================================
 *
 * Five sites that look like five businesses, from one component set.
 *
 * Each demo declares values for the custom properties below, and `DemoLayout` sets them
 * on its root element. Nothing in the demo components hard-codes a colour — they all read
 * these — so a sixth trade is a token block rather than a stylesheet.
 *
 * **This is a contract, not a suggestion.** A demo that omits a token inherits whatever
 * the previous demo set on a client-side navigation between two demos, which is the kind
 * of bug that only appears when somebody clicks from the HVAC demo to the roofing one.
 * The type makes every key required, and a test asserts every demo supplies all of them.
 */
export const DEMO_TOKENS = [
  '--demo-brand',
  '--demo-brand-strong',
  '--demo-accent',
  '--demo-ink',
  '--demo-ink-muted',
  '--demo-surface',
  '--demo-surface-alt',
  '--demo-on-brand',
] as const;

export type DemoToken = (typeof DEMO_TOKENS)[number];

/** Every token, required. See the note above on why none of these is optional. */
export type DemoPalette = Readonly<Record<DemoToken, string>>;
