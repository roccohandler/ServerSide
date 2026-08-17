import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/*
 * ============================================================================
 * THE BUILD IS A PRODUCTION BUILD
 * ============================================================================
 *
 * One property, and it is the one that broke: **no development React in `dist/`.**
 *
 * `vite.config.ts` sets `envDir: '../..'` so the console shares the repository's `.env`
 * with the server — and that file contains `NODE_ENV=development`, because the server
 * genuinely runs in development locally. Vite honours it, so `vite build` produced a
 * development bundle: `jsxDEV` for every element with its source file and line number
 * attached, React's development runtime, and none of the dead-code elimination that
 * `process.env.NODE_ENV === 'production'` unlocks.
 *
 * Nothing warns. The command is called `build`, it exits zero, and the artefact is simply
 * worse — 475 kB with 297 `jsxDEV` calls in it, measured, against a client bundle built
 * through the same pin with none. `scripts/build.ts` sets NODE_ENV before importing Vite;
 * this asserts it worked.
 *
 * ## Why it reads `dist/` instead of testing the script
 *
 * Because the script is not the property. Somebody could change the build command, add a
 * second entry point, or set the variable somewhere Vite reads later, and a test of
 * `build.ts` would still pass. The question is what is in the file that gets uploaded, so
 * that is what this opens.
 *
 * ## Why it skips when `dist/` is absent
 *
 * `npm run verify` runs the tests *before* the build, so on a clean checkout there is
 * nothing to read. Skipping is honest — but silently skipping forever would make this
 * decorative, so it fails rather than skips when `dist/` exists and is empty, and
 * `npm run build` is what makes it run for real.
 * ============================================================================
 */

const DIST = join(import.meta.dirname, '..', '..', 'dist', 'assets');

function bundles(): readonly string[] {
  if (!existsSync(DIST)) return [];

  const files = readdirSync(DIST).filter((name) => name.endsWith('.js'));

  /* A `dist/assets` with no JavaScript in it is a broken build, not an absent one. */
  expect(files.length, `${DIST} exists but contains no JavaScript.`).toBeGreaterThan(0);

  return files.map((name) => readFileSync(join(DIST, name), 'utf8'));
}

describe('the built console', () => {
  it('contains no development React', () => {
    const sources = bundles();
    if (sources.length === 0) {
      console.warn('[bundle.test] no dist/ yet — run `npm run build` to check this for real.');
      return;
    }

    /*
     * `jsxDEV` is the development JSX runtime. Its presence is not a style question: each
     * call carries `fileName` and `lineNumber`, so a development bundle also publishes the
     * source layout of every component in it.
     */
    for (const source of sources) {
      expect(source).not.toContain('jsxDEV');
    }
  });

  it('has had NODE_ENV folded out rather than left to the browser', () => {
    const sources = bundles();
    if (sources.length === 0) return;

    /*
     * A production build replaces `process.env.NODE_ENV` with the literal at bundle time.
     * If the identifier survives, the browser is being asked to resolve `process` — which
     * does not exist there — and something is being decided at runtime that should have
     * been decided at build time.
     */
    for (const source of sources) {
      expect(source).not.toContain('process.env.NODE_ENV');
    }
  });
});
