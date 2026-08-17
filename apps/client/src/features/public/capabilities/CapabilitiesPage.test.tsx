import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { routes } from '../../../config/routes';
import { trades } from '../../../config/trades';
import { primaryCta } from '../../../content';
import {
  availabilityLabels,
  capabilities,
  capabilityIntegrations,
  capabilityPage,
  lifecycleStages,
} from './content/capabilities';
import { isAvailableToday } from './utils/capabilityMatch';
import { CapabilitiesPage } from './CapabilitiesPage';

/*
 * The capability library, rendered.
 *
 * `capabilities.test.ts` guards the content and `lib/capabilityMatch.test.ts` guards the
 * rules. What is left for this file is the part neither can see: that the honest labels
 * actually reach the screen, that the collapsed list discloses availability *before* somebody
 * clicks, and that the trade chooser changes what is recommended.
 *
 * The last of those is the one worth having a rendering test for at all. Everything else about
 * the recommendation is tested on fixtures; this asserts the component is genuinely wired to
 * the engine rather than rendering the library in file order and calling it personalisation.
 */

function renderPage(search = '') {
  return render(
    <MemoryRouter initialEntries={[`${routes.capabilities}${search}`]}>
      <CapabilitiesPage />
    </MemoryRouter>,
  );
}

describe('the capability library page', () => {
  it('has exactly one first-level heading', () => {
    renderPage();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('never gives two headings the same name', () => {
    /*
     * The same guard both long marketing pages carry. This page renders forty capability
     * names, twelve integration names, eight lifecycle stages and three tier labels — the
     * highest heading count on the site by a wide margin, and therefore the likeliest place
     * for two to collide. A duplicate heading makes the page's outline useless to anybody
     * navigating by it.
     */
    renderPage();

    const names = screen
      .getAllByRole('heading')
      .map((heading) => heading.textContent?.trim().toLowerCase() ?? '');

    const seen = new Set<string>();
    const duplicates = names.filter((name) => {
      if (seen.has(name)) return true;
      seen.add(name);
      return false;
    });

    expect(duplicates).toEqual([]);
  });

  /*
   * ==========================================================================
   * THE LABELS REACH THE SCREEN
   * ==========================================================================
   */

  it('shows an availability status on every capability without anybody expanding it', () => {
    renderPage();

    /*
     * The single most important assertion on this page. A reader scanning the collapsed list
     * is forming a picture of what this business does — if "you cannot buy this" is only
     * revealed on expansion, the list has misled everybody who did not expand.
     *
     * Checked per capability rather than by counting badges, so a card rendering the wrong
     * one still fails.
     */
    for (const capability of capabilities) {
      const heading = screen.getByRole('heading', { name: capability.name });
      const summary = heading.closest('summary');
      expect(summary, `${capability.id} has no summary element`).not.toBeNull();

      const expected = availabilityLabels[capability.availability].label;
      expect(
        summary?.textContent,
        `${capability.id} does not show "${expected}" while collapsed`,
      ).toContain(expected);
    }
  });

  it('keeps every capability collapsed until it is asked for', () => {
    renderPage();

    /* Progressive disclosure. Forty expanded cards is a document nobody reads. */
    const open = document.querySelectorAll('details[open]');
    expect(open).toHaveLength(0);
  });

  it('explains what the status means before it explains the benefit', () => {
    renderPage();

    /*
     * Order inside the expanded panel. Somebody who has just opened "Intended, not built"
     * needs that qualified before they read a paragraph about what it would do for them —
     * otherwise the paragraph sells and the badge disclaims, which is a misleading page even
     * though both are accurate.
     */
    const unavailable = capabilities.find((capability) => !isAvailableToday(capability));
    expect(unavailable).toBeDefined();

    const heading = screen.getByRole('heading', { name: unavailable!.name });
    const card = heading.closest('details');
    expect(card).not.toBeNull();

    const text = card?.textContent ?? '';
    const meaningAt = text.indexOf(availabilityLabels[unavailable!.availability].meaning);
    const outcomeAt = text.indexOf(unavailable!.businessOutcome);

    expect(meaningAt).toBeGreaterThan(-1);
    expect(outcomeAt).toBeGreaterThan(-1);
    expect(meaningAt).toBeLessThan(outcomeAt);
  });

  it('leads the honesty block with the four statuses, above the library', () => {
    renderPage();

    for (const key of capabilityPage.honesty.keys) {
      expect(screen.getByText(key)).toBeTruthy();
    }

    /*
     * Position, not just presence. A caveat that arrives after forty capabilities has been
     * read by nobody who needed it.
     */
    const honesty = screen.getByRole('heading', { name: capabilityPage.honesty.heading });
    const library = screen.getByRole('heading', { name: capabilityPage.explorer.heading });

    expect(
      honesty.compareDocumentPosition(library) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('derives the availability counts rather than printing a written total', () => {
    renderPage();

    /*
     * The counts come from `countByAvailability`, so they cannot go stale. This asserts the
     * rendered figure matches the library — if somebody later replaces the grid with a typed
     * sentence, the number stops tracking and this fails.
     */
    const inBuild = capabilities.filter((c) => c.availability === 'included-build').length;
    const term = screen.getByText('In the build', { selector: 'dt' });
    const value = term.parentElement?.querySelector('dd')?.textContent;

    expect(value).toBe(String(inBuild));
  });

  /*
   * ==========================================================================
   * THE LIFECYCLE
   * ==========================================================================
   */

  it('draws all eight stages and marks who owns each band', () => {
    renderPage();

    for (const stage of lifecycleStages) {
      expect(screen.getByRole('heading', { name: stage.label })).toBeTruthy();
    }

    /*
     * The section's argument is the ownership, so the labels have to render. `demand` and
     * `business` may each appear once or more depending on how the bands fall out of the
     * array, which is why this uses `getAllByText`.
     */
    for (const owner of ['demand', 'website', 'business'] as const) {
      expect(
        screen.getAllByText(capabilityPage.lifecycle.ownerLabels[owner]).length,
      ).toBeGreaterThan(0);
    }
  });

  it('numbers the stages as one continuous run', () => {
    renderPage();

    /*
     * The bands are separate `<ol>`s, so each starts its own numbering unless `start` is set.
     * Eight stages reading 1-2-3 then 1-2 then 1-2-3 would tell the reader there are three
     * separate journeys.
     */
    const lists = screen
      .getAllByRole('list')
      .filter((list) => list.tagName === 'OL' && list.hasAttribute('start'));

    const starts = lists.map((list) => Number(list.getAttribute('start')));
    expect(starts.length).toBeGreaterThan(1);
    expect([...starts]).toEqual([...starts].sort((a, b) => a - b));
    expect(starts[0]).toBe(1);
  });

  /*
   * ==========================================================================
   * THE CHOOSER IS WIRED TO THE ENGINE
   * ==========================================================================
   */

  it('offers every trade in the taxonomy', () => {
    renderPage();

    for (const trade of trades) {
      expect(screen.getByRole('radio', { name: trade.label })).toBeTruthy();
    }
  });

  it('preselects a trade carried in the URL', () => {
    renderPage('?trade=roofing');

    const roofing = trades.find((trade) => trade.slug === 'roofing');
    expect(roofing).toBeDefined();
    expect(screen.getByRole('radio', { name: roofing!.label })).toBeChecked();
  });

  it('ignores a trade in the URL that is not one of the trades', () => {
    /* A URL is not a promise — same rule as `/audit`. */
    renderPage('?trade=underwater-basket-weaving');

    for (const trade of trades) {
      expect(screen.getByRole('radio', { name: trade.label })).not.toBeChecked();
    }
  });

  it('changes what is recommended when the trade changes', async () => {
    /*
     * The one assertion that proves the component is using `recommendFor` rather than
     * rendering the library in file order. Two trades whose recommended groups genuinely
     * differ in the real content — a roofer gets financing and list capture, a cleaner gets
     * booking and a recurring-service page.
     */
    const user = userEvent.setup();
    renderPage();

    const roofing = trades.find((trade) => trade.slug === 'roofing');
    const cleaning = trades.find((trade) => trade.slug === 'cleaning');
    expect(roofing).toBeDefined();
    expect(cleaning).toBeDefined();

    await user.click(screen.getByRole('radio', { name: roofing!.label }));
    const forRoofers = screen.queryByRole('heading', { name: /financing/i });
    expect(forRoofers).not.toBeNull();

    await user.click(screen.getByRole('radio', { name: cleaning!.label }));
    expect(screen.queryByRole('heading', { name: /financing/i })).toBeNull();
    expect(screen.queryByRole('heading', { name: /book a slot themselves/i })).not.toBeNull();
  });

  it('never hides a foundation capability, whatever is chosen', async () => {
    /*
     * Foundation is what every build and every plan month contains, so it is never filtered by
     * trade. Hiding one from a photographer because a tag was missing would be the library
     * contradicting the offer.
     */
    const user = userEvent.setup();
    renderPage();

    const foundation = capabilities.filter((capability) => capability.tier === 'foundation');

    await user.click(screen.getByRole('radio', { name: /photography/i }));

    for (const capability of foundation) {
      expect(
        screen.queryByRole('heading', { name: capability.name }),
        `${capability.id} disappeared after choosing a trade`,
      ).not.toBeNull();
    }
  });

  it('says so when it has nothing written for the reader’s trade', async () => {
    /*
     * The graceful path, rendered. `isGeneric` must reach the screen as a sentence, or a
     * generic list is being passed off as personalisation.
     */
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('radio', { name: /something else/i }));

    expect(screen.getByText(capabilityPage.chooser.genericNotice)).toBeTruthy();
    expect(screen.getByRole('link', { name: capabilityPage.chooser.genericCtaLabel })).toBeTruthy();
  });

  it('does not cry generic for a trade it has written for', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('radio', { name: /roofing/i }));
    expect(screen.queryByText(capabilityPage.chooser.genericNotice)).toBeNull();
  });

  /*
   * ==========================================================================
   * FILTERING
   * ==========================================================================
   */

  it('narrows the library by category', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.selectOptions(
      screen.getByLabelText(capabilityPage.explorer.categoryFieldLabel),
      'payments',
    );

    /*
     * A capability outside the chosen category and outside the foundation must be gone. One
     * inside it must remain. Foundation is exempt by design, so the pair is chosen from the
     * non-foundation tiers.
     */
    const payments = capabilities.find(
      (capability) => capability.category === 'payments' && capability.tier !== 'foundation',
    );
    const other = capabilities.find(
      (capability) => capability.category === 'reputation' && capability.tier !== 'foundation',
    );

    expect(payments).toBeDefined();
    expect(other).toBeDefined();
    expect(screen.queryByRole('heading', { name: payments!.name })).not.toBeNull();
    expect(screen.queryByRole('heading', { name: other!.name })).toBeNull();
  });

  it('hides what cannot be bought when asked, and only then', async () => {
    const user = userEvent.setup();
    renderPage();

    const aspiration = capabilities.find(
      (capability) => !isAvailableToday(capability) && capability.tier !== 'foundation',
    );
    expect(aspiration).toBeDefined();

    expect(screen.queryByRole('heading', { name: aspiration!.name })).not.toBeNull();

    await user.click(screen.getByLabelText(capabilityPage.explorer.availableOnlyLabel));
    expect(screen.queryByRole('heading', { name: aspiration!.name })).toBeNull();
  });

  /*
   * ==========================================================================
   * THE WAY BACK
   * ==========================================================================
   *
   * A radio group cannot be un-chosen. Without a reset, a reader who picked one trade had no
   * control anywhere on the page that would show them the capabilities written for the others —
   * a dead end, and the reason the reset exists.
   *
   * There is deliberately no empty-state test: no combination of these controls can empty the
   * library, and `capabilityMatch.test.ts` asserts that rather than leaving an unreachable
   * branch in the component.
   * ==========================================================================
   */
  it('offers no reset until something has been narrowed', () => {
    renderPage();
    expect(screen.queryByRole('button', { name: capabilityPage.explorer.clearLabel })).toBeNull();
  });

  it('gives a reader who chose a trade a way back to the whole library', async () => {
    const user = userEvent.setup();
    renderPage();

    /* Written for cleaners specifically, so a roofer's recommendation excludes it. */
    const forCleaners = capabilities.find(
      (capability) => capability.id === 'recurring-service-page',
    );
    expect(forCleaners).toBeDefined();

    await user.click(screen.getByRole('radio', { name: /roofing/i }));
    expect(screen.queryByRole('heading', { name: forCleaners!.name })).toBeNull();

    await user.click(screen.getByRole('button', { name: capabilityPage.explorer.clearLabel }));

    expect(screen.queryByRole('heading', { name: forCleaners!.name })).not.toBeNull();
    for (const trade of trades) {
      expect(screen.getByRole('radio', { name: trade.label })).not.toBeChecked();
    }
  });

  it('applies the category filter to the foundation too', async () => {
    /*
     * The defect the exemption caused, from the other side: a reader who picks one area of the
     * business and still sees seventeen foundation cards about every other area has a filter
     * that does not work.
     */
    const user = userEvent.setup();
    renderPage();

    const foundationElsewhere = capabilities.find(
      (capability) => capability.tier === 'foundation' && capability.category !== 'payments',
    );
    expect(foundationElsewhere).toBeDefined();

    await user.selectOptions(
      screen.getByLabelText(capabilityPage.explorer.categoryFieldLabel),
      'payments',
    );

    expect(screen.queryByRole('heading', { name: foundationElsewhere!.name })).toBeNull();
  });

  /*
   * ==========================================================================
   * INTEGRATIONS
   * ==========================================================================
   */

  it('describes every integration and says whose account it is', () => {
    renderPage();

    for (const integration of capabilityIntegrations) {
      const heading = screen.getByRole('heading', { name: integration.name });
      const row = heading.closest('li');
      expect(row, `${integration.id} has no row`).not.toBeNull();

      const text = row?.textContent ?? '';
      expect(text, `${integration.id} does not explain why to connect it`).toContain(
        integration.whyConnect,
      );
      expect(text, `${integration.id} does not say whose account it is`).toContain(
        capabilityPage.integrations.ownerLabels[integration.owner],
      );
      expect(text, `${integration.id} shows no availability`).toContain(
        availabilityLabels[integration.availability].label,
      );
    }
  });

  it('sends the reader at the free assessment rather than at a price', () => {
    renderPage();

    /*
     * Somebody who has read forty capabilities has questions about their own site, not about
     * the invoice. There is no price on this page and there must not be one — the closing
     * action is the assessment.
     */
    const banner = screen.getByRole('heading', { name: capabilityPage.closing.heading });
    const section = banner.closest('section');
    expect(section).not.toBeNull();

    /*
     * Asserted against `primaryCta.to` rather than against `/contact`.
     *
     * The literal was right while the primary action pointed at the contact form, and it
     * quietly encoded a second claim — that the closing action is *that page* — which
     * DECISION 028 falsified when the button moved to `/get-my-assessment`. What this test
     * is about is that the closing action is the assessment and not a price, and reading
     * the destination from the content is what keeps it about that.
     */
    const links = within(section!).getAllByRole('link');
    expect(links.some((link) => link.getAttribute('href') === primaryCta.to)).toBe(true);
  });
});
