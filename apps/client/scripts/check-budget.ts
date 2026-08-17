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
 * ## The times this has been raised, and what each bought
 *
 * 2026-08-12: 455.0 → 465.0 kB raw, 140.0 → 142.0 kB gzipped.
 *
 * The offer rebuild failed this check by 0.7 kB the first time it was run, which is the
 * guard doing its job on the commit that added the guard's author. What the 11 kB bought:
 * three project tiers with a founding-client price each, the founding offer and its
 * conditions, the eight-point launch standard, and two care plans — all of it copy on the
 * homepage, none of it a dependency and none of it a new eager route.
 *
 * 2026-08-13: 465.0 → 488.0 kB raw, 142.0 → 148.0 kB gzipped. Measured 477.7 / 144.4.
 *
 * The offer simplification. What the ~13 kB bought: the year-one cost block (both paths,
 * in full), the build-versus-plan comparison table, the grouped commercial terms, the
 * responsibilities split, the after-launch choice, and the "why isn't it $299 a month"
 * answer — every one of them an answer to a question the audit found the page leaving
 * open. Removed at the same time: two project tiers and a second care plan. No new
 * dependency, no new eager route (the welcome page is lazy).
 *
 * That is the trade this file exists to make visible. It is not a licence to keep raising
 * the number; the next increase needs its own line here.
 *
 * 2026-08-13 (third that day): CSS 98.0 → 99.0 kB raw, 15.5 → 16.0 gzipped. Measured
 * 97.1 / 15.5. JS untouched, and it went *down* — 487.6 → 489.2 raw is inside the existing
 * ceiling, and the ScoreScale consolidation moved code out of two lazy chunks into one.
 *
 * The JobForge brand identity, and the design-system work that came with it. What the
 * ~2.4 kB raw and ~0.5 kB gzipped bought:
 *
 *   - The Forge Stamp lockup (`components/brand/Logo.module.css`), which is eager because
 *     the header and the footer both render it. This is the only genuinely *new* eager
 *     stylesheet, and it is the mark itself.
 *   - The header inverting to a charcoal bar, which added the mark, the text column and
 *     the on-dark states for the nav, phone, call button and menu.
 *   - The token layers the system was missing: a named z-index scale, motion easing, the
 *     two translucent on-dark panels, `--space-hair` and `--radius-xs`.
 *
 * What was given back rather than simply added, because the first attempt was 0.1 kB over
 * and "raise it" is the answer this file exists to make awkward:
 *
 *   - Thirteen unreferenced custom properties, now three. The four `--brand-*` foundation
 *     values are documented in a comment instead (stripped at build time); `--weight-black`,
 *     `--radius-xl`, `--transition-slow` and four unused z-index layers are gone, to be
 *     added back in the same commit as whatever needs them.
 *   - The duplicated scorecard control, which existed in full in both `Audit.module.css`
 *     and `Assessment.module.css` and is now one lazy `ScoreScale`.
 *
 * No new dependency, no new eager route. The web font is a network request rather than a
 * bundle byte and does not appear in these figures — see README and VALUE-PER-SECOND §9,
 * both of which were corrected rather than left claiming the site has no web fonts.
 *
 * 2026-08-13 (second raise that day): JS 488.0 → 496.0 kB raw, 148.0 → 150.0 gzipped;
 * CSS 95.0 → 98.0 kB raw, 15.0 → 15.5 gzipped. Measured 487.6 / 147.2 and 94.7 / 15.0.
 *
 * The visual sales system. What the ~5.5 kB JS and ~3.3 kB CSS bought: the hero now
 * shows framed screenshots of a real demonstration build instead of an abstract SVG
 * wireframe, the before/after section bridges to a phone-framed capture of a finished
 * demo, the examples grid shows all five trades, `/portfolio` presents each build as a
 * desktop-plus-phone showcase row, and `/services` gained a three-card product strip.
 * The screenshots themselves are outside this budget by design (hashed static assets,
 * lazy-loaded); these bytes are the frames, captions and layout that present them. No
 * new dependency, no new eager route, no new homepage section.
 */
