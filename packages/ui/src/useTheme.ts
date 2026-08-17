import { useCallback, useEffect, useState } from 'react';

/*
 * ============================================================================
 * WHICH PALETTE THIS READER GETS
 * ============================================================================
 *
 * Three states, not two. A switch can only say light-or-dark, and the state most people
 * actually want is neither: **do what my computer does**, which is free, follows them
 * between day and night, and is what every visitor gets before they touch anything.
 *
 *   system   no attribute on <html>. `@media (prefers-color-scheme: dark)` decides.
 *   light    data-theme="light" — beats a dark operating system.
 *   dark     data-theme="dark"  — beats a light one.
 *
 * The CSS is in `styles/tokens.css` and it is arranged so that all three fall out of two
 * blocks; read the note there before changing either.
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
 * error boundary, so every access is wrapped and a failure means "system" — which is the
 * default anyway, and is the behaviour of a reader who never touched the control.
 *
 * ## Two tabs
 *
 * `storage` fires in the *other* tabs when one of them writes. Without it, a reader who
 * switches to dark in one tab finds the second still light, changes it there too, and now
 * has a setting they have set twice and cannot trust. One listener, four lines.
 * ============================================================================
 */

export type Theme = 'system' | 'light' | 'dark';

/** Shared with the inline bootstrap in both `index.html` documents. Changing it orphans it. */
export const THEME_STORAGE_KEY = 'jobforge:theme';

const THEMES: readonly Theme[] = ['system', 'light', 'dark'];

const isTheme = (value: unknown): value is Theme =>
  typeof value === 'string' && (THEMES as readonly string[]).includes(value);

function read(): Theme {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

/**
 * Puts the choice on `<html>`, which is the only thing that actually changes the page.
 *
 * Exported because the bootstrap script does the same job before React exists, and because
 * `DemoLayout` pins its own subtree — see the note there.
 */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}

export function useTheme(): { theme: Theme; setTheme: (next: Theme) => void } {
  /*
   * Lazy initialiser rather than an effect: the attribute is already on `<html>` when this
   * first runs — the bootstrap in `index.html` put it there before the first paint — so
   * starting from `system` and correcting in an effect would render the wrong label for one
   * frame on every load, on the one control whose job is to report the current state.
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
      const next = isTheme(event.newValue) ? event.newValue : 'system';
      setThemeState(next);
      applyTheme(next);
    };

    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  return { theme, setTheme };
}
