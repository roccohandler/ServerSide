import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import {
  audience,
  cancellation,
  carePricing,
  commercialTerms,
  faqItems,
  guarantee,
  hero,
  prices,
  pricing,
  primaryCta,
  responseGuarantee,
  site,
  systemComponents,
  systemPhases,
} from '../../content';
import { industries } from '../../content/industries';
import { routes } from '../../config/routes';
import { containsPlaceholder } from '../../lib/placeholders';
import { HomePage } from './HomePage';

/*
 * A smoke test for the page the whole business runs on.
 *
 * It is not a snapshot and it does not assert on wording — copy is meant to change, and
 * a test that fails every time somebody edits a sentence gets deleted. What it pins is
 * the structure the page argues through: one heading, the business case before the
 * product, the offer present in full, and a call to action the reader can act on.
 *
 * jsdom has no IntersectionObserver, which is exactly the case `Reveal` treats as "show
 * everything immediately" — so this also proves the reveal animation can never hide
 * content from a browser that cannot run it.
 */

function renderHome() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );
}

describe('the homepage', () => {
  it('has exactly one first-level heading, and it is the offer', () => {
    renderHome();

    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(hero.heading);
  });

  it('shows every component of the system, split into its two phases', () => {
    renderHome();

    const system = screen.getByRole('region', { name: /customer conversion system/i });

    for (const component of systemComponents) {
      expect(within(system).getByText(component.name)).toBeInTheDocument();
    }

    // The split is the argument for the monthly fee, so it has to survive a refactor.
    for (const phase of systemPhases) {
      expect(within(system).getByRole('heading', { name: phase.label })).toBeInTheDocument();
    }
  });

  /*
   * The order matters as much as the presence. A business owner has no reason to care
   * what is in the offer until they have been told, in their own terms, what a website
   * is supposed to do for them — so the business case and the demonstrations come first.
   *
   * The sequence below is the argument, and two steps in it are deliberate reversals of
   * how this page used to read:
   *
   *   - **The economic anchor comes before the funnel.** "What is one more customer
   *     worth" is what makes the price on the first screen legible. A reader who reaches
   *     the pricing cards without it has only their own budget to judge the number by.
   *   - **"You're not buying a website" comes before the mechanism.** It reframes what
   *     the money is for, and a reframe that lands after ten sections of mechanism is
   *     arriving to somebody who has already decided what they are looking at.
   */
  it('argues the business case before it describes the product', () => {
    const { container } = renderHome();

    const order = [
      /you don't need another website/i,
      /what is one more customer worth/i,
      /how a stranger becomes a phone call/i,
      /getting found is not the same as getting hired/i,
      /small website problems cost you customers/i,
      /customer conversion system/i,
      /four jobs, one system/i,
    ].map((name) => {
      const region = screen.getByRole('region', { name });
      return [...container.querySelectorAll('section')].indexOf(region as HTMLElement);
    });

    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(order.every((index) => index >= 0)).toBe(true);
  });

  /*
   * Risk reversal belongs above the price, not below it.
   *
   * The guarantee, the exit terms and the list of what nobody controls are the answer to
   * "what happens if this goes wrong" — a question somebody asks while looking at a
   * number, not after they have decided the number is too big and left. They used to sit
   * after the pricing block, where the reader most in need of them had already gone.
   */
  it('answers what happens if it goes wrong before it asks for money', () => {
    const { container } = renderHome();

    const indexOf = (name: RegExp | string) => {
      const region = screen.getByRole('region', { name });
      return [...container.querySelectorAll('section')].indexOf(region as HTMLElement);
    };

    const price = indexOf(/four jobs, one system/i);

    expect(indexOf(guarantee.heading)).toBeLessThan(price);
    expect(indexOf(cancellation.heading)).toBeLessThan(price);
  });

  it('renders every section that carries the offer or answers an objection', () => {
    renderHome();

    for (const name of [
      /your website manager/i,
      /live in two to four weeks/i,
      guarantee.heading,
      cancellation.heading,
      // From the content layer: the offer's name is a variable and has moved once already.
      site.offer.freeReview.name,
    ]) {
      expect(screen.getByRole('region', { name })).toBeInTheDocument();
    }
  });

  /*
   * The depth that moved to `/services`. Asserted absent here rather than simply dropped
   * from the list above, because "we consolidated the homepage" is a claim that decays:
   * without this, the eight-stage business case could drift back onto the first read one
   * well-meaning commit at a time. `ServicesPage.test.tsx` asserts the other half — that
   * the same six sections are genuinely still published somewhere.
   */
  it('leaves the researcher-depth sections to the services page', () => {
    renderHome();

    for (const name of [
      /what your website actually does/i,
      /work with your marketing/i,
      /being found is not the same/i,
      // Moved by the value-per-second pass. See docs/VALUE-PER-SECOND.md §5.
      /you're not buying a website/i,
      /most web designers build it/i,
      /three ways this usually starts/i,
    ]) {
      expect(screen.queryByRole('region', { name })).not.toBeInTheDocument();
    }
  });

  /*
   * ==========================================================================
   * THE VALUE-PER-SECOND BUDGETS
   * ==========================================================================
   *
   * Two ceilings, both deliberately set at what the page costs *today* rather than at a
   * round number with headroom in it. A budget with slack is a budget that gets spent
   * without anybody deciding to spend it, which is exactly how this page reached twenty
   * sections and thirty-one open questions in the first place.
   *
   * Neither of these forbids growth. They make growth a thing somebody has to type a new
   * number for, in a diff, next to a comment asking what it bought.
   * ==========================================================================
   */
  const MAX_SECTIONS = 17;

  it('stays under its section budget', () => {
    const { container } = renderHome();

    /*
     * Top-level bands only. `Section` renders a `<section>` per band, and several of them
     * contain nested landmarks — counting every `<section>` in the tree would measure the
     * markup rather than what a reader has to scroll past.
     */
    const bands = [...container.children].filter((node) => node.tagName === 'SECTION');

    expect(
      bands.length,
      `The homepage renders ${bands.length} sections. The budget is ${MAX_SECTIONS}. ` +
        'Read docs/VALUE-PER-SECOND.md §1 before raising it: what does the new section ' +
        'deliver that the reader cannot already get, and could /services carry it instead?',
    ).toBeLessThanOrEqual(MAX_SECTIONS);
  });

  /*
   * The tone alternation, which three separate comments in `HomePage.tsx` describe and
   * nothing enforced.
   *
   * Two abutting bands of the same surface make the cards inside one of them vanish — the
   * pricing cards and the FAQ rows are both `--color-surface`. Removing `EntrySection`
   * broke this run and it took three tone changes to repair, none of which any test would
   * have caught. Reordering a section is now safe in the only sense that matters: getting
   * it wrong fails here rather than in production.
   */
  it('never places two bands of the same surface next to each other', () => {
    const { container } = renderHome();

    const surfaceOf = (node: Element) => {
      const className = node.className;
      if (className.includes('surfaceBrand')) return 'brand';
      if (className.includes('surfaceMuted')) return 'muted';
      return 'default';
    };

    const bands = [...container.children].filter((node) => node.tagName === 'SECTION');

    /*
     * The hero is excluded: it paints its own gradient rather than a `Section` surface,
     * so it has no tone to clash with. It is the first band and always will be.
     */
    const surfaces = bands.slice(1).map(surfaceOf);

    surfaces.forEach((surface, index) => {
      if (index === 0) return;
      expect(
        surface,
        `Bands ${index} and ${index + 1} after the hero are both "${surface}".`,
      ).not.toBe(surfaces[index - 1]);
    });

    // Guards the guard: if `Section` ever stops emitting these class names the loop above
    // would pass by reading "default" off every band.
    expect(new Set(surfaces).size).toBeGreaterThan(1);
  });

  /*
   * Eight of thirty-one, and a way to the rest.
   *
   * The section's lede promises "the things people ask first" and the page was rendering
   * every one of them — around nine hundred lines of collapsed detail below a call to
   * action that was also on the first screen.
   */
  it('carries the questions people ask first, and links to the rest', () => {
    renderHome();

    const faq = screen.getByRole('region', { name: /before you get in touch/i });
    const questions = within(faq).getAllByRole('group');

    expect(questions.length).toBeLessThan(faqItems.length);
    expect(questions.length).toBeGreaterThanOrEqual(5);

    // Rendered in order, so "the ones asked first" means the first ones in the file.
    expect(within(faq).getByText(faqItems[0]?.question ?? '')).toBeInTheDocument();

    const more = within(faq).getByRole('link', { name: new RegExp(`${faqItems.length}`) });
    expect(more).toHaveAttribute('href', routes.services);
  });

  /*
   * The recurring service is what this business sells, so the page has to answer the
   * question an owner asks about it out loud rather than implying an answer.
   */
  it('says why the fee is monthly, and what a month contains', () => {
    renderHome();

    const management = screen.getByRole('region', { name: /your website manager/i });

    expect(
      within(management).getByRole('heading', { name: /why website management is monthly/i }),
    ).toBeInTheDocument();
    expect(
      within(management).getByRole('heading', { name: /what actually happens each month/i }),
    ).toBeInTheDocument();
    expect(
      within(management).getByRole('heading', { name: /not a maintenance plan/i }),
    ).toBeInTheDocument();
  });

  /*
   * The response guarantee is live and has money attached, so the page has to carry the
   * limits next to the promise rather than in a footnote somebody can quietly delete.
   */
  it('publishes the response guarantee with its remedy and its limits', () => {
    renderHome();

    if (!responseGuarantee.enabled) {
      expect(screen.queryByText(responseGuarantee.promise)).not.toBeInTheDocument();
      return;
    }

    expect(screen.getByText(responseGuarantee.promise)).toBeInTheDocument();
    expect(screen.getByText(responseGuarantee.remedy)).toBeInTheDocument();

    // Response, never resolution — and never a promise of leads or rankings.
    expect(screen.getByText(responseGuarantee.distinction)).toBeInTheDocument();
    expect(screen.getByText(responseGuarantee.notGuaranteed.body)).toBeInTheDocument();
  });

  /*
   * The whole commercial story on one page. If a term is on the site it is a term a
   * buyer will hold the business to, so all of them are rendered rather than summarised.
   */
  it('publishes the terms a buyer needs before they will get in touch', () => {
    renderHome();

    for (const term of commercialTerms.items) {
      expect(screen.getByText(term.label)).toBeInTheDocument();
      expect(screen.getByText(term.value)).toBeInTheDocument();
    }
  });

  it('answers what happens if the customer leaves', () => {
    renderHome();

    const exit = screen.getByRole('region', { name: cancellation.heading });
    for (const item of cancellation.items) {
      expect(within(exit).getByRole('heading', { name: item.title })).toBeInTheDocument();
    }
  });

  it('keeps one call to action, worded the same way everywhere it appears', () => {
    renderHome();

    const actions = screen.getAllByRole('link', { name: primaryCta.label });
    expect(actions.length).toBeGreaterThanOrEqual(2);

    for (const action of actions) {
      expect(action).toHaveAttribute('href', primaryCta.to);
    }
  });

  /*
   * A visitor who arrived already convinced should be able to act from the first screen
   * without scrolling. The hero does not hold the form — it holds a button that lands
   * them on it, fragment and all, so they arrive at the form rather than at the top of
   * the page containing it.
   */
  it('offers a way to act from the first screen, pointed at the form itself', () => {
    renderHome();

    const hero = screen.getByRole('region', { name: /turn your website into/i });
    const action = within(hero).getByRole('link', { name: primaryCta.label });

    expect(action).toHaveAttribute('href', primaryCta.to);
    expect(primaryCta.to).toContain('#');

    // And no form: the ask lives on the contact page.
    expect(within(hero).queryByRole('textbox')).not.toBeInTheDocument();
  });

  /*
   * The price is the question every visitor arrives with. It appears twice on purpose —
   * once on the first screen so nobody has to hunt for it, and once in the offer where
   * it can be read against what it buys.
   */
  it('publishes every price it charges, on the first screen and again with the offer', () => {
    renderHome();

    for (const figure of [prices.launch, prices.managementDisplay]) {
      expect(screen.getAllByText(figure).length).toBeGreaterThanOrEqual(1);
    }

    const offer = screen.getByRole('region', { name: /four jobs, one system/i });

    // All three project tiers, each with the price actually being asked for.
    for (const tier of pricing.tiers) {
      expect(within(offer).getAllByText(tier.price).length).toBeGreaterThan(0);
    }

    // And the recurring plans, which are a second decision rather than part of the first.
    for (const plan of carePricing.plans) {
      expect(within(offer).getAllByText(plan.price).length).toBeGreaterThan(0);
    }

    /*
     * The annual option is present and secondary. Matched loosely because it is rendered
     * mid-sentence beside its label and cadence rather than as a figure of its own — which
     * is the point: it is an aside on one plan, not a fourth headline price.
     */
    expect(
      within(offer).getByText(new RegExp(pricing.annual.price.replace('$', '\\$'))),
    ).toBeInTheDocument();
  });

  /*
   * ==========================================================================
   * THE FOUNDING-CLIENT PRICE IS NOT PRESENTED AS A FORMER PRICE
   * ==========================================================================
   *
   * 16 CFR 233.1 permits a former-price comparison only where the former price was
   * actually charged, publicly, on a regular basis, for a substantial period. This
   * business has never charged the standard prices — they are a rate card being
   * established now.
   *
   * `content.test.ts` bans the *words* that would make it a claim about the past. This
   * bans the *markup* that would make the same claim without any words: a strike-through
   * is how a page says "was". The two together are what make the presentation defensible,
   * and neither is sufficient alone.
   * ==========================================================================
   */
  it('never strikes through the standard price, and always labels it', () => {
    const { container } = renderHome();

    if (!pricing.founding.enabled) return;

    const struck = container.querySelectorAll('s, del, strike');
    expect(struck, 'a struck-out price is a former-price claim made with markup').toHaveLength(0);

    const offer = screen.getByRole('region', { name: /four jobs, one system/i });

    for (const tier of pricing.tiers) {
      if (tier.hasDiscount !== true) continue;

      // The figure is on the page, and the words explaining what it is are beside it.
      expect(within(offer).getAllByText(tier.standardPrice ?? '').length).toBeGreaterThan(0);
    }

    expect(
      within(offer).getAllByText(pricing.founding.standardLabel).length,
    ).toBeGreaterThanOrEqual(1);

    // And the condition that makes the lower price truthful is stated, not implied.
    expect(within(offer).getByText(pricing.founding.body)).toBeInTheDocument();
  });

  /*
   * The number the reader has to leave with is what they pay. A saving rendered larger
   * than the price it derives from is a page selling the discount rather than the work.
   */
  it('makes the price the reader pays the most prominent figure on the card', () => {
    renderHome();

    const offer = screen.getByRole('region', { name: /four jobs, one system/i });
    const growth = pricing.tiers.find((tier) => tier.emphasis);

    const price = within(offer).getAllByText(growth?.price ?? '')[0];
    const standard = within(offer).getAllByText(growth?.standardPrice ?? '')[0];

    /*
     * Compared by class rather than by computed font size: jsdom does not apply the
     * stylesheet, so the assertion that survives is that the two use different, known
     * treatments — the price uses the display style and the standard price does not.
     */
    expect(price?.className).not.toBe(standard?.className);
    expect(price?.closest('p')?.className).toMatch(/priceValue/);
    expect(standard?.className).toMatch(/priceStandardValue/);
  });

  /*
   * The two figures on the first screen are both halves of one offer, not a choice
   * between them. They used to be separated by a decorative rule, which is how a reader
   * gets to "$2,500 *or* $299 a month" in the five seconds they give a first screen —
   * and that reading makes the cheaper number look like the whole price.
   *
   * Asserted as rendered text rather than as a class, because the fix only works if it
   * is announced: a screen-reader user had no divider to misread and no word to read
   * either.
   */
  it('joins the two prices on the first screen with a word, not a rule', () => {
    renderHome();

    const firstScreen = screen.getByRole('region', { name: /turn your website into/i });
    const join = within(firstScreen).getByText(hero.priceLine.join);

    expect(join).toBeInTheDocument();
    expect(join).not.toHaveAttribute('aria-hidden');
    // "or" would invert the meaning of the whole line.
    expect(hero.priceLine.join).not.toMatch(/\bor\b/i);
  });

  /*
   * A price that is still a token reads as a broken page rather than as an unfinished
   * decision, so no rendered price may contain one. The dev banner catches the rest.
   */
  it('renders no half-finished figure anywhere in the pricing block', () => {
    renderHome();

    const offer = screen.getByRole('region', { name: /four jobs, one system/i });

    for (const tier of pricing.tiers) {
      expect(containsPlaceholder(tier.price)).toBe(false);
      expect(within(offer).getAllByText(tier.price).length).toBeGreaterThan(0);
    }
  });

  /*
   * The objection that stops most people accepting a free anything is not "is it really
   * free" — it is "what am I actually going to get". Offering the review without showing
   * what comes back leaves that open at the exact moment the reader decides.
   */
  it('shows what the free review comes back with, next to the offer of one', () => {
    renderHome();

    const link = screen.getByRole('link', { name: site.offer.freeReview.sampleLabel });
    expect(link).toHaveAttribute('href', routes.teardown);
  });

  /*
   * The five trades with a page of their own are reachable from the homepage. This is the
   * main internal route into them, and the only personalisation the homepage does.
   */
  it('links each trade that has its own page to it', () => {
    renderHome();

    for (const industry of industries) {
      const chip = screen.getByRole('link', {
        name: audience.industries.find((entry) => entry.slug === industry.slug)?.label ?? '',
      });
      expect(chip).toHaveAttribute('href', industry.path);
    }
  });
});
