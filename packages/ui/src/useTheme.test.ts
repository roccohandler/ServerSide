import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_THEME, THEME_STORAGE_KEY, useTheme } from './useTheme';

/*
 * The things about a theme preference that are easy to get wrong, and one that is only wrong
 * in production.
 *
 * There is no test here that dark mode *looks* right — `styles/tokens.test.ts` computes AA
 * over both palettes and that is the check that matters. This is about the state.
 */

afterEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  vi.restoreAllMocks();
});

describe('the theme preference', () => {
  it('starts at light, and leaves the attribute off', () => {
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('light');
    expect(DEFAULT_THEME).toBe('light');
    /*
     * No attribute, rather than `data-theme="light"`. `:root` in `styles/tokens.css` already
     * holds the light values, so a reader who has never touched the control gets the right
     * palette from the stylesheet with nothing on `<html>` at all — which is the whole reason
     * the common case cannot flash.
     */
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('reads a stored choice on the first render rather than in an effect', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');

    const { result } = renderHook(() => useTheme());

    /*
     * First render, not second. The bootstrap in index.html has already stamped `<html>` by
     * the time React runs, so a hook that started at the default and corrected itself in an
     * effect would render the wrong label for one frame — on the one control whose entire
     * job is to report which theme is active.
     */
    expect(result.current.theme).toBe('dark');
  });

  it('ignores a stored value that is not a theme', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'darkk');

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('light');
  });

  it('reads a stored `system` from before the two-state change as light', () => {
    /*
     * The migration, and the reason it needs no code of its own.
     *
     * There were three states until DECISION 036 — System / Light / Dark — and `system` was
     * the default and therefore the value most readers who touched the control at all have
     * stored. With `prefers-color-scheme` gone from `tokens.css`, every meaning it could have
     * had resolves to light, so falling through to the default *is* the correct migration:
     * the reader gets the palette the old value would now have produced, and nobody is shown
     * an error about a preference they do not remember setting.
     *
     * The inline bootstrap in both `index.html` documents already agrees — it writes the
     * attribute only for `light` and `dark` and has always ignored everything else — which is
     * why narrowing the type moved no CSP digest.
     */
    window.localStorage.setItem(THEME_STORAGE_KEY, 'system');

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('light');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('writes the attribute and the store together', () => {
    const { result } = renderHook(() => useTheme());

    act(() => result.current.setTheme('dark'));

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');

    act(() => result.current.setTheme('light'));

    /*
     * `light` is stated on the element rather than removed. `:root` would give the same
     * colours either way, but the bootstrap writes the attribute for a stored `light` too,
     * and a hook that disagreed with the script that runs before it is a difference somebody
     * eventually debugs.
     */
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('still applies the theme when storage refuses to be written', () => {
    /*
     * Safari in a private window, and any iframe with third-party storage blocked. It throws
     * on write, and a colour scheme is not worth an unhandled rejection — so the reader gets
     * the theme they asked for and simply is not remembered next time.
     */
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    const { result } = renderHook(() => useTheme());

    expect(() => act(() => result.current.setTheme('dark'))).not.toThrow();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(result.current.theme).toBe('dark');
  });

  it('follows a change made in another tab', () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setTheme('dark'));

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', { key: THEME_STORAGE_KEY, newValue: 'light' }),
      );
    });

    expect(result.current.theme).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('ignores another key changing', () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setTheme('dark'));

    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'something:else', newValue: null }));
    });

    expect(result.current.theme).toBe('dark');
  });
});
