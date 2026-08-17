import { readFileSync, readdirSync } from 'node:fs';
import { join, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

/*
 * ============================================================================
 * WHAT EVERY SHELL OWES THE PERSON INSIDE IT
 * ============================================================================
 *
 * A single-page application does not reload the document, so four things that a server-rendered
 * site gets for free have to be written by hand in every layout: a way past the navigation, a
 * focusable landmark to land on, a focus move when the route changes, and something to catch a
 * throw before it takes the whole page down.
 *
 * `SiteLayout` has all four and explains each of them at length. The other layouts were written
 * later — `AuthLayout` when the credential pages left the marketing shell, `AppLayout` when the
 * portal was built, `DemoLayout` for the demonstration sites — and each arrived with a subset.
 * Nothing decided against the rest. **A comment in one layout cannot fail a build in another**,
 * which is what this file is for.
 *
 * What it found when it was first run: `AuthLayout` and `DemoLayout` had no skip link, and
 * `AppLayout` had no error boundary — so a throw in any `/app` page discarded the workspace
 * navigation, the sign-out control and the support address, on the surface where somebody is
 * signed in and mid-task.
 *
 * ## Why these read the source
 *
 * The same reason `tokens.test.ts` and `outline.test.tsx` do: the question is "does every one
 * of them do this", and rendering five shells means five sets of router context, session fakes
 * and content stubs to check four attributes that are visible in one line each.
 * ============================================================================
 */

const SRC = join(import.meta.dirname, '..');
const LAYOUTS = join(SRC, 'components', 'layout');

const basename = (file: string) => file.split(sep).pop() ?? file;

/**
 * Every shell a route renders inside.
 *
 * `DemoLayout` lives with its feature rather than in `components/layout/`, because it paints
 * another business's site rather than this one's — so it is named explicitly here. The rest
 * are found by convention, which is what covers a sixth shell the day it is written.
 */
function shells(): { file: string; source: string }[] {
  const fromLayoutFolder = readdirSync(LAYOUTS)
    .filter((name) => /Layout\.tsx$/.test(name))
    .map((name) => join(LAYOUTS, name));

  const demo = join(SRC, 'features', 'public', 'demo', 'DemoLayout.tsx');

  return [...fromLayoutFolder, demo].map((file) => ({
    file: basename(file),
    source: readFileSync(file, 'utf8'),
  }));
}

describe('every shell', () => {
  it('finds the shells it is supposed to be checking', () => {
    // A walker that matches nothing is a test that passes forever.
    expect(shells().length).toBeGreaterThanOrEqual(4);
  });

  it('offers a way past the navigation', () => {
    const missing = shells()
      .filter(({ source }) => !source.includes('Skip to main content'))
      .map(({ file }) => file);

    expect(
      missing,
      'These put chrome ahead of the content with no way past it. Every other shell has a ' +
        'skip link; a keyboard user should not have to learn which pages have one.',
    ).toEqual([]);
  });

  it('gives its main landmark a focus target', () => {
    const missing = shells()
      .filter(({ source }) => !source.includes('tabIndex={-1}'))
      .map(({ file }) => file);

    expect(
      missing,
      'The skip link and the route-change focus move both need the landmark to be able to ' +
        'take focus. Without tabIndex={-1} both silently do nothing.',
    ).toEqual([]);
  });

  it('moves focus when the route changes', () => {
    const missing = shells()
      .filter(({ source }) => !/\.focus\(\)/.test(source))
      .map(({ file }) => file);

    expect(
      missing,
      'A route change in a single-page application announces nothing and leaves focus on the ' +
        'link that was clicked. Every shell has to move it.',
    ).toEqual([]);
  });

  it('catches a throw before it reaches the whole document', () => {
    const missing = shells()
      .filter(({ source }) => !source.includes('ErrorBoundary'))
      .map(({ file }) => file);

    expect(
      missing,
      'Without a boundary around the outlet, one section reading a renamed content property ' +
        'discards the entire shell — the navigation, the phone number and the way out with ' +
        'it. That has happened, on the homepage. See app/ErrorBoundary.tsx.',
    ).toEqual([]);
  });
});

/*
 * ==========================================================================
 * NOTHING WAITS IN SILENCE
 * ==========================================================================
 *
 * Five `Suspense fallback={null}` boundaries and two `return null` session guards rendered a
 * blank content area for the whole of a cold load. Each carried a comment arguing that a
 * spinner appearing for 30ms is worse than nothing, and each was right about the fast case
 * and silent about the slow one.
 *
 * `RouteFallback` keeps the fast path — `useDelayedFlag` returns false for the first 400ms,
 * so these boundaries render exactly what they did before on any healthy connection.
 */
describe('the route boundaries', () => {
  function routeSources(): { file: string; source: string }[] {
    const dir = join(SRC, 'app', 'routes');
    return readdirSync(dir)
      .filter((name) => name.endsWith('.tsx'))
      .map((name) => ({
        file: name,
        source: readFileSync(join(dir, name), 'utf8'),
      }));
  }

  it('finds the route modules', () => {
    expect(routeSources().length).toBeGreaterThanOrEqual(4);
  });

  it('never falls back to nothing', () => {
    const silent = [...routeSources(), ...shells()]
      .filter(({ source }) => source.includes('fallback={null}'))
      .map(({ file }) => file);

    expect(
      silent,
      'A null Suspense fallback is a blank content area for as long as the chunk takes. Use ' +
        'RouteFallback, which renders nothing for the first 400ms and is therefore the same ' +
        'thing on a warm connection.',
    ).toEqual([]);
  });
});
