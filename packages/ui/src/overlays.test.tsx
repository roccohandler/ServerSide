import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Avatar } from './Avatar';
import { Drawer } from './Drawer';
import { Switch } from './Switch';
import { Tooltip } from './Tooltip';

/*
 * `Modal` and `Toast` have their own files because they have the most to get wrong. These
 * four are asserted together — each has one or two properties that matter and no consumer
 * yet, so a test is the only thing keeping them honest.
 */

describe('a drawer', () => {
  it('is a named modal dialog anchored to an edge', () => {
    render(
      <Drawer open title="Filters" onClose={vi.fn()}>
        <p>Body</p>
      </Drawer>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Filters' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveFocus();
  });

  it('traps focus, like the dialog it is', async () => {
    render(
      <Drawer open title="Filters" onClose={vi.fn()}>
        <button>Apply</button>
      </Drawer>,
    );

    const close = screen.getByRole('button', { name: 'Close' });
    const apply = screen.getByRole('button', { name: 'Apply' });

    await userEvent.tab();
    expect(close).toHaveFocus();
    await userEvent.tab();
    expect(apply).toHaveFocus();
    await userEvent.tab();
    expect(close).toHaveFocus();
  });

  it('closes on Escape', async () => {
    const onClose = vi.fn();
    render(
      <Drawer open title="Filters" onClose={onClose}>
        <p>Body</p>
      </Drawer>,
    );

    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('a tooltip', () => {
  it('describes the control rather than renaming it', () => {
    render(
      <Tooltip tip="The half paid up front to start the build.">
        <button>Deposit</button>
      </Tooltip>,
    );

    /*
     * The button is still called "Deposit". `aria-label` would have replaced that with the
     * tip and lost the word entirely — which is the mistake this exists to not make.
     */
    const button = screen.getByRole('button', { name: 'Deposit' });
    expect(button).toHaveAccessibleDescription('The half paid up front to start the build.');
  });

  /*
   * A tooltip a keyboard cannot summon does not exist for a large fraction of the people it
   * was written for — and hover does not exist on a touchscreen at all.
   */
  it('appears on focus, not only on hover', async () => {
    render(
      <Tooltip tip="Paid on launch day.">
        <button>Final</button>
      </Tooltip>,
    );

    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Final' })).toHaveFocus();
    expect(screen.getByRole('tooltip')).toHaveTextContent('Paid on launch day.');
  });

  /*
   * The tip stays in the DOM whether or not it is visible, because a description pointing at
   * an element that is not rendered is silently nothing — a tooltip that appears to exist
   * and announces nothing.
   */
  it('keeps the description resolvable while hidden', () => {
    render(
      <Tooltip tip="Paid on launch day.">
        <button>Final</button>
      </Tooltip>,
    );

    expect(screen.getByRole('tooltip', { hidden: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Final' })).toHaveAccessibleDescription(
      'Paid on launch day.',
    );
  });
});

describe('a switch', () => {
  it('is announced as on and off rather than checked and unchecked', () => {
    render(<Switch checked label="Email me about my project" onChange={vi.fn()} />);

    const control = screen.getByRole('switch', { name: 'Email me about my project' });
    expect(control).toBeChecked();
  });

  it('is operable by keyboard, because it is a real checkbox underneath', async () => {
    const onChange = vi.fn();
    render(<Switch checked={false} label="Email me" onChange={onChange} />);

    await userEvent.tab();
    await userEvent.keyboard(' ');

    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('reads its hint as part of the control', () => {
    render(
      <Switch checked={false} label="Email me" hint="At most once a week." onChange={vi.fn()} />,
    );

    expect(screen.getByRole('switch')).toHaveAccessibleDescription('At most once a week.');
  });
});

describe('an avatar', () => {
  it('shows initials, which is the case that actually happens', () => {
    const { container } = render(<Avatar name="Dana Reyes" />);
    expect(container.textContent).toBe('DR');
  });

  it('handles one name, and a name that is nothing', () => {
    const single = render(<Avatar name="Dana" />);
    expect(single.container.textContent).toBe('D');

    const blank = render(<Avatar name="   " />);
    expect(blank.container.textContent).toBe('?');
  });

  /*
   * Decorative, always. It sits beside the name it depicts, and announcing "Dana Reyes" as an
   * image and then reading "Dana Reyes" is the same information twice.
   */
  it('is hidden from a screen reader', () => {
    const { container } = render(<Avatar name="Dana Reyes" />);
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('falls back to initials when an image fails rather than to a broken icon', () => {
    const { container } = render(<Avatar name="Dana Reyes" src="/nope.png" />);

    const image = container.querySelector('img');
    expect(image).toBeInTheDocument();

    /*
     * `fireEvent` rather than `dispatchEvent`: React's synthetic media events are not
     * delivered by a raw DOM dispatch outside `act`, so the handler never runs and the
     * assertion below passes against an empty container for the wrong reason.
     */
    if (image) fireEvent.error(image);

    expect(container.textContent).toBe('DR');
    expect(container.querySelector('img')).not.toBeInTheDocument();
  });
});
