import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ScoreScale } from './ScoreScale';

/*
 * The rating scale, which `/audit` and the PlayBook assessment both compose.
 *
 * The behaviour worth pinning is the part that made it worth extracting: the radio is
 * hidden from *sight* only. If it ever becomes `display: none` — the obvious way to hide
 * it — the group silently loses keyboard operability, and both scoring instruments become
 * unusable for anyone not holding a mouse. Nothing about the page would look different.
 */

const POINTS = [
  { value: '1', label: 'Not at all' },
  { value: '2', label: 'Partly' },
  { value: '3', label: 'Completely' },
];

function renderScale(selected: number | undefined = undefined, onSelect = vi.fn()) {
  render(<ScoreScale group="q1" points={POINTS} selected={selected} onSelect={onSelect} />);
  return onSelect;
}

describe('ScoreScale', () => {
  it('renders one radio per point', () => {
    renderScale();
    expect(screen.getAllByRole('radio')).toHaveLength(POINTS.length);
  });

  /* The number and its caption together are the accessible name — "3 Completely" — so the
     announcement carries the meaning of the score and not just its digit. */
  it('names each point by its number and caption', () => {
    renderScale();
    expect(screen.getByRole('radio', { name: '3 Completely' })).toBeInTheDocument();
  });

  it('starts with nothing chosen', () => {
    renderScale();
    for (const radio of screen.getAllByRole('radio')) expect(radio).not.toBeChecked();
  });

  it('reflects the selected score', () => {
    renderScale(2);
    expect(screen.getByRole('radio', { name: '2 Partly' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '1 Not at all' })).not.toBeChecked();
  });

  /* The features store numbers; the content supplies strings. The conversion belongs here
     so neither caller has to remember to do it. */
  it('reports the score as a number', async () => {
    const user = userEvent.setup();
    const onSelect = renderScale();

    await user.click(screen.getByRole('radio', { name: '3 Completely' }));

    expect(onSelect).toHaveBeenCalledWith(3);
  });

  it('is operable from the keyboard', async () => {
    const user = userEvent.setup();
    const onSelect = renderScale();

    await user.tab();
    expect(screen.getByRole('radio', { name: '1 Not at all' })).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    expect(onSelect).toHaveBeenCalledWith(2);
  });

  /*
   * Two scales on one page must not capture each other's clicks. Twenty of these render at
   * once on `/audit`, and a shared `name` would turn twenty questions into one.
   */
  it('keeps separate groups independent', async () => {
    const user = userEvent.setup();
    const first = vi.fn();
    const second = vi.fn();

    render(
      <>
        <ScoreScale group="q1" points={POINTS} selected={undefined} onSelect={first} />
        <ScoreScale group="q2" points={POINTS} selected={undefined} onSelect={second} />
      </>,
    );

    // Six radios, two groups, and ids that do not collide.
    expect(screen.getAllByRole('radio')).toHaveLength(6);

    await user.click(screen.getAllByRole('radio', { name: '1 Not at all' })[1]!);

    expect(second).toHaveBeenCalledWith(1);
    expect(first).not.toHaveBeenCalled();
  });

  it('renders both layouts', () => {
    const { unmount } = render(
      <ScoreScale
        group="row"
        points={POINTS}
        selected={undefined}
        onSelect={vi.fn()}
        layout="row"
      />,
    );
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    unmount();

    render(
      <ScoreScale
        group="grid"
        points={POINTS}
        selected={undefined}
        onSelect={vi.fn()}
        layout="grid"
      />,
    );
    expect(screen.getAllByRole('radio')).toHaveLength(3);
  });
});
