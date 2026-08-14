import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Suspense } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  DEMO_PAGES,
  DEMO_SLUGS,
  demoPath,
  type DemoPage,
  type DemoSlug,
} from '../../../config/demos';
import { routes, sections } from '../../../config/routes';
import { loadDemoSite } from '../../../content/demos';
import { demoBusinessNames } from '../../../content/demos/demoMeta';
import { site } from '../../../content';
import { MAIN_CONTENT_ID } from '../../../components/layout/SiteLayout';
import { DemoLayout } from './DemoLayout';
import { DemoHomePage } from './DemoHomePage';
import { DemoServicesPage } from './DemoServicesPage';
import { DemoContactPage } from './DemoContactPage';

/*
 * ============================================================================
 * THE DEMONSTRATION SHELL
 * ============================================================================
 *
 * Three properties, and the whole design depends on all three holding at once:
 *
 *   1. **It discloses.** Every route, unconditionally, with the business named.
 *   2. **It is not the marketing site.** No JobForge header, footer or navigation. This
 *      is the property that makes an internal `/demo/...` path defensible at all — see the
 *      rewritten `demoUrl` guard in `content.test.ts`, which used to require an external
 *      URL precisely because a marketing page in costume would not be a demonstration.
 *   3. **It cannot send anything anywhere.** The quote form is inert by construction, and
 *      the construction is asserted rather than described.
 * ============================================================================
 */

/*
 * Every trade's chunk, loaded before the first render.
 *
 * `DemoLayout` reads its content through `use()`, which suspends until the dynamic import
 * lands. Warming the module cache here means the shell paints on the first commit rather
 * than each test racing an import — the suspending path is a property of the loader, and
 * `content/demos/index.ts` is where that belongs, not in thirty assertions about markup.
 */
beforeAll(async () => {
  await Promise.all(DEMO_SLUGS.map((slug) => loadDemoSite(slug)));
});

function renderDemo(slug: DemoSlug, page: DemoPage = 'home') {
  return render(
    <MemoryRouter initialEntries={[demoPath(slug, page)]}>
      <Suspense fallback={<p>loading</p>}>
        <Routes>
          <Route path="/demo/:trade" element={<DemoLayout />}>
            <Route index element={<DemoHomePage />} />
            <Route path="services" element={<DemoServicesPage />} />
            <Route path="contact" element={<DemoContactPage />} />
          </Route>
        </Routes>
      </Suspense>
    </MemoryRouter>,
  );
}

/**
 * The content chunk loads asynchronously, so every assertion waits for the shell.
 *
 * `findAllBy` rather than `findBy`: the business is named in the disclosure bar, in the
 * header lockup and in the footer, and all three of those are deliberate.
 */
async function waitForDemo(slug: DemoSlug) {
  return screen.findAllByText(demoBusinessNames[slug]);
}

