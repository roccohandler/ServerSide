import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { portfolioProjects } from '../../../content';
import { PortfolioGrid } from './PortfolioGrid';
import { PortfolioShowcase } from './PortfolioShowcase';

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
   * The site never links somewhere that is not live. All five demos are published today,
   * so it is the linked branch that runs — the "not published yet" branch stays in the
   * loop because a real client project can be added before its demo route exists, and
   * that is the case a button to nowhere would ship in.
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

/*
 * The same honesty rules again, for the showcase `/portfolio` renders instead of the
 * grid. It is a separate component with its own markup, so the grid's badge test
 * protects nothing here — a layout change could drop the label from the full-width
 * rows while the grid stays honest, and these assertions are what would catch it.
 */
describe('the portfolio showcase', () => {
  function renderShowcase() {
    return render(
      <MemoryRouter>
        <PortfolioShowcase />
      </MemoryRouter>,
    );
  }

  /** The `<li>` row a project renders, found from its heading the way the grid tests do. */
  function rowFor(project: (typeof portfolioProjects)[number]) {
    const row = screen.getByRole('heading', { name: project.title }).closest('li');
    expect(row, `no row rendered for ${project.id}`).not.toBeNull();
    return row;
  }

  it('renders a visible demonstration label on every row that is not client work', () => {
    renderShowcase();

    expect(screen.getAllByText('Demonstration')).toHaveLength(
      portfolioProjects.filter((project) => project.isDemo).length,
    );

    for (const project of portfolioProjects) {
      const row = rowFor(project);
      if (!row) continue;

      if (project.isDemo) {
        expect(within(row).getByText('Demonstration')).toBeInTheDocument();
      } else {
        expect(within(row).queryByText('Demonstration')).toBeNull();
      }
    }
  });

  /*
   * The point of the showcase over the grid: both captures on screen, each carrying its
   * own alt text from the content file — including the disclosure bar those alts
   * describe. The phone capture is optional in the data, so its assertion is too.
   */
  it('shows the desktop capture, and the phone capture where one exists', () => {
    renderShowcase();

    for (const project of portfolioProjects) {
      const row = rowFor(project);
      if (!row) continue;

      expect(within(row).getByAltText(project.imageAlt)).toBeInTheDocument();
      if (project.mobileImage && project.mobileImageAlt) {
        expect(within(row).getByAltText(project.mobileImageAlt)).toBeInTheDocument();
      }
    }
  });

  it('links to a demo only when one has actually been published', () => {
    renderShowcase();

    for (const project of portfolioProjects) {
      const row = rowFor(project);
      if (!row) continue;

      if (project.demoUrl) {
        const link = within(row).getByRole('link', {
          name: `View ${project.industry} demo`,
        });
        expect(link).toHaveAttribute('href', project.demoUrl);
      } else {
        expect(within(row).queryByRole('link')).toBeNull();
        expect(within(row).getByText(/not published yet/i)).toBeInTheDocument();
      }
    }
  });
});
