import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { playbook } from '../../../content/playbook';
import { PlayBookAssessment } from './sections/PlayBookAssessment';

/*
 * The self-assessment.
 *
 * It is the one interactive thing on a page that contains a whole improvement about
 * building accessible forms, so these tests care as much about how it is operated as
 * about what it calculates. Everything here drives it the way a person would — clicking
 * labels, tabbing, reading what is announced — rather than reaching into the hook.
 */

function renderAssessment() {
  return render(
    <MemoryRouter>
      <PlayBookAssessment />
    </MemoryRouter>,
  );
}

/*
 * The accessible name of each fieldset is its legend, which carries the category label
 * *and* the stage it belongs to, concatenated without a separator — "TrustGet trusted".
 *
 * So an unanchored /Trust/i also matches "Proof placementGet trusted", and a `\b` after
 * the label never matches either, because the next character is a letter. Anchoring on
 * the prefix alone is what works, and no category label is a prefix of another.
 */
function groupFor(label: string): HTMLElement {
  return screen.getByRole('group', { name: new RegExp(`^${label}`, 'i') });
}

/** Scores every category the same, which is the fastest way to reach a known total. */
async function scoreEverything(user: ReturnType<typeof userEvent.setup>, value: '0' | '1' | '2') {
  for (const category of playbook.scorecard.categories) {
    await user.click(within(groupFor(category.label)).getByLabelText(new RegExp(`^${value}`)));
  }
}

/** The running total, read from the live region rather than by matching a bare digit. */
function totalText(): string {
  const live = document.querySelector('[aria-live="polite"]');
  if (!live) throw new Error('The assessment must announce its total politely.');
  return live.textContent ?? '';
}

describe('the website assessment', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('renders every category as a labelled radio group', () => {
    renderAssessment();

    const groups = screen.getAllByRole('group');
    expect(groups).toHaveLength(playbook.scorecard.categories.length);

    for (const category of playbook.scorecard.categories) {
      // Three real radios, so arrow keys work and a screen reader announces the group.
      expect(within(groupFor(category.label)).getAllByRole('radio')).toHaveLength(3);
    }
  });

  it('shows nothing scored before anybody touches it', () => {
    renderAssessment();

    expect(screen.getByText(playbook.scorecard.unscoredLabel)).toBeInTheDocument();
    expect(
      screen.getByText(`0 of ${playbook.scorecard.categories.length} scored`),
    ).toBeInTheDocument();
  });

  it('adds up what has been scored, and announces the total politely', async () => {
    const user = userEvent.setup();
    renderAssessment();

    const first = playbook.scorecard.categories[0];
    if (!first) throw new Error('The scorecard must have categories.');

    await user.click(within(groupFor(first.label)).getByLabelText(/^2/));

    // Announced without interrupting somebody mid-question.
    expect(totalText()).toContain('2');
    expect(totalText()).toContain('/ 40');
    expect(
      screen.getByText(`1 of ${playbook.scorecard.categories.length} scored`),
    ).toBeInTheDocument();
  });

  /*
   * A partial assessment would rank the categories somebody happened to answer first,
   * which looks like an answer while being worse than none.
   */
  it('withholds the work list until every category is scored', async () => {
    const user = userEvent.setup();
    renderAssessment();

    const first = playbook.scorecard.categories[0];
    if (!first) throw new Error('The scorecard must have categories.');

    await user.click(within(groupFor(first.label)).getByLabelText(/^0/));

    expect(screen.getByText(playbook.scorecard.result.emptyBody)).toBeInTheDocument();
    expect(screen.queryByText(playbook.scorecard.result.lede)).not.toBeInTheDocument();
  });

  it('resolves a completed assessment to the right band', async () => {
    const user = userEvent.setup();
    renderAssessment();

    await scoreEverything(user, '0');

    const lowest = playbook.scorecard.bands[0];
    expect(lowest).toBeDefined();
    expect(screen.getByRole('heading', { name: lowest?.title })).toBeInTheDocument();
  });

  it('produces the weakest five, and stops at five', async () => {
    const user = userEvent.setup();
    renderAssessment();

    await scoreEverything(user, '0');

    expect(
      screen.getByRole('heading', { name: playbook.scorecard.result.heading }),
    ).toBeInTheDocument();

    const list = screen
      .getByRole('heading', { name: playbook.scorecard.result.heading })
      .closest('div')
      ?.querySelector('ol');
    expect(list).not.toBeNull();
    expect(within(list as HTMLElement).getAllByRole('listitem')).toHaveLength(5);
  });

  /*
   * Scoring everything at two is the one case where the work list would be empty, and an
   * empty list rendered as a list reads like a bug.
   */
  it('says something useful when nothing scored badly', async () => {
    const user = userEvent.setup();
    renderAssessment();

    await scoreEverything(user, '2');

    expect(
      screen.getByRole('heading', { name: playbook.scorecard.result.perfectHeading }),
    ).toBeInTheDocument();

    const highest = playbook.scorecard.bands.at(-1);
    expect(screen.getByRole('heading', { name: highest?.title })).toBeInTheDocument();
  });

  it('links every weak category back to the improvement that explains it', async () => {
    const user = userEvent.setup();
    renderAssessment();

    await scoreEverything(user, '0');

    const links = screen.getAllByRole('link', {
      name: new RegExp(playbook.scorecard.result.readMore, 'i'),
    });
    expect(links).toHaveLength(5);
    for (const link of links) {
      expect(link.getAttribute('href')).toMatch(/^#stage-/);
    }
  });

  /* ---------------------------------------------------------------- storage */

  it('keeps the answers in this browser and nowhere else', async () => {
    const user = userEvent.setup();
    const { unmount } = renderAssessment();

    const first = playbook.scorecard.categories[0];
    if (!first) throw new Error('The scorecard must have categories.');

    await user.click(within(groupFor(first.label)).getByLabelText(/^1/));

    unmount();
    renderAssessment();

    expect(within(groupFor(first.label)).getByLabelText(/^1/)).toBeChecked();
  });

  it('clears everything when asked, including the stored copy', async () => {
    const user = userEvent.setup();
    renderAssessment();

    const first = playbook.scorecard.categories[0];
    if (!first) throw new Error('The scorecard must have categories.');

    await user.click(within(groupFor(first.label)).getByLabelText(/^2/));

    await user.click(screen.getByRole('button', { name: playbook.scorecard.resetLabel }));

    expect(screen.getByText(playbook.scorecard.unscoredLabel)).toBeInTheDocument();
    expect(within(groupFor(first.label)).getByLabelText(/^2/)).not.toBeChecked();
  });

  /*
   * Corrupt or stale storage must not be able to take the page down or poison the total.
   * It is user-writable and it survives deploys.
   */
  it('ignores stored data it does not recognise', () => {
    window.localStorage.setItem(
      'serviceside.playbook.score.v1',
      JSON.stringify({ 'a-category-that-was-renamed': 2, clarity: 99, speed: 1 }),
    );

    renderAssessment();

    // Only the one valid entry survives.
    expect(
      screen.getByText(`1 of ${playbook.scorecard.categories.length} scored`),
    ).toBeInTheDocument();
  });

  it('survives storage containing something that is not JSON', () => {
    window.localStorage.setItem('serviceside.playbook.score.v1', 'not json at all');

    renderAssessment();

    expect(screen.getByText(playbook.scorecard.unscoredLabel)).toBeInTheDocument();
  });

  it('tells the reader their answers are not sent anywhere', () => {
    renderAssessment();
    expect(screen.getByText(playbook.scorecard.storageNote)).toBeInTheDocument();
  });
});
