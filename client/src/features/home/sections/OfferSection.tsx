import { commercialTerms, included, offerStack, pricing, primaryCta } from '../../../content';
import { sections } from '../../../config/routes';
import { Card, Container, Grid, Section, SectionHeading } from '../../../components/ui/Layout';
import { ButtonLink } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';
import { Reveal } from '../../../components/ui/Reveal';
import { useInViewOnce } from '../../../hooks/useInViewOnce';
import { track } from '../../../lib/analytics';
import { isPlaceholder } from '../../../lib/placeholders';
import { CarePlans } from './CarePlans';
import styles from '../Offer.module.css';

const HEADING_ID = 'offer-heading';
const INCLUDED_HEADING_ID = 'included-heading';
const PRICING_HEADING_ID = 'pricing-heading';
const TERMS_HEADING_ID = 'terms-heading';

/**
 * The value stack: what is delivered, what is thrown in, and what it costs — in one
 * place, because splitting them across three sections is how a reader loses the thread
 * of what they are actually buying.
 *
 * Prices degrade honestly. While `price` is still a `[PLACEHOLDER]` the card shows
 * `pricing.unsetLabel` instead, so an undecided number can never be published as a
 * figure and can never be published as a broken-looking token either. Same rule the
 * phone number and the structured data already follow.
 */
