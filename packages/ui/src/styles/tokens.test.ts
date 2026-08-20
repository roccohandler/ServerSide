import { readdirSync, readFileSync } from 'node:fs';
import { join, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

/*
 * ============================================================================
 * THE DESIGN SYSTEM, ENFORCED
 * ============================================================================
 *
 * `styles/tokens.css` says every colour, size, radius and shadow is defined in one place.
 * That sentence has been true of this repository for about as long as somebody has been
 * checking, which is the problem: a design system is a claim about every file, and a claim
 * about every file that only a person checks is a claim that decays.
 *
 * So these are the rules that were previously only written down. Each one failed against
 * the codebase at the moment it was added, was fixed, and now cannot come back.
 *
 * ## What this deliberately does not do
 *
 * It does not ban colour literals outright. A `box-shadow` is a colour literal and there
 * is no useful token for "black at 18% going upward"; the demo sites are five other
 * businesses' brands and are meant to look nothing like this one. The rules below are
 * scoped to the *properties that carry UI colour* rather than to the character `#`,
 * because a rule that fires on legitimate CSS is a rule somebody deletes.
 *
 * ## The exception list
 *
 * `EXCEPTIONS` is checked in both directions. An entry lets a file break one rule, and an
 * entry that no longer matches anything **fails the test** — so an exception cannot quietly
 * outlive the thing it was granted for. Adding one costs a sentence explaining why; that
 * is the whole point of it being here rather than in a comment nobody reads.
 * ============================================================================
 */

const STYLES = import.meta.dirname;

/*
 * Every stylesheet in the repository, not just this package's.
 *
 * The tokens live here and the rules are enforced here, but the CSS they govern is mostly
 * somewhere else — the customer app's feature stylesheets, the owner console's, and any
 * future package's. Scanning only `packages/ui/src` would leave this file passing while
 * measuring almost nothing, which is the failure mode a guard is least likely to be
 * noticed in. `SRC` is therefore the repository root, and `moduleFiles`/`allStylesheets`
 * walk down into every app and package from there.
 *
 * `node_modules` and `dist` are skipped by the walkers below.
 */
const SRC = join(STYLES, '..', '..', '..', '..');

/*
 * Directories a repository-wide walk must never descend into.
 *
 * Every entry is a build or tooling artefact. **Do not add source-shaped names here.** The
 * first version of this list also skipped `public`, meaning to skip `apps/client/public`
 * (favicons, OG images) — and silently skipped `apps/client/src/features/public` as well,
 * which is the entire marketing site. Thirty-two stylesheets stopped being checked and the
 * suite still passed; only the "guards the guard" counts below noticed, and they are the
 * reason this was caught at all rather than shipped.
 */
const SKIP = new Set(['node_modules', 'dist', '.git', '.vercel', 'coverage']);

/** Every `.module.css` in the repository. `tokens.css` and `global.css` are not modules. */
function moduleFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (SKIP.has(entry.name)) return [];
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return moduleFiles(path);
    return entry.name.endsWith('.module.css') ? [path] : [];
  });
}

function allStylesheets(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (SKIP.has(entry.name)) return [];
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return allStylesheets(path);
    return entry.name.endsWith('.css') ? [path] : [];
  });
}

const basename = (file: string) => file.split(sep).pop() ?? file;

/** Comments blanked, not removed, so reported line numbers stay true. */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, ' '));
}

interface Exception {
  readonly rule: 'font-size' | 'border-radius' | 'spacing' | 'direction' | 'contrast-dark';
  readonly file: string;
  readonly why: string;
}

const EXCEPTIONS: readonly Exception[] = [
  {
    rule: 'font-size',
    file: 'Value.module.css',
    why: '`.mockCramped` depicts a badly-built website. 11px is the illustration — rounding it onto the scale would make the "before" legible and delete the argument the section makes.',
  },
  {
    rule: 'border-radius',
    file: 'DeviceFrame.module.css',
    why: 'The phone bezel and its screen depict hardware, not the brand. A shell radius larger than the screen radius is what makes the frame read as a phone; snapping both to --radius-lg collapses the illusion.',
  },
  {
    rule: 'spacing',
    file: 'DeviceFrame.module.css',
    why: 'The browser chrome depicts hardware. The window dots are 8px with a 16px gap because that is what a title bar looks like; the 6px screen inset is a bezel. None of it is page rhythm.',
  },
  {
    rule: 'spacing',
    file: 'Field.module.css',
    why: "`.passwordControl` reserves 5.5rem of padding for the show/hide toggle sitting inside it. The number is the toggle's width plus its insets — a measurement of another element, not a step on the rhythm.",
  },
  {
    rule: 'spacing',
    file: 'LaunchSection.module.css',
    why: "`.launchStep` hangs its numbered marker in 3.25rem of padding. The value is the marker's diameter plus its gap; a rhythm step would either clip the marker or leave it swimming. (Was granted against Offer.module.css until that stylesheet was split by owner.)",
  },
  {
    rule: 'spacing',
    file: 'Welcome.module.css',
    why: 'Same hanging-marker clearance as `.launchStep` in Offer.module.css, and deliberately the same number — the two lists are the same component in two places.',
  },
  {
    rule: 'spacing',
    file: 'Value.module.css',
    why: '`.stepItem` hanging-marker clearance at the `md` step, where the marker grows. Same argument as `.launchStep`.',
  },
  {
    rule: 'spacing',
    file: 'Switch.module.css',
    why: "`.hint` is indented 3.25rem so it lines up under the label rather than under the track, and the thumb's checked inset is 1.125rem. Both are measurements of specific elements — the track's width plus the row's gap, and the track less the thumb less the hairline — and a rhythm step would put the hint under neither and the thumb over the track's edge.",
  },
  {
    rule: 'spacing',
    file: 'Demo.module.css',
    why: "`.site` reserves 4.5rem at the bottom for the fixed mobile call bar. The number is that bar's height; it is clearance for a specific element, not rhythm.",
  },
  {
    rule: 'direction',
    file: 'Demo.module.css',
    why: 'The demo sites depict five other businesses’ brands and are exempt from the system by design (see the note at the top of this file). They are five fictional Greater Seattle contractors and will never be served right-to-left; converting them would be maintenance on a depiction.',
  },
  {
    rule: 'direction',
    file: 'DeviceFrame.module.css',
    why: 'The browser chrome depicts hardware, and hardware does not turn. The window dots are one element with two `box-shadow` offsets standing in for the other two, and a shadow offset has no logical spelling — so the `margin-right` that spaces them has to stay on the same axis as the shadows it belongs to.',
  },
  {
    rule: 'direction',
    file: 'Tooltip.module.css',
    why: '`.tip` is centred with `left: 50%` against `transform: translateX(-50%)`, and that pair is symmetric — it lands in the same place in either direction. Converting the inset alone while the translate stayed physical is what would break it, and there is no logical translate to convert the other half to.',
  },
];

