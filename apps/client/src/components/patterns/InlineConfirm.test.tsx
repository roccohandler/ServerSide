import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { InlineConfirm } from './InlineConfirm';

/*
 * The property worth pinning is the one a confirmation exists for and the one nobody writes a
 * test for: that saying no does nothing at all. A confirm step whose cancel path still fires
 * the action is worse than no confirm step, because it teaches somebody the guard is there.
 */

describe('an inline confirmation', () => {
  function renderConfirm(overrides?: { readonly busy?: boolean }) {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <InlineConfirm
        question="Approve this website?"
        detail="It will be public."
        confirmLabel="Yes, approve and go live"
        busyLabel="Approving…"
        busy={overrides?.busy ?? false}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    return { onConfirm, onCancel };
  }

  it('does nothing at all when the answer is no', async () => {
    const { onConfirm, onCancel } = renderConfirm();

    await userEvent.click(screen.getByRole('button', { name: 'Not yet' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('acts once when the answer is yes', async () => {
    const { onConfirm } = renderConfirm();

    await userEvent.click(screen.getByRole('button', { name: 'Yes, approve and go live' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  /*
   * A group, not an `alertdialog`. `alertdialog` promises the rest of the page is unavailable,
   * and it is not — this replaces a button in the flow of the document. Announcing a
   * constraint that does not exist is worse than announcing nothing.
   */
  it('is a labelled group rather than a dialog', () => {
    renderConfirm();

    const group = screen.getByRole('group', { name: /approve this website/i });
    expect(group).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  /*
   * `loading`, never `disabled`. A disabled button leaves the tab order the instant it becomes
   * disabled, so a keyboard user who confirmed with Enter loses focus mid-request — on the
   * one control in the product built to be pressed deliberately.
   */
  it('stays focusable while the action is in flight', () => {
    renderConfirm({ busy: true });

    const confirm = screen.getByRole('button', { name: 'Approving…' });
    expect(confirm).not.toBeDisabled();
    expect(confirm).toHaveAttribute('aria-disabled', 'true');
    expect(confirm).toHaveAttribute('aria-busy', 'true');
  });
});