export function OfferSection() {
  const hasPricingNote = !isPlaceholder(pricing.note);

  // How far down the page people actually get. Without it, "nobody buys" and "nobody
  // reaches the price" look identical in the numbers.
  const watchPricing = useInViewOnce(() => track('pricing_viewed'));
  const watchOffer = useInViewOnce(() => track('offer_viewed'));
  /* `care_plans_viewed` moved into `CarePlans` with the block it measures, so both pages
     that render the plans report reaching them. */

  return (
    // Muted rather than default since `EntrySection` left the homepage — it carried the
    // alternation between the exit terms and this block. The pricing cards gain from it:
    // they are `--color-surface` and were relying on their borders alone to separate them
    // from a white band.
    <Section id={sections.offer} tone="muted" labelledBy={HEADING_ID} ref={watchOffer}>
      <Container>
        <SectionHeading
          id={HEADING_ID}
          eyebrow={offerStack.eyebrow}
          title={offerStack.heading}
          lede={offerStack.lede}
        />

        <Grid as="ul" columns={2}>
          {offerStack.groups.map((group) => (
            <Reveal as="li" key={group.id} className={styles['careItem']}>
              <Card className={styles['stackCard']}>
                <div className={styles['stackHead']}>
                  <span className={styles['stackStep']} aria-hidden="true">
                    {group.step}
                  </span>
                  <span className={styles['stackIcon']}>
                    <Icon name={group.icon} size={22} />
                  </span>
                </div>

                <h3 className={styles['stackName']}>{group.name}</h3>

                {/*
                 * Outcome, then mechanism, then deliverables — in that order.
                 *
                 * `whyItMatters` used to sit underneath the bullet list, which made every
                 * card read as an invoice with a justification stapled to the bottom. It
                 * is the only line in the card written in the owner's terms rather than
                 * in the supplier's, so it goes directly under the name, and the list of
                 * what actually gets built follows as the evidence for it.
                 */}
                <p className={styles['stackWhy']}>
                  <span className={styles['stackWhyLabel']}>What this is for</span>
                  {group.whyItMatters}
                </p>

                <p className={styles['stackSummary']}>{group.summary}</p>

                <ul className={styles['stackList']}>
                  {group.includes.map((item) => (
                    <li key={item} className={styles['stackListItem']}>
                      <Icon name="check" size={16} className={styles['stackMarker']} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </Reveal>
          ))}
        </Grid>

        <p className={styles['stackSummaryLine']}>{offerStack.summary}</p>

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
           * The founding-client offer, stated once, above the tiers it applies to.
           *
           * It is here rather than repeated on each card because it is one offer with one
           * condition — printing it three times would read as three separate discounts,
           * and the condition is the part that makes any of it truthful.
           */}
          {pricing.founding.enabled ? (
            <div className={styles['founding']}>
              <p className={styles['foundingLabel']}>{pricing.founding.label}</p>
              <p className={styles['foundingBody']}>{pricing.founding.body}</p>
              <p className={styles['foundingRemaining']}>{pricing.founding.remainingLabel}</p>
            </div>
          ) : null}

          <ul className={styles['priceList']}>
            {pricing.tiers.map((tier) => {
              const isPriceSet = !isPlaceholder(tier.price);
              const showsDiscount = isPriceSet && tier.hasDiscount === true;

              return (
                <Reveal as="li" key={tier.id} className={styles['priceItem']}>
                  <Card
                    className={`${styles['priceCard']} ${tier.emphasis ? styles['priceCardEmphasis'] : ''}`}
                  >
                    <p className={styles['priceCadence']}>{tier.cadence}</p>
                    {tier.emphasis ? (
                      <p className={styles['priceBadge']}>Most businesses need this</p>
                    ) : null}
                    <h4 className={styles['priceName']}>{tier.name}</h4>

                    {/*
                     * The standard price, above the price that is actually being asked for
                     * and a great deal smaller than it.
                     *
                     * **No strike-through, and the label is not optional.** This business
                     * has never charged the standard price, so presenting it as struck out
                     * would be a former-price claim made with CSS — the exact thing 16 CFR
                     * 233.1 is about. Labelled, it reads as what it is: the other price
                     * that exists, for anybody who does not want the condition attached.
                     */}
                    {showsDiscount ? (
                      <p className={styles['priceStandard']}>
                        <span className={styles['priceStandardLabel']}>
                          {pricing.founding.standardLabel}
                        </span>
                        <span className={styles['priceStandardValue']}>{tier.standardPrice}</span>
                      </p>
                    ) : null}

                    <p className={styles['priceValue']}>
                      {isPriceSet ? tier.price : pricing.unsetLabel}
                    </p>

                    {showsDiscount ? (
                      <p className={styles['priceSaving']}>
                        {pricing.founding.savingLabel} {tier.saving}
                      </p>
                    ) : null}

                    <p className={styles['priceNote']}>
                      {isPriceSet ? tier.priceNote : pricing.unsetNote}
                    </p>

                    <p className={styles['priceSummary']}>{tier.summary}</p>

                    <ul className={styles['priceIncludes']}>
                      {tier.includes.map((item) => (
                        <li key={item} className={styles['stackListItem']}>
                          <Icon name="check" size={16} className={styles['stackMarker']} />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>

                    {/*
                     * The qualifying line sits with the price rather than in a footnote.
                     * A minimum term a reader has to scroll to find is a minimum term they
                     * will feel they were not told about.
                     */}
                    {tier.terms ? <p className={styles['priceTerms']}>{tier.terms}</p> : null}

                    {/*
                     * One action per tier, all three going to the same place.
                     *
                     * The destination is the assessment, not a checkout — nobody decides
                     * to spend four thousand dollars from a pricing card. What the button
                     * buys is knowing which tier they actually need, which is also the
                     * honest answer to the question the card just raised.
                     *
                     * The tier travels with the event because "which one do people reach
                     * for" is unanswerable from a single `cta_clicked`, and it is the only
                     * question three tiers exist to answer.
                     */}
                    <div className={styles['priceCardAction']}>
                      <ButtonLink
                        to={primaryCta.to}
                        variant={tier.emphasis ? 'primary' : 'secondary'}
                        block
                        onClick={() => track('pricing_tier_selected', { tier: tier.id })}
                      >
                        {primaryCta.label}
                      </ButtonLink>
                    </div>
                  </Card>
                </Reveal>
              );
            })}
          </ul>

          {hasPricingNote ? <p className={styles['priceFootnote']}>{pricing.note}</p> : null}

          {/*
           * What happens after launch: a separate decision, rendered as one — and rendered
           * from a component, because the services page needs exactly the same block and
           * for a while had a bare annual figure instead. See `CarePlans`.
           */}
          <CarePlans headingLevel={4} />

          <div className={styles['priceAction']}>
            <ButtonLink
              to={primaryCta.to}
              onClick={() => track('cta_clicked', { location: 'pricing' })}
            >
              {primaryCta.label}
            </ButtonLink>
          </div>
        </div>

        {/* ------------------------------------------------------------------ terms */}

        <div className={styles['terms']}>
          <h3 id={TERMS_HEADING_ID} className={styles['blockHeading']}>
            {commercialTerms.heading}
          </h3>
          <p className={styles['blockLede']}>{commercialTerms.lede}</p>

          <dl className={styles['termsList']}>
            {commercialTerms.items.map((term) => (
              <Reveal key={term.id} className={styles['term']}>
                <dt className={styles['termLabel']}>{term.label}</dt>
                <dd className={styles['termValue']}>{term.value}</dd>
                <dd className={styles['termDetail']}>{term.detail}</dd>
              </Reveal>
            ))}
          </dl>

          <p className={styles['priceFootnote']}>{commercialTerms.note}</p>
        </div>
      </Container>
    </Section>
  );
}
