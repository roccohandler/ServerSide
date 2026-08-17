import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { AnnouncerProvider } from './Announcer';
import { useAnnounce } from './useAnnounce';

/*
 * ============================================================================
 * THE THREE WAYS A LIVE REGION SILENTLY DOES NOTHING
 * ============================================================================
 *
 * All three are invisible in a browser and invisible in a screenshot, which is why they are
 * asserted rather than looked at:
 *
 *   1. The region is mounted at the same moment as its text, so the screen reader never sees
 *      a *change* and announces nothing.
 *   2. The same message is sent twice, so the second one is not a change either.
 *   3. It is `assertive` when it should be `polite`, and cuts the reader off mid-sentence.
 * ============================================================================
 */

function Harness() {
  const announce = useAnnounce();

  return (
    <>
      <button type="button" onClick={() => announce('Website approved.')}>
        Approve
      </button>
      <button type="button" onClick={() => announce('Marked as done.')}>
        Complete
      </button>
    </>
  );
}

const region = () => document.querySelector('[aria-live]');

describe('the workspace announcer', () => {
  it('mounts the region before there is anything to say', () => {
    render(
      <AnnouncerProvider>
        <Harness />
      </AnnouncerProvider>,
    );

    /*
     * Present and empty. A region that appears together with its text is the single most
     * common reason an announcement is dropped — the reader is watching for a change to
     * something that was already there.
     */
    expect(region()).toBeInTheDocument();
    expect(region()).toHaveTextContent('');
  });

  it('is polite, so it waits for a gap rather than interrupting', () => {
    render(
      <AnnouncerProvider>
        <Harness />
      </AnnouncerProvider>,
    );

    expect(region()).toHaveAttribute('aria-live', 'polite');
    expect(region()).toHaveAttribute('aria-atomic', 'true');
  });

  it('says what happened', async () => {
    render(
      <AnnouncerProvider>
        <Harness />
      </AnnouncerProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(region()).toHaveTextContent('Website approved.');
  });

  /*
   * Completing two tasks in a row is one change followed by no change, so the second
   * announcement is silent — on the surface where repeating an action is most normal.
   * `useAnnouncerState` appends a zero-width space on alternate calls to force the change.
   */
  it('says it again when the same thing happens twice', async () => {
    render(
      <AnnouncerProvider>
        <Harness />
      </AnnouncerProvider>,
    );

    const complete = screen.getByRole('button', { name: 'Complete' });

    await userEvent.click(complete);
    const first = region()?.textContent;

    await userEvent.click(complete);
    const second = region()?.textContent;

    expect(first).toContain('Marked as done.');
    expect(second).toContain('Marked as done.');
    /* Different content, same sentence — which is what makes the reader announce it twice. */
    expect(second).not.toBe(first);
  });
});
