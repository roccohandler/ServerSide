import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import {
  afterLaunch,
  audience,
  cancellation,
  carePricing,
  commercialTermItems,
  comparison,
  demos,
  entryPaths,
  faqItems,
  guarantee,
  hero,
  offerStack,
  websiteReport,
  prices,
  pricing,
  primaryCta,
  responseGuarantee,
  site,
  system,
  systemComponents,
  systemPhases,
} from '../../../content';
import { industries } from '../../../content/industries';
import { routes } from '../../../config/routes';
import { containsPlaceholder } from '../../../lib/placeholders';
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

    const systemRegion = screen.getByRole('region', { name: system.heading });

    for (const component of systemComponents) {
      expect(within(systemRegion).getByText(component.name)).toBeInTheDocument();
    }

    // The split is what stops the optional half reading as included in the build's
    // price, so it has to survive a refactor — and the second phase has to say whose
    // work it is.
    for (const phase of systemPhases) {
      expect(within(systemRegion).getByRole('heading', { name: phase.label })).toBeInTheDocument();
    }
    expect(systemPhases[1].label).toContain('Growth Partner');
  });

  /*
   * The order matters as much as the presence. A business owner has no reason to care
   * what is in the offer until they have been told, in their own terms, what a website
   * is supposed to do for them — so the business case and the demonstrations come first.
   *
   * The sequence below is the argument. Four steps in it are deliberate, and three are
   * reversals of how this page used to read:
   *
   *   - **The economic anchor comes before the funnel.** "What is one more customer
   *     worth" is what makes the price on the first screen legible. A reader who reaches
   *     the pricing cards without it has only their own budget to judge the number by.
   *   - **"How you will know" comes after the build and before any proof.** It is the
   *     answer to the question the whole page raises, and it did not exist as a section at
   *     all: the baseline was a technical bullet in a deliverable list, the day-30 report
   *     was the fifth beat of a prose block, and the monthly measurement was the last line
   *     of the plan's scope. A reader had to visit three places and infer the sequence.
   *   - **The demonstrations come before the research.** `EvidenceSection`'s three
   *     citations are deliberately about parts of the journey this business does not
   *     touch — call answer rates, booking expectations — so as an opening move they argue
   *     that the website may not be the problem. That belongs after the reader has seen
   *     what a good one looks like, not before.
   *   - **The three situations come immediately before the price**, so the reader picks
   *     which piece of work they need once, at the moment the commercial question arrives.
   */
  it('argues the business case before it describes the product', () => {
    const { container } = renderHome();

    const order = [
      /you don't need another website/i,
      /what is one more customer worth/i,
      /how a stranger becomes a phone call/i,
      system.heading,
      afterLaunch.heading,
      /small website problems cost you customers/i,
      /getting found is not the same as getting hired/i,
      entryPaths.heading,
      offerStack.heading,
    ].map((name) => {
      const region = screen.getByRole('region', { name });
      return [...container.querySelectorAll('section')].indexOf(region as HTMLElement);
    });

    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(order.every((index) => index >= 0)).toBe(true);
  });

  /*
   * ==========================================================================
   * NO TWO HEADINGS ON THIS PAGE MAY SAY THE SAME THING
   * ==========================================================================
   *
   * A screen-reader user navigates a long page by jumping between headings. Two headings with
   * an identical accessible name are two indistinguishable destinations, and on a page this
   * long that is not a nicety — it is the primary way the page is read at all.
   *
   * This guard exists because the offer redesign produced **three** of them, and every one was
   * found by a human reading a dump of the outline rather than by anything automatic:
   *
   *   - "Keep it running" — a `systemComponents` step title and a `managementCategories` title
   *   - "Run it yourself" — `launch.after.self` and `carePricing.choice.without`, which turned
   *     out to be a whole duplicated block rather than a coincidence of wording
   *   - "Free website assessment" — a process-step title that was *only* the offer's name, and
   *     `ReviewOfferSection`'s own heading, which is also exactly the offer's name
   *
   * Two of the three were symptoms of content being said twice, which is the more useful thing
   * this catches: a repeated heading is usually a repeated section.
   *
   * Deliberately compares the *whole* page rather than per-section, and normalises whitespace
   * only — not case, because two headings differing only in case are still two headings a
   * listener cannot tell apart.
   * ==========================================================================
   */
  it('never gives two headings the same name', () => {
    const { container } = renderHome();

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

    const price = indexOf(offerStack.heading);

    expect(indexOf(guarantee.heading)).toBeLessThan(price);
    expect(indexOf(cancellation.heading)).toBeLessThan(price);
  });

  /*
   * The two homepage demo renderings no other suite covers: the hero's framed product
   * shot and the finished bridge in the demonstrations section. Every screenshot of a
   * fictional business must carry a visible "Demonstration" label adjacent to it — the
   * portfolio, industry, teardown and services suites each pin their own surfaces, and
   * without this one a refactor could strip the label from the highest-traffic
   * rendering on the site while the whole suite stayed green.
   */
  it('labels both homepage demo renderings as demonstrations', () => {
    renderHome();

    // The hero carries the product shot only in the 'cta' variant; the form variant
    // deliberately shows no screenshot, so there is nothing to label.
    if (site.hero.variant === 'cta') {
      const heroRegion = screen.getByRole('region', { name: hero.heading });
      expect(within(heroRegion).getByText('Demonstration')).toBeInTheDocument();
      expect(within(heroRegion).getByAltText(/Cascade Comfort/)).toBeInTheDocument();
    }

    const demosRegion = screen.getByRole('region', { name: demos.heading });
    expect(within(demosRegion).getByText('Demonstration')).toBeInTheDocument();
    expect(within(demosRegion).getByAltText(/Emerald Line/)).toBeInTheDocument();
  });

  it('renders every section that carries the offer or answers an objection', () => {
    renderHome();

    for (const name of [
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
  const MAX_SECTIONS = 18;

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
   * ==========================================================================
   * WHAT THE MONTHLY FEE BUYS, ON THE PAGE, IN THE ORDER THAT SAYS SO
   * ==========================================================================
   *
   * This test used to look for `ManagementSection` here. That section is on `/services`
   * now — see the note in `HomePage.tsx` — and `ServicesPage.test.tsx` pins it there.
   *
   * What has to be true *here* is the more important half, and it was never asserted: the
   * recurring service is answered where the money is, and it leads with the deliverable
   * rather than with hosting. The previous version of this block opened on "Hosting,
   * certificates, backups and security updates" and closed on "Measurement, and what it
   * means in plain English" — which is a care plan being sold by a page that elsewhere
   * argued it was not one. Readers scan lists; the order is the claim.
   * ==========================================================================
   */
  it('answers the monthly fee where the price is, and leads with the deliverable', () => {
    renderHome();

    const offer = screen.getByRole('region', { name: offerStack.heading });

    // The question an owner actually asks, answered at the point they ask it.
    expect(
      within(offer).getByRole('heading', { name: pricing.whyNotMonthly.question }),
    ).toBeInTheDocument();

    // The named artefact, present and above the scope list rather than buried inside it.
    const report = within(offer).getByRole('heading', { name: websiteReport.heading });
    expect(report).toBeInTheDocument();

    const scopeLabel = within(offer).getByText(carePricing.plan.groups[0]?.label ?? '');
    expect(
      report.compareDocumentPosition(scopeLabel) & Node.DOCUMENT_POSITION_FOLLOWING,
      'the monthly scope is rendered above the deliverable it exists to produce',
    ).toBeTruthy();

    // And the plan still has somewhere to go, which it did not before this redesign.
    expect(within(offer).getByRole('link', { name: carePricing.requestCta })).toBeInTheDocument();
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

    for (const term of commercialTermItems) {
      expect(screen.getAllByText(term.label).length).toBeGreaterThan(0);
      expect(screen.getAllByText(term.value).length).toBeGreaterThan(0);
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
   * without scrolling. The hero does not hold the form — it holds a button that lands them
   * on the ask.
   *
   * It used to assert the href carried a `#`, because the ask was a form partway down the
   * contact page and a button that dropped somebody at the top of it had failed. DECISION
   * 028 pointed the primary action at `/get-my-assessment`, where the ask *is* the page, so
   * a fragment there would link to a section of a one-section page.
   *
   * What is asserted instead is the property that mattered all along and is still checkable
   * here: the hero's button and the site's primary action are the same destination. The
   * "lands on the ask" rule itself lives in `content.test.ts`, next to the content it is
   * about, rather than being restated in a rendering test.
   */
  it('offers a way to act from the first screen, pointed at the ask itself', () => {
    renderHome();

    const heroRegion = screen.getByRole('region', { name: hero.heading });
    const action = within(heroRegion).getByRole('link', { name: primaryCta.label });

    expect(action).toHaveAttribute('href', primaryCta.to);

    /*
     * The second action, for the reader who arrived already convinced.
     *
     * The first screen serves two visitors who need opposite things, and until this
     * redesign it served one: the secondary button scrolled to the offer block, which is
     * useful to a researcher and a dead end to somebody sent by a referral. It carries an
     * `intent` now, so the contact form already knows why they came.
     */
    const direct = within(heroRegion).getByRole('link', { name: site.cta.secondary.label });
    expect(direct).toHaveAttribute('href', site.cta.secondary.to);
    expect(site.cta.secondary.to).toContain('intent=');

    // And no form: the ask lives on the contact page.
    expect(within(heroRegion).queryByRole('textbox')).not.toBeInTheDocument();
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

    const offer = screen.getByRole('region', { name: offerStack.heading });

    // The build, at the price actually being asked for.
    expect(within(offer).getAllByText(pricing.build.price).length).toBeGreaterThan(0);

    // And the recurring plan, which is a second decision rather than part of the first.
    expect(within(offer).getAllByText(carePricing.plan.price).length).toBeGreaterThan(0);

    // Year-one economics, in full — both paths, so nothing recurring is hidden.
    expect(within(offer).getByText(pricing.yearOne.withPartner.figure)).toBeInTheDocument();

    /*
     * The annual option is present and secondary. Matched loosely because it is rendered
     * mid-sentence beside its label and cadence rather than as a figure of its own — which
     * is the point: it is an aside on the plan, not a third headline price.
     */
    expect(
      within(offer).getAllByText(new RegExp(pricing.annual.price.replace('$', '\\$'))).length,
    ).toBeGreaterThan(0);
  });

  /*
   * The build-versus-plan comparison, on the page. It is the fastest honest answer to
   * "which purchase does what", so it has to survive a refactor.
   */
  it('renders the comparison between the build and the plan', () => {
    renderHome();

    // getAll throughout: row labels legitimately reuse phrases the offer copy also uses
    // (e.g. the responsibilities list also says "Analytics and conversion tracking").
    expect(screen.getAllByText(comparison.columns.build).length).toBeGreaterThan(0);
    expect(screen.getAllByText(comparison.columns.partner).length).toBeGreaterThan(0);

    const [table] = screen.getAllByRole('table');
    for (const row of comparison.rows) {
      expect(within(table as HTMLElement).getByText(row.label)).toBeInTheDocument();
    }
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

    const offer = screen.getByRole('region', { name: offerStack.heading });

    // The figure is on the page, and the words explaining what it is are beside it.
    expect(within(offer).getAllByText(pricing.build.standardPrice).length).toBeGreaterThan(0);
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

    const offer = screen.getByRole('region', { name: offerStack.heading });

    const price = within(offer).getAllByText(pricing.build.price)[0];
    const standard = within(offer).getAllByText(pricing.build.standardPrice)[0];

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
   * The two figures on the first screen are two purchases, not one compound bill — and
   * not a choice between equals either. Each carries its own label ("The build" /
   * "Optional after launch"), and the sentence that settles whether the monthly part is
   * compulsory is rendered right under them. A reader who leaves the first screen
   * believing the plan is mandatory was misled by layout; this pins the layout that
   * does not mislead.
   */
  it('labels both first-screen figures, and says the plan is optional', () => {
    renderHome();

    const firstScreen = screen.getByRole('region', { name: hero.heading });

    expect(within(firstScreen).getByText(hero.priceBlock.build.label)).toBeInTheDocument();
    expect(within(firstScreen).getByText(hero.priceBlock.partner.label)).toBeInTheDocument();
    expect(hero.priceBlock.partner.label.toLowerCase()).toContain('optional');

    // The sentence that settles the question the two figures raise.
    expect(within(firstScreen).getByText(hero.priceBlock.choice)).toBeInTheDocument();

    // The founding condition travels with the founding figure.
    if (pricing.founding.enabled) {
      expect(hero.priceBlock.foundingNote).toBeTruthy();
      expect(within(firstScreen).getByText(hero.priceBlock.foundingNote ?? '')).toBeInTheDocument();
    }

    // And the timeline is a first-screen fact, not a buried paragraph.
    expect(within(firstScreen).getByText(hero.priceBlock.timeline)).toBeInTheDocument();
  });

  /*
   * A price that is still a token reads as a broken page rather than as an unfinished
   * decision, so no rendered price may contain one. The dev banner catches the rest.
   */
  it('renders no half-finished figure anywhere in the pricing block', () => {
    renderHome();

    const offer = screen.getByRole('region', { name: offerStack.heading });

    expect(containsPlaceholder(pricing.build.price)).toBe(false);
    expect(within(offer).getAllByText(pricing.build.price).length).toBeGreaterThan(0);
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
