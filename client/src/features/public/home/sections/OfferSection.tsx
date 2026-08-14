import { Link } from 'react-router-dom';
import { included, offerStack, pricing } from '../../../../content';
import { routes, sections } from '../../../../config/routes';
import { Container, Section, SectionHeading } from '../../../../components/ui/Layout';
import { Icon } from '../../../../components/ui/Icon';
import { Reveal } from '../../../../components/ui/Reveal';
import { useInViewOnce } from '../../../../hooks/useInViewOnce';
import { track } from '../../../../lib/analytics';
import { OfferStack } from './OfferStack';
import { PricingBlock } from './PricingBlock';
import styles from '../Offer.module.css';

const HEADING_ID = 'offer-heading';
const INCLUDED_HEADING_ID = 'included-heading';
const PRICING_HEADING_ID = 'pricing-heading';

/**
 * The value stack: what the one-time build delivers, what is thrown in, and what it
 * costs — in one place, because splitting them across three sections is how a reader
 * loses the thread of what they are actually buying.
 *
 * The stack lists **build deliverables only**. The optional monthly service renders
 * inside `PricingBlock`, below the price, labelled as the separate purchase it is —
 * mixing the two lists is the confusion the offer redesign removed, and a content test
 * now enforces the separation.
 */
export function OfferSection() {
  // How far down the page people actually get. Without it, "nobody buys" and "nobody
  // reaches the price" look identical in the numbers.
  const watchPricing = useInViewOnce(() => track('pricing_viewed'));
  const watchOffer = useInViewOnce(() => track('offer_viewed'));

  return (
    <Section id={sections.offer} labelledBy={HEADING_ID} ref={watchOffer}>
      <Container>
        <SectionHeading
          id={HEADING_ID}
          eyebrow={offerStack.eyebrow}
          title={offerStack.heading}
          lede={offerStack.lede}
        />

        {/*
         * Compact here, in full on `/services`. The full version made this section 34% of
         * the homepage on its own — see the note in `OfferStack`.
         */}
        <OfferStack variant="compact" />

        <p className={styles['stackSummaryLine']}>
          {offerStack.summary}{' '}
          <Link to={routes.services}>See what each one includes, in detail</Link>.
        </p>

        {/* ------------------------------------------------ included at no extra cost */}

        <div className={styles['included']}>
          <h3 id={INCLUDED_HEADING_ID} className={styles['blockHeading']}>
            {included.heading}
          </h3>
          <p className={styles['blockLede']}>{included.lede}</p>

          <ul className={styles['includedList']}>
            {included.items.map((item) => (
              <Reveal as="li" key={item.id} className={styles['includedItem']}>
                <span className={styles['includedIcon']}>
                  <Icon name={item.icon} size={20} />
                </span>
                <div>
                  <h4 className={styles['includedTitle']}>{item.title}</h4>
                  <p className={styles['includedBody']}>{item.description}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>

        {/* ------------------------------------------------------------------ pricing */}

        <div className={styles['pricing']} ref={watchPricing}>
          <h3 id={PRICING_HEADING_ID} className={styles['blockHeading']}>
            {pricing.heading}
          </h3>
          <p className={styles['blockLede']}>{pricing.lede}</p>

          {/*
           * The whole commercial block — founding condition, the build card, the plan,
           * year-one economics, the comparison and the terms — from one shared
           * component, so this page and /services can never disagree about any of it.
           */}
          <PricingBlock blockLevel={4} location="home" depth="summary" />
        </div>
      </Container>
    </Section>
  );
}