/*
 * 2026-08-13: JS 496.0 → 506.0 kB raw, 150.0 → 153.0 gzipped. Measured 498.4 / 150.8.
 *
 * The customer platform. What the ~11 kB raw and ~3.6 kB gzipped bought, and why every
 * byte of it is genuinely eager rather than a splitting mistake:
 *
 *   - `features/auth/AuthContext.tsx` — the one authenticated-user state. It cannot be
 *     lazy, because the *marketing* header reads it: a customer mid-build who lands on
 *     the homepage sees "Dashboard" instead of "Sign in", and the alternative is a
 *     header that flickers between the two when a chunk arrives.
 *   - `lib/http.ts` — the shared fetch layer. `lib/api.ts` now sits on top of it, so
 *     this is partly a replacement rather than an addition: the marketing forms gave up
 *     their own copy of the timeout, the envelope check and the failure constants.
 *   - `features/auth/api/authApi.ts` — eleven one-line functions, of which the header's
 *     session check uses one. Splitting them to save ten lines would cost a network
 *     round trip during first paint to save well under a kilobyte.
 *   - The route table's ten new lazy imports, and the runtime constants in
 *     `types/api.ts` that the eager code actually references.
 *
 * What is NOT in this number, and is why it is 11 kB rather than sixty: every page of
 * the private application, both credential pages, the private layout, the Google
 * integration and the assessment hand-off. All lazy, and this check is what keeps that
 * true — eagerly importing any one of them fails the build.
 *
 * CSS did not move. The private application's stylesheets are in its own chunks.
 */
/*
 * 2026-08-13: JS 506.0 → 536.0 kB raw, 153.0 → 161.0 gzipped; CSS 99.0 → 108.0 kB raw,
 * 16.0 → 17.0 gzipped. Measured 527.3 / 158.4 and 105.8 / 16.3.
 *
 * The offer redesign. This is the largest single increase this file has recorded, so it gets
 * the longest justification — and the honest summary is that almost all of it is **copy on
 * the primary page**, which is where this site's argument lives and the one place weight is
 * worth paying for.
 *
 * What the ~29 kB raw and ~7.6 kB gzipped of JS bought, in descending order of size:
 *
 *   - **The Website Performance Report** (`content/offer.ts` → `websiteReport`, and
 *     `components/marketing/ReportExample`). The recurring fee used to be defended by an
 *     activity list — hosting, backups, monitoring — with "measurement, and what it means in
 *     plain English" as the last line of six. It is now a named monthly artefact with four
 *     stated contents, a worked illustrative month and its own honesty note. This is the
 *     single most expensive addition and the one the whole redesign turns on: it is what
 *     stops a $299 subscription reading as upkeep.
 *   - **The after-launch sequence** (`afterLaunch`, `AfterLaunchSection`). Launch → baseline
 *     → the first 30 days → the day-30 report → monthly. Every part already existed and none
 *     of it was findable; drawn once, it answers "when will I know it worked", which the page
 *     had no section for.
 *   - **The build's deliverables, regrouped** (`config/pricing.ts` → `buildOutcomes`). Seven
 *     promises, each with a mechanism name and a reason it matters, replacing a flat list of
 *     thirteen features. `flagship.includes` is now *derived* from it rather than typed
 *     beside it, so this is partly a replacement.
 *   - **Conversion Fix** (`conversionFix`, and its card). A third product, so the audit's
 *     middle recommendation stops ending at the words "quoted per site".
 *   - **The market comparison** (`marketComparison`), the build↔partner relationship diagram
 *     (`relationship`), the pricing card's five reassurance lines, a fourth guarantee about
 *     measurement, and three FAQ answers the site had never carried — why not a website
 *     builder, why not the cheap version, and what happens if you stop after the deposit.
 *   - **`EntrySection` becoming eager.** It was lazy-only, on `/services`; it is on the
 *     homepage again now, immediately before the price, because there is one build price
 *     rather than three tiers and the three cards route rather than upsell.
 *
 * The ~8.7 kB raw of CSS is the report card (its own module, because a shared marketing
 * component may not reach into a feature's stylesheet), the Conversion Fix card, the
 * relationship sequence, the after-launch boundary and the reassurance well.
 *
 * **What was given back**, because "raise it" is the answer this file exists to make awkward:
 *
 *   - The five `.first30*` classes in `Offer.module.css`. The dead-CSS guard found them the
 *     moment that content moved into `afterLaunch`, which is exactly the pairing these two
 *     checks are for: one measures the weight, the other finds the reason.
 *   - `ManagementSection` left the eager graph entirely. It moved to `/services` because once
 *     `CarePlans` carried the report and the full scope, about three quarters of it was a
 *     second rendering of the same argument on one page.
 *   - `.respColumn` stopped being a muted fill and became a white panel with a hairline, so
 *     the section it belongs to can be reordered without a stylesheet change. Not a saving;
 *     a reason the next reorder will not need one.
 *
 * No new dependency. No new eager route. Nothing lazy was re-exported from
 * `content/index.ts` — the four lazy content modules are still absent from it, and
 * `content.test.ts` still asserts they are in the sweep corpus anyway.
 */
