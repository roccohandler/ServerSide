import { Link } from 'react-router-dom';
import { pricing } from '../../../../content';
import { routes } from '../../../../config/routes';
import { CarePlans } from './CarePlans';
import { BuildCard } from './pricing/BuildCard';
import { RelationshipDiagram } from './pricing/RelationshipDiagram';
import { YearOneEconomics } from './pricing/YearOneEconomics';
import { CoverageComparison } from './pricing/CoverageComparison';
import { MarketComparison } from './pricing/MarketComparison';
import { CommercialTermsDisclosure } from './pricing/CommercialTermsDisclosure';
import type { BlockLevel } from './pricing/headingTags';
import styles from './pricing/Pricing.module.css';

interface PricingBlockProps {
  /**
   * The heading level of this block's sub-headings — the build card's name, the year-one
   * heading, the comparison heading and the terms heading.
   */
  readonly blockLevel?: BlockLevel;
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
   * comparison, the year-one figures and the "why not just charge monthly" answer were all
   * considered for this cut and all kept: each is asserted by `HomePage.test.tsx` with a
   * stated reason.
   */
  readonly depth?: 'summary' | 'full';
}

/**
 * The entire commercial block, rendered once and used by both pricing surfaces.
 *
 * ## Why one component rather than two renderings of the same content
 *
 * Because two renderings is how the last two pricing defects happened: `/services`
 * published all three founding prices with the condition only on the homepage, and priced
 * an annual plan it never described. A single component cannot disagree with itself across
 * pages.
 *
 * ## The order, and why it is this order
 *
 * The block answers nine questions, in the sequence a buyer actually asks them — and the
 * body below is those nine answers, named, in that order:
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
 * ## Two products, two actions, and no tier ladder
 *
 * The build is the primary purchase and the only one with ember on its button. Growth
 * Partner is subordinate to it and cannot be bought before a website exists.
 *
 * There were three. Conversion Fix sat beside the build as a smaller, deliberately plainer
 * card — never as a cheaper tier, because a ladder invites a reader to pick the bottom rung
 * rather than the right product. It is withdrawn (see `config/pricing.ts`), and the reader it
 * was written for is answered by the audit's `fix` branch and the entry section's middle
 * path, both of which now offer the free review the fix was always scoped from.
 */
export function PricingBlock({
  blockLevel = 4,
  location = 'home',
  depth = 'full',
}: PricingBlockProps) {
  const full = depth === 'full';

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

      {/*
       * One purchase, and the row that used to hold two.
       *
       * Conversion Fix was the second card and is withdrawn — see `config/pricing.ts`. The
       * argument that put them side by side was real and is now moot: stacked, the pair ran
       * 2,380px, so a reader met the build, scrolled a full screen of it, and arrived at the
       * alternative having lost what it was an alternative to. With one card there is nothing
       * to compare and nothing to lose.
       */}
      <div className={styles['priceCards']}>
        <BuildCard blockLevel={blockLevel} location={location} showIncludes={full} />
      </div>

      {/* The real constraint, stated as a fact about fulfilment rather than a counter. */}
      <p className={styles['capacityNote']}>
        <strong>{pricing.capacity.heading}.</strong> {pricing.capacity.body}
      </p>

      <RelationshipDiagram blockLevel={blockLevel} />

      <CarePlans headingLevel={blockLevel} location={location} />

      <YearOneEconomics blockLevel={blockLevel} />

      <CoverageComparison blockLevel={blockLevel} />

      {full ? <MarketComparison blockLevel={blockLevel} /> : null}

      <p className={styles['priceFootnote']}>{pricing.note}</p>

      <CommercialTermsDisclosure blockLevel={blockLevel} open={full} />

      {full ? null : (
        <p className={styles['priceFootnote']}>
          <Link to={routes.services}>See how this compares to the alternatives</Link>.
        </p>
      )}
    </div>
  );
}
