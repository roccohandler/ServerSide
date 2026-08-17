import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import {
  carePricing,
  commercialTermItems,
  entryPaths,
  management,
  faqItems,
  portfolioProjects,
  prices,
  pricing,
  systemComponents,
  trust,
} from '../../../content';
import { routes } from '../../../config/routes';
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
      entryPaths.heading,
      /* Moved here in the offer redesign, once the pricing block's own Growth Partner card
         grew to carry the monthly report and the full scope: the homepage was saying it
         twice, so the depth came here and the answer stayed where the money is. */
      management.heading,
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

  /*
   * The product strip. This page described a website product in ten sections without
   * ever showing a website; what is pinned here is that it now shows one, and shows it
   * honestly — every demonstration card with its own label, plus the same disclosure
   * sentence every other rendering of these examples sits beside. The badge count is
   * tied to the project list so a card can never render without its label.
   */
  it('shows the finished build, labelled as demonstration work', () => {
    renderServices();

    const region = screen.getByRole('region', { name: /what the finished build looks like/i });

    expect(within(region).getAllByText('Demonstration')).toHaveLength(portfolioProjects.length);
    expect(within(region).getByText(trust.disclosure)).toBeInTheDocument();
    expect(within(region).getByRole('link', { name: /see all five examples/i })).toHaveAttribute(
      'href',
      routes.portfolio,
    );
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
     * Scoped to the pricing section rather than the page. `EntrySection` quotes the
     * launch price too, so an unscoped `getByText` would find two — which is correct on
     * a page that describes three ways to start and then prices them.
     */
    const pricingSection = screen.getByRole('region', { name: pricing.heading });

    expect(within(pricingSection).getAllByText(pricing.build.price).length).toBeGreaterThan(0);
    expect(within(pricingSection).getAllByText(carePricing.plan.price).length).toBeGreaterThan(0);

    // Year-one economics, in full, on the page a cost search lands on.
    expect(
      within(pricingSection).getByText(pricing.yearOne.withPartner.figure),
    ).toBeInTheDocument();

    expect(
      within(pricingSection).getByText(pricing.annual.price, { exact: false }),
    ).toBeInTheDocument();

    for (const term of commercialTermItems) {
      expect(within(pricingSection).getAllByText(term.label).length).toBeGreaterThan(0);
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
  it('publishes the founding condition beside the price it qualifies', () => {
    const { container } = renderServices();

    if (!pricing.founding.enabled) return;

    const pricingSection = screen.getByRole('region', { name: pricing.heading });

    expect(within(pricingSection).getByText(pricing.founding.body)).toBeInTheDocument();

    expect(
      within(pricingSection).getAllByText(pricing.build.standardPrice).length,
      'the founding price is published with no standard price beside it',
    ).toBeGreaterThan(0);

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

    const entry = screen.getByRole('region', { name: entryPaths.heading });
    const launch = entryPaths.paths.find((path) => path.price === prices.launch);

    if (launch?.priceNote === undefined) return;
    expect(within(entry).getByText(launch.priceNote)).toBeInTheDocument();
  });

  /*
   * ==========================================================================
   * NO TWO HEADINGS ON THIS PAGE MAY SAY THE SAME THING
   * ==========================================================================
   *
   * The twin of the guard in `HomePage.test.tsx`, and it is here because this page needed it
   * immediately: moving `ManagementSection` off the homepage put its comparison column
   * label — the bare product name — on the same page as `CarePlans`, which heads its own card
   * with exactly that name. Two headings called "Growth Partner", no way to tell them apart
   * when navigating by heading.
   *
   * This page carries more sections than any other, which is precisely why a repeated heading
   * is most costly here: heading navigation is how a long page is read at all.
   * ==========================================================================
   */
  it('never gives two headings the same name', () => {
    const { container } = renderServices();

    const names = [...container.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((node) =>
      (node.textContent ?? '').trim().replace(/\s+/g, ' '),
    );

    const duplicates = [...new Set(names.filter((name, index) => names.indexOf(name) !== index))];

    expect(
      duplicates,
      'Two headings with the same accessible name are two indistinguishable destinations for ' +
        'anybody navigating this page by heading — and are usually a section rendered twice.',
    ).toEqual([]);
  });
});