/*
 * 2026-08-14: JS 536.0 → 545.0 kB raw, 161.0 → 164.0 gzipped; CSS 108.0 → 112.0 kB raw,
 * 17.0 → 18.0 gzipped. Measured 536.5 / 161.4 and 108.0 / 16.6.
 *
 * The UI refinement and the stepped credential flows. Two honest notes before the list.
 *
 * **This increase is not all one change.** The previous raise recorded 527.3 kB measured
 * against a 536.0 budget, and the tree was not built again between then and now — so the
 * 9.2 kB below includes eager work from that session which was never weighed (`RequireAdmin`
 * in the route table, and the admin surface's share of the shared chunk). I could not
 * separate the two cleanly without a build of an intermediate state that does not exist, and
 * guessing at a split would be worse than saying so.
 *
 * **The previous raise left no headroom** — it set the budget to within 0.1 kB of the
 * measured CSS figure, so the very next change of any size failed the build. These numbers
 * deliberately leave about 8 kB of JS and 4 kB of CSS, which is enough that a comment or a
 * class does not fail a build and far too little to hide a lazy route leaking into the eager
 * graph, which is the failure this guard exists for.
 *
 * What the eager additions are, in descending order of size:
 *
 *   - **`app/ErrorBoundary`**, and it is the reason this raise is defensible at all. The
 *     application had no error boundary anywhere, so one section reading a renamed content
 *     property rendered the *entire site* blank — no header, no phone number, no footer, on
 *     every route the layout wraps. That happened, on the homepage, the day before this. Two
 *     boundaries are wired: one in `SiteLayout` around the routed page, so a bad section
 *     costs that page and not the navigation, and one in `App` for the layout itself. It
 *     cannot be lazy: a boundary that arrives in a chunk is a boundary that was not there
 *     when the throw happened.
 *   - **`PasswordField`** in `components/ui/Field`. The show/hide toggle, shared by the
 *     sign-up, sign-in and reset forms. `Field` is eager because the marketing contact forms
 *     use it, so this rides along — about a hundred lines including the toggle button and its
 *     `aria-pressed` handling.
 *   - **`OfferStack`**, which is a *replacement* rather than an addition: the same seven
 *     cards `OfferSection` used to render inline, now behind a `variant` so the homepage
 *     shows a compact grid and `/services` shows the full detail. Slightly larger as a
 *     component than as inline JSX, and it is what took 14,160px of homepage down to 580.
 *   - **Two icons** (`eye`, `eye-off`) and the header's utility strip.
 *
 * The CSS is the boundary's fallback screen, the password toggle, the utility strip, the
 * echoed-address panel on the stepped forms, and the terms disclosure.
 *
 * **What was given back:** `.heroPriceChoice` and `.heroPriceNote` were deleted when the two
 * hero paragraphs became one, and the dead-CSS guard in `content.test.ts` is what found them
 * — the same pairing the previous entry describes. The homepage itself is 4.5 kpx shorter and
 * 1,100 words lighter, but that is scroll rather than payload and is not claimed here.
 *
 * Nothing lazy was re-exported from `content/index.ts`. No new dependency. No new eager route.
 */