function isExcepted(rule: Exception['rule'], file: string): boolean {
  return EXCEPTIONS.some((entry) => entry.rule === rule && entry.file === basename(file));
}

/*
 * The documented breakpoint scale. Kept in step with the note in `tokens.css` — custom
 * properties cannot be used inside a media query, so this array is the only thing that can
 * actually hold the line.
 */
const BREAKPOINTS = [26, 30, 48, 60, 64, 80] as const;

describe('the design system', () => {
  /*
   * ==========================================================================
   * NO RAW UI COLOUR
   * ==========================================================================
   *
   * Scoped to the properties that paint the interface. `box-shadow` is excluded on
   * purpose (see the note at the top), and so is anything inside a comment.
   */
  it('paints no interface colour that is not a token', () => {
    const offenders: string[] = [];
    let declarationsSeen = 0;

    const COLOUR_PROPERTY =
      /^\s*(color|background|background-color|border(?:-[a-z]+)?-color|outline-color|fill|stroke|accent-color|caret-color)\s*:\s*([^;]+);/;

    for (const file of moduleFiles(SRC)) {
      withoutComments(readFileSync(file, 'utf8'))
        .split('\n')
        .forEach((line, index) => {
          const match = line.match(COLOUR_PROPERTY);
          if (!match?.[2]) return;
          declarationsSeen += 1;

          if (!/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/.test(match[2])) return;
          offenders.push(`${basename(file)}:${index + 1}  ${line.trim()}`);
        });
    }

    expect(
      offenders,
      'These paint the interface with a literal instead of a token. Add a token to ' +
        'styles/tokens.css and use it — a colour that exists in only one stylesheet is a ' +
        'colour the next re-skin will miss.',
    ).toEqual([]);

    // Guards the guard: a regex that matched nothing would pass here forever.
    expect(declarationsSeen).toBeGreaterThan(200);
  });

  /*
   * ==========================================================================
   * SYSTEM COLOURS STAY INSIDE A FORCED-COLORS BLOCK
   * ==========================================================================
   *
   * `CanvasText`, `Highlight`, `ButtonFace` and the rest are the reader's own colours, and
   * they are the correct — the only — thing to name inside `@media (forced-colors: active)`,
   * where every token in `tokens.css` has already been discarded by the browser.
   *
   * Outside that block they are a raw colour literal wearing a keyword, and worse than a
   * hex: `#17191E` at least renders the same thing on every machine, whereas `CanvasText`
   * renders whatever the reader's high-contrast theme happens to say, on a page that is
   * otherwise painted from a measured palette. `tokens.test.ts`'s first rule does not catch
   * them, because it looks for `#`, `rgb(` and `hsl(` — so this is the rule that does.
   *
   * There is no exception list. A system colour outside a forced-colors block has not yet
   * had a defensible reason, and the day it does, the entry costs a sentence like every
   * other one here.
   */
  it('names a system colour only where the system is painting', () => {
    const offenders: string[] = [];
    let insideSeen = 0;

    const SYSTEM_COLOUR =
      /\b(?:Canvas|CanvasText|LinkText|VisitedText|ActiveText|ButtonFace|ButtonText|ButtonBorder|Field|FieldText|Highlight|HighlightText|SelectedItem|SelectedItemText|Mark|MarkText|GrayText|AccentColor|AccentColorText)\b/;

    for (const file of allStylesheets(SRC)) {
      const source = withoutComments(readFileSync(file, 'utf8'));

      /*
       * Brace-counted rather than regex-matched. A `@media` block contains rules, which
       * contain braces, so `\{[^}]*\}` stops at the first inner rule and would report every
       * declaration after it as outside the block.
       */
      const forced: [number, number][] = [];
      for (const match of source.matchAll(/@media\s*\(forced-colors:\s*active\)\s*\{/g)) {
        let depth = 1;
        let index = match.index + match[0].length;
        while (index < source.length && depth > 0) {
          if (source[index] === '{') depth += 1;
          else if (source[index] === '}') depth -= 1;
          index += 1;
        }
        forced.push([match.index, index]);
      }

      const inForced = (at: number) => forced.some(([from, to]) => at >= from && at < to);

      for (const match of source.matchAll(
        /^[^\S\n]*(?:color|background|background-color|border(?:-[a-z]+)?-color|border(?:-[a-z]+)?|outline-color|fill|stroke)\s*:\s*([^;]+);/gm,
      )) {
        if (!SYSTEM_COLOUR.test(match[1] ?? '')) continue;

        if (inForced(match.index)) {
          insideSeen += 1;
          continue;
        }

        const line = source.slice(0, match.index).split('\n').length;
        offenders.push(`${basename(file)}:${line}  ${match[0].trim()}`);
      }
    }

    expect(
      offenders,
      'These name one of the reader’s system colours outside a ' +
        '`@media (forced-colors: active)` block, where the palette in tokens.css is still ' +
        'in force. Use a --color-* token; a system keyword is a literal whose value nobody ' +
        'here chose.',
    ).toEqual([]);

    /* Guards the guard: the brace counter silently finding no blocks would pass forever. */
    expect(insideSeen).toBeGreaterThan(20);
  });

  /*
   * ==========================================================================
   * NO RAW Z-INDEX
   * ==========================================================================
   *
   * Stacking is the one part of CSS where a local decision is a global one. The failure is
   * always the same: somebody needs to be above one thing, picks a number bigger than the
   * one they can see, and the number ratchets until the codebase is full of `9999`.
   */
  it('takes every z-index from the layering scale', () => {
    const offenders: string[] = [];
    let seen = 0;

    for (const file of allStylesheets(SRC)) {
      withoutComments(readFileSync(file, 'utf8'))
        .split('\n')
        .forEach((line, index) => {
          const match = line.match(/^\s*z-index\s*:\s*([^;]+);/);
          if (!match?.[1]) return;
          seen += 1;
          if (match[1].includes('var(--z-')) return;
          offenders.push(`${basename(file)}:${index + 1}  ${line.trim()}`);
        });
    }

    expect(
      offenders,
      'These pick a stacking number instead of naming a layer. Use one of the --z-* ' +
        'tokens in styles/tokens.css, or add a layer there if none of them fits.',
    ).toEqual([]);

    expect(seen).toBeGreaterThan(3);
  });

  /*
   * ==========================================================================
   * ONE BREAKPOINT SCALE
   * ==========================================================================
   *
   * Six steps, every one of them earning its place — see the note in `tokens.css`. A
   * seventh invented for one component is how a responsive design stops being a system and
   * starts being a pile of widths that each looked reasonable alone.
   *
   * `max-width` queries must be a step minus 0.001rem, so there is no width at which both
   * the `min-` and `max-` rule match and none at which neither does.
   */
  it('uses only the documented breakpoints', () => {
    const offenders: string[] = [];
    let seen = 0;

    for (const file of allStylesheets(SRC)) {
      withoutComments(readFileSync(file, 'utf8'))
        .split('\n')
        .forEach((line, index) => {
          for (const [, kind, value] of line.matchAll(/\((min|max)-width:\s*([\d.]+)rem\s*\)/g)) {
            if (!kind || !value) continue;
            seen += 1;
            const width = Number(value);

            const ok =
              kind === 'min'
                ? BREAKPOINTS.includes(width as (typeof BREAKPOINTS)[number])
                : BREAKPOINTS.some((step) => Math.abs(step - 0.001 - width) < 1e-9);

            if (ok) continue;
            offenders.push(
              `${basename(file)}:${index + 1}  (${kind}-width: ${value}rem) — ` +
                (kind === 'min'
                  ? `not one of ${BREAKPOINTS.join(', ')}rem`
                  : `expected a step minus 0.001rem, e.g. ${BREAKPOINTS.map((s) => s - 0.001).join(', ')}rem`),
            );
          }
        });
    }

    expect(
      offenders,
      'These invent a breakpoint. Use one of the six documented steps, or add a step to ' +
        'BREAKPOINTS here and to the note in styles/tokens.css and say what it is for.',
    ).toEqual([]);

    expect(seen).toBeGreaterThan(20);
  });

  /*
   * ==========================================================================
   * EVERY FOREGROUND/BACKGROUND PAIR CLEARS AA
   * ==========================================================================
   *
   * The rule the whole palette is shaped around, and the one a person cannot hold in their
   * head. Ember exists at three lightnesses precisely because the bright one is 3.0:1 on
   * cream — so the failure mode is not "somebody used a colour that is not a token", it is
   * "somebody used the *wrong* token", which no amount of tokenising prevents.
   *
   * So this measures rather than trusts. Any rule that sets both a `color` and a
   * `background-color` from the palette has its actual contrast computed, by the actual
   * WCAG formula, from the actual hex values in `tokens.css`.
   *
   * Only rules that state *both* halves can be checked; a colour whose ground is set by an
   * ancestor is outside what a stylesheet can tell us statically. That is a real limit and
   * it is why the ratios in `tokens.css` are also documented per token — but the pairs that
   * can be checked are checked, and they are where the mistakes have actually been.
   */
  it('clears AA on every foreground and background it states together', () => {
    /** The light palette, as written in tokens.css. Alpha values are skipped — see below. */
    const PALETTE: Readonly<Record<string, string>> = {
      '--color-ink': '#17191E',
      '--color-ink-muted': '#5F5B54',
      '--color-ink-inverse': '#F3EEE4',
      '--color-ink-inverse-muted': '#B9B4AA',
      '--color-on-accent': '#FFFFFF',
      '--color-accent': '#E85C24',
      '--color-accent-strong': '#C4471A',
      '--color-accent-deep': '#A2360F',
      '--color-accent-text': '#B03E14',
      '--color-brand': '#17191E',
      '--color-brand-strong': '#0E1013',
      '--color-surface': '#FFFFFF',
      '--color-page': '#F3EEE4',
      '--color-surface-muted': '#EAE4D8',
      '--color-surface-sunken': '#DFD8C9',
      '--color-surface-dark': '#17191E',
      '--color-surface-dark-raised': '#22252C',
      '--color-tint-brand': '#E3E0DA',
      '--color-tint-accent': '#FAEDE5',
      '--color-success': '#14663F',
      '--color-tint-success': '#E4F0E7',
      '--color-danger': '#9B1C14',
      '--color-tint-danger': '#FBE9E6',
    };

    /**
     * The dark palette. Same tokens, different measurements — not the light values inverted.
     *
     * Every pair below is computed twice, once against each table, because a stylesheet rule
     * states one foreground and one background and both themes have to survive it. That is
     * the entire safety argument for having a second palette at all: nobody can hold
     * forty-six contrast ratios in their head, and this file does not ask them to.
     */
    const PALETTE_DARK: Readonly<Record<string, string>> = {
      '--color-ink': '#f3eee4',
      '--color-ink-muted': '#aba69c',
      '--color-ink-inverse': '#f3eee4',
      '--color-ink-inverse-muted': '#b9b4aa',
      '--color-on-accent': '#17191e',
      '--color-accent': '#e85c24',
      '--color-accent-strong': '#e85c24',
      '--color-accent-deep': '#ff8551',
      '--color-accent-text': '#f4763f',
      '--color-brand': '#f3eee4',
      '--color-brand-strong': '#05070a',
      '--color-surface': '#1d2027',
      '--color-page': '#15171c',
      '--color-surface-muted': '#24272f',
      '--color-surface-sunken': '#0f1115',
      '--color-surface-dark': '#0b0d11',
      '--color-surface-dark-raised': '#22252c',
      '--color-tint-brand': '#2a2e36',
      '--color-tint-accent': '#2b1810',
      '--color-success': '#63c68c',
      '--color-tint-success': '#12251a',
      '--color-danger': '#f2887c',
      '--color-tint-danger': '#2c1512',
    };

    const tokensSource = readFileSync(join(STYLES, 'tokens.css'), 'utf8');

    /**
     * The body of one top-level block, by the selector that opens it.
     *
     * Checking each table against its own block rather than against the whole file, because
     * a token now has two values and a file-wide search would happily match the wrong one —
     * `--color-ink` is `#17191E` in one block and `#f3eee4` in another, and both are correct.
     */
    function block(selector: string): string {
      const start = tokensSource.indexOf(`${selector} {`);
      if (start === -1) return '';
      return tokensSource.slice(start, tokensSource.indexOf('\n}', start));
    }

    const drifted = [
      ...Object.entries(PALETTE).map(([token, hex]) => [':root', token, hex] as const),
      ...Object.entries(PALETTE_DARK).map(
        ([token, hex]) => [":root[data-theme='dark']", token, hex] as const,
      ),
    ].filter(
      ([selector, token, hex]) =>
        !new RegExp(`${token}:\\s*${hex}\\s*;`, 'i').test(block(selector)),
    );

    expect(
      drifted.map(([selector, token, hex]) => `${selector} no longer sets ${token} to ${hex}`),
      'A table here has drifted from tokens.css, so the contrast maths below is measuring ' +
        'colours the site does not use. Update PALETTE or PALETTE_DARK to match.',
    ).toEqual([]);

    /*
     * ========================================================================
     * THE DARK PALETTE IS DECLARED ONCE, AND THE OS IS NOT ASKED
     * ========================================================================
     *
     * This replaces a check that the *two* dark blocks agreed with each other. There was a
     * copy inside `@media (prefers-color-scheme: dark)` and a copy under `[data-theme='dark']`,
     * and keeping them in step was the price of the operating system being allowed to choose.
     * DECISION 036 stopped asking it: light is the default for every visitor and the dark
     * palette is reached only from the Appearance control, so there is one block and nothing
     * to keep in step.
     *
     * The check that replaces it is the decision itself. Deleting a media query is a one-line
     * change and re-adding one is too — and the symptom of re-adding one is not a broken
     * build, it is the site quietly serving two different first impressions again, which is
     * the exact bug this whole change was made to fix. So the file may not contain the string
     * at all outside a comment.
     */
    expect(
      withoutComments(tokensSource).includes('prefers-color-scheme'),
      'tokens.css answers `prefers-color-scheme` again. The light palette is the default for ' +
        'every visitor by decision, not by omission — see DECISION 036 and the long note in ' +
        'tokens.css. Dark is reached through the Appearance control, which writes ' +
        '`data-theme`. If the decision is being reversed, reverse it here too, on purpose.',
    ).toBe(false);

    /*
     * ========================================================================
     * BOTH PALETTES DECLARE THE SAME COLOURS
     * ========================================================================
     *
     * A token that exists in one palette and not the other is not a build failure and not a
     * contrast failure. It is a value tuned against one ground, silently reused on the other,
     * and the only way anybody finds it is by looking at the page in the second theme — which
     * is how `--color-surface-on-dark` sat unmeasured through a whole dark-mode project.
     *
     * The allowlist is checked in both directions like `EXCEPTIONS`: an entry that has *started*
     * being overridden fails too, so an allowance cannot outlive its argument.
     */
    const NOT_OVERRIDDEN_IN_DARK: readonly { token: string; why: string }[] = [
      {
        token: '--color-surface-on-dark',
        why: 'Cream at 8% over a charcoal band, and the band is charcoal in both palettes. The alpha resolves against whatever is behind it, so there is no second value to measure — unlike every solid token, which resolves against a ground that moved.',
      },
      {
        token: '--color-surface-on-dark-strong',
        why: 'The emphasised form of the above, and the same argument.',
      },
    ];

    const lightColours = [...block(':root').matchAll(/^\s*(--color-[a-z-]+):/gm)].map(
      ([, token]) => token as string,
    );
    const darkColours = new Set(
      [...block(":root[data-theme='dark']").matchAll(/^\s*(--color-[a-z-]+):/gm)].map(
        ([, token]) => token as string,
      ),
    );
    const allowedMissing = new Set(NOT_OVERRIDDEN_IN_DARK.map((entry) => entry.token));

    expect(
      lightColours.filter((token) => !darkColours.has(token) && !allowedMissing.has(token)),
      'These colours exist in the light palette and not the dark one, so the dark theme is ' +
        'reusing a value measured against cream. Give each a measured dark value, or add it ' +
        'to NOT_OVERRIDDEN_IN_DARK with the sentence that says why it does not need one.',
    ).toEqual([]);

    expect(
      NOT_OVERRIDDEN_IN_DARK.filter((entry) => darkColours.has(entry.token)).map(
        (entry) => entry.token,
      ),
      'These are in NOT_OVERRIDDEN_IN_DARK and the dark block now overrides them. Delete the ' +
        'entry — an allowance nobody is using is an allowance the next reader trusts.',
    ).toEqual([]);

    /* Guards the guard: an empty light palette would satisfy every assertion above. */
    expect(lightColours.length).toBeGreaterThan(25);

    const channel = (value: number) =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;

    const luminance = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((offset) =>
        channel(parseInt(hex.slice(offset, offset + 2), 16) / 255),
      );
      return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
    };

    const contrast = (a: string, b: string) => {
      const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
      return (hi + 0.05) / (lo + 0.05);
    };

    const offenders: string[] = [];
    const exceptionsUsed = new Set<string>();
    let pairsChecked = 0;

    for (const file of allStylesheets(SRC)) {
      const source = withoutComments(readFileSync(file, 'utf8'));

      for (const [, prelude, body] of source.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        if (!prelude || !body) continue;

        const foreground = body.match(/(?:^|;|\s)color:\s*var\((--[a-z-]+)\)/);
        const background = body.match(/background(?:-color)?:\s*var\((--[a-z-]+)\)/);
        if (!foreground?.[1] || !background?.[1]) continue;

        for (const [theme, palette] of [
          ['light', PALETTE],
          ['dark', PALETTE_DARK],
        ] as const) {
          // Alpha panels (`--color-surface-on-dark`) have no fixed value to measure against.
          const fg = palette[foreground[1]];
          const bg = palette[background[1]];
          if (!fg || !bg) continue;

          /*
           * The hook is kept and no file currently uses it, which is deliberate and was not
           * always accurate. It used to carry a comment saying the demo subtree was excused
           * here because `DemoLayout` pins `data-theme="light"` on itself, and pointing at an
           * `EXCEPTIONS` entry. Neither was true: the demo pins `color-scheme: light` on
           * `.shell` (which paints nothing, and is there so the browser does not draw a
           * charcoal date picker inside somebody else's bright website), and no entry ever
           * existed. Nothing was excused and nothing needed to be — every colour below the
           * disclosure bar is a `--demo-*` literal, so no pair in those files matches this
           * rule at all. The stale-entry check below still holds the hook honest.
           */
          if (theme === 'dark' && isExcepted('contrast-dark', file)) {
            exceptionsUsed.add(`contrast-dark:${basename(file)}`);
            continue;
          }

          pairsChecked += 1;
          const ratio = contrast(fg, bg);
          if (ratio >= 4.5) continue;

          offenders.push(
            `${basename(file)} [${theme}]  ${prelude.trim().split('\n').pop()?.trim()}  ` +
              `${foreground[1]} on ${background[1]} = ${ratio.toFixed(2)}:1`,
          );
        }
      }
    }

    expect(
      offenders,
      'These pair a foreground and a background that do not clear 4.5:1 in the theme ' +
        'named in brackets. The usual cause in light is reaching for --color-accent ' +
        '(Ember, 3.0:1 on cream) where --color-accent-text belongs; the usual cause in ' +
        'dark is a token that was tuned for one ground and used on another. See the ' +
        'accent note and the dark-palette note in tokens.css.',
    ).toEqual([]);

    /* Both palettes, so roughly twice what the single-theme version counted. */
    expect(pairsChecked).toBeGreaterThan(60);

    const stale = EXCEPTIONS.filter(
      (entry) =>
        entry.rule === 'contrast-dark' && !exceptionsUsed.has(`contrast-dark:${entry.file}`),
    ).map((entry) => `contrast-dark in ${entry.file}`);

    expect(
      stale,
      'These contrast-dark EXCEPTIONS no longer match anything — delete the entry.',
    ).toEqual([]);
  });

  /*
   * ==========================================================================
   * NO TEXT TOKEN PAINTS A SURFACE
   * ==========================================================================
   *
   * The rule above measures a pair. This one measures a *role*, and it exists because the
   * rule above structurally cannot see the failure it catches.
   *
   * The contrast rule needs a foreground and a background stated in the same block. That is
   * 144 of the 948 colour-bearing rules in this repository — the other 804 state one half and
   * inherit the other, which no stylesheet can resolve statically. So a rule that paints only
   * a background is invisible to it, and `background: var(--color-ink)` is invisible *and*
   * wrong: `--color-ink` means "the colour text is" and therefore inverts with the ground.
   * It was charcoal on the light page and cream on the dark one, which is correct for text
   * and is not correct for a phone bezel, a sticky bar, or anything else that is an object.
   *
   * Three of those shipped: the hero's phone frame, the demonstration banner, and the mark
   * tile in the header (that one paired two inverting tokens, so it stayed legible right up
   * until it turned 1.08:1 and disappeared). None failed a test. Two of them were also
   * legible, which is the point — legibility is not the property being protected here.
   *
   * The fix in every case was the same: name the token that means the *thing*.
   * `--color-surface-dark` is a band and stays a band; `--color-ink-inverse` is the text on
   * one and stays cream. There is no EXCEPTIONS hook because there has not yet been a
   * defensible reason, and the day there is, it costs a sentence like every other one here.
   */
  it('paints no surface with a token that means text', () => {
    /* Tokens whose value follows the ground. A surface painted with one is a surface that
       inverts when the palette does — which is only ever right by accident. */
    const TEXT_TOKENS = ['--color-ink', '--color-ink-muted', '--color-accent-text'];

    const offenders: string[] = [];
    let backgroundsSeen = 0;

    for (const file of allStylesheets(SRC)) {
      withoutComments(readFileSync(file, 'utf8'))
        .split('\n')
        .forEach((line, index) => {
          const match = line.match(/^\s*background(?:-color)?\s*:\s*([^;]+);/);
          if (!match?.[1]) return;
          backgroundsSeen += 1;
          const token = TEXT_TOKENS.find((name) => match[1]?.includes(`var(${name})`));
          if (!token) return;
          offenders.push(`${basename(file)}:${index + 1}  ${line.trim()}`);
        });
    }

    expect(
      offenders,
      'These paint a surface with a token that means text, so the surface inverts with the ' +
        'palette. Name the token that means the thing instead — --color-surface-dark for a ' +
        'band, --color-surface for a card, --color-accent-strong for an ember fill.',
    ).toEqual([]);

    expect(backgroundsSeen).toBeGreaterThan(100);
  });

  /*
   * ==========================================================================
   * EVERY CUSTOM PROPERTY A STYLESHEET NAMES ACTUALLY EXISTS
   * ==========================================================================
   *
   * A misspelt custom property is the quietest failure in CSS. `var(--color-accent-fill)` is
   * valid syntax, passes every linter, builds, deploys — and at computed-value time the whole
   * declaration is thrown away. `background` falls back to transparent and `color` falls back
   * to inherited, so the element renders as *something* and nobody is told anything.
   *
   * Four were live in this repository when this rule was written, all four added recently and
   * all four invisible to every other guard here: `--color-accent-fill` (the word
   * "Demonstration", which the stylesheet's own comment calls the thing that has to be
   * unmistakable, rendering with no fill), `--color-ink-subtle`, `--container-prose` and
   * `--container-xs` (two elements with no max-width, so two measures gone on wide screens).
   *
   * A `var(--x, fallback)` is deliberately allowed: a fallback is a stated intention, and the
   * one-argument form is the one that fails silently.
   */
  it('names no custom property that is never defined', () => {
    const defined = new Set<string>();

    for (const file of allStylesheets(SRC)) {
      for (const [, , token] of readFileSync(file, 'utf8').matchAll(
        /(^|[;{\s])(--[a-zA-Z0-9-]+)\s*:/g,
      )) {
        if (token) defined.add(token);
      }
    }

    /*
     * A component may set a custom property from JSX — `style={{ '--reveal-delay': … }}` is
     * the documented way to pass a dynamic value into a stylesheet — so those count as
     * definitions too. Without this the rule would fire on every one of them.
     */
    function sourceFiles(dir: string): string[] {
      return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        if (SKIP.has(entry.name)) return [];
        const path = join(dir, entry.name);
        if (entry.isDirectory()) return sourceFiles(path);
        return /\.tsx?$/.test(entry.name) ? [path] : [];
      });
    }

    for (const file of sourceFiles(SRC)) {
      for (const [, token] of readFileSync(file, 'utf8').matchAll(
        /['"](--[a-zA-Z0-9-]+)['"]\s*:/g,
      )) {
        if (token) defined.add(token);
      }
    }

    const offenders: string[] = [];
    let referencesSeen = 0;

    for (const file of allStylesheets(SRC)) {
      withoutComments(readFileSync(file, 'utf8'))
        .split('\n')
        .forEach((line, index) => {
          for (const [, token, fallback] of line.matchAll(/var\((--[a-zA-Z0-9-]+)\s*(,)?/g)) {
            referencesSeen += 1;
            if (fallback || !token || defined.has(token)) continue;
            offenders.push(`${basename(file)}:${index + 1}  ${line.trim()}`);
          }
        });
    }

    expect(
      offenders,
      'These name a custom property that is defined nowhere, so the browser discards the ' +
        'whole declaration and the element renders as if the line were not there. Fix the ' +
        'name, add the token to styles/tokens.css, or state a fallback: var(--x, value).',
    ).toEqual([]);

    expect(referencesSeen).toBeGreaterThan(500);
  });

  /*
   * ==========================================================================
   * TYPE AND RADIUS COME FROM THE SCALES
   * ==========================================================================
   */
  it('takes every font-size and border-radius from a scale', () => {
    const offenders: string[] = [];
    const exceptionsUsed = new Set<string>();
    let seen = 0;

    const RULES = [
      {
        rule: 'font-size' as const,
        property: /^\s*font-size\s*:\s*([^;]+);/,
        token: 'var(--text-',
      },
      {
        rule: 'border-radius' as const,
        property: /^\s*border-radius\s*:\s*([^;]+);/,
        token: 'var(--radius-',
      },
    ];

    /*
     * `0` is the *absence* of a size, not a size off the scale — a panel that goes
     * edge-to-edge on a phone says `border-radius: 0`, and there is no token for "none"
     * that would not be sillier than the literal. The CSS-wide keywords are the same
     * argument. Flagging these would be the rule firing on correct CSS, which is how a
     * rule earns its own deletion.
     */
    const ABSENT = /^(0(px|rem|em|%)?|inherit|initial|unset|revert|none)$/;

    for (const file of moduleFiles(SRC)) {
      withoutComments(readFileSync(file, 'utf8'))
        .split('\n')
        .forEach((line, index) => {
          for (const { rule, property, token } of RULES) {
            const match = line.match(property);
            if (!match?.[1]) continue;
            seen += 1;
            if (match[1].includes(token)) continue;
            if (ABSENT.test(match[1].trim())) continue;

            if (isExcepted(rule, file)) {
              exceptionsUsed.add(`${rule}:${basename(file)}`);
              continue;
            }
            offenders.push(`${basename(file)}:${index + 1}  ${line.trim()}`);
          }
        });
    }

    expect(
      offenders,
      'These set a size outside the scale. Use a --text-* or --radius-* token, or add an ' +
        'entry to EXCEPTIONS in this file explaining why this one is genuinely different.',
    ).toEqual([]);

    expect(seen).toBeGreaterThan(150);

    /*
     * The exception list is checked in both directions. An exception that stops matching
     * anything is an exception somebody fixed and forgot to delete, and leaving it there
     * quietly licenses the next person to break the same rule in the same file.
     */
    const stale = EXCEPTIONS.filter(
      (entry) =>
        /* Only the two rules this test manages — the spacing rule checks its own. */
        RULES.some(({ rule }) => rule === entry.rule) &&
        !exceptionsUsed.has(`${entry.rule}:${entry.file}`),
    ).map((entry) => `${entry.rule} in ${entry.file}`);

    expect(
      stale,
      'These EXCEPTIONS no longer match anything. The rule they excused is now being ' +
        'followed — delete the entry.',
    ).toEqual([]);
  });

  /*
   * ==========================================================================
   * SPACING COMES FROM THE RHYTHM
   * ==========================================================================
   *
   * The last unguarded scale. Colour, type, radius, stacking and breakpoints were already
   * held; spacing was not, which made it the one place a number could still be invented.
   *
   * ## What this deliberately does not flag, and why each exclusion is load-bearing
   *
   * A rule that fires on correct CSS is a rule somebody deletes, and spacing has more
   * legitimate non-scale values than any other property. Four exclusions, each for a real
   * category found in this codebase:
   *
   *   `em`         Font-relative by design. Twenty-eight declarations in this repository are
   *                a `margin-top: 0.15em` optically centring a `flex-shrink: 0` icon against
   *                the text beside it, or a list's `padding-inline-start` indenting its own
   *                markers. The whole point is that they track the local font size — snapping
   *                them to a rem step breaks the alignment at every size but one.
   *
   *   negatives    `margin: -1px` is the visually-hidden clip idiom, not a gap.
   *
   *   `calc()`,    A value composed from tokens, or from `env(safe-area-inset-*)`, is already
   *   `env()`,     doing the right thing. Flagging it would push authors back to literals.
   *   `clamp()`…
   *
   *   `0`, `auto`  The absence of spacing is not spacing off the scale.
   *
   * What is left is a bare `rem` or `px` literal in a spacing property, which is either a
   * rhythm value that should be a token or a measurement of some other element — and the
   * second kind belongs in EXCEPTIONS with the measurement written down, because a number
   * whose reason is unrecorded is a number the next person rounds.
   */
  it('takes every spacing value from the rhythm', () => {
    const offenders: string[] = [];
    const exceptionsUsed = new Set<string>();
    let seen = 0;

    const SPACING_PROPERTY =
      /^\s*((?:margin|padding)(?:-(?:top|right|bottom|left|inline|block))?(?:-(?:start|end))?|gap|row-gap|column-gap)\s*:\s*([^;]+);/;

    /* Composed or token-derived values are already correct — see the note above. */
    const COMPOSED = /var\(--|calc\(|env\(|clamp\(|min\(|max\(/;
    const ABSENT = /^(0(px|rem|em|%)?|auto|inherit|initial|unset|revert)$/;

    for (const file of moduleFiles(SRC)) {
      withoutComments(readFileSync(file, 'utf8'))
        .split('\n')
        .forEach((line, index) => {
          const match = line.match(SPACING_PROPERTY);
          if (!match?.[2]) return;

          const value = match[2].trim();
          if (COMPOSED.test(value)) return;

          seen += 1;

          /* A shorthand carries up to four values; any one of them can be off the scale. */
          const literals = value
            .split(/\s+/)
            .filter((part) => !ABSENT.test(part))
            .filter((part) => !part.startsWith('-'))
            .filter((part) => /^[\d.]+(rem|px)$/.test(part));

          if (literals.length === 0) return;

          if (isExcepted('spacing', file)) {
            exceptionsUsed.add(`spacing:${basename(file)}`);
            return;
          }

          offenders.push(`${basename(file)}:${index + 1}  ${line.trim()}`);
        });
    }

    expect(
      offenders,
      'These set a spacing value outside the rhythm. Use a --space-* token, or — if the ' +
        'number is a measurement of another element rather than page rhythm — add an entry ' +
        'to EXCEPTIONS in this file saying what it measures.',
    ).toEqual([]);

    expect(seen).toBeGreaterThan(100);

    const stale = EXCEPTIONS.filter(
      (entry) => entry.rule === 'spacing' && !exceptionsUsed.has(`spacing:${entry.file}`),
    ).map((entry) => `spacing in ${entry.file}`);

    expect(stale, 'These spacing EXCEPTIONS no longer match anything — delete the entry.').toEqual(
      [],
    );
  });

  /*
   * ==========================================================================
   * NO PROPERTY THAT HARD-CODES A SIDE
   * ==========================================================================
   *
   * `padding-left` and `padding-inline-start` are the same length, do the same thing in a
   * left-to-right document, and differ in one respect: the second one knows which way the
   * document reads. There were 139 of the first spelling in this repository and 68 of the
   * second, which is not a decision — it is two habits sharing a codebase.
   *
   * ## This is a spelling rule, not a feature
   *
   * Nothing here ships right-to-left, and nothing in this rule makes it possible to. The
   * `dir` attribute is set in one module, it says `ltr`, and a locale that wanted otherwise
   * would still need copy nobody has written. What this rule buys is that the *layout* half
   * of that job is done and stays done — the alternative being 139 declarations to find
   * again later, in stylesheets that had grown by then.
   *
   * It also buys something today: `border-inline-start` is the property that describes the
   * ember rail on a callout. `border-left` describes where the rail happens to be.
   *
   * ## The block axis is not in scope
   *
   * `margin-top`, `border-bottom` and `top`/`bottom` are left alone. They are physical too,
   * and their logical equivalents exist — but a `writing-mode` change is the only thing that
   * turns them, and this repository has no vertical text and no plan for any. A rule that
   * fires on `border-bottom: 1px solid var(--color-border)` would be a rule about nothing,
   * fired two hundred times, and it would be deleted within a week.
   */
  it('hard-codes no side on the inline axis', () => {
    const offenders: string[] = [];
    const exceptionsUsed = new Set<string>();
    let logicalSeen = 0;

    /*
     * Properties only. A *value* of `left` or `right` is caught too, because `text-align`,
     * `float` and `clear` all take one and all have a `start`/`end` spelling.
     */
    const PHYSICAL =
      /^\s*(?:(?:margin|padding|border|inset)-(?:left|right)(?:-[a-z]+)?|left|right)\s*:|^\s*(?:text-align|float|clear)\s*:\s*(?:left|right)\s*;/;

    const LOGICAL = /^\s*(?:(?:margin|padding|border|inset)-inline|inset-inline-(?:start|end))/;

    for (const file of allStylesheets(SRC)) {
      withoutComments(readFileSync(file, 'utf8'))
        .split('\n')
        .forEach((line, index) => {
          if (LOGICAL.test(line)) logicalSeen += 1;
          if (!PHYSICAL.test(line)) return;

          if (isExcepted('direction', file)) {
            exceptionsUsed.add(`direction:${basename(file)}`);
            return;
          }

          offenders.push(`${basename(file)}:${index + 1}  ${line.trim()}`);
        });
    }

    expect(
      offenders,
      'These hard-code a side. Use the logical property — padding-inline-start, ' +
        'border-inline-end, inset-inline-start, text-align: start — which is the same ' +
        'length and does the same thing. If the value is genuinely physical (a shadow ' +
        'offset, a depiction of hardware, a symmetric 50% centring paired with a ' +
        'translate), add an entry to EXCEPTIONS saying which.',
    ).toEqual([]);

    /*
     * Guards the guard, and it has to count the *logical* spelling rather than the physical
     * one: a rule whose job is to leave zero offenders cannot prove it ran by counting
     * offenders. If the walk broke, this is the number that would go to zero.
     */
    expect(logicalSeen).toBeGreaterThan(120);

    const stale = EXCEPTIONS.filter(
      (entry) => entry.rule === 'direction' && !exceptionsUsed.has(`direction:${entry.file}`),
    ).map((entry) => `direction in ${entry.file}`);

    expect(
      stale,
      'These direction EXCEPTIONS no longer match anything — delete the entry.',
    ).toEqual([]);
  });
});
