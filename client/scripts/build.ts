/*
 * Production build entry point.
 *
 * ## Why this file exists rather than `vite build && tsx scripts/build-seo.ts`
 *
 * `.env` is shared with the server and can legitimately contain NODE_ENV=development.
 * Vite honours that value, and the result is a *development* React bundle emitted by a
 * command called `build` — 522 kB instead of 295 kB, 154 kB gzipped instead of 93 kB,
 * with no warning. On a site whose pitch is "loads fast on a phone", that is the worst
 * kind of bug: silent, and in the shipped artefact.
 *
 * Vite decides this by reading `process.env.NODE_ENV` when its module first loads, and
 * only falls back to the `.env` value if nothing was set. So NODE_ENV is pinned here,
 * before Vite is imported. Setting it inside `vite.config.ts` is too late — the config
 * is resolved after that check has already run.
 *
 * The dynamic import below is load-bearing: a static `import { build } from 'vite'`
 * would be hoisted above the assignment and the pin would do nothing.
 */

// Marks this file as a module so top-level await is permitted. Dynamic imports alone
// do not, and a static import here would defeat the point of the assignment below.
export {};

process.env['NODE_ENV'] = 'production';

const { build } = await import('vite');
const { generateSeoFiles } = await import('./build-seo.js');
const { checkBudget } = await import('./check-budget.js');

await build();
await generateSeoFiles();

/*
 * Last, and it throws.
 *
 * The build is the only place the real answer exists — bundling decisions are made by
 * Rollup, not by anything a test can see — so this is where page weight gets checked.
 * `npm run verify` runs the build, which means a payload regression fails locally rather
 * than being discovered from a field measurement later.
 */
await checkBudget();
