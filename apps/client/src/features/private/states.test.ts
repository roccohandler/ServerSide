import { readFileSync, readdirSync } from 'node:fs';
import { join, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

/*
 * ============================================================================
 * ONE RESOURCE STATE MACHINE, AND ONLY ONE
 * ============================================================================
 *
 * `useResource` exists because there were two copies of it — `useAdminResource` and
 * `useProjectOverview` — and they had already drifted on the question that mattered most:
 * what happens after a *failed* write. Its own header records that, and the fix was to
 * extract it into `@jobforge/ui` so both applications could reach one implementation.
 *
 * The extraction happened. The adoption did not. As of the state audit on 2026-08-15 there
 * were **five** implementations: the hook, and four screens that had each written the same
 * `useState` + `AbortController` + reload-token machine by hand — `/app`, `/app/projects`,
 * `/app/billing`, and the console's inbox. A fifth turned up while this was being fixed
 * (`/app/assessment`), which is the argument for a guard rather than a sweep: a sweep is
 * accurate on the day it is run.
 *
 * ## What this actually checks
 *
 * That no screen in the private boundary builds its own loader. `AbortController` is the
 * tell: `useResource` owns the one abort in this boundary, and a page constructing its own
 * is a page that has rebuilt the machine around it. `lib/http.ts` and `session/` are outside
 * this sweep because they are the layers that legitimately own a request.
 *
 * A source read rather than a render, for the reason `tokens.test.ts` gives: the question is
 * "does any of them do this", and rendering eight screens with eight sets of fetch stubs to
 * find out would be a slower test that answers less directly.
 * ============================================================================
 */

const PRIVATE = import.meta.dirname;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) && !entry.name.includes('.test.') ? [path] : [];
  });
}

const basename = (file: string) => file.split(sep).pop() ?? file;

const files = sourceFiles(PRIVATE).map((file) => ({
  file: basename(file),
  source: readFileSync(file, 'utf8'),
}));

describe('the customer portal', () => {
  it('finds the files it is supposed to be checking', () => {
    // A walker that matches nothing is a test that passes forever.
    expect(files.length).toBeGreaterThan(15);
  });

  it('builds no resource state machine of its own', () => {
    const handRolled = files
      .filter(({ source }) => source.includes('new AbortController()'))
      .map(({ file }) => file);

    expect(
      handRolled,
      'These construct their own request lifecycle. `useResource` in @jobforge/ui owns that ' +
        'shape for both applications, and it exists because two hand-written copies had ' +
        'already disagreed about what happens after a failed write. Use the hook.',
    ).toEqual([]);
  });

  /*
   * Every screen that loads something offers a way to try again.
   *
   * `/app/projects` was the one that did not: `<AppError failure={failure} />` with no
   * `onRetry`, so a network blip on the page a customer opens to find their own website was
   * a dead end with a browser reload as the only way out.
   */
  it('offers a retry wherever it reports a failed load', () => {
    const withoutRetry = files
      .filter(({ source }) => source.includes('<AppError'))
      .filter(({ source }) => !source.includes('onRetry'))
      .map(({ file }) => file);

    expect(
      withoutRetry,
      'These report a failed load with no way to try again. Most of what reaches AppError is ' +
        'a network blip, and the only alternative offered is a browser reload.',
    ).toEqual([]);
  });
});
