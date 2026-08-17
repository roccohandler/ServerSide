import { readdirSync, readFileSync } from 'node:fs';
import { join, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

/*
 * ============================================================================
 * NOBODY WRITES A DATE OR A NUMBER BY HAND
 * ============================================================================
 *
 * Two habits produce a number that is wrong for somebody, and both look correct in a
 * browser set to US English — which is every browser this was ever developed in.
 *
 *   1. **A hard-coded locale tag.** `value.toLocaleString('en-US')` groups thousands with
 *      commas for a reader whose own operating system groups them with full stops. The
 *      audit's revenue scenario did exactly this, under a comment claiming the number was
 *      "correct for anybody outside the US".
 *
 *   2. **`toFixed` on anything a reader sees.** It writes the decimal separator as `.`,
 *      unconditionally. `Intl.NumberFormat` is the same call with a different name and it
 *      asks the reader's browser what a decimal point looks like.
 *
 * The console had a third, worse version — `createdAt.slice(0, 10)` printing a UTC calendar
 * day as though it were a local one, which is off by a day for the whole of a Seattle
 * evening. That one is fixed and pinned by `utils/formatDate.test.ts`; this file is what
 * stops all three from coming back somewhere else.
 *
 * ## This is not internationalisation
 *
 * There is one locale here and no plans for a second; `deferred_work_plan.md` §3.1c says at
 * length why a message catalogue is not being built. Formatting is the part that is broken
 * *now*, for readers who already exist, in a product that already renders in their browser.
 * ============================================================================
 */

const ROOT = join(import.meta.dirname, '..', '..', '..');
const SKIP = new Set(['node_modules', 'dist', '.git', '.vercel', 'coverage']);

/*
 * Application source only — every workspace keeps it under `src/`, and the build tooling
 * beside it under `scripts/`.
 *
 * This is a positive filter rather than a `SKIP` entry for `scripts`, deliberately. The
 * note at the top of `tokens.test.ts` records what happened the last time a source-shaped
 * name went into a skip-list: `public` was added to miss the favicons and silently stopped
 * checking `features/public`, the entire marketing site. A rule that says which paths it
 * *does* read cannot fail that way.
 *
 * What the tooling is allowed to do, and why it is not a hole: `check-budget.ts` prints
 * "534.9 kB" and `stripe-setup.ts` prints a price to an operator's terminal. Both are
 * developer output on a machine whose locale is the developer's own, and neither has ever
 * reached a browser.
 */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (SKIP.has(entry.name)) return [];
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    if (!path.includes(`${sep}src${sep}`)) return [];
    return /\.tsx?$/.test(entry.name) && !entry.name.includes('.test.') ? [path] : [];
  });
}

const basename = (file: string) => file.split(sep).pop() ?? file;

/** Comments blanked, not removed, so reported line numbers stay true. */
function withoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, ' '))
    .replace(/^(\s*)\/\/.*$/gm, '$1');
}

/**
 * The two places a locale tag is deliberately fixed, and both of them are money.
 *
 * `pricing.ts`'s `money()` formats a JobForge price. The price is quoted in US dollars to
 * businesses in Greater Seattle, and `$4,900` is what that price *is* — not a rendering of it
 * that should follow the reader's settings. A German reader seeing `4.900 $` would be reading a
 * number this business does not charge, in a currency it does not bill in. Currency is the case
 * where the writer's locale is the right one and the reader's is not.
 *
 * `billing.amounts.ts`'s `amountLabel()` is the same argument on the server, where it is even
 * harder to argue with: there is no reader to ask. `undefined` there resolves to the locale of
 * a Vercel region, which is nobody's. The notifier's `formatDate` reaches the opposite
 * conclusion from the same premise, and its header says why — a date has no currency to anchor
 * it, so the fix there is a format no reader can misread rather than a fixed tag.
 */
const FIXED_LOCALE_ALLOWED = new Set(['pricing.ts', 'billing.amounts.ts']);

describe('dates and numbers', () => {
  it('never hard-codes a locale outside the price formatter', () => {
    const offenders: string[] = [];
    const allowancesUsed = new Set<string>();
    let callsSeen = 0;

    /* `Intl.X('en-US'…)` and `value.toLocaleY('en-US'…)`, which are the two spellings. */
    const FIXED_LOCALE =
      /(?:new Intl\.[A-Za-z]+\(|\.toLocale(?:String|DateString|TimeString)\()\s*['"][a-z]{2}(?:-[A-Za-z0-9]+)*['"]/;
    const ANY_CALL = /new Intl\.[A-Za-z]+\(|\.toLocale(?:String|DateString|TimeString)\(/;

    for (const file of sourceFiles(ROOT)) {
      withoutComments(readFileSync(file, 'utf8'))
        .split('\n')
        .forEach((line, index) => {
          if (ANY_CALL.test(line)) callsSeen += 1;
          if (!FIXED_LOCALE.test(line)) return;

          if (FIXED_LOCALE_ALLOWED.has(basename(file))) {
            allowancesUsed.add(basename(file));
            return;
          }

          offenders.push(`${basename(file)}:${index + 1}  ${line.trim()}`);
        });
    }

    expect(
      offenders,
      'These format for a locale the reader may not be in. Pass `undefined` — or no first ' +
        'argument at all — so the browser answers with its own. A fixed tag is only right ' +
        'when the value belongs to the writer rather than the reader, which is currency.',
    ).toEqual([]);

    /* Guards the guard: a walk that found no files would pass this test forever. */
    expect(callsSeen).toBeGreaterThan(8);

    const stale = [...FIXED_LOCALE_ALLOWED].filter((file) => !allowancesUsed.has(file));
    expect(
      stale,
      'These files are allowed a fixed locale and no longer use one — delete the allowance.',
    ).toEqual([]);
  });

  it('never renders a fixed number of decimals with toFixed', () => {
    const offenders: string[] = [];

    for (const file of sourceFiles(ROOT)) {
      withoutComments(readFileSync(file, 'utf8'))
        .split('\n')
        .forEach((line, index) => {
          if (!/\.toFixed\(/.test(line)) return;
          offenders.push(`${basename(file)}:${index + 1}  ${line.trim()}`);
        });
    }

    expect(
      offenders,
      'These write a decimal point that is a comma in half of Europe. Build an ' +
        '`Intl.NumberFormat` with minimumFractionDigits/maximumFractionDigits once, ' +
        'outside the component, and call `.format()`.',
    ).toEqual([]);
  });
});
