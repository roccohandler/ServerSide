import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { prices } from '../../../content';
import { pricingPage } from '../../../content/pricingPage';
import { routes } from '../../../config/routes';
import { termsContent } from '../../../content/legal';
import { PricingPage } from './PricingPage';

/*
 * ============================================================================
 * `/pricing`
 * ============================================================================
 *
 * The page carries three kinds of thing, and each needs a different kind of test.
 *
 *   1. **The figures.** Asserted against `content/offer.ts` rather than typed here, so a price
 *      change moves the assertion with the price. A test that hard-codes "$4,900" is a fourth
 *      copy of the number and would have to be found and edited on the day it changes — which
 *      is the failure the whole pricing configuration exists to prevent.
 *   2. **The legal presentation.** The standard price must never carry a line through it, and
 *      the tax line must never carry a rate. Both are checkable properties of the DOM rather
 *      than of the copy, and both are the kind of thing a well-meaning style pass removes.
 *   3. **The links into the terms.** Five clauses are summarised here and each links to the
 *      section it summarises. A summary that links to a section that no longer exists is worse
 *      than no link, because it reads as verification.
 * ============================================================================
 */

function renderPricing() {
  return render(
    <MemoryRouter>
      <PricingPage />
    </MemoryRouter>,
  );
}

describe('the pricing page', () => {
  it('has exactly one first-level heading', () => {
    renderPricing();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  /*
   * Both figures, and both from the configuration. The founding price is what somebody pays
   * today; the standard price is the rate card it is discounted from, and publishing one
   * without the other would leave the "save" claim with nothing to be a saving against.
   */
  it('publishes both prices, from the one place that states them', () => {
    renderPricing();

    expect(screen.getAllByText(prices.launch).length).toBeGreaterThan(0);
    expect(screen.getAllByText(prices.launchStandard).length).toBeGreaterThan(0);
  });

  /*
   * ==========================================================================
   * THE STANDARD PRICE IS NEVER STRUCK THROUGH
   * ==========================================================================
   *
   * 16 CFR 233.1 permits a former-price comparison only where the former price was actually
   * charged, publicly, for a substantial period. **This business has never charged $7,500.**
   * Strike-through is how a page says "was" without typing it, so it carries the same risk as
   * saying it in words — see the header of `config/pricing.ts`.
   *
   * This asserts the property in the rendered document rather than trusting the component,
   * because the way this would actually break is a CSS change, not a JSX one.
   * ==========================================================================
   */
  it('never renders the standard price with a line through it', () => {
    const { container } = renderPricing();

    for (const element of container.querySelectorAll('s, del, strike')) {
      expect(
        element.textContent ?? '',
        'a former-price claim made with markup is still a former-price claim',
      ).not.toContain(prices.launchStandard);
    }
  });

  /*
   * DECISION 037. The line has to be there — a tax appearing for the first time at checkout is
   * the surprise cost that ends the most sales — and the *rate* has to stay out, because it
   * depends on the reader's own address and a number here is one they could add to the price
   * and then be charged something different.
   */
  it('states that tax is extra, and never states a rate', () => {
    renderPricing();

    const line = screen.getByText(pricingPage.tax.detail);
    expect(line).toBeInTheDocument();
    expect(line.textContent ?? '').not.toMatch(/\d+(\.\d+)?\s*%/);
  });

  /*
   * The ownership block. Its closing sentence is the one that matters and it is the one most
   * likely to be trimmed by somebody shortening the page: a promise of ownership that never
   * mentions leaving is a promise nobody has tested.
   */
  it('names what the client owns, and says what happens when they leave', () => {
    renderPricing();

    for (const item of pricingPage.ownership.items) {
      expect(screen.getByText(item.title)).toBeInTheDocument();
    }
    expect(screen.getByText(pricingPage.ownership.closing)).toBeInTheDocument();
  });

  /*
   * Five clauses, five working links. `termsAnchor` is a string in a content file with nothing
   * connecting it to the terms page, so this is the only thing standing between a rename in
   * `content/legal.ts` and five links that scroll nowhere — silently, since a fragment that
   * matches no element is not an error anywhere in a browser.
   */
  it('links every payment answer to the term it summarises', () => {
    renderPricing();

    const known = new Set(termsContent.sections.map((section) => section.id));

    for (const item of pricingPage.howPayingWorks.items) {
      expect(
        known.has(item.termsAnchor),
        `"${item.id}" links to #${item.termsAnchor}, which is not a section of the terms`,
      ).toBe(true);
    }

    const links = screen.getAllByRole('link', { name: /read the term itself/i });
    expect(links).toHaveLength(pricingPage.howPayingWorks.items.length);
    for (const link of links) {
      expect(link.getAttribute('href')).toMatch(new RegExp(`^${routes.terms}#`));
    }
  });

  /*
   * The objection that tells some readers not to buy.
   *
   * It is the one a conversion-focused edit removes first, and it is the reason the other
   * three are worth reading — a page where every objection resolves to "so buy it" is a page
   * whose answers carry no information.
   */
  it('keeps the answer that sends some readers somewhere cheaper', () => {
    renderPricing();

    const cheaper = pricingPage.objections.items.find((item) => item.id === 'cheaper');
    expect(cheaper, 'the price-comparison objection is gone').toBeDefined();
    expect(cheaper?.answer).toMatch(/rather you spent the money there/i);
  });

  /*
   * Two actions, and only one accent between them. Ember is rationed to the single primary
   * action across the whole site — `Header.test.tsx` enforces the same rule in the header —
   * and a page that has just published a price is exactly where a second one would creep in.
   */
  it('offers two ways to start and gives only one of them the accent', () => {
    renderPricing();

    /*
     * Scoped to the closing section, because the assessment button's label appears twice on
     * this page — once on the build card and once here. That is deliberate and matches every
     * other long page on the site, but it means an unscoped query finds both.
     */
    const close = screen.getByRole('region', { name: pricingPage.close.heading });
    const assessment = within(close).getByRole('link', {
      name: pricingPage.close.primary.label,
    });
    const build = within(close).getByRole('link', { name: pricingPage.close.secondary.label });

    expect(assessment).toHaveAttribute('href', pricingPage.close.primary.to);
    expect(build).toHaveAttribute('href', pricingPage.close.secondary.to);

    /*
     * The secondary button carries `variant="secondary"`, which resolves to a different class
     * than the primary's. Asserting they differ is the durable form of "only one is ember" —
     * it survives a rename of either class, and it fails the moment somebody makes them match.
     */
    expect(build.className).not.toEqual(assessment.className);
  });

  /*
   * The build card is rendered by the shared `PricingBlock`, so this asserts the page actually
   * mounts it rather than re-implementing a price. Three surfaces render one component
   * precisely so they cannot disagree; a page that quietly stopped using it would look right
   * and drift on the next price change.
   */
  it('renders the shared offer block rather than its own version of it', () => {
    renderPricing();

    const offer = screen.getByRole('region', { name: /the two prices/i });
    expect(within(offer).getAllByText(prices.launch).length).toBeGreaterThan(0);
  });
});
