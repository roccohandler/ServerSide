import { carePricing, pricing, websiteReport } from '../../../../content';
import { routes, sections } from '../../../../config/routes';
import { ButtonLink } from '@jobforge/ui';
import { Card } from '@jobforge/ui';
import { Icon } from '@jobforge/ui';
import { useInViewOnce } from '../../../../hooks/useInViewOnce';
import { track } from '../../../../lib/analytics';
import { ReportExample } from '../components/ReportExample';
import styles from './CarePlans.module.css';
import offer from '../Offer.module.css';

const HEADING_ID = 'care-heading';
const REPORT_HEADING_ID = 'report-heading';

interface CarePlansProps {
  /**
   * The rank of "what happens after launch" on the page it is rendered on. On the
   * homepage the pricing sub-headings are `h4`; on the services page they are `h3`.
   * Both pages assert their own heading outline, and a skipped level is the failure
   * those tests exist to catch.
   */
  readonly headingLevel?: 3 | 4;
  /** Which surface reported the view, so the two are separable in the numbers. */
  readonly location?: string;
}

/**
 * What happens after launch: an optional second purchase, rendered as one.
 *
 * ## The four rules it exists to hold
 *
 *   1. **The report comes first.** The monthly deliverable is rendered above the scope
 *      list, because the scope list is what makes this look like a care plan and the
 *      report is what makes it not one. The previous version opened on hosting.
 *   2. **The choice comes before the plan.** "Run it yourself" and "take Growth Partner"
 *      are presented side by side, at equal weight, before the plan's scope — because a
 *      reader who cannot see the way out does not believe the way in.
 *   3. **Visually subordinate to the project price.** Combining the two figures would
 *      make the project look more expensive than it is and the plan look compulsory
 *      when it is not.
 *   4. **Scope is grouped by cadence** — measurement, improvement, currency, the floor,
 *      on request — with the allowances stated, so nothing reads as unlimited and nothing
 *      has to be discovered in the agreement. The order of those groups is the argument;
 *      it comes from `carePricing.plan.groups` and a test asserts measurement is first.
 *
 * ## Why there is a call to action here now, when there deliberately was not
 *
 * The card used to have no button, and the reasoning was sound: a fourth identical "get my
 * free assessment" on the same screen buys nothing. This one is not that. It asks about
 * Growth Partner specifically and carries `?intent=partner` into the contact form, so a
 * reader convinced by this block does not have to re-explain what they want — which is
 * what they had to do before, having been given nowhere to go.
 */
