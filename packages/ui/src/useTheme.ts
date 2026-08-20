import { useCallback, useEffect, useState } from 'react';

/*
 * ============================================================================
 * WHICH PALETTE THIS READER GETS
 * ============================================================================
 *
 * Two states, and the default is not negotiable by the operating system.
 *
 *   light    the default. `data-theme="light"`, or no attribute at all — `:root` in
 *            `styles/tokens.css` holds the light values, so the absence of a choice and the
 *            choice of light land on the same palette.
 *   dark     `data-theme="dark"` — the alternate palette, reached only from the control.
 *
 * ## Why there is no "match my system" any more
 *
 * There used to be three states, and the third was the default: no attribute, and
 * `@media (prefers-color-scheme: dark)` decided. That media query is gone (DECISION 036, and
 * the long note in `styles/tokens.css`), so "Match my system" would now be a label promising
 * something no stylesheet can deliver — every value of it resolves to light. A control that
 * lies about what it does is worse than one option fewer.
 *
 * The reasoning behind removing it is in `tokens.css` and belongs there rather than here;
 * the part that matters to this file is the consequence: **a stored `system` from before now
 * reads as `light`.** `isTheme` rejects it, `read()` falls through to the default, and the
 * reader gets the palette they would have got anyway on a light machine. Nobody is shown an
 * error about a preference they do not remember setting.
 *
 * ## Why this is in `packages/ui` and the control is not
 *
 * The same line DECISION 026 draws for every other shared hook: **behaviour is worth one
 * copy, appearance is worth two.** What the reader may choose, where the choice is written
 * down, what happens when two tabs disagree and what an unreadable value means are the same
 * questions in both applications, and answering them twice is how the two would come to
 * disagree about what `data-theme="darkk"` means. What the control *looks like* — a footer
 * field on the marketing site, a bar control in the console — is each application's own.
 *
 * ## Storage is best-effort, on purpose
 *
 * `localStorage` throws in a Safari private window and in an iframe with third-party storage
 * blocked, and it throws on *read* as well as on write. A theme preference is not worth an
 * error boundary, so every access is wrapped and a failure means "light" — which is the
 * default anyway, and is the behaviour of a reader who never touched the control.
 *
 * ## Two tabs
 *
 * `storage` fires in the *other* tabs when one of them writes. Without it, a reader who
 * switches to dark in one tab finds the second still light, changes it there too, and now
 * has a setting they have set twice and cannot trust. One listener, four lines.
 *
 * ## The bootstrap in `index.html` is frozen
 *
 * Both documents carry six inline lines that stamp `data-theme` from this key before first
 * paint, and `vercel.json` carries a `sha256-` of their exact bytes. Those lines already
 * handle exactly `light` and `dark` and ignore everything else, so the narrowing here needed
 * no edit there — which is the only reason this change does not move a CSP digest. Keep it
 * that way: `THEME_STORAGE_KEY` and the two accepted values are a contract with a script this
 * module cannot see.
 * ============================================================================
 */

export type Theme = 'light' | 'dark';

/** Shared with the inline bootstrap in both `index.html` documents. Changing it orphans it. */
export const THEME_STORAGE_KEY = 'jobforge:theme';

/** What a reader gets before they touch anything, and what an unreadable value falls back to. */
export const DEFAULT_THEME: Theme = 'light';

const THEMES: readonly Theme[] = ['light', 'dark'];

const isTheme = (value: unknown): value is Theme =>
  typeof value === 'string' && (THEMES as readonly string[]).includes(value);

function read(): Theme {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

/**
 * Puts the choice on `<html>`, which is the only thing that actually changes the page.
 *
 * Exported because the bootstrap script does the same job before React exists, and because
 * `DemoLayout` pins its own subtree — see the note there.
 */
export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
}

export function useTheme(): { theme: Theme; setTheme: (next: Theme) => void } {
  /*
   * Lazy initialiser rather than an effect: the attribute is already on `<html>` when this
   * first runs — the bootstrap in `index.html` put it there before the first paint — so
   * starting from the default and correcting in an effect would render the wrong label for
   * one frame on every load, on the one control whose job is to report the current state.
   */
  const [theme, setThemeState] = useState<Theme>(read);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    applyTheme(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* A reader who cannot be remembered still gets the theme they asked for, this visit. */
    }
  }, []);

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) return;
      const next = isTheme(event.newValue) ? event.newValue : DEFAULT_THEME;
      setThemeState(next);
      applyTheme(next);
    };

    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  return { theme, setTheme };
}
