import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { primaryCta } from '../../content';
import { playbook, playbookStages } from '../../content/playbook';
import { PlayBookPage } from './PlayBookPage';

/*
 * The PlayBook is a free resource, and the thing that makes it worth anything is that it
 * is actually free. These tests exist mostly to stop that eroding: the whole of every
 * improvement has to stay on the public page, unfolded, and no claim in it may quietly
 * become a promise.
 */

function renderPlayBook() {
  return render(
    <MemoryRouter>
      <PlayBookPage />
    </MemoryRouter>,
  );
}

describe('the PlayBook', () => {
  it('has exactly one first-level heading', () => {
    renderPlayBook();

    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(playbook.hero.heading);
  });

  /*
   * The value exchange only works if the free half is the larger half. Every improvement,
   * including what to do about it and how to test it, has to be readable without giving
   * anybody an email address — so this asserts the practices and the quick test are on
   * the page, not just the headings.
   */
  it('publishes every improvement in full, with nothing held back', () => {
    renderPlayBook();

    const region = screen.getByRole('region', { name: /the twenty improvements/i });

    /*
     * Read the rendered text once and search it, rather than running a `getByText` query
     * per string. Twenty improvements with eight parts each is over two hundred queries,
     * and each one re-walks the whole document — enough to push this past the timeout
     * while proving nothing that a single read does not.
     */
    const rendered = region.textContent ?? '';

    expect(playbook.principles).toHaveLength(20);

    for (const play of playbook.principles) {
      expect(within(region).getByRole('heading', { name: play.heading })).toBeInTheDocument();

      for (const required of [
        play.metaConcept,
        play.principle,
        play.quickTest,
        play.whyItMatters,
        ...play.practices,
      ]) {
        expect(rendered, `${play.number} ${play.name} is missing: ${required}`).toContain(required);
      }
    }
  });

  /*
   * Nothing may be collapsed behind a disclosure. Content inside `<details>` is weighted
   * less by search engines, does not print, and reads as gated even when it is not —
   * which would undo the entire argument the page is making about itself.
   */
  it('hides no part of the resource behind a disclosure widget', () => {
    const { container } = renderPlayBook();
    expect(container.querySelectorAll('details')).toHaveLength(0);
  });

  it('groups the improvements into the six stages', () => {
    renderPlayBook();

    for (const stage of playbookStages) {
      expect(screen.getAllByRole('heading', { name: stage.name }).length).toBeGreaterThan(0);
    }
  });

  it('offers a way to jump to each stage', () => {
    renderPlayBook();

    const nav = screen.getByRole('navigation', { name: /the six stages/i });
    for (const stage of playbookStages) {
      const link = within(nav).getByRole('link', { name: new RegExp(stage.name, 'i') });
      expect(link).toHaveAttribute('href', `#stage-${stage.id}`);
    }
  });

  it('gives the reader an ordered place to start', () => {
    renderPlayBook();

    const priorities = screen.getByRole('region', { name: /you do not have twenty jobs/i });

    for (const tier of playbook.priorities.tiers) {
      expect(within(priorities).getByRole('heading', { name: tier.heading })).toBeInTheDocument();
    }
  });

  /* ---------------------------------------------------------------- assessment */

  it('renders every assessment category as readable content', () => {
    renderPlayBook();

    const assessment = screen.getByRole('region', { name: /score your own website/i });

    for (const category of playbook.scorecard.categories) {
      expect(within(assessment).getByText(category.prompt)).toBeInTheDocument();
    }

    // The bands are a way of deciding what to do next, not a measurement of anything.
    expect(within(assessment).getByText(/illustrative self-assessment/i)).toBeInTheDocument();
  });

  /*
   * The one interactive thing on a page containing an improvement about accessible forms.
   * Real radiogroups, one per category, or the page is arguing with itself.
   */
  it('scores with real radio groups, one per category', () => {
    renderPlayBook();

    const assessment = screen.getByRole('region', { name: /score your own website/i });
    const groups = within(assessment).getAllByRole('group');
    expect(groups).toHaveLength(playbook.scorecard.categories.length);

    const radios = within(assessment).getAllByRole('radio');
    expect(radios).toHaveLength(playbook.scorecard.categories.length * 3);
  });

  it('withholds the work list until every category is scored', () => {
    renderPlayBook();

    const assessment = screen.getByRole('region', { name: /score your own website/i });
    expect(within(assessment).getByText(playbook.scorecard.result.emptyBody)).toBeInTheDocument();
  });

  /* ---------------------------------------------------------------- capture */

  it('ends on the same call to action as the rest of the site', () => {
    renderPlayBook();

    const actions = screen.getAllByRole('link', { name: primaryCta.label });
    expect(actions.length).toBeGreaterThanOrEqual(1);
    for (const action of actions) expect(action).toHaveAttribute('href', primaryCta.to);
  });

  /*
   * The one place on the page that asks for anything, and it arrives after everything has
   * already been given away. It asks for an email address and nothing else — a name and a
   * business name would be data collected because a form felt too short.
   */
  it('asks for an email address, and only an email address', () => {
    renderPlayBook();

    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(1);
    expect(screen.getByLabelText(playbook.pdfOffer.form.label)).toBeInTheDocument();
  });

  it('states the consent next to the button rather than in a policy nobody opens', () => {
    renderPlayBook();
    expect(screen.getByText(playbook.pdfOffer.form.consent)).toBeInTheDocument();
  });

  /*
   * The exact string stored with every record on the server. `subscriber.schema.test.ts`
   * has the mirror of this assertion — reword the promise on the page without rewording
   * the server constant and one of the two fails, which is the point.
   */
  it('pins the consent wording that the server stores', () => {
    expect(playbook.pdfOffer.form.consent).toBe(
      'One email with the PlayBook in it. No sequence, no list, and no sharing your address with anybody.',
    );
  });

  /*
   * Two confirmations, one per real behaviour. Neither may describe something that is not
   * happening: the queued one must not talk about inboxes, and the sent one may, because
   * it is only ever shown when the workbook was genuinely emailed.
   */
  it('keeps the queued confirmation free of claims about an email being sent', () => {
    const copy = playbook.pdfOffer.success.queuedBody;

    expect(copy).not.toMatch(/check your (inbox|spam)/i);
    expect(copy).not.toMatch(/on its way/i);
    expect(copy).toMatch(/rather than from a mailing system|comes from me/i);
  });

  it('says out loud that nothing essential is behind the form', () => {
    renderPlayBook();
    expect(screen.getByText(playbook.pdfOffer.boundary)).toBeInTheDocument();
  });

  /*
   * A free guide is exactly where invented statistics turn up. Anything that looks like a
   * measured result has to be attributed, and no percentage is attributed to anybody here
   * — so none may appear at all, other than the published Core Web Vitals thresholds.
   */
  it('quotes no unattributed statistic and promises no result', () => {
    const { container } = renderPlayBook();
    const copy = container.textContent ?? '';

    expect(copy).not.toMatch(/\d+\s?%/);

    for (const forbidden of [
      /guaranteed (leads?|rankings?|conversions?)/i,
      /\b10x\b/i,
      // Scoped like the content-layer guard: "if a stock photo dominates" is ordinary
      // English, and only the hype claim is forbidden.
      /dominate\s+(?:google|search|your\s+market|the\s+competition)/i,
      /secret/i,
    ]) {
      expect(copy).not.toMatch(forbidden);
    }
  });
});
