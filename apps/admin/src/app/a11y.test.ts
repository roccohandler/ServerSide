import { readFileSync, readdirSync } from 'node:fs';
import { join, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

/*
 * ============================================================================
 * THE CONSOLE'S ACCESSIBILITY CONTRACT, ENFORCED
 * ============================================================================
 *
 * The customer application has had a skip link, a focus move on every route change and a
 * document title per page since it was built, and each of those is written down in a comment
 * explaining why. The console had **none of them** — not because anybody decided against it,
 * but because `apps/admin` was assembled from three screens that were moved out of the
 * customer bundle and a layout that was written fresh, and the layout is where all three of
 * those things live.
 *
 * That is the failure mode this file exists for: a property that is true of one application,
 * argued for at length in that application's source, and simply absent from the other one.
 * A comment in `SiteLayout` cannot fail a build in `apps/admin`.
 *
 * ## Why these read the source instead of rendering
 *
 * The same reason `tokens.test.ts` and `outline.test.tsx` do. The question is "does every
 * screen do this", and rendering five screens means five sets of router context, session
 * fakes and fetch stubs to assert a property that is visible in one line of each file. A
 * source read asks the question directly and cannot be defeated by a test setup that happens
 * to supply the thing being checked.
 *
 * Every assertion below carries a "guards the guard" count, because a walker that silently
 * matches nothing passes forever — which is exactly how `tokens.test.ts` once stopped
 * checking the entire marketing site.
 * ============================================================================
 */

const SRC = join(import.meta.dirname, '..');

const SKIP = new Set(['node_modules', 'dist']);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (SKIP.has(entry.name)) return [];
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) && !entry.name.includes('.test.') ? [path] : [];
  });
}

const basename = (file: string) => file.split(sep).pop() ?? file;

/**
 * Every screen the router can land on.
 *
 * Found by naming convention rather than by a hand-maintained list, so a sixth screen is
 * covered the moment it is written rather than the moment somebody remembers this file.
 */
function pageFiles(): { file: string; source: string }[] {
  return sourceFiles(SRC)
    .filter((file) => /Page\.tsx$/.test(basename(file)))
    .map((file) => ({ file: basename(file), source: readFileSync(file, 'utf8') }));
}

describe('the console', () => {
  it('finds the screens it is supposed to be checking', () => {
    // A walker that matches nothing is a test that passes forever.
    expect(pageFiles().length).toBeGreaterThanOrEqual(5);
  });

  /*
   * ==========================================================================
   * EVERY SCREEN SETS A DOCUMENT TITLE
   * ==========================================================================
   *
   * All five rendered under `index.html`'s single title until 2026-08-15, which made browser
   * history a list of identical entries and — the part that actually matters — meant a route
   * change announced nothing at all. In a single-page application the document title is the
   * only automatic announcement a navigation produces.
   */
  it('sets a document title on every screen', () => {
    const missing = pageFiles()
      .filter(({ source }) => !source.includes('useTitle('))
      .map(({ file }) => file);

    expect(
      missing,
      'These screens never write a document title, so navigating to them announces nothing ' +
        'and leaves the browser history entry indistinguishable from every other. Call ' +
        '`useTitle` from hooks/useTitle.ts.',
    ).toEqual([]);
  });

  /*
   * ==========================================================================
   * THE SHELL CARRIES WHAT THE SHELL IS FOR
   * ==========================================================================
   *
   * Three properties, all of them true of both of the customer application's layouts and
   * none of them true of this one until 2026-08-15. They are asserted against the layout
   * source rather than a render because that is where they are decided: a rendered test
   * would need router context and a session fake to check three attributes.
   */
  describe('the shell', () => {
    const layout = readFileSync(join(SRC, 'app', 'ConsoleLayout.tsx'), 'utf8');

    it('offers a skip link past the navigation', () => {
      expect(
        layout.includes('Skip to main content'),
        'Every console screen puts three destinations and a sign-out control ahead of the ' +
          'content. Without a skip link a keyboard user tabs through all four on every page.',
      ).toBe(true);
    });

    it('gives <main> an id and makes it focusable', () => {
      expect(layout).toContain('CONSOLE_MAIN_ID');
      expect(
        layout.includes('tabIndex={-1}'),
        'The skip link and the route-change focus move both need <main> to be able to take ' +
          'focus. Without tabIndex={-1} both silently do nothing.',
      ).toBe(true);
    });

    it('moves focus when the route changes', () => {
      expect(
        layout.includes('mainRef.current?.focus()'),
        'A single-page application does not reload the document, so a route change announces ' +
          'nothing and leaves focus on the link that was clicked.',
      ).toBe(true);
    });
  });

  /*
   * ==========================================================================
   * EXACTLY ONE LIVE REGION, MOUNTED BEFORE IT HAS ANYTHING TO SAY
   * ==========================================================================
   *
   * One, because two regions announcing the same outcome is worse than none — the reader
   * hears it twice and stops trusting either. Mounted early, because a region that appears
   * at the same moment as its text is a region most screen readers never announce.
   */
  it('owns exactly one aria-live region, and mounts it above the routes', () => {
    const regions = sourceFiles(SRC)
      .map((file) => ({ file: basename(file), source: readFileSync(file, 'utf8') }))
      .filter(({ source }) => source.includes('aria-live'));

    expect(
      regions.map(({ file }) => file),
      'The console announces every outcome through one region, provided by ' +
        'components/Announcer and mounted in app/App.tsx. A second one would announce the ' +
        'same thing twice.',
    ).toEqual(['Announcer.tsx']);

    expect(readFileSync(join(SRC, 'app', 'App.tsx'), 'utf8')).toContain('AnnouncerProvider');
  });
});
