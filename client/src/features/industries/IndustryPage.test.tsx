import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { evidence, pages, portfolioProjects } from '../../content';
import { ADVERTISING_BENCHMARK_LABEL, industries, industryShared } from '../../content/industries';
import { routes } from '../../config/routes';
import { industryPath, tradesWithPages } from '../../config/trades';
import { IndustryPage } from './IndustryPage';

/*
 * What is pinned here is the promise the industry pages make: that they are five
 * different arguments rather than one template with the trade name substituted, and that
 * the advertising figure on each of them can never be mistaken for a website conversion
 * rate.
 */

function renderIndustry(slug: (typeof industries)[number]['slug']) {
  return render(
    <MemoryRouter>
      <IndustryPage slug={slug} />
    </MemoryRouter>,
  );
}

describe('the industry pages as a set', () => {
  it('exists for every trade that claims to have one, at the derived path', () => {
    expect(industries).toHaveLength(tradesWithPages.length);

    const documented = new Set(pages.map((page) => page.path));
    const routed = new Set<string>(Object.values(routes));

    for (const trade of tradesWithPages) {
      const industry = industries.find((entry) => entry.slug === trade.slug);

      expect(industry, `no industry page for ${trade.slug}`).toBeDefined();
      expect(industry?.path).toBe(industryPath(trade.slug));
      expect(routed.has(industryPath(trade.slug))).toBe(true);
      expect(documented.has(industryPath(trade.slug))).toBe(true);
    }
  });

  /*
   * The brief was explicit: do not simply replace the word "HVAC" in a generic template.
   * The strongest available check is that no sentence of substance is reused between two
   * of the five — a template would fail this immediately, and so would a lazy edit.
   */
  it('shares no journey, friction or page-architecture copy between two trades', () => {
    const journeys = industries.flatMap((industry) =>
      industry.journey.steps.map((step) => step.detail),
    );
    const frictions = industries.flatMap((industry) =>
      industry.friction.items.flatMap((item) => [
        item.title,
        item.whatHappens,
        item.whatItCosts,
        item.whatIdChange,
      ]),
    );
    const needs = industries.flatMap((industry) =>
      industry.pages.items.map((need) => `${need.name}: ${need.why}`),
    );

    expect(new Set(journeys).size).toBe(journeys.length);
    expect(new Set(frictions).size).toBe(frictions.length);
    expect(new Set(needs).size).toBe(needs.length);
  });

  /*
   * The trades genuinely differ in how long the decision takes and how many beats it has.
   * If all five journeys ever converge on the same length, the content has drifted back
   * into a template with different words in it.
   */
  it('does not give every trade the same shape of journey', () => {
    const lengths = new Set(industries.map((industry) => industry.journey.steps.length));
    expect(lengths.size).toBeGreaterThan(1);
  });

  it('points every demonstration and every citation at something that exists', () => {
    const demoIds = new Set(portfolioProjects.map((project) => project.id));
    const citationIds = new Set(evidence.citations.map((citation) => citation.id));

    for (const industry of industries) {
      expect(demoIds.has(industry.demoId), `${industry.slug} has no demo`).toBe(true);

      for (const id of industry.evidenceIds) {
        expect(citationIds.has(id), `${industry.slug} cites a missing "${id}"`).toBe(true);
      }
    }
  });
});

/*
 * ============================================================================
 * THE ADVERTISING BENCHMARKS
 * ============================================================================
 *
 * These figures are the single riskiest thing on the site. An advertising conversion rate
 * reprinted as a website conversion rate is the exact overclaim the whole project is
 * positioned against, and it is one careless sentence away at all times.
 * ============================================================================
 */
