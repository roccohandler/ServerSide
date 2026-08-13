import { gzipSync } from 'node:zlib';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

/*
 * ============================================================================
 * THE EAGER PAYLOAD BUDGET
 * ============================================================================
 *
 * What a visitor downloads and parses before the first screen of the homepage can be
 * rendered: the entry script, everything `index.html` modulepreloads, and every
 * stylesheet it links. Lazy chunks are excluded — they are the point of being lazy.
 *
 * ## Why this exists
 *
 * Because the last regression of exactly this kind was invisible for weeks. Every lazy
 * route's *copy* — the twenty PlayBook improvements, all five industry pages, the
 * teardown, the audit — was riding in the shared chunk, because they were re-exported
 * from `content/index.ts` and every component imports that barrel. The component code was
 * split correctly, so every dashboard and every code review said the splitting worked.
 * The shared chunk was 236 kB. Nothing failed. Nobody could have noticed without
 * measuring, and nothing was measuring.
 *
 * A site whose pitch is "your website should not waste the customer's time" cannot find
 * out about its own page weight from a customer.
 *
 * ## Why the numbers are where they are
 *
 * They are the measured cost at the time of writing, plus a small allowance so that
 * editing a paragraph does not fail a build. The allowance is deliberately smaller than
 * a new dependency, a new eager route or a re-exported content module — the three things
 * that have ever actually moved this number.
 *
 * **Raising them is allowed.** Raising them without saying what the bytes bought is the
 * thing this file exists to make awkward. The gzipped figure is the one to argue about:
 * it is what crosses the network. The raw figure is what the phone has to parse, which is
 * the part that shows up in INP on a mid-range Android.
 *
 * Thresholds this is protecting, at the 75th percentile of real visits:
 * LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1. See `docs/VALUE-PER-SECOND.md` §3.
 * ============================================================================
 */
/*
 * ## The one time this has been raised, and what bought it
 *
 * 2026-08-12: 455.0 → 465.0 kB raw, 140.0 → 142.0 kB gzipped.
 *
 * The offer rebuild failed this check by 0.7 kB the first time it was run, which is the
 * guard doing its job on the commit that added the guard's author. What the 11 kB bought:
 * three project tiers with a founding-client price each, the founding offer and its
 * conditions, the eight-point launch standard, and two care plans — all of it copy on the
 * homepage, none of it a dependency and none of it a new eager route.
 *
 * That is the trade this file exists to make visible. It is not a licence to keep raising
 * the number; the next increase needs its own line here.
 */
const BUDGET = {
  /** Entry script + everything modulepreloaded by `index.html`. Measured: 455.7 / 137.8. */
  js: { raw: 465_000, gzip: 142_000 },
  /**
   * Every stylesheet `index.html` links. Render-blocking, so it is LCP's problem too.
   * Measured: 87.2 / 13.7.
   */
  css: { raw: 95_000, gzip: 15_000 },
} as const;

const DIST = resolve(import.meta.dirname, '..', 'dist');

interface Measured {
  readonly raw: number;
  readonly gzip: number;
  readonly files: readonly string[];
}

/**
 * Pulls asset paths out of the built HTML.
 *
 * A regex rather than an HTML parser on purpose: this reads Vite's own output, which is
 * generated from a template in this repository, and adding a parser dependency to a
 * script whose entire job is to complain about dependencies would be its own punchline.
 */
function assetsIn(html: string): { js: string[]; css: string[] } {
  const js = new Set<string>();
  const css = new Set<string>();

  for (const [, href] of html.matchAll(/<script[^>]+src="([^"]+)"/g)) {
    if (href) js.add(href);
  }
  for (const [, href] of html.matchAll(/rel="modulepreload"[^>]+href="([^"]+)"/g)) {
    if (href) js.add(href);
  }
  // Order-independent: Vite emits `rel` before `href` for preloads and after it for
  // stylesheets, and has swapped which it does at least once.
  for (const [, href] of html.matchAll(/<link[^>]+href="([^"]+\.css)"/g)) {
    if (href) css.add(href);
  }

  return { js: [...js], css: [...css] };
}

async function measure(paths: readonly string[]): Promise<Measured> {
  let raw = 0;
  let gzip = 0;

  for (const path of paths) {
    const contents = await readFile(join(DIST, path.replace(/^\//, '')));
    raw += contents.byteLength;
    gzip += gzipSync(contents).byteLength;
  }

  return { raw, gzip, files: paths };
}

const kb = (bytes: number) => `${(bytes / 1000).toFixed(1)} kB`;

/**
 * Measures the built homepage against the budget and throws if it is over.
 *
 * Called from `scripts/build.ts`, so it runs on every production build and therefore on
 * every `npm run verify` — a budget that only runs in CI is a budget that is discovered
 * to be broken by somebody who did not break it.
 */
export async function checkBudget(): Promise<void> {
  const html = await readFile(join(DIST, 'index.html'), 'utf8');
  const { js, css } = assetsIn(html);

  if (js.length === 0 || css.length === 0) {
    throw new Error(
      `[budget] Found ${js.length} scripts and ${css.length} stylesheets in dist/index.html. ` +
        'That is not a homepage — the markup this script reads has changed shape and it is ' +
        'now measuring nothing. Fix `assetsIn` rather than the budget.',
    );
  }

  const measured = { js: await measure(js), css: await measure(css) };
  const failures: string[] = [];

  for (const kind of ['js', 'css'] as const) {
    for (const unit of ['raw', 'gzip'] as const) {
      const actual = measured[kind][unit];
      const allowed = BUDGET[kind][unit];
      if (actual > allowed) {
        failures.push(
          `  ${kind.toUpperCase()} ${unit}: ${kb(actual)} exceeds the ${kb(allowed)} budget ` +
            `by ${kb(actual - allowed)}`,
        );
      }
    }
  }

  const summary =
    `[budget] eager JS ${kb(measured.js.raw)} (${kb(measured.js.gzip)} gzipped) ` +
    `across ${measured.js.files.length} chunks; ` +
    `CSS ${kb(measured.css.raw)} (${kb(measured.css.gzip)} gzipped)`;

  if (failures.length > 0) {
    throw new Error(
      `${summary}\n\nThe first screen got heavier than the budget allows:\n${failures.join('\n')}\n\n` +
        'Before raising the numbers in scripts/check-budget.ts, check the two causes that ' +
        'have actually done this:\n' +
        "  1. A lazy route's content re-exported from content/index.ts — see the note at\n" +
        '     the bottom of that file. It puts the module in the shared preloaded chunk\n' +
        '     however carefully the component was split.\n' +
        '  2. A new eager route in app/App.tsx.\n' +
        'If neither applies and the weight is genuinely earning its place, raise the budget\n' +
        'and say in the commit message what it bought.',
    );
  }

  console.log(summary);
}
