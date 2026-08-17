import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useDelayedFlag } from './useDelayedFlag';

/*
 * The two halves of this have to be asserted together, because each on its own is satisfied
 * by a hook that is simply wrong in the other direction: "never shows early" is satisfied by
 * one that never shows at all, which is what the codebase had.
 */

describe('a delayed flag', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('stays false through the fast case, which is every healthy request', () => {
    vi.useFakeTimers();

    const { result, rerender } = renderHook(({ active }) => useDelayedFlag(active), {
      initialProps: { active: true },
    });

    /* A same-origin chunk or a cookie check lands here. Nothing should have been painted. */
    act(() => void vi.advanceTimersByTime(150));
    expect(result.current).toBe(false);

    rerender({ active: false });
    expect(result.current).toBe(false);
  });

  it('becomes true once the wait is long enough to be worth reporting', () => {
    vi.useFakeTimers();

    const { result } = renderHook(() => useDelayedFlag(true));

    expect(result.current).toBe(false);
    act(() => void vi.advanceTimersByTime(400));
    expect(result.current).toBe(true);
  });

  /*
   * The reset. Without it a second load that resolves in 20ms would paint the fallback
   * immediately, because the flag was left true by the slow load before it — which is worse
   * than the original behaviour, not better.
   */
  it('resets, so a slow load does not make the next fast one flash', () => {
    vi.useFakeTimers();

    const { result, rerender } = renderHook(({ active }) => useDelayedFlag(active), {
      initialProps: { active: true },
    });

    act(() => void vi.advanceTimersByTime(400));
    expect(result.current).toBe(true);

    rerender({ active: false });
    expect(result.current).toBe(false);

    rerender({ active: true });
    expect(result.current).toBe(false);
  });
});
