import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Notice } from './Notice';

/*
 * ============================================================================
 * THE TONE DECIDES THE ROLE
 * ============================================================================
 *
 * This is the assertion the component exists for. Before it, the console had two
 * hand-written message treatments and every future one was a fresh decision about which
 * ARIA role to reach for — and the wrong answer is not visible, because a `role="status"`
 * that should have been `role="alert"` looks identical and simply fails to interrupt.
 *
 * `alert` interrupts a screen reader mid-sentence. That is right for a refused operation and
 * wrong for "showing the fifty oldest". Pinning the mapping means the choice is made once.
 * ============================================================================
 */

describe('a console notice', () => {
  it('interrupts for a problem', () => {
    render(<Notice tone="problem">A task would have nobody to appear for.</Notice>);

    expect(screen.getByRole('alert')).toHaveTextContent('A task would have nobody to appear for.');
  });

  it('does not interrupt for a success', () => {
    render(<Notice tone="success">Reply sent.</Notice>);

    expect(screen.getByRole('status')).toHaveTextContent('Reply sent.');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('does not interrupt for context', () => {
    render(<Notice tone="info">Showing the 50 oldest.</Notice>);

    expect(screen.getByRole('status')).toHaveTextContent('Showing the 50 oldest.');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  /*
   * The sign-in page moves focus to its failure so a keyboard user is not left standing on a
   * button whose label reverted to "Sign in" with the reason it failed out of reach. That
   * needs a focusable element, and making it a prop would mean the one page that needs it is
   * the one page that has to remember.
   */
  it('can be focused programmatically without joining the tab order', () => {
    render(<Notice tone="problem">That account is not an owner account.</Notice>);

    const notice = screen.getByRole('alert');
    expect(notice).toHaveAttribute('tabindex', '-1');

    notice.focus();
    expect(notice).toHaveFocus();
  });
});
