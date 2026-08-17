import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from './Modal';

/*
 * ============================================================================
 * EVERY WAY A DIALOG IS QUIETLY BROKEN
 * ============================================================================
 *
 * A modal is the most commonly broken component on the web, and every failure below is
 * invisible to somebody testing it with a mouse. That is the whole reason these exist: this
 * primitive has no consumer yet, so the *only* thing standing between it and a wrong
 * implementation is this file.
 * ============================================================================
 */

function Harness({ onClose = vi.fn() }: { readonly onClose?: () => void }) {
  return (
    <Modal open title="Approve this website?" onClose={onClose} footer={<button>Approve</button>}>
      <p>It will be public.</p>
      <button>Read the terms</button>
    </Modal>
  );
}

describe('a dialog', () => {
  it('announces itself as a modal, with a name', () => {
    render(<Harness />);

    const dialog = screen.getByRole('dialog', { name: 'Approve this website?' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('takes focus when it opens', () => {
    render(<Harness />);

    /*
     * The panel, not the first button. Landing on a control puts the heading and the body
     * behind the reader's cursor, and they are the part that says what this is.
     */
    expect(screen.getByRole('dialog')).toHaveFocus();
  });

  it('gives focus back to whatever opened it', () => {
    const opener = document.createElement('button');
    opener.textContent = 'Open';
    document.body.appendChild(opener);
    opener.focus();

    const { rerender } = render(
      <Modal open title="A dialog" onClose={vi.fn()}>
        <p>Body</p>
      </Modal>,
    );

    expect(screen.getByRole('dialog')).toHaveFocus();

    rerender(
      <Modal open={false} title="A dialog" onClose={vi.fn()}>
        <p>Body</p>
      </Modal>,
    );

    /*
     * Without this, focus lands on `<body>` — so somebody who opened a dialog from halfway
     * down a long page is returned to the top of it.
     */
    expect(opener).toHaveFocus();
    opener.remove();
  });

  it('closes on Escape, which is the key everybody tries', async () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);

    await userEvent.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on the close button', async () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);

    await userEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  /*
   * The failure this exists for: tab past the last control and you are behind the dialog,
   * operating a page you cannot see, while `aria-modal` tells a screen reader that page is
   * unavailable. The claim is only true because of this.
   */
  it('keeps focus inside, forwards and backwards', async () => {
    render(<Harness />);

    const close = screen.getByRole('button', { name: 'Close' });
    const terms = screen.getByRole('button', { name: 'Read the terms' });
    const approve = screen.getByRole('button', { name: 'Approve' });

    await userEvent.tab();
    expect(close).toHaveFocus();
    await userEvent.tab();
    expect(terms).toHaveFocus();
    await userEvent.tab();
    expect(approve).toHaveFocus();

    /* Past the last one, back to the first rather than out to the page. */
    await userEvent.tab();
    expect(close).toHaveFocus();

    /* And backwards off the first, to the last. */
    await userEvent.tab({ shift: true });
    expect(approve).toHaveFocus();
  });

  it('stops the page behind it scrolling, and puts it back', () => {
    const { rerender } = render(<Harness />);
    expect(document.body.style.overflow).toBe('hidden');

    rerender(
      <Modal open={false} title="Approve this website?" onClose={vi.fn()}>
        <p>It will be public.</p>
      </Modal>,
    );
    expect(document.body.style.overflow).toBe('');
  });

  it('renders nothing at all when closed', () => {
    render(
      <Modal open={false} title="Approve this website?" onClose={vi.fn()}>
        <p>It will be public.</p>
      </Modal>,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