export function CarePlans({ headingLevel = 4, location = 'home' }: CarePlansProps) {
  const Heading = `h${headingLevel}` as 'h3' | 'h4';
  /* The plan name and the two choice titles sit one rank below the block heading, so a
     screen-reader user can skip between them the way a sighted reader skips cards. */
  const PlanHeading = `h${(headingLevel + 1) as 4 | 5}` as 'h4' | 'h5';

  /*
   * Separate from `pricing_viewed`. The gap between the two is the share of readers who
   * see a price and leave before learning what happens after launch — a fact about where
   * the plan sits on the page, not about the plan.
   */
  const watchCare = useInViewOnce(() => track('growth_partner_viewed', { location }));

  const { plan } = carePricing;
  const partnerTo = `${routes.contact}?intent=partner#${sections.request}`;

  return (
    <div className={styles['care']} ref={watchCare}>
      <Heading id={HEADING_ID} className={offer['blockHeading']}>
        {carePricing.heading}
      </Heading>
      <p className={offer['blockLede']}>{carePricing.lede}</p>

      {/* The two options, at equal weight, before the plan is described. */}
      <div className={offer['careChoice']}>
        <div className={styles['careChoiceItem']}>
          <PlanHeading className={styles['careChoiceTitle']}>
            {carePricing.choice.without.title}
          </PlanHeading>
          <p className={styles['careChoiceBody']}>{carePricing.choice.without.body}</p>
        </div>
        <div className={styles['careChoiceItem']}>
          <PlanHeading className={styles['careChoiceTitle']}>
            {carePricing.choice.with.title}
          </PlanHeading>
          <p className={styles['careChoiceBody']}>{carePricing.choice.with.body}</p>
        </div>
      </div>

      {/*
       * The deliverable and its price, level with each other.
       *
       * The ordering rule this block is built on — the artefact before the scope, because a
       * reader who meets "hosting, certificates, backups" first has already priced the fee
       * as upkeep — is intact, and it costs less to keep now. Stacked, these two ran
       * 2,750px: the report went first so the fee would not read as maintenance, and then
       * the reader had to carry it through a full screen of scrolling before reaching the
       * figure it justifies. Side by side, the deliverable is simply the thing beside the
       * price.
       *
       * DOM order is unchanged, so on a phone — and to a screen reader — the report is
       * still read first, which is what the rule was protecting.
       */}
      <div className={styles['careMain']}>
        <div className={styles['report']}>
          <PlanHeading id={REPORT_HEADING_ID} className={styles['reportHeading']}>
            {websiteReport.heading}
          </PlanHeading>
          <p className={offer['blockLede']}>{websiteReport.lede}</p>

          <dl className={styles['reportContains']}>
            {websiteReport.contains.map((item) => (
              <div key={item.id} className={styles['reportContainsItem']}>
                <dt className={styles['reportContainsLabel']}>{item.label}</dt>
                <dd className={styles['reportContainsDetail']}>{item.detail}</dd>
              </div>
            ))}
          </dl>

          <ReportExample />

          <p className={styles['reportHonesty']}>
            <strong className={styles['reportHonestyHeading']}>
              {websiteReport.honesty.heading}.
            </strong>{' '}
            {websiteReport.honesty.body}
          </p>
        </div>

        <Card className={styles['carePlanCard']}>
          <PlanHeading className={styles['carePlanName']}>{plan.name}</PlanHeading>
          <p className={styles['carePlanPrice']}>{plan.price}</p>
          <p className={styles['carePlanSummary']}>{plan.summary}</p>

          {/* Scope by cadence, so "what am I paying for every month" has a literal answer. */}
          <div className={styles['carePlanGroups']}>
            {plan.groups.map((group) => (
              <div key={group.id}>
                <p className={styles['carePlanGroupLabel']}>{group.label}</p>
                <ul className={offer['priceIncludes']}>
                  {group.items.map((item) => (
                    <li key={item} className={offer['stackListItem']}>
                      <Icon name="check" size={16} className={offer['stackMarker']} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* The floor, named as the floor rather than left to be inferred from position. */}
          <p className={styles['carePlanFloor']}>{plan.floorNote}</p>

          <p className={styles['carePlanLimits']}>{plan.limits}</p>

          {/* The one promise with money attached, beside the price it belongs to. */}
          <p className={styles['carePlanGuarantee']}>{plan.guarantee}</p>

          {/*
           * The annual option, and what happens to it if you leave part-way through.
           * The discount and its refund condition travel together, on both pages.
           */}
          <p className={styles['carePlanAnnual']}>
            {pricing.annual.label}: {plan.annual} {pricing.annual.cadence}. {pricing.annual.saving}{' '}
            {pricing.annual.note}
          </p>

          {/*
           * Deliberately `secondary`. Ember is rationed to the primary action on the page,
           * and the primary action is the build — a plan that cannot be bought before the
           * website exists must not out-shout the thing that has to be bought first.
           */}
          <ButtonLink
            to={partnerTo}
            variant="secondary"
            className={styles['carePlanAction'] ?? ''}
            onClick={() => track('growth_partner_selected', { from: location })}
          >
            {carePricing.requestCta}
          </ButtonLink>
        </Card>
      </div>

      <p className={styles['careTerms']}>{carePricing.terms}</p>
      {/* The way out, printed as plainly as the way in. */}
      <p className={styles['careOptOut']}>{carePricing.optOut}</p>
    </div>
  );
}
