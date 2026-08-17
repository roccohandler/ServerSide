import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { THEME_STORAGE_KEY, useTheme } from './useTheme';

/*
 * The four things about a theme preference that are easy to get wrong, and one that is only
 * wrong in production.
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
  it('starts at system, and leaves the attribute off', () => {
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('system');
    /*
     * No attribute at all, rather than `data-theme="system"`. The stylesheet's dark block is
     * `:root:not([data-theme='light'])` inside a `prefers-color-scheme` query — an attribute
     * with any value would be a third state the CSS has no rule for.
     */
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('reads a stored choice on the first render rather than in an effect', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');

    const { result } = renderHook(() => useTheme());

    /*
     * First render, not second. The bootstrap in index.html has already stamped `<html>` by
     * the time React runs, so a hook that started at `system` and corrected itself in an
     * effect would render the wrong label for one frame — on the one control whose entire
     * job is to report which theme is active.
     */
    expect(result.current.theme).toBe('dark');
  });

  it('ignores a stored value that is not a theme', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'darkk');

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('system');
  });

  it('writes the attribute and the store together', () => {
    const { result } = renderHook(() => useTheme());

    act(() => result.current.setTheme('dark'));

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');

    act(() => result.current.setTheme('system'));

    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('system');
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
