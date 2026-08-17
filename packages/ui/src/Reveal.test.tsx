import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Reveal } from './Reveal';

/*
 * ============================================================================
 * WHAT MOTION IS ALLOWED TO SAY
 * ============================================================================
 *
 * `Reveal` was introduced to walk the reader through one ordered list. By the time
 * anybody counted, it was on thirty-three lists across twenty-four files and thirty-two
 * of them were staggered — including grids of cards with no order at all.
 *
 * A staggered reveal makes a claim: *these arrive one after another because the order
 * means something*. Where that is true it is information the layout cannot carry. Where
 * it is false the reader pays for it — up to 420ms of delay on top of a 460ms transition,
 * to be told about a sequence that does not exist.
 *
 * Two things are pinned here. The first is the component's contract. The second is the
 * policy, by reading the repository — because "we were disciplined about this" is exactly
 * the kind of claim that was already false once.
 * ============================================================================
 */

/**
 * Forces the "motion is fine" branch. `Reveal` decides once, before first paint, from
 * `matchMedia` — and jsdom does not implement it, which would otherwise send every test
 * down the reduced-motion path and prove nothing.
 */
function allowMotion(reduced = false) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({ matches: reduced, addEventListener() {}, removeEventListener() {} }),
  );
}

/**
 * jsdom has no IntersectionObserver, and `Reveal` treats that as "show everything now".
 * Stubbing it keeps the element in its hidden-and-waiting state, which is where the
 * delay is observable.
 */
function stubObserver() {
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the reveal', () => {
  it('adds no delay when nothing ordered was declared', () => {
    allowMotion();
    stubObserver();

    render(<Reveal>plain</Reveal>);
    expect(screen.getByText('plain')).toHaveStyle({ '--reveal-delay': '0ms' });
  });

  it('staggers by position when it is given one', () => {
    allowMotion();
    stubObserver();

    render(<Reveal sequence={3}>third</Reveal>);
    expect(screen.getByText('third')).toHaveStyle({ '--reveal-delay': '210ms' });
  });

  /*
   * The cap is what stops a long ordered list becoming a queue. Twenty improvements at
   * 70ms each would leave the last one waiting 1.4 seconds after it was scrolled to.
   */
  it('stops staggering long lists into a waiting line', () => {
    allowMotion();
    stubObserver();

    render(<Reveal sequence={19}>twentieth</Reveal>);
    expect(screen.getByText('twentieth')).toHaveStyle({ '--reveal-delay': '420ms' });
  });

  /*
   * The promise in the component's own comment: a browser that cannot or will not run
   * the effect still gets the content. Both branches, because either one failing hides
   * the page from somebody.
   */
  it('shows the content immediately when motion is not wanted', () => {
    allowMotion(true);
    stubObserver();

    render(<Reveal sequence={4}>reduced</Reveal>);
    expect(screen.getByText('reduced').className).toMatch(/visible/);
  });

  it('shows the content immediately when the observer is missing', () => {
    allowMotion();
    vi.stubGlobal('IntersectionObserver', undefined);

    render(<Reveal sequence={4}>no observer</Reveal>);
    expect(screen.getByText('no observer').className).toMatch(/visible/);
  });
});

/*
 * ============================================================================
 * THE POLICY, CHECKED AGAINST THE REPOSITORY
 * ============================================================================
 *
 * Reading source in a test is unusual and it is the right tool exactly once: when the
 * thing being protected is a rule about how an API is *called*, across two dozen files,
 * that no type and no render can express.
 *
 * The rule: `sequence` may only be passed inside an `<ol>`. Ordered markup and ordered
 * motion are the same claim, so if one is wrong the other is visible in review.
 * ============================================================================
 */
describe('where the stagger is used', () => {
  /*
   * Every application, not just this package. `Reveal` lives in `packages/ui` and is
   * rendered almost entirely in `apps/`, so a sweep rooted at the package would check the
   * component against no call sites at all — and pass. The count assertion below is what
   * would catch that, and it is why it is written as a floor rather than a formality.
   */
  const REPO = join(import.meta.dirname, '..', '..', '..');
  const SOURCES = [join(REPO, 'apps'), join(REPO, 'packages')];

  /* Build output and dependencies are not call sites, and `node_modules` is enormous. */
  const SKIP = new Set(['node_modules', 'dist', 'coverage']);

  function tsxFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      if (SKIP.has(entry.name)) return [];
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return tsxFiles(path);
      return entry.name.endsWith('.tsx') && !entry.name.endsWith('.test.tsx') ? [path] : [];
    });
  }

  /**
   * The nearest list element opened above a line. Crude on purpose: a JSX parser would
   * be a dependency and a maintenance burden to answer a question that is one regex and
   * a backwards walk, in a codebase where every `Reveal` is a direct child of the list
   * it belongs to.
   *
   * The walk starts at the line holding the prop rather than at the `<Reveal` that owns
   * it. That is deliberate — props are sometimes wrapped onto their own lines, and
   * guessing how far back the opening tag is would be a second thing to get wrong. The
   * nearest list above the prop is the same list either way.
   */
  function enclosingList(lines: readonly string[], at: number): string | null {
    for (let line = at - 1; line >= 0 && line > at - 16; line -= 1) {
      const match = lines[line]?.match(/<(ol|ul|Grid)\b/);
      if (match?.[1]) return match[1];
    }
    return null;
  }

  it('only staggers content that is genuinely ordered', () => {
    const offenders: string[] = [];
    let staggered = 0;

    for (const file of SOURCES.flatMap(tsxFiles)) {
      const lines = readFileSync(file, 'utf8').split('\n');

      lines.forEach((line, at) => {
        if (!line.includes('sequence={')) return;
        staggered += 1;

        if (enclosingList(lines, at) === 'ol') return;
        offenders.push(`${file.slice(SOURCE.length + 1)}:${at + 1}`);
      });
    }

    expect(
      offenders,
      'These pass `sequence` outside an <ol>, which animates an order the content does ' +
        'not have. Either the list is ordered and the markup should say so, or the ' +
        'stagger should go. See the note at the top of components/ui/Reveal.tsx.',
    ).toEqual([]);

    // Guards the guard: a scan that finds nothing would pass silently forever.
    expect(staggered).toBeGreaterThan(5);
  });
});