describe('the advertising benchmarks', () => {
  it('carries the same sanctioned label on every one, word for word', () => {
    for (const industry of industries) {
      expect(industry.benchmark.label).toBe(ADVERTISING_BENCHMARK_LABEL);
    }
  });

  it('has a label that names advertising and denies being a website benchmark', () => {
    expect(ADVERTISING_BENCHMARK_LABEL.toLowerCase()).toContain('advertising');
    expect(ADVERTISING_BENCHMARK_LABEL.toLowerCase()).toContain(
      'not a website conversion benchmark',
    );
  });

  it('publishes a checkable figure, a source link and what the figure does not show', () => {
    for (const industry of industries) {
      const { benchmark } = industry;

      expect(benchmark.conversionRate).toMatch(/^\d+(?:\.\d+)?%$/);
      expect(benchmark.sourceUrl).toMatch(/^https:\/\//);
      expect(benchmark.category.length).toBeGreaterThan(3);
      expect(benchmark.dataset.length).toBeGreaterThan(30);
      // A limitation short enough to skim is a limitation written to be skipped.
      expect(benchmark.limitation.length).toBeGreaterThan(120);
    }
  });

  /*
   * The figures are reproduced from a published table, so five identical numbers would
   * mean somebody had copied one row five times.
   */
  it('reproduces a different published figure for each trade', () => {
    const rates = industries.map((industry) => industry.benchmark.conversionRate);
    expect(new Set(rates).size).toBe(rates.length);
  });

  it('never states a cost per lead, in any currency', () => {
    for (const industry of industries) {
      const copy = Object.values(industry.benchmark).join(' ');
      expect(copy).not.toMatch(/\$/);
    }
  });
});

/*
 * Heading structure, checked on all five rather than on one.
 *
 * These pages are assembled from a shared renderer over five different content shapes —
 * some sections render conditionally on whether a demo or a citation resolves — so the
 * outline is a property of the data as much as of the JSX, and a trade whose content
 * omits something is exactly where a gap would open up.
 */
describe('the heading outline', () => {
  function levelsFor(slug: (typeof industries)[number]['slug']): number[] {
    const { container, unmount } = renderIndustry(slug);
    const levels = [...container.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((node) =>
      Number(node.tagName.slice(1)),
    );
    unmount();
    return levels;
  }

  it('gives every trade exactly one first-level heading', () => {
    for (const industry of industries) {
      const levels = levelsFor(industry.slug);
      expect(
        levels.filter((level) => level === 1),
        `${industry.slug}`,
      ).toHaveLength(1);
      expect(levels[0], `${industry.slug} does not open with its own title`).toBe(1);
    }
  });

  /*
   * A jump from h2 straight to h4 is how a screen-reader user loses the thread: the
   * outline says a level is missing and there is no way to tell what it was.
   */
  it('never skips a heading level, on any of the five', () => {
    for (const industry of industries) {
      const levels = levelsFor(industry.slug);

      levels.reduce((previous, level) => {
        expect(level, `${industry.slug} skips from h${previous} to h${level}`).toBeLessThanOrEqual(
          previous + 1,
        );
        return level;
      }, 1);
    }
  });
});

describe('an industry page', () => {
  it('leads with the trade rather than with the service', () => {
    const hvac = industries.find((industry) => industry.slug === 'hvac');
    renderIndustry('hvac');

    expect(
      screen.getByRole('heading', { level: 1, name: hvac?.heading ?? '' }),
    ).toBeInTheDocument();
    expect(screen.getByText(hvac?.decisionWindow ?? '')).toBeInTheDocument();
  });

  it('renders the benchmark label on the page, next to the figure', () => {
    const roofing = industries.find((industry) => industry.slug === 'roofing');
    renderIndustry('roofing');

    const region = screen.getByRole('region', {
      name: new RegExp(industryShared.benchmark.heading, 'i'),
    });

    expect(within(region).getByText(ADVERTISING_BENCHMARK_LABEL)).toBeInTheDocument();
    expect(within(region).getByText(roofing?.benchmark.conversionRate ?? '')).toBeInTheDocument();
    expect(within(region).getByText(roofing?.benchmark.limitation ?? '')).toBeInTheDocument();
  });

  /*
   * The source link is the whole reason a borrowed number is publishable — a reader has to
   * be able to go and check it. Opening a new tab is a context change, so the link says so
   * to the people who cannot see that it is about to happen.
   */
  it('links every source, and warns that each one opens a new tab', () => {
    const landscaping = industries.find((industry) => industry.slug === 'landscaping');
    renderIndustry('landscaping');

    const region = screen.getByRole('region', {
      name: new RegExp(industryShared.benchmark.heading, 'i'),
    });

    /*
     * Two on this page: the trade's own benchmark and the citation beside it. Both are
     * external, so both carry the warning — a page where only some of them do is worse
     * than one where none do, because the missing one now reads as internal.
     */
    const links = within(region).getAllByRole('link', { name: /opens in a new tab/i });
    expect(links).toHaveLength(1 + (landscaping?.evidenceIds.length ?? 0));

    for (const link of links) {
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      expect(link).toHaveAttribute('target', '_blank');
    }

    expect(links.map((link) => link.getAttribute('href'))).toContain(
      landscaping?.benchmark.sourceUrl,
    );
  });

  it('labels the demonstration as a demonstration, on every trade', () => {
    for (const industry of industries) {
      const { unmount } = renderIndustry(industry.slug);

      const region = screen.getByRole('region', {
        name: new RegExp(industryShared.demo.heading, 'i'),
      });
      expect(within(region).getByText('Demonstration')).toBeInTheDocument();

      unmount();
    }
  });

  /*
   * The point of the trade-specific call to action: the reader has already answered the
   * audit's first question by being on this page, and being asked it again is exactly the
   * friction the page has just spent several sections describing.
   */
  it('sends the reader to the audit with their trade already carried across', () => {
    renderIndustry('plumbing');

    const links = screen
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'))
      .filter((href): href is string => href !== null);

    expect(links.some((href) => href === `${routes.audit}?trade=plumbing`)).toBe(true);
  });

  /*
   * The prices, the guarantee and the terms are published once. Five per-trade copies is
   * how a business ends up with two different launch prices on its own website.
   */
  it('states no price of its own, and links to the page that does', () => {
    for (const industry of industries) {
      const copy = JSON.stringify(industry);
      expect(copy).not.toMatch(/\$/);
    }

    renderIndustry('electrical');
    const links = screen.getAllByRole('link').map((link) => link.getAttribute('href'));
    expect(links).toContain(routes.services);
  });
});
