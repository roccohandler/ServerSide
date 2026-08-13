import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { routes, sections } from '../config/routes';
import { AboutPage } from '../features/about/AboutPage';
import { ContactPage } from '../features/contact/ContactPage';
import { HomePage } from '../features/home/HomePage';
import { PortfolioPage } from '../features/portfolio/PortfolioPage';
import { PlayBookPage } from '../features/playbook/PlayBookPage';
import { PrivacyPage } from '../features/legal/PrivacyPage';
import { ServicesPage } from '../features/services/ServicesPage';
import { TermsPage } from '../features/legal/TermsPage';
import { WorkbookPage } from '../features/playbook/WorkbookPage';

/*
 * ============================================================================
 * THE HEADING OUTLINE, ON EVERY EAGER PAGE
 * ============================================================================
 *
 * A jump from `h1` straight to `h3` is how a screen-reader user loses the thread: the
 * outline announces that a level is missing and there is no way to find out what was in
 * it. Navigating a long page by heading is the primary way that reader skims, and this
 * site's longest pages are the ones that matter commercially.
 *
 * `IndustryPage.test.tsx` has enforced exactly this on the five industry pages since they
 * were built. The standard was simply never applied to the rest of the site — and when it
 * finally was, **two pages failed immediately**:
 *
 *   - `/services` rendered `ServiceList` at level 3 directly beneath the page's `h1`.
 *   - `/portfolio` did the same with `PortfolioGrid`, by taking its default.
 *
 * Both components take a `headingLevel`, both defaulted to 3 — correct on the homepage,
 * where a section heading occupies level 2, and wrong on the page where the list is the
 * first thing under the title. Neither was caused by the value-per-second pass; both had
 * been shipping. That is the argument for testing the whole set rather than the page
 * somebody happened to be editing.
 *
 * ## What is here and what is elsewhere
 *
 * The five industry pages, the teardown and the audit check their own outlines in their
 * own test files, next to the content that produces them. Everything else is here.
 *
 * That includes the PlayBook and the workbook, which are lazy routes rather than eager
 * ones. They are here because checking found they had **no outline test at all** — and
 * they are the two longest documents on the site, one of which renders the other again
 * for print. Both pass. Being correct and being untested look identical right up until
 * somebody adds a section.
 * ============================================================================
 */

const PAGES = [
  ['the homepage', HomePage],
  ['the services page', ServicesPage],
  ['the portfolio page', PortfolioPage],
  ['the contact page', ContactPage],
  ['the about page', AboutPage],
  ['the privacy page', PrivacyPage],
  ['the terms page', TermsPage],
  ['the playbook', PlayBookPage],
  ['the workbook', WorkbookPage],
] as const;

function headingsOf(container: Element) {
  return [...container.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((node) => ({
    level: Number(node.tagName.slice(1)),
    text: (node.textContent ?? '').trim().slice(0, 48),
  }));
}

describe.each(PAGES)('%s', (_name, Page) => {
  function headings() {
    const { container, unmount } = render(
      <MemoryRouter>
        <Page />
      </MemoryRouter>,
    );
    const found = headingsOf(container);
    unmount();
    return found;
  }

  it('has exactly one first-level heading, and opens with it', () => {
    const found = headings();

    expect(found.filter((heading) => heading.level === 1)).toHaveLength(1);
    expect(found[0]?.level).toBe(1);
  });

  it('never skips a heading level', () => {
    /*
     * Reported as a list rather than as the first failure, so a page with three gaps
     * takes one run to fix instead of three. The text is included because "h1 -> h3" on
     * its own does not tell anybody which of forty headings to look at.
     */
    const skipped: string[] = [];

    headings().reduce((previous, heading) => {
      if (heading.level > previous + 1) {
        skipped.push(`h${previous} → h${heading.level} at "${heading.text}"`);
      }
      return heading.level;
    }, 1);

    expect(skipped).toEqual([]);
  });
});

/*
 * ============================================================================
 * EVERY CROSS-PAGE ANCHOR LANDS ON SOMETHING
 * ============================================================================
 *
 * `content.test.ts` already asserts that every declared `sections.*` key is rendered as an
 * id *somewhere*. That is not the same question as whether it is rendered on the page being
 * linked to, and the difference cost the funnel its most important link.
 *
 * The assessment's tier recommendation pointed at `/services#offer`. `sections.offer` was
 * rendered — on the homepage. So somebody who answered twenty questions, read five findings
 * and clicked the recommendation arrived at the top of a long page with the pricing several
 * screens below and no indication of where. Nothing failed; a fragment that matches nothing
 * scrolls nowhere in silence.
 *
 * This reads the source for links of the form `${routes.x}#${sections.y}`, renders the page
 * `routes.x` resolves to, and checks the element is there. It is deliberately built on the
 * page map above rather than on a second one, so a page added to that list is covered here
 * for free — and a link to a page missing from it fails loudly rather than being skipped.
 * ============================================================================
 */
describe('cross-page anchors', () => {
  const PAGE_BY_ROUTE = new Map<string, (typeof PAGES)[number][1]>([
    [routes.home, HomePage],
    [routes.services, ServicesPage],
    [routes.portfolio, PortfolioPage],
    [routes.contact, ContactPage],
    [routes.about, AboutPage],
    [routes.privacy, PrivacyPage],
    [routes.terms, TermsPage],
    [routes.playbook, PlayBookPage],
  ]);

  function sourceFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return sourceFiles(path);
      return /\.tsx?$/.test(entry.name) && !entry.name.includes('.test.') ? [path] : [];
    });
  }

  /** Every `${routes.x}#${sections.y}` written anywhere in the app, deduplicated. */
  const links = new Set<string>();

  for (const file of sourceFiles(join(import.meta.dirname, '..'))) {
    const source = readFileSync(file, 'utf8');
    for (const [, route, section] of source.matchAll(
      /\$\{routes\.(\w+)\}#\$\{sections\.(\w+)\}/g,
    )) {
      if (route && section) links.add(`${route}|${section}`);
    }
  }

  it('finds the links it is supposed to be checking', () => {
    // A regex that silently matches nothing is a test that silently passes.
    expect(links.size).toBeGreaterThan(0);
  });

  it.each([...links])('%s resolves to an element on the page it points at', (link) => {
    const [routeKey, sectionKey] = link.split('|') as [keyof typeof routes, keyof typeof sections];

    const path = routes[routeKey];
    const anchor = sections[sectionKey];
    const Page = PAGE_BY_ROUTE.get(path);

    expect(Page, `${path} is linked to with a fragment but is not in the page map`).toBeDefined();
    if (!Page) return;

    const { container, unmount } = render(
      <MemoryRouter>
        <Page />
      </MemoryRouter>,
    );
    const target = container.querySelector(`#${anchor}`);
    unmount();

    expect(
      target,
      `${path}#${anchor} scrolls nowhere — nothing on that page has that id`,
    ).not.toBeNull();
  });
});
