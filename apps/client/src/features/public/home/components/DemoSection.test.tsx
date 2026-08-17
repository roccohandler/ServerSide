import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { demos, primaryCta } from '../../../../content';
import { DemoSection } from './DemoSection';

/*
 * The demonstrations exist so a visitor can see the value before contacting anybody.
 * That only works if two things stay true: the comparison is actually usable on a phone,
 * and nobody can mistake an illustration for a customer's website.
 *
 * The second is the one worth a test. There are no customers yet, and a demo panel that
 * quietly loses its label is the fastest way for this site to start implying otherwise.
 */

function renderDemos() {
  return render(
    <MemoryRouter>
      <DemoSection />
    </MemoryRouter>,
  );
}

describe('DemoSection', () => {
  it('labels every panel as an illustration', () => {
    renderDemos();

    // Two panels per demonstration, each carrying the disclaimer.
    expect(screen.getAllByText(demos.disclaimer)).toHaveLength(demos.items.length * 2);
  });

  it('shows a before and an after for every problem it raises', () => {
    renderDemos();

    for (const demo of demos.items) {
      expect(screen.getByRole('heading', { name: demo.title })).toBeInTheDocument();
      expect(screen.getByText(demo.problem)).toBeInTheDocument();
      expect(screen.getByText(demo.change)).toBeInTheDocument();
      expect(screen.getByText(demo.whyItMatters)).toBeInTheDocument();
    }

    expect(screen.getAllByText(demos.beforeLabel).length).toBeGreaterThanOrEqual(
      demos.items.length,
    );
    expect(screen.getAllByText(demos.afterLabel).length).toBeGreaterThanOrEqual(demos.items.length);
  });

  /*
   * Above 48rem both panels are on screen and the toggle is hidden by CSS, so this is
   * the narrow-screen path: the switch has to actually switch, and say which side it is
   * on, because pressed state is all a screen reader has to go by.
   */
  it('switches sides, and says which side it is on', async () => {
    const user = userEvent.setup();
    renderDemos();

    const firstDemo = demos.items[0];
    if (!firstDemo) throw new Error('there is nothing to demonstrate');

    const group = screen.getByRole('group', { name: new RegExp(firstDemo.title, 'i') });

    const before = within(group).getByRole('button', { name: demos.beforeLabel });
    const after = within(group).getByRole('button', { name: demos.afterLabel });

    expect(before).toHaveAttribute('aria-pressed', 'true');
    expect(after).toHaveAttribute('aria-pressed', 'false');

    await user.click(after);

    expect(before).toHaveAttribute('aria-pressed', 'false');
    expect(after).toHaveAttribute('aria-pressed', 'true');
  });

  /*
   * The section shows problems on somebody else's page. The only useful next thought is
   * "does mine do that", so the way to find out has to be in the section rather than four
   * screens further down.
   *
   * Matched against `primaryCta.label` rather than against the words, because the label is
   * deliberately a testable variable — it has already moved from "review" to "assessment"
   * once, and a test pinning the old wording would have failed for the wrong reason.
   */
  it('sends the reader from the demonstration to an assessment of their own website', () => {
    renderDemos();

    const section = screen.getByRole('region', { name: /small website problems/i });
    const action = within(section).getByRole('link', { name: primaryCta.label });

    expect(action).toHaveAttribute('href', primaryCta.to);
  });
});