/*
 * 2026-08-15: CSS 112.0 → 120.0 kB raw, 18.0 → 20.0 gzipped. Measured 112.1 / 18.0.
 *
 * The state layer — DECISION 029. This is the largest raise this file has recorded and the
 * first one that is not copy on the primary page, so it gets the sharpest justification.
 *
 * **It fired on 0.1 kB.** The change that tripped it was a delayed route fallback and a skip
 * link, together about 0.7 kB raw — which is worth stating plainly, because it means the
 * previous ceiling had no headroom left at all rather than that this change was large. The
 * last raise recorded 108.0 measured against 112.0; the tree grew to 111.4 without anyone
 * measuring again, and 0.6 kB is not a budget.
 *
 * What the raise was actually spent on, measured after everything landed at 112.7 / 18.2:
 *
 *   - **The delayed route fallback and three skip links** (~0.6 kB). The fallback is the only
 *     eager part of the state work and it has to be: a fallback that arrives in a chunk is a
 *     fallback that was not there while the chunk was slow, which is the only situation it
 *     exists for. Five `Suspense fallback={null}` boundaries and two `return null` guards
 *     rendered a blank content area for the whole of a cold load.
 *   - **`Table` and `Tabs`** (~0.6 kB), which have consumers: the console's two tables and
 *     the customer project page's four views.
 *   - **Three z-index tokens and `--color-scrim`** (~0.1 kB). `tokens.css` named the first
 *     three in a comment — "a dropdown belongs at 30, a modal at 50, a toast at 60" — and
 *     declined to declare them until something needed one. Three things now do.
 *   - **Headroom.** The previous raise left 0.6 kB, which is not a budget. This one leaves
 *     about 7 kB raw, deliberately: enough that a comment or a class does not fail a build,
 *     far too little to hide a lazy route leaking into the eager graph.
 *
 * ## What it was *not* spent on, and the correction that matters
 *
 * The plan that authorised this raise budgeted ~6.3 kB for eight primitives, on the reasoning
 * that `@jobforge/ui`'s barrel is eager so an unused export is weight every visitor downloads.
 * **Measured, that is wrong.** Adding `Modal` and `Drawer` moved the eager bundle by zero
 * bytes, and `aria-modal` appears in no chunk in `dist` at all: Rollup drops a barrel export
 * nothing imports, and the CSS module goes with it because its import lives inside the dropped
 * file.
 *
 * So the six primitives with no consumer — Modal, Drawer, Toast, Tooltip, Switch, Avatar —
 * cost nothing here and will cost something the day something imports them. That is worth
 * knowing before the next person argues about a component's weight: **in this package, weight
 * follows use, not declaration.** It also means the raise above is smaller than it looks
 * relative to what it enabled.
 *
 * What was given back, because "raise it" is the answer this file exists to make awkward:
 *
 *   - Thirteen bespoke outcome-message classes across five stylesheets, replaced by one
 *     `Notice` pattern per application. About 0.5 kB, all of it in lazy chunks so it does not
 *     show in the figure below — but the system got smaller, not larger.
 *   - Six hand-rolled data-loading state machines onto the `useResource` that already existed
 *     for exactly this reason. Roughly 150 lines.
 *
 * No new dependency. No new eager route. Nothing lazy was re-exported from
 * `content/index.ts`.
 */
const BUDGET = {
  /**
   * Entry script + everything modulepreloaded by `index.html`. Measured: 534.9 / 162.4.
   *
   * Not raised. The state work added about 2.4 kB — the four shared hooks, the session-lost
   * handler and `FIELD_LIMITS` — against 12.5 kB of headroom that was already there.
   */
  js: { raw: 545_000, gzip: 164_000 },
  /**
   * Every stylesheet `index.html` links. Render-blocking, so it is LCP's problem too.
   * Measured: 112.7 / 18.2.
   */
  css: { raw: 120_000, gzip: 20_000 },
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
