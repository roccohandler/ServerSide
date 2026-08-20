import { pricing, primaryCta } from '../../../../../content';
import { flagship } from '../../../../../config/pricing';
import { routes, sections } from '../../../../../config/routes';
import { Card } from '@jobforge/ui';
import { ButtonLink } from '@jobforge/ui';
import { Icon } from '@jobforge/ui';
import { track, type CtaLocation } from '../../../../../lib/analytics';
import { headingTags, type BlockLevel } from './headingTags';
import styles from './Pricing.module.css';
import offer from '../../Offer.module.css';

interface BuildCardProps {
  readonly blockLevel: BlockLevel;
  readonly location: PricingSurface;
  /** `false` on the homepage, where the offer stack already prints the expansion. */
  readonly showIncludes: boolean;
}

/** The three surfaces that render a price. Exported so all of them name the same set. */
export type PricingSurface = 'home' | 'services' | 'pricing';

/**
 * Which `cta_clicked` location each surface reports.
 *
 * A lookup rather than the ternary this used to be. Two surfaces are a ternary; three are a
 * ternary with a default, and a default is where the third surface silently reports as the
 * first — which is indistinguishable in a report from the third surface not existing.
 */
const CTA_LOCATIONS: Readonly<Record<PricingSurface, CtaLocation>> = {
  home: 'pricing',
  services: 'services-pricing',
  pricing: 'pricing-page',
};

/**
 * The primary purchase: the whole website build.
 *
 * The only card on the page with a shadow and an ember button. That used to be what stopped
 * a row of two cards reading as a tier ladder; Conversion Fix is withdrawn and there is one
 * card, so the emphasis now says only that this is the thing being sold.
 */
export function BuildCard({ blockLevel, location, showIncludes }: BuildCardProps) {
  const { Heading } = headingTags(blockLevel);
  const build = pricing.build;
  const requestTo = `${routes.contact}?intent=build#${sections.request}`;

  return (
    <div className={styles['buildCard']}>
      <Card className={styles['priceCard']}>
        <p className={styles['priceCadence']}>{build.cadence}</p>
        <Heading className={styles['priceName']}>{build.name}</Heading>

        {/*
         * The outcome, before the number.
         *
         * A reader who meets the figure first has nothing to weigh it against except their
         * own budget. One sentence saying what the money is for costs a line and changes
         * what the number is compared with.
         */}
        <p className={styles['priceStatement']}>{build.statement}</p>

        {/*
         * The standard price, above the price actually being asked for and a great deal
         * smaller than it. **No strike-through, and the label is not optional.** This
         * business has never charged the standard price, so striking it out would be a
         * former-price claim made with CSS — see 16 CFR 233.1 notes in config/pricing.ts.
         */}
        {build.hasDiscount ? (
          <p className={styles['priceStandard']}>
            <span className={styles['priceStandardLabel']}>{pricing.founding.standardLabel}</span>
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
         * A reader convinced by the figure should not have to scroll past fifteen bullet
         * points to act, and a reader who needs the bullet points has not been deprived of
         * them — they are immediately below, and the action repeats nowhere because one
         * card with two identical buttons is a card that has not decided.
         */}
        <div className={styles['buildActions']}>
          <ButtonLink
            to={requestTo}
            size="lg"
            onClick={() => track('pricing_tier_selected', { tier: flagship.id, from: location })}
          >
            {pricing.requestCta}
          </ButtonLink>
          <ButtonLink
            to={primaryCta.to}
            variant="secondary"
            onClick={() => track('cta_clicked', { location: CTA_LOCATIONS[location] })}
          >
            {primaryCta.label}
          </ButtonLink>
        </div>

        {/*
         * The five things that answer "what am I signing up for" before the list of
         * deliverables answers "what do I get". Effort and risk, not features: the copy is
         * written, the accounts are yours, there are revisions, there is a month of fixes,
         * and it does not launch until it passes.
         */}
        <ul className={styles['priceReassure']}>
          {pricing.reassurance.map((item) => (
            <li key={item} className={styles['priceReassureItem']}>
              <Icon name="check" size={16} className={offer['stackMarker']} />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <p className={styles['priceSummary']}>{build.summary}</p>

        {/*
         * The deliverable list, on the depth page only.
         *
         * `build.includes` is literally `buildOutcomes.flatMap(o => o.includes)` — the same
         * seven promises the offer stack renders, expanded one level. On the homepage that
         * stack sits about 600px directly above this card, in this section, so printing the
         * expansion here was the same information twice with a price between the two
         * copies. The stack keeps it; the card points at it.
         *
         * `/services` renders the stack in a different section from the price, so there the
         * card still carries its own list.
         */}
        {showIncludes ? (
          <ul className={offer['priceIncludes']}>
            {build.includes.map((item) => (
              <li key={item} className={offer['stackListItem']}>
                <Icon name="check" size={16} className={offer['stackMarker']} />
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
  );
}
