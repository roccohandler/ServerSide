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
const SRC = join(STYLES, '..');

/** Every `.module.css` under `src/`. `tokens.css` and `global.css` are not modules. */
function moduleFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return moduleFiles(path);
    return entry.name.endsWith('.module.css') ? [path] : [];
  });
}

function allStylesheets(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
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
  readonly rule: 'font-size' | 'border-radius';
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
    /** The palette, as written in tokens.css. Alpha values are skipped — see below. */
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

    /*
     * Every hex above must still be the value tokens.css defines, or this test measures a
     * palette the site does not use. Checked rather than assumed.
     */
    const tokensSource = readFileSync(join(STYLES, 'tokens.css'), 'utf8');
    const drifted = Object.entries(PALETTE).filter(
      ([token, hex]) => !new RegExp(`${token}:\\s*${hex}\\s*;`, 'i').test(tokensSource),
    );
    expect(
      drifted.map(([token, hex]) => `${token} is no longer ${hex}`),
      'This table has drifted from tokens.css, so the contrast maths below is measuring ' +
        'colours the site does not use. Update PALETTE to match.',
    ).toEqual([]);

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
    let pairsChecked = 0;

    for (const file of allStylesheets(SRC)) {
      const source = withoutComments(readFileSync(file, 'utf8'));

      for (const [, prelude, body] of source.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        if (!prelude || !body) continue;

        const foreground = body.match(/(?:^|;|\s)color:\s*var\((--[a-z-]+)\)/);
        const background = body.match(/background(?:-color)?:\s*var\((--[a-z-]+)\)/);
        if (!foreground?.[1] || !background?.[1]) continue;

        // Alpha panels (`--color-surface-on-dark`) have no fixed value to measure against.
        const fg = PALETTE[foreground[1]];
        const bg = PALETTE[background[1]];
        if (!fg || !bg) continue;

        pairsChecked += 1;
        const ratio = contrast(fg, bg);
        if (ratio >= 4.5) continue;

        offenders.push(
          `${basename(file)}  ${prelude.trim().split('\n').pop()?.trim()}  ` +
            `${foreground[1]} on ${background[1]} = ${ratio.toFixed(2)}:1`,
        );
      }
    }

    expect(
      offenders,
      'These pair a foreground and a background that do not clear 4.5:1. The usual cause ' +
        'is reaching for --color-accent (Ember, 3.0:1 on cream) where --color-accent-text ' +
        'belongs, or an on-dark token on a light ground. See the accent note in tokens.css.',
    ).toEqual([]);

    expect(pairsChecked).toBeGreaterThan(30);
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
      (entry) => !exceptionsUsed.has(`${entry.rule}:${entry.file}`),
    ).map((entry) => `${entry.rule} in ${entry.file}`);

    expect(
      stale,
      'These EXCEPTIONS no longer match anything. The rule they excused is now being ' +
        'followed — delete the entry.',
    ).toEqual([]);
  });
});
