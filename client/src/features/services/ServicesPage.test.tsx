import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import {
  commercialTerms,
  entryPaths,
  faqItems,
  prices,
  pricing,
  systemComponents,
} from '../../content';
import { ServicesPage } from './ServicesPage';

/*
 * The services page is where the depth lives.
 *
 * Six sections have now moved here off the homepage — the eight-stage business case, the
 * local-search foundation and the campaign/seasonal/testing detail, and then the value
 * stack, the competitor comparison and the three entry paths — plus twenty-three of the
 * thirty-one FAQ answers. `HomePage.test.tsx` asserts they are gone from the first read;
 * this asserts they are still published, which is the half that stops a consolidation
 * from quietly becoming a deletion.
 *
 * That pairing is the whole safety mechanism for `docs/VALUE-PER-SECOND.md`. A philosophy
 * that says "remove it" needs a test on the other side saying "and it went somewhere",
 * or the next pass removes something that was only ever on one page.
 */

function renderServices() {
  return render(
    <MemoryRouter>
      <ServicesPage />
    </MemoryRouter>,
  );
}

describe('the services page', () => {
  it('has exactly one first-level heading', () => {
    renderServices();

    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
  });

  it('describes every component of the system in depth', () => {
    renderServices();

    for (const component of systemComponents) {
      expect(screen.getByRole('heading', { name: component.title })).toBeInTheDocument();
    }
  });

  /*
   * The depth that moved off the homepage. If any of these stops rendering, the
   * consolidation deleted an argument instead of relocating it.
   *
   * The last three arrived in the value-per-second pass, and each one is here for a
   * reason recorded in `docs/VALUE-PER-SECOND.md` §5: the value stack restated the system
   * as an equation, the competitor comparison duplicated the management argument, and the
   * three entry paths sat directly above the three pricing tiers.
   */
  it('publishes the depth that moved off the homepage', () => {
    renderServices();

    for (const name of [
      /what your website actually does/i,
      /being found is not the same/i,
      /work with your marketing/i,
      /you're not buying a website/i,
      /most web designers build it/i,
      /three ways this usually starts/i,
    ]) {
      expect(screen.getByRole('region', { name })).toBeInTheDocument();
    }
  });

  /*
   * All thirty-one questions, against the homepage's eight.
   *
   * The homepage links here for "the rest", and a link that promises more than it
   * delivers is worse than no link — so this counts them rather than sampling.
   */
  it('answers every question, not just the ones people ask first', () => {
    renderServices();

    const faq = screen.getByRole('region', { name: /everything people ask/i });

    for (const item of faqItems) {
      expect(within(faq).getByText(item.question)).toBeInTheDocument();
    }
  });

  it('states who the managed service is built for, without disqualifying anybody', () => {
    renderServices();

    const region = screen.getByRole('region', { name: /who this is built for/i });
    expect(region).toBeInTheDocument();

    // The escape hatch is the point of the section — see content/qualification.ts.
    expect(within(region).getByRole('link', { name: /playbook/i })).toBeInTheDocument();
  });

  /*
   * Both prices, in full, on the page somebody lands on from a search for what this
   * costs. Sending them back to the homepage for the number is how that visitor is lost.
   */
  it('repeats both prices and the published terms', () => {
    renderServices();

    /*
     * Scoped to the pricing section rather than the page. `EntrySection` moved here in
     * the value-per-second pass and it quotes the launch price too, so an unscoped
     * `getByText` now finds two — which is correct on a page that describes three ways
     * to start and then prices them, and would have been a false alarm.
     */
    const pricingSection = screen.getByRole('region', { name: pricing.heading });

    for (const tier of pricing.tiers) {
      expect(within(pricingSection).getAllByText(tier.price).length).toBeGreaterThan(0);
    }

    expect(
      within(pricingSection).getByText(pricing.annual.price, { exact: false }),
    ).toBeInTheDocument();

    for (const term of commercialTerms.items) {
      expect(within(pricingSection).getByText(term.label)).toBeInTheDocument();
    }
  });

  /*
   * ==========================================================================
   * THE PRICES ON THIS PAGE CARRY THEIR CONDITION
   * ==========================================================================
   *
   * These three figures are the founding-client prices, and for a while this page printed
   * all three of them with no mention anywhere that they were conditional — while the
   * homepage carried the block explaining it. The comment above this section claimed the
   * two pages "cannot disagree", which was true of the numbers and false of the thing that
   * makes the numbers truthful.
   *
   * It matters most here: this is the page somebody reaches from a search for what a
   * managed website costs, so it is the page most likely to be read *instead of* the
   * homepage rather than after it.
   *
   * The same two checks the homepage runs — the words, and the markup that would make the
   * claim without any words.
   * ==========================================================================
   */
  it('publishes the founding condition beside the prices it qualifies', () => {
    const { container } = renderServices();

    if (!pricing.founding.enabled) return;

    const pricingSection = screen.getByRole('region', { name: pricing.heading });

    expect(within(pricingSection).getByText(pricing.founding.body)).toBeInTheDocument();
    expect(within(pricingSection).getByText(pricing.founding.remainingLabel)).toBeInTheDocument();

    for (const tier of pricing.tiers) {
      if (tier.hasDiscount !== true) continue;
      expect(
        within(pricingSection).getAllByText(tier.standardPrice ?? '').length,
        `${tier.id} publishes a founding price with no standard price beside it`,
      ).toBeGreaterThan(0);
    }

    const struck = container.querySelectorAll('s, del, strike');
    expect(struck, 'a struck-out price is a former-price claim made with markup').toHaveLength(0);
  });

  /*
   * `EntrySection` quotes the launch figure two sections above the pricing cards, in prose
   * that has no card to hang a label on. The qualification is a field on the path itself,
   * so it travels with the number rather than waiting for the reader to scroll.
   */
  it('qualifies the launch figure where the entry paths quote it', () => {
    renderServices();

    const entry = screen.getByRole('region', { name: /three ways this usually starts/i });
    const launch = entryPaths.paths.find((path) => path.price === prices.launch);

    if (launch?.priceNote === undefined) return;
    expect(within(entry).getByText(launch.priceNote)).toBeInTheDocument();
  });
});
