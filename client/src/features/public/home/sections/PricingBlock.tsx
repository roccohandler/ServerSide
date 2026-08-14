import {
  commercialTerms,
  comparison,
  marketComparison,
  pricing,
  primaryCta,
  relationship,
} from '../../../../content';
import { Link } from 'react-router-dom';
import { conversionFix, flagship } from '../../../../config/pricing';
import { routes, sections } from '../../../../config/routes';
import { Card } from '../../../../components/ui/Layout';
import { ButtonLink } from '../../../../components/ui/Button';
import { Icon } from '../../../../components/ui/Icon';
import { track } from '../../../../lib/analytics';
import { CarePlans } from './CarePlans';
import styles from '../Offer.module.css';

interface PricingBlockProps {
  /**
   * The heading level of this block's sub-headings — the build card's name, the
   * year-one heading, the comparison heading and the terms heading. The homepage puts
   * the whole block under an `h3` ("What it costs"), so its sub-headings are `h4`; the
   * services page renders it directly under the section's `h2`, so they are `h3`.
   */
  readonly blockLevel?: 3 | 4;
  /** Which surface reported the interaction, so the two are separable in the numbers. */
  readonly location?: 'home' | 'services';
  /**
   * How much of the block to render.
   *
   * `full` is everything. `summary` drops the two blocks that are research rather than
   * offer — the market comparison and the commercial terms — and links to the page that
   * carries them.
   *
   * Everything else stays on both surfaces, deliberately. The build-versus-plan
   * comparison, the year-one figures and the "why not just charge monthly" answer were
   * all considered for this cut and all kept: each is asserted by `HomePage.test.tsx`
   * with a stated reason, and the comparison's own test says in as many words that it has
   * to survive a refactor. A price block that hides what the two purchases each cover is
   * the confusion this block was built to remove.
   */
  readonly depth?: 'summary' | 'full';
}

/**
 * The entire commercial block, rendered once and used by both pricing surfaces.
 *
 * ## Why one component rather than two renderings of the same content
 *
 * Because two renderings is how the last two pricing defects happened: `/services`
 * published all three founding prices with the condition only on the homepage, and
 * priced an annual plan it never described. A single component cannot disagree with
 * itself across pages.
 *
 * ## The order, and why it is this order
 *
 * The block answers nine questions, in the sequence a buyer actually asks them:
 *
 *   1. *What am I buying?* — the product name and a one-line statement of the outcome
 *   2. *Who is it for?* — `bestFor`, immediately under the price
 *   3. *What does it change?* — the reassurance chips
 *   4. *What do I receive?* — the deliverables checklist
 *   5. *How long?* — the timeline, beside the figure rather than in a footnote
 *   6. *What does it cost?* — the figure, its condition, and the payment split
 *   7. *What happens afterwards?* — the relationship diagram, then Growth Partner
 *   8. *What risk am I taking?* — the terms, the exit, the comparison
 *   9. *What do I do next?* — a specific action on every card
 *
 * The founding condition comes before the figure it qualifies, because the condition is
 * what makes the lower number truthful. Everything about the recurring service comes
 * *after* the build price: before it, six categories of monthly work are read with no
 * number attached, which is how a reader arrives at the figure already suspicious.
 *
 * ## Three products, three actions, and no tier ladder
 *
 * The build is the primary purchase and the only one with ember on its button. Conversion
 * Fix is a smaller, secondary card for the reader whose site basically works — it is not a
 * cheaper tier of the same thing, and it is deliberately not presented as one, because a
 * ladder invites a reader to pick the bottom rung rather than the right product. Growth
 * Partner is subordinate to both and cannot be bought before a website exists.
 */
