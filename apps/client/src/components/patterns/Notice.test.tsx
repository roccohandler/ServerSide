import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Notice, NoticeAction } from './Notice';

/*
 * ============================================================================
 * THE TONE DECIDES THE ROLE
 * ============================================================================
 *
 * The assertion this pattern exists for. Ten hand-written message treatments preceded it and
 * they did not agree: the billing banners carried `role="status"`, the project page's action
 * failure carried `role="alert"`, the dashboard's verification nudge carried neither — and
 * nothing tied any of those choices to how the message looked, so each new one was the same
 * decision made again from scratch.
 *
 * The wrong answer is invisible. A `role="status"` that should have been `role="alert"`
 * renders identically and simply fails to interrupt, which is the failure mode you only find
 * by using a screen reader on the day it matters.
 * ============================================================================
 */

describe('a workspace notice', () => {
  it('interrupts for a problem', () => {
    render(<Notice tone="problem">We could not save that.</Notice>);

    expect(screen.getByRole('alert')).toHaveTextContent('We could not save that.');
  });

  it('does not interrupt for a success', () => {
    render(<Notice tone="success">Your answers are saved.</Notice>);

    expect(screen.getByRole('status')).toHaveTextContent('Your answers are saved.');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  /*
   * The post-checkout banner is the case that decided this. It is the most consequential
   * thing on the page at the moment it appears — and it is still not worth cutting somebody
   * off mid-sentence to announce, because nothing about it needs acting on.
   */
  it('does not interrupt for information', () => {
    render(<Notice tone="info">Your payment is with Stripe.</Notice>);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('can be focused programmatically without joining the tab order', () => {
    render(<Notice tone="problem">Check the highlighted fields.</Notice>);

    const notice = screen.getByRole('alert');
    expect(notice).toHaveAttribute('tabindex', '-1');

    notice.focus();
    expect(notice).toHaveFocus();
  });

  /*
   * A button, never a link. "Check again" re-reads the page's own data rather than going
   * anywhere, and the distinction is the one `Button` versus `ButtonLink` exists to protect:
   * an anchor here would offer "open in new tab" for something that is not a destination.
   */
  it('carries an inline action that is a button', async () => {
    const onClick = vi.fn();
    render(
      <Notice tone="info">
        Confirming. <NoticeAction onClick={onClick}>Check again</NoticeAction>
      </Notice>,
    );

    const action = screen.getByRole('button', { name: 'Check again' });
    await userEvent.click(action);

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
