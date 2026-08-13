import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { portfolioProjects } from '../../content';
import { PortfolioGrid } from './PortfolioGrid';

/*
 * The demonstration label, pinned where it actually matters.
 *
 * `content.test.ts` asserts the `isDemo` flag is set on the data. That is necessary and
 * not sufficient: a flag nobody renders protects nothing, and the failure this guards
 * against is a layout change that quietly drops the badge while the data stays honest.
 * So these assertions are about what is on the screen.
 */

function renderGrid(limit?: number) {
  return render(
    <MemoryRouter>
      <PortfolioGrid {...(limit === undefined ? {} : { limit })} />
    </MemoryRouter>,
  );
}

describe('the portfolio grid', () => {
  it('renders a visible demonstration label on every example that is not client work', () => {
    renderGrid();

    const expected = portfolioProjects.filter((project) => project.isDemo).length;
    expect(screen.getAllByText('Demonstration')).toHaveLength(expected);
  });

  it('keeps the label attached to the example it belongs to', () => {
    renderGrid();

    for (const project of portfolioProjects) {
      const item = screen.getByRole('heading', { name: project.title }).closest('li');
      expect(item, `no card rendered for ${project.id}`).not.toBeNull();
      if (!item) continue;

      if (project.isDemo) {
        expect(within(item).getByText('Demonstration')).toBeInTheDocument();
      } else {
        expect(within(item).queryByText('Demonstration')).toBeNull();
      }
    }
  });

  /*
   * The site never links somewhere that is not live. Today no demo is published, so every
   * card states that plainly instead of rendering a button to nowhere — and when a URL is
   * added, this test starts covering the other branch without being edited.
   */
  it('links to a demo only when one has actually been published', () => {
    renderGrid();

    for (const project of portfolioProjects) {
      const heading = screen.getByRole('heading', { name: project.title });
      const item = heading.closest('li');
      expect(item).not.toBeNull();
      if (!item) continue;

      if (project.demoUrl) {
        const link = within(item).getByRole('link');
        expect(link).toHaveAttribute('href', project.demoUrl);
      } else {
        expect(within(item).queryByRole('link')).toBeNull();
        expect(within(item).getByText(/not published yet/i)).toBeInTheDocument();
      }
    }
  });

  it('honours the limit used on the homepage without dropping any labels', () => {
    renderGrid(3);

    const shown = portfolioProjects.slice(0, 3);

    // Counted by card heading rather than by list item — the highlights are a list too.
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(shown.length);
    expect(screen.getAllByText('Demonstration')).toHaveLength(
      shown.filter((project) => project.isDemo).length,
    );
  });
});