describe.each(DEMO_SLUGS)('the %s demonstration', (slug) => {
  it.each(DEMO_PAGES)('discloses that it is a demonstration on the %s page', async (page) => {
    renderDemo(slug, page);
    await waitForDemo(slug);

    /*
     * Twice, deliberately: the pinned bar and the footer. Somebody who has scrolled a whole
     * page has had the bar off screen for a minute, and a screenshot of the lower half of a
     * fictional business's website with no disclosure in it is the artefact this is for.
     */
    const disclosures = screen.getAllByText(/not a real business/i);
    expect(disclosures.length).toBeGreaterThanOrEqual(2);
  });

  it('never renders the marketing site around it', async () => {
    const { container } = renderDemo(slug);
    await waitForDemo(slug);

    /*
     * Asserted on `SiteLayout`'s own landmarks rather than on link labels, because the
     * labels collide: JobForge's nav has a "Services" item and so does every demo's,
     * which is not a bug — it is two different businesses with the same obvious word.
     *
     * `#main-content` and the skip link are rendered by `SiteLayout` and by nothing else,
     * so their absence is proof the demo is outside it. That is the property that makes an
     * internal `/demo/...` path defensible at all — see the rewritten `demoUrl` guard in
     * `content.test.ts`, which used to demand an external URL for exactly this reason.
     */
    expect(container.querySelector(`#${MAIN_CONTENT_ID}`)).toBeNull();
    expect(screen.queryByRole('link', { name: /skip to main content/i })).toBeNull();

    // And the seller is never named inside somebody else's website.
    expect(screen.queryByText(site.name, { exact: true })).toBeNull();

    /*
     * The two links out are deliberate and are the only two: a way back and the one real
     * call to action. Anything else pointing at a marketing route would mean the demo is
     * leaking into the site around it.
     */
    const outbound = [...container.querySelectorAll('a[href]')]
      .map((node) => node.getAttribute('href') ?? '')
      .filter((href) => href.startsWith('/') && !href.startsWith('/demo/'));

    expect(new Set(outbound)).toEqual(
      new Set([routes.portfolio, `${routes.contact}#${sections.request}`]),
    );
  });

  it('navigates between its own three pages', async () => {
    renderDemo(slug);
    await waitForDemo(slug);

    const nav = screen.getByRole('navigation', { name: new RegExp(`${'pages'}$`) });

    for (const [label, page] of [
      ['Home', 'home'],
      ['Services', 'services'],
      ['Contact', 'contact'],
    ] as const) {
      expect(within(nav).getByRole('link', { name: label })).toHaveAttribute(
        'href',
        demoPath(slug, page),
      );
    }
  });

  /*
   * The heading outline, on all fifteen routes.
   *
   * `outline.test.tsx` covers the marketing pages and cannot reach these — they render
   * under a different layout, behind a suspending content chunk, off a parameterised
   * route. A screen-reader user navigating a demo by heading is the closest thing this
   * site has to a demonstration of the accessibility it charges for.
   */
  it.each(DEMO_PAGES)('has a sound heading outline on the %s page', async (page) => {
    const { container } = renderDemo(slug, page);
    await waitForDemo(slug);

    const headings = [...container.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((node) =>
      Number(node.tagName.slice(1)),
    );

    expect(headings.filter((level) => level === 1)).toHaveLength(1);
    expect(headings[0]).toBe(1);

    headings.reduce((previous, level) => {
      expect(level, `h${previous} → h${level} on ${demoPath(slug, page)}`).toBeLessThanOrEqual(
        previous + 1,
      );
      return level;
    }, 1);
  });
});

describe('an unknown trade', () => {
  it('renders the real not-found page rather than an empty shell', () => {
    render(
      <MemoryRouter initialEntries={['/demo/pest-control']}>
        <Suspense fallback={<p>loading</p>}>
          <Routes>
            <Route path="/demo/:trade" element={<DemoLayout />}>
              <Route index element={<DemoHomePage />} />
            </Route>
          </Routes>
        </Suspense>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.queryByText(/not a real business/i)).toBeNull();
  });
});

describe('the demo quote form', () => {
  /*
   * ==========================================================================
   * INERT BY CONSTRUCTION, NOT BY INTENTION
   * ==========================================================================
   *
   * A demonstration form that posts to the real lead endpoint would put fictional
   * enquiries into a real inbox and a real database. "It does not call the API" is a
   * property of today's code; "it cannot reach the API" is a property of the module graph,
   * and only the second one survives a refactor by somebody who has not read the comment.
   * ==========================================================================
   */
  it('cannot reach the lead API, because it does not import it', () => {
    const source = readFileSync(join(import.meta.dirname, 'DemoQuoteForm.tsx'), 'utf8');

    expect(source).not.toMatch(/from\s+'[^']*lib\/api'/);
    expect(source).not.toMatch(/\bfetch\s*\(/);
    expect(source).not.toMatch(/useLead|submitLead|XMLHttpRequest|navigator\.sendBeacon/);
  });

  it('says nothing was sent, rather than faking a success', async () => {
    const user = userEvent.setup();
    renderDemo('hvac', 'contact');
    await waitForDemo('hvac');

    await user.type(screen.getByLabelText(/your name/i), 'Sam Whitfield');
    await user.type(screen.getByLabelText(/^phone/i), '206 555 0111');
    await user.selectOptions(screen.getByLabelText(/what do you need/i), 'No heat');
    await user.click(screen.getByRole('button', { name: /send request/i }));

    const result = await screen.findByRole('status');
    expect(within(result).getByText(/nothing was sent/i)).toBeInTheDocument();
    expect(within(result).getByText(/not submitted, not emailed and not stored/i)).toBeVisible();

    // No confirmation language that would read as a real business replying.
    expect(screen.queryByText(/we'?ll be in touch|thanks|received/i)).toBeNull();
  });

  it('validates before it explains, so the demonstration is of a working form', async () => {
    const user = userEvent.setup();
    renderDemo('hvac', 'contact');
    await waitForDemo('hvac');

    await user.click(screen.getByRole('button', { name: /send request/i }));

    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByLabelText(/your name/i)).toHaveAttribute('aria-invalid', 'true');
  });
});