export function PricingBlock({
  blockLevel = 4,
  location = 'home',
  depth = 'full',
}: PricingBlockProps) {
  const Heading = `h${blockLevel}` as 'h3' | 'h4';
  const SubHeading = `h${(blockLevel + 1) as 4 | 5}` as 'h4' | 'h5';
  const full = depth === 'full';

  const build = pricing.build;
  const fix = pricing.fix;
  const requestTo = `${routes.contact}?intent=build#${sections.request}`;
  const fixTo = `${routes.contact}?intent=fix#${sections.request}`;

  return (
    <div className={styles['pricingBlock']}>
      {/*
       * The founding-client offer, stated once, above the price it applies to. The
       * condition is the part that makes the lower figure truthful, so it comes first.
       * There is deliberately no live "X of 10 still open" counter — see config/pricing.ts.
       */}
      {pricing.founding.enabled ? (
        <div className={styles['founding']}>
          <p className={styles['foundingLabel']}>{pricing.founding.label}</p>
          <p className={styles['foundingBody']}>{pricing.founding.body}</p>
        </div>
      ) : null}

      {/* ------------------------------------------------------------- the build */}

      {/*
       * Both purchases in one row once there is room for two readable measures.
       *
       * Stacked, these two cards ran 2,380px — the reader met the build, scrolled a full
       * screen of it, and arrived at Conversion Fix having lost the thing it is an
       * alternative to. Side by side the choice is a glance.
       *
       * The columns are deliberately unequal and the styling stays as it was: the build is
       * wider, keeps the shadow and the only ember button on the page, and Conversion Fix
       * keeps its plain border and secondary action. That is what stops a row of two cards
       * reading as a tier ladder — see the note above `.fixCard`. DOM order is unchanged,
       * so on a phone it is still the build first and the smaller job after it.
       */}
      <div className={styles['priceCards']}>
        <div className={styles['buildCard']}>
          <Card className={styles['priceCard']}>
            <p className={styles['priceCadence']}>{build.cadence}</p>
            <Heading className={styles['priceName']}>{build.name}</Heading>

            {/*
             * The outcome, before the number.
             *
             * A reader who meets the figure first has nothing to weigh it against except
             * their own budget. One sentence saying what the money is for costs a line and
             * changes what the number is compared with.
             */}
            <p className={styles['priceStatement']}>{build.statement}</p>

            {/*
             * The standard price, above the price actually being asked for and a great
             * deal smaller than it. **No strike-through, and the label is not optional.**
             * This business has never charged the standard price, so striking it out
             * would be a former-price claim made with CSS — see 16 CFR 233.1 notes in
             * config/pricing.ts.
             */}
            {build.hasDiscount ? (
              <p className={styles['priceStandard']}>
                <span className={styles['priceStandardLabel']}>
                  {pricing.founding.standardLabel}
                </span>
                <span className={styles['priceStandardValue']}>{build.standardPrice}</span>
              </p>
            ) : null}

            <p className={styles['priceValue']}>{build.price}</p>

            {build.hasDiscount ? (
              <p className={styles['priceSaving']}>
                {pricing.founding.savingLabel} {build.saving}
              </p>
            ) : null}

            <p className={styles['priceNote']}>{build.priceNote}</p>
            <p className={styles['buildTimeline']}>{build.timeline}</p>

            {/*
             * The action, directly under the price rather than under the deliverables.
             *
             * A reader convinced by the figure should not have to scroll past fifteen
             * bullet points to act, and a reader who needs the bullet points has not been
             * deprived of them — they are immediately below, and the action repeats nowhere
             * because one card with two identical buttons is a card that has not decided.
             */}
            <div className={styles['buildActions']}>
              <ButtonLink
                to={requestTo}
                size="lg"
                onClick={() =>
                  track('pricing_tier_selected', { tier: flagship.id, from: location })
                }
              >
                {pricing.requestCta}
              </ButtonLink>
              <ButtonLink
                to={primaryCta.to}
                variant="secondary"
                onClick={() =>
                  track('cta_clicked', {
                    location: location === 'services' ? 'services-pricing' : 'pricing',
                  })
                }
              >
                {primaryCta.label}
              </ButtonLink>
            </div>

            {/*
             * The five things that answer "what am I signing up for" before the list of
             * deliverables answers "what do I get". Effort and risk, not features: the copy
             * is written, the accounts are yours, there are revisions, there is a month of
             * fixes, and it does not launch until it passes.
             */}
            <ul className={styles['priceReassure']}>
              {pricing.reassurance.map((item) => (
                <li key={item} className={styles['priceReassureItem']}>
                  <Icon name="check" size={16} className={styles['stackMarker']} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <p className={styles['priceSummary']}>{build.summary}</p>

            {/*
             * The deliverable list, on the depth page only.
             *
             * `build.includes` is literally `buildOutcomes.flatMap(o => o.includes)` — the
             * same seven promises the offer stack renders, expanded one level. On the
             * homepage that stack sits about 600px directly above this card, in this
             * section, so printing the expansion here was the same information twice with
             * a price between the two copies. The stack keeps it; the card points at it.
             *
             * `/services` renders the stack in a different section from the price, so
             * there the card still carries its own list.
             */}
            {full ? (
              <ul className={styles['priceIncludes']}>
                {build.includes.map((item) => (
                  <li key={item} className={styles['stackListItem']}>
                    <Icon name="check" size={16} className={styles['stackMarker']} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles['priceIncludesPointer']}>{pricing.includesPointer}</p>
            )}

            <p className={styles['priceTerms']}>{build.terms}</p>
          </Card>
        </div>

        {/* -------------------------------------------------------- the smaller job */}

        {/*
         * Conversion Fix.
         *
         * Deliberately a plainer card than the build, and deliberately after it: it is a
         * different piece of work for a different situation, not a cheaper version of the same
         * one. Presenting the two as tiers would make the build look like the expensive option
         * rather than the right one, and would invite a reader whose site genuinely needs
         * replacing to buy the smaller thing twice.
         *
         * While `pricePublished` is false there is no figure here at all — `pricing.fix.price`
         * carries the honest sentence instead, and `sanctionedFigures()` does not sanction the
         * number, so quoting it anywhere fails the build. See DECISION 014.
         */}
        <div className={styles['fixCard']}>
          <Card className={styles['fixCardInner']}>
            <p className={styles['priceCadence']}>{fix.cadence}</p>
            <SubHeading className={styles['fixName']}>{fix.name}</SubHeading>
            <p className={styles['priceStatement']}>{fix.statement}</p>

            <p className={fix.pricePublished ? styles['fixPrice'] : styles['fixPriceQuoted']}>
              {fix.price}
            </p>
            <p className={styles['priceNote']}>{fix.priceNote}</p>
            <p className={styles['buildTimeline']}>{fix.timeline}</p>

            <p className={styles['priceSummary']}>{fix.summary}</p>

            <ul className={styles['priceIncludes']}>
              {fix.includes.map((item) => (
                <li key={item} className={styles['stackListItem']}>
                  <Icon name="check" size={16} className={styles['stackMarker']} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            {/*
             * The boundary, on the card rather than in the agreement.
             *
             * A fixed scope is only meaningful with a stated edge, and the absence of one is
             * exactly why the previous $2,500 tier was withdrawn — it described unseen work at
             * a fixed figure. Four lines of "what this is not" is what makes the rest of the
             * card a commitment instead of an opening position.
             */}
            <p className={styles['fixExcludesLabel']}>{fix.excludesLabel}</p>
            <ul className={styles['fixExcludes']}>
              {fix.excludes.map((item) => (
                <li key={item} className={styles['fixExcludesItem']}>
                  <Icon name="close" size={16} className={styles['fixExcludesMarker']} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <ButtonLink
              to={fixTo}
              variant="secondary"
              className={styles['fixAction'] ?? ''}
              onClick={() =>
                track('pricing_tier_selected', { tier: conversionFix.id, from: location })
              }
            >
              {fix.requestCta}
            </ButtonLink>
          </Card>
        </div>
      </div>

      {/* The real constraint, stated as a fact about fulfilment rather than a counter. */}
      <p className={styles['capacityNote']}>
        <strong>{pricing.capacity.heading}.</strong> {pricing.capacity.body}
      </p>

      {/* ----------------------------------------------- how the two purchases relate */}

      {/*
       * Drawn before Growth Partner is described, because "why is there a monthly fee at
       * all" is answered by the relationship rather than by the plan's contents. A reader
       * looking at two priced cards constructs that relationship themselves, and almost
       * always constructs the wrong one: a website, and then a bill to keep it switched on.
       */}
      <div className={styles['relationship']}>
        <Heading className={styles['blockHeading']}>{relationship.heading}</Heading>
        <p className={styles['blockLede']}>{relationship.lede}</p>

        <ol className={styles['relationshipSteps']}>
          {relationship.steps.map((step) => (
            <li key={step.id} className={styles['relationshipStep']}>
              <p className={styles['relationshipCadence']}>{step.cadence}</p>
              <p className={styles['relationshipLabel']}>{step.label}</p>
              <p className={styles['relationshipRole']}>{step.role}</p>
            </li>
          ))}
        </ol>

        <p className={styles['relationshipClosing']}>{relationship.closing}</p>
      </div>

      {/* -------------------------------------------------- after launch: the plan */}

      <CarePlans headingLevel={blockLevel} location={location} />

      {/* ------------------------------------------------------- year-one economics */}

      {/*
       * The two year-one figures and the question they raise, in one row.
       *
       * "Why isn't the website just $299 a month?" is the question a reader asks *while*
       * looking at those two totals, so it is set beside them rather than after them.
       */}
      <div className={styles['yearOneRow']}>
        <div className={styles['yearOne']}>
          <Heading className={styles['blockHeading']}>{pricing.yearOne.heading}</Heading>
          <p className={styles['blockLede']}>{pricing.yearOne.lede}</p>

          <div className={styles['yearOnePaths']}>
            <div className={styles['yearOnePath']}>
              <p className={styles['yearOnePathLabel']}>{pricing.yearOne.websiteOnly.label}</p>
              <p className={styles['yearOneFigure']}>{pricing.yearOne.websiteOnly.figure}</p>
              <p className={styles['yearOneNote']}>{pricing.yearOne.websiteOnly.note}</p>
            </div>

            <div className={styles['yearOnePath']}>
              <p className={styles['yearOnePathLabel']}>{pricing.yearOne.withPartner.label}</p>
              <p className={styles['yearOneFigure']}>{pricing.yearOne.withPartner.figure}</p>
              <p className={styles['yearOneBreakdown']}>{pricing.yearOne.withPartner.breakdown}</p>
              <p className={styles['yearOneNote']}>{pricing.yearOne.withPartner.note}</p>
            </div>
          </div>
        </div>

        {/* ------------------------------------------- the question under the structure */}

        <div className={styles['whyNot']}>
          <Heading className={styles['whyNotQuestion']}>{pricing.whyNotMonthly.question}</Heading>
          <p className={styles['whyNotAnswer']}>{pricing.whyNotMonthly.answer}</p>
        </div>
      </div>

      {/* ---------------------------------------------------------- the comparisons */}

      <div className={styles['comparison']}>
        <Heading className={styles['blockHeading']}>{comparison.heading}</Heading>
        <p className={styles['blockLede']}>{comparison.lede}</p>

        {/*
         * Focusable, because it scrolls.
         *
         * `overflow-x: auto` on a div is reachable with a pointer and unreachable with a
         * keyboard: a sighted keyboard user on a narrow window can see the table is cut off and
         * has no way to move it. `tabIndex={0}` plus a name makes it a scrollable region the
         * arrow keys work in, which is the standard fix and the reason it is not just a div.
         */}
        <div
          className={styles['comparisonScroll']}
          tabIndex={0}
          role="region"
          aria-label={comparison.heading}
        >
          <table className={styles['comparisonTable']}>
            <thead>
              <tr>
                <th scope="col" className={styles['comparisonHead']}>
                  <span className="visually-hidden">What is covered</span>
                </th>
                <th scope="col" className={styles['comparisonHead']}>
                  {comparison.columns.build}
                </th>
                <th scope="col" className={styles['comparisonHead']}>
                  {comparison.columns.partner}
                </th>
              </tr>
            </thead>
            <tbody>
              {comparison.rows.map((row) => (
                <tr key={row.id}>
                  <th scope="row" className={styles['comparisonLabel']}>
                    {row.label}
                  </th>
                  <td className={styles['comparisonCell']}>{row.build}</td>
                  <td className={styles['comparisonCell']}>{row.partner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className={styles['comparisonNote']}>{comparison.note}</p>
      </div>

      {/*
       * And the comparison the reader is actually making, which is not between these two
       * purchases — it is between this and whatever else they could spend the money on.
       * Nobody is named: see the note above `marketComparison` in `content/offer.ts`.
       *
       * Depth-gated. On the homepage this is a second full table immediately under the
       * first, and two tables in a row is where a scanning reader stops scanning.
       */}
      {full ? (
        <div className={styles['comparison']}>
          <Heading className={styles['blockHeading']}>{marketComparison.heading}</Heading>
          <p className={styles['blockLede']}>{marketComparison.lede}</p>

          <div
            className={styles['comparisonScroll']}
            tabIndex={0}
            role="region"
            aria-label={marketComparison.heading}
          >
            <table className={styles['comparisonTable']}>
              <thead>
                <tr>
                  <th scope="col" className={styles['comparisonHead']}>
                    <span className="visually-hidden">{marketComparison.columns.label}</span>
                  </th>
                  <th scope="col" className={styles['comparisonHead']}>
                    {marketComparison.columns.typical}
                  </th>
                  <th scope="col" className={styles['comparisonHead']}>
                    {marketComparison.columns.here}
                  </th>
                </tr>
              </thead>
              <tbody>
                {marketComparison.rows.map((row) => (
                  <tr key={row.id}>
                    <th scope="row" className={styles['comparisonLabel']}>
                      {row.label}
                    </th>
                    <td className={styles['comparisonCell']}>{row.typical}</td>
                    <td className={styles['comparisonCell']}>{row.here}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className={styles['comparisonNote']}>{marketComparison.note}</p>
        </div>
      ) : null}

      <p className={styles['priceFootnote']}>{pricing.note}</p>

      {/* ------------------------------------------------------------------ terms */}

      {/*
       * ====================================================================
       * EVERY COMMERCIAL TERM — PUBLISHED ON BOTH SURFACES, COLLAPSED ON ONE
       * ====================================================================
       *
       * This block was the obvious cut: two thousand pixels of definition list at the
       * bottom of the longest section on the homepage. It is deliberately *not* cut, and
       * the reason is a test — `HomePage.test.tsx` asserts every term label and value
       * renders here, under the name "publishes the terms a buyer needs before they will
       * get in touch". That is a stated commercial position, not an accident of layout: a
       * business asking for $4,900 up front publishes its terms where the price is.
       *
       * So the terms stay on the page and every one of them stays in the document. What
       * changes is that the homepage ships them closed. A disclosure is not hiding — the
       * heading is visible, it says how many groups are inside, and it is one click with
       * no navigation. `<details>` keeps the content in the DOM, so the guarantee the test
       * encodes still holds, and a reader who came to read the terms still finds them by
       * scrolling to the word "terms".
       *
       * `/services` renders it open. Somebody on the depth page has already asked.
       */}
      <details className={styles['terms']} open={full}>
        <summary className={styles['termsSummary']}>
          <Heading className={styles['blockHeading']}>{commercialTerms.heading}</Heading>
          <p className={styles['blockLede']}>{commercialTerms.lede}</p>
        </summary>

        {commercialTerms.groups.map((group) => (
          <div key={group.id} className={styles['termsGroup']}>
            <SubHeading className={styles['termsGroupLabel']}>{group.label}</SubHeading>
            <dl className={styles['termsList']}>
              {group.items.map((term) => (
                <div key={term.id} className={styles['term']}>
                  <dt className={styles['termLabel']}>{term.label}</dt>
                  <dd className={styles['termValue']}>{term.value}</dd>
                  <dd className={styles['termDetail']}>{term.detail}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}

        <p className={styles['priceFootnote']}>{commercialTerms.note}</p>
      </details>

      {full ? null : (
        <p className={styles['priceFootnote']}>
          <Link to={routes.services}>See how this compares to the alternatives</Link>.
        </p>
      )}
    </div>
  );
}
