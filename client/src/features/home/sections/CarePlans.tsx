import { carePricing, pricing } from '../../../content';
import { Card } from '../../../components/ui/Layout';
import { Icon } from '../../../components/ui/Icon';
import { useInViewOnce } from '../../../hooks/useInViewOnce';
import { track } from '../../../lib/analytics';
import styles from '../Offer.module.css';

const HEADING_ID = 'care-heading';

interface CarePlansProps {
  /**
   * The rank of "What happens after launch" on the page it is rendered on.
   *
   * A property of where the block sits rather than a style choice: on the homepage the
   * pricing sub-heading is already an `h3`, so this is an `h4`; on the services page the
   * tier names are `h3` and this sits beside them. Both pages assert their own heading
   * outline, and a skipped level is the failure those tests exist to catch.
   */
  readonly headingLevel?: 3 | 4;
  /** Which surface reported the view, so the two are separable in the numbers. */
  readonly location?: string;
}

/**
 * What happens after launch: a second purchase, made after the first one, rendered as one.
 *
 * ## Why this is a component rather than JSX inside the offer section
 *
 * Because it was JSX inside the offer section, and the services page — the page somebody
 * lands on from a search for what a managed website costs — consequently priced the
 * *annual prepay* of a plan whose monthly price it never showed. A bare "Or pay annually:
 * $2,990 per year" sat directly beneath three project tiers, where the most natural reading
 * is that it is an annual alternative to the project. It was not; it is the recurring plan,
 * which the page described everywhere except in its own pricing section.
 *
 * ## The two rules it exists to hold
 *
 *   1. **Visually subordinate to the project prices.** Combining them into one figure would
 *      make the project look more expensive than it is and the plan look compulsory when it
 *      is not.
 *   2. **The way out is printed as plainly as the way in.** `carePricing.optOut` says you
 *      can take the project and stop, on the page, rather than in an email afterwards.
 */
export function CarePlans({ headingLevel = 4, location = 'home' }: CarePlansProps) {
  const Heading = `h${headingLevel}` as const;
  /* The plans are headings, one rank below the block they sit in, so a screen-reader user
     can skip between them the way a sighted reader skips between the cards. */
  const PlanHeading = `h${(headingLevel + 1) as 4 | 5}` as const;

  /*
   * Separate from `pricing_viewed`. The gap between the two is the share of readers who see
   * a price and leave before learning what happens after launch — a fact about where the
   * plan sits on the page, not about the plan.
   */
  const watchCare = useInViewOnce(() => track('care_plans_viewed', { location }));

  return (
    <div className={styles['care']} ref={watchCare}>
      <Heading id={HEADING_ID} className={styles['blockHeading']}>
        {carePricing.heading}
      </Heading>
      <p className={styles['blockLede']}>{carePricing.lede}</p>

      <ul className={styles['carePlanList']}>
        {carePricing.plans.map((plan) => (
          <li key={plan.id} className={styles['carePlanItem']}>
            <Card
              className={`${styles['carePlanCard']} ${plan.emphasis ? styles['priceCardEmphasis'] : ''}`}
            >
              <PlanHeading className={styles['carePlanName']}>{plan.name}</PlanHeading>
              <p className={styles['carePlanPrice']}>{plan.price}</p>
              <p className={styles['carePlanSummary']}>{plan.summary}</p>

              <ul className={styles['priceIncludes']}>
                {plan.includes.map((item) => (
                  <li key={item} className={styles['stackListItem']}>
                    <Icon name="check" size={16} className={styles['stackMarker']} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              {/*
               * The annual option, and what happens to it if you leave part-way through.
               *
               * The refund term used to be published only on the services page, in a
               * paragraph beneath the project tiers — which is to say the discount was
               * offered in one place and its condition explained in another. They travel
               * together now, on both pages.
               */}
              {plan.annual ? (
                <p className={styles['carePlanAnnual']}>
                  {pricing.annual.label}: {plan.annual} {pricing.annual.cadence}.{' '}
                  {pricing.annual.saving} {pricing.annual.note}
                </p>
              ) : null}
            </Card>
          </li>
        ))}
      </ul>

      <p className={styles['careTerms']}>{carePricing.terms}</p>
      {/* The way out, printed as plainly as the way in. */}
      <p className={styles['careOptOut']}>{carePricing.optOut}</p>
    </div>
  );
}
