import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { CONSOLE_BASENAME, normaliseBasename, routePatterns } from '../config/routes';

/*
 * ============================================================================
 * THE BARE `/admin` HAS TO RENDER
 * ============================================================================
 *
 * This exists because of a defect that reached production and was invisible everywhere it
 * could have been caught. `import.meta.env.BASE_URL` is `'/admin/'` in a production build —
 * Vite always appends the slash, because its job is to be joined to an asset path — and React
 * Router's `stripBasename` tests `pathname.startsWith(basename)` before normalising anything.
 * `'/admin'` does not start with `'/admin/'`, so the router matched nothing and rendered
 * nothing.
 *
 * What made it expensive is the shape of the failure:
 *
 *   - Every test passed, because nothing rendered the app through a basename.
 *   - The build passed. The CSP check passed. The bundle was correct.
 *   - `/admin/` — with the slash — worked perfectly, so any link *inside* the console was fine.
 *   - The bare `/admin`, which is the one URL a person types, was a blank charcoal page with
 *     one warning in a console nobody had open.
 *
 * ## Why these tests pass `'/admin/'` in by hand
 *
 * The first version of this file did not, and **it would have passed against the broken code**.
 * Under Vitest `BASE_URL` is `'/'` rather than `'/admin/'`, because the test run does not build
 * through the production `base` — so a guard that only inspects `CONSOLE_BASENAME` is a guard
 * that inspects `'/'`, and `'/'` never had the bug. That near miss is the reason
 * `normaliseBasename` is an exported function: the value under test has to be one the test
 * chooses, not one the environment happens to supply.
 * ============================================================================
 */

/** Joins a basename to a path without producing `//`. Test-local; the router does its own. */
const at = (basename: string, path = '') => `${basename === '/' ? '' : basename}${path}` || '/';

describe('normaliseBasename', () => {
  it('strips the trailing slash Vite always appends', () => {
    expect(normaliseBasename('/admin/')).toBe('/admin');
  });

  it('leaves an already-clean basename alone', () => {
    expect(normaliseBasename('/admin')).toBe('/admin');
  });

  it('keeps the root as a root rather than collapsing it to empty', () => {
    /*
     * The case that matters when the console goes back to its own origin, and the reason for
     * the `|| '/'`: `'/'.replace(/\/+$/, '')` is the empty string, and React Router treats an
     * empty basename as "no basename" only by accident of falsiness.
     */
    expect(normaliseBasename('/')).toBe('/');
  });

  it('is what the console actually uses', () => {
    expect(CONSOLE_BASENAME).toBe(normaliseBasename(import.meta.env.BASE_URL));
  });
});

describe('routing under a mounted basename', () => {
  /*
   * `'/admin'` explicitly rather than `CONSOLE_BASENAME`, for the reason in the header: the
   * constant is `'/'` here, and `'/'` is the one value that never reproduced the failure.
   */
  const MOUNTED = normaliseBasename('/admin/');

  function renderAt(entry: string) {
    return render(
      <MemoryRouter basename={MOUNTED} initialEntries={[entry]}>
        <Routes>
          <Route index element={<h1>Inbox</h1>} />
          <Route path={routePatterns.projects} element={<h1>Projects</h1>} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('renders the bare path somebody types', () => {
    renderAt(at(MOUNTED));
    expect(screen.getByRole('heading', { name: 'Inbox' })).toBeInTheDocument();
  });

  it('renders the path with the slash a browser may produce', () => {
    renderAt(`${MOUNTED}/`);
    expect(screen.getByRole('heading', { name: 'Inbox' })).toBeInTheDocument();
  });

  it('still matches a route below it', () => {
    renderAt(at(MOUNTED, '/projects'));
    expect(screen.getByRole('heading', { name: 'Projects' })).toBeInTheDocument();
  });
});
