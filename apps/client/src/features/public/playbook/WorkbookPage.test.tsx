import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { pages } from '../../../content';
import { playbook, playbookStages } from '../../../content/playbook';
import { routes } from '../../../config/routes';
import { WorkbookPage } from './WorkbookPage';

/*
 * The workbook is the document that gets printed and emailed, so what these tests protect
 * is different from the rest of the suite: that it stays out of search results, that the
 * whole resource is genuinely in it, and that it never becomes a page with an idea on it
 * that the public PlayBook does not already have.
 */

function renderWorkbook() {
  return render(
    <MemoryRouter>
      <WorkbookPage />
    </MemoryRouter>,
  );
}

describe('the workbook', () => {
  it('has exactly one first-level heading', () => {
    renderWorkbook();

    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(playbook.workbook.title);
  });

  /*
   * It is a production tool, not a landing page. Indexed, it would compete with the public
   * PlayBook for the same searches while being far less useful to read on screen — and it
   * would make the email form pointless.
   */
  it('is kept out of search results and out of the sitemap', () => {
    const meta = pages.find((page) => page.path === routes.workbook);

    expect(meta).toBeDefined();
    expect(meta?.noIndex).toBe(true);
  });

  /*
   * The document is the resource, not a summary of it. Somebody who was emailed this and
   * never visits the site should have everything.
   */
  it('carries all twenty improvements in full', () => {
    const { container } = renderWorkbook();

    // One read, then string searches — see the note on the equivalent PlayBook test.
    const rendered = container.textContent ?? '';

    expect(playbook.principles).toHaveLength(20);

    for (const principle of playbook.principles) {
      for (const required of [
        principle.heading,
        principle.metaConcept,
        principle.quickTest,
        ...principle.practices,
      ]) {
        expect(rendered, `${principle.number} ${principle.name} is missing: ${required}`).toContain(
          required,
        );
      }
    }
  });

  it('groups them under the six stages, and lists them in a contents page', () => {
    renderWorkbook();

    for (const stage of playbookStages) {
      expect(screen.getAllByRole('heading', { name: stage.name }).length).toBeGreaterThan(0);
    }

    const contents = screen.getByRole('heading', { name: playbook.workbook.contentsHeading });
    expect(contents).toBeInTheDocument();
  });

  it('renders every audit sheet', () => {
    renderWorkbook();

    for (const sheet of playbook.workbook.sections) {
      expect(screen.getByRole('heading', { name: sheet.title })).toBeInTheDocument();
    }

    for (const title of [
      playbook.workbook.scoreSheet.title,
      playbook.workbook.priority.title,
      playbook.workbook.closing.heading,
    ]) {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    }
  });

  /*
   * A worksheet with no room to write on is a handout. Every table declares its own row
   * count and those rows have to reach the page, empty.
   */
  it('draws the tables with room to write in', () => {
    renderWorkbook();

    const formSheet = playbook.workbook.sections.find((sheet) => sheet.id === 'form');
    expect(formSheet).toBeDefined();
    if (!formSheet || !('table' in formSheet) || !formSheet.table) {
      throw new Error('The form audit sheet must carry a table.');
    }

    const heading = screen.getByRole('heading', { name: formSheet.title });
    const section = heading.closest('section');
    expect(section).not.toBeNull();

    const table = within(section as HTMLElement).getByRole('table');
    // Header row plus the declared blank rows.
    expect(within(table).getAllByRole('row')).toHaveLength(formSheet.table.rows + 1);
  });

  it('carries all twenty scorecard categories plus a total row', () => {
    renderWorkbook();

    const heading = screen.getByRole('heading', { name: playbook.workbook.scoreSheet.title });
    const section = heading.closest('section');
    const table = within(section as HTMLElement).getByRole('table');

    for (const category of playbook.scorecard.categories) {
      expect(within(table).getByRole('rowheader', { name: category.label })).toBeInTheDocument();
    }

    expect(
      within(table).getByRole('rowheader', { name: /total \(out of 40\)/i }),
    ).toBeInTheDocument();
  });

  /*
   * Same rule as the public page: nothing here quotes a statistic or promises a result. A
   * free asset that gets forwarded to other business owners is exactly where an invented
   * number would travel furthest.
   */
  it('quotes no statistic and promises no result', () => {
    const { container } = renderWorkbook();
    const copy = container.textContent ?? '';

    expect(copy).not.toMatch(/\d+\s?%/);

    for (const forbidden of [
      /guaranteed (leads?|rankings?)/i,
      /\b10x\b/i,
      // Scoped like the content-layer guard: only the hype claim, not the ordinary verb.
      /dominate\s+(?:google|search|your\s+market|the\s+competition)/i,
    ]) {
      expect(copy).not.toMatch(forbidden);
    }
  });
});
