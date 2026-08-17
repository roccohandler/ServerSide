/*
 * Production build entry point.
 *
 * ## Why this file exists rather than `vite build`
 *
 * The same trap `apps/client/scripts/build.ts` was written for, and the console walked
 * straight into it: `envDir` points at the repository root so the `.env` there is shared
 * with the server, and that file legitimately contains `NODE_ENV=development`. Vite honours
 * it, and a command called `build` emits a **development React bundle** — `jsxDEV` calls
 * carrying `fileName` and `lineNumber` for every element, React's development runtime with
 * its warnings and checks, and no minifier benefit from `process.env.NODE_ENV` folding.
 *
 * It shipped that way until it was measured: 475 kB with 297 `jsxDEV` calls in it, against a
 * client bundle built through the pin that had zero. There is no warning, and the only
 * symptom is a bundle that is bigger and slower than it should be — plus the source paths
 * of every component embedded in it.
 *
 * Vite decides this by reading `process.env.NODE_ENV` when its module first loads, and only
 * falls back to the `.env` value if nothing was set. So NODE_ENV is pinned here, before Vite
 * is imported. Setting it inside `vite.config.ts` is too late — the config is resolved after
 * that check has already run.
 *
 * The dynamic import below is load-bearing: a static `import { build } from 'vite'` would be
 * hoisted above the assignment and the pin would do nothing.
 *
 * ## Why there is no budget check here
 *
 * `apps/client` fails its build on a payload regression because a visitor downloads it once,
 * on a phone, and may never come back. This is four screens behind a sign-in, opened by one
 * person all day. A budget on it would be a number nobody has a reason to defend — and
 * `bundle.test.ts` beside this file guards the thing that actually went wrong instead.
 */

// Marks this file as a module so top-level await is permitted. Dynamic imports alone
// do not, and a static import here would defeat the point of the assignment below.
export {};

process.env['NODE_ENV'] = 'production';

const { build } = await import('vite');

await build();
