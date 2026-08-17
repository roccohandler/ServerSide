import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Toast } from './Toast';

/*
 * The three things a toast gets wrong, asserted — because this primitive has no consumer yet,
 * so these are the only thing standing between it and a wrong implementation.
 */

describe('a toast', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('dismisses itself after a while', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();

    render(
      <Toast open onClose={onClose}>
        Reply sent.
      </Toast>,
    );

    expect(onClose).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(6000));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  /*
   * The failure this exists for: auto-dismiss is a timer racing a human, and it usually wins
   * against somebody who reads slowly or was looking somewhere else.
   */
  it('stops the clock while somebody is reading it', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();

    render(
      <Toast open onClose={onClose}>
        Reply sent.
      </Toast>,
    );

    const toast = screen.getByText('Reply sent.').parentElement as HTMLElement;

    act(() => void toast.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })));
    act(() => void vi.advanceTimersByTime(20_000));

    expect(onClose).not.toHaveBeenCalled();
  });

  /*
   * And on focus, which matters more than hover: a keyboard user reaching the dismiss button
   * is exactly the person the timer is about to rob.
   */
  it('stops the clock when the keyboard reaches it', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();

    render(
      <Toast open onClose={onClose}>
        Reply sent.
      </Toast>,
    );

    act(() => screen.getByRole('button', { name: 'Dismiss' }).focus());
    act(() => void vi.advanceTimersByTime(20_000));

    expect(onClose).not.toHaveBeenCalled();
  });

  it('can always be dismissed by hand', async () => {
    const onClose = vi.fn();

    render(
      <Toast open duration={null} onClose={onClose}>
        Reply sent.
      </Toast>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('stays until dismissed when it is given no duration', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();

    render(
      <Toast open duration={null} onClose={onClose}>
        Reply sent.
      </Toast>,
    );

    act(() => void vi.advanceTimersByTime(60_000));
    expect(onClose).not.toHaveBeenCalled();
  });

  /*
   * Deliberately silent. Both applications own one live region each, and two regions
   * announcing one outcome is worse than none — the reader hears it twice and stops trusting
   * either. Whatever opens a toast announces through the shell.
   */
  it('carries no live-region role of its own', () => {
    render(
      <Toast open onClose={vi.fn()}>
        Reply sent.
      </Toast>,
    );

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(document.querySelector('[aria-live]')).toBeNull();
  });

  it('renders nothing at all when closed', () => {
    render(
      <Toast open={false} onClose={vi.fn()}>
        Reply sent.
      </Toast>,
    );

    expect(screen.queryByText('Reply sent.')).not.toBeInTheDocument();
  });
});
