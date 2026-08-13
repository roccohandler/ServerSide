import { routes, sections } from '../../config/routes';
import {
  commercialTerms,
  findPageMeta,
  offerName,
  offerStack,
  pricing,
  primaryCta,
  site,
  system,
} from '../../content';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { Card, Container, Section, SectionHeading } from '../../components/ui/Layout';
import { ButtonLink } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { CtaBanner } from '../../components/marketing/CtaBanner';
import { useInViewOnce } from '../../hooks/useInViewOnce';
import { track } from '../../lib/analytics';
import { ServiceList } from './ServiceList';
import { QualificationSection } from './QualificationSection';
import { ValueSection } from '../home/sections/ValueSection';
import { LocalSearchSection } from '../home/sections/LocalSearchSection';
import { GrowthSection } from '../home/sections/GrowthSection';
import { WhatYoureBuyingSection } from '../home/sections/WhatYoureBuyingSection';
import { DifferentiatorSection } from '../home/sections/DifferentiatorSection';
import { EntrySection } from '../home/sections/EntrySection';
import { CarePlans } from '../home/sections/CarePlans';
import { FaqList } from '../faq/FaqList';
import styles from './Services.module.css';

const meta = findPageMeta(routes.services);

/**
 * The services page is the offer in depth: the same ten components the homepage
 * summarises, with the supporting detail underneath each one.
 *
 * It renders `content/offer.ts` directly, so there is no second description of the
 * service anywhere in the repository that could drift out of step with the first.
 *
 * ## The three sections that moved here from the homepage
 *
 * `ValueSection` (the eight-stage business case), `LocalSearchSection` and
 * `GrowthSection` (campaign alignment, seasonal work and testing) all used to render on
 * the homepage, where between them they restated the funnel, the ongoing service and the
 * no-rankings caveat that four other sections were already making. None of it was wrong;
 * it was depth arriving before the reader had asked for any. This is the page somebody
 * lands on once they have decided to look properly, which is where depth belongs.
 *
 * They live in `features/home/sections/` still, because that is where their styles are
 * and moving the files would be churn for no benefit. Each is surface-agnostic — borders
 * and self-contained muted panels rather than white cards — so they can sit consecutively
 * on the default band without a card disappearing into it.
 *
 * ## And the three the value-per-second pass moved here
 *
 * `WhatYoureBuyingSection`, `DifferentiatorSection` and `EntrySection`, plus the other
 * twenty-three FAQ answers. `docs/VALUE-PER-SECOND.md` §5 records why each failed the
 * test on the homepage: an equation restating a list that was already on the page, a
 * competitor comparison duplicating the management argument, and three "ways to start"
 * cards sitting directly above three pricing tiers.
 *
 * None of them is *wrong* — they are all depth, and this is where depth belongs. That
 * distinction is the whole reason this page absorbs rather than the homepage deleting.
 *
 * These three are not surface-agnostic: two paint the brand band and one paints white
 * cards on muted. They are interleaved with the default-band sections above rather than
 * appended, so no two neighbouring bands share a colour.
 */
export function ServicesPage() {
  useDocumentMeta(meta ?? { path: routes.services, title: 'Services', description: '' });

  const watchPricing = useInViewOnce(() => track('pricing_viewed', { page: 'services' }));

  return (
    <>
      <Section labelledBy="services-heading">
        <Container>
          {/* The page's own <h1>; component names below are h3 under it. */}
          <SectionHeading
            id="services-heading"
            level={1}
            eyebrow={offerName}
            title="What is included, and what keeps happening"
            lede={`${system.lede} Everything below is work I do myself for service businesses in ${site.serviceArea.label}.`}
          />

          {/* Level 2: this list is directly under the page's own h1, with no section
              heading between them. See the note on `headingLevel`. */}
          <ServiceList headingLevel={2} />

          <p className={styles['footnote']}>
            {offerStack.summary} Not sure which parts your business actually needs? That is what the
            free website assessment is for — send me what you have now and I will tell you which
            parts are worth paying for and which are not.
          </p>
        </Container>
      </Section>

      {/* The ten components above, summed. Brand band, so it breaks the default run. */}
      <WhatYoureBuyingSection />

      {/*
       * The depth, in the order somebody researching actually wants it: why a website is
       * worth anything at all, how being found works, and what the ongoing half of the
       * service does month to month.
       */}
      <ValueSection />
      <LocalSearchSection />
      <GrowthSection />

      {/* Which of the three situations the reader is in, and what each one costs. */}
      <EntrySection />

      {/* And why any of it is monthly rather than a project with an end date. */}
      <DifferentiatorSection />

      {/*
       * Who this is built for, and what to do if that is not you yet. It sits between the
       * description of the work and the price, which is where somebody starts asking the
       * commercial question — and it is a recommendation, never a rejection.
       *
       * It is also the page's only muted band, which makes it the visual break before the
       * price.
       */}
      <QualificationSection />

      {/*
       * Pricing, repeated in full rather than linked back to the homepage.
       *
       * This is the page somebody lands on from a search for what a managed website
       * costs, and sending them somewhere else to find the number is the most reliable
       * way to lose them. Both the figures and the terms come from `content/offer.ts`,
       * so the two pages cannot disagree.
       */}
      {/*
       * `id={sections.offer}` because the audit links here.
       *
       * The assessment's recommendation sends the reader to `/services#offer`, and nothing
       * on this page rendered that anchor — so the most important link in the funnel landed
       * them at the top of a long page and left them to find the pricing themselves. The
       * homepage renders the same id on its offer section; anchors are per-page, so both
       * are correct and `outline.test.tsx` now checks every cross-page anchor resolves.
       */}
      <Section id={sections.offer} labelledBy="services-pricing-heading" ref={watchPricing}>
        <Container>
          <SectionHeading
            id="services-pricing-heading"
            eyebrow={pricing.eyebrow}
            title={pricing.heading}
            lede={pricing.lede}
          />

          {/*
           * The founding-client offer, stated above the tiers on this page as well.
           *
           * Not a duplicate for its own sake: these three figures *are* the founding
           * prices, and this page publishes them to somebody who arrived from a search for
           * what a managed website costs. Printing a conditional price without its
           * condition is the same defect as a former-price claim, reached from the other
           * side — the reader forms a belief about what this costs before being told what
           * makes it cost that. Same strings, same config flag, so switching the offer off
           * removes it from both pages at once.
           */}
          {pricing.founding.enabled ? (
            <div className={styles['founding']}>
              <p className={styles['foundingLabel']}>{pricing.founding.label}</p>
              <p className={styles['foundingBody']}>{pricing.founding.body}</p>
              <p className={styles['foundingRemaining']}>{pricing.founding.remainingLabel}</p>
            </div>
          ) : null}

          <ul className={styles['priceList']}>
            {pricing.tiers.map((tier) => (
              <li key={tier.id} className={styles['priceItem']}>
                <Card
                  className={`${styles['priceCard']} ${tier.emphasis ? styles['priceCardEmphasis'] : ''}`}
                >
                  <p className={styles['priceCadence']}>{tier.cadence}</p>
                  {tier.emphasis ? (
                    <p className={styles['priceBadge']}>Most businesses need this</p>
                  ) : null}
                  <h3 className={styles['priceName']}>{tier.name}</h3>

                  {/* Labelled, never struck through — see the note above `pricing` in
                      content/offer.ts, and the test that bans the markup. */}
                  {tier.hasDiscount ? (
                    <p className={styles['priceStandard']}>
                      <span className={styles['priceStandardLabel']}>
                        {pricing.founding.standardLabel}
                      </span>
                      <span className={styles['priceStandardValue']}>{tier.standardPrice}</span>
                    </p>
                  ) : null}

                  <p className={styles['priceValue']}>{tier.price}</p>

                  {tier.hasDiscount ? (
                    <p className={styles['priceSaving']}>
                      {pricing.founding.savingLabel} {tier.saving}
                    </p>
                  ) : null}

                  <p className={styles['priceNote']}>{tier.priceNote}</p>
                  <p className={styles['priceSummary']}>{tier.summary}</p>

                  <ul className={styles['priceIncludes']}>
                    {tier.includes.map((item) => (
                      <li key={item} className={styles['priceIncludesItem']}>
                        <Icon name="check" size={16} className={styles['priceMarker']} />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>

                  {tier.terms ? <p className={styles['priceTerms']}>{tier.terms}</p> : null}
                </Card>
              </li>
            ))}
          </ul>

          {/*
           * What happens after launch, in full rather than as a stray annual figure.
           *
           * This was one paragraph — "Or pay annually: $2,990 per year" — sitting directly
           * beneath the three project tiers on a page that never showed the monthly plan it
           * belonged to. The most natural reading was that it was an annual alternative to
           * the project, which it is not. Same component as the homepage now, so the
           * recurring half of the offer is described identically on both.
           */}
          <CarePlans headingLevel={3} location="services" />

          <dl className={styles['termsList']}>
            {commercialTerms.items.map((term) => (
              <div key={term.id} className={styles['term']}>
                <dt className={styles['termLabel']}>{term.label}</dt>
                <dd className={styles['termValue']}>{term.value}</dd>
              </div>
            ))}
          </dl>

          <p className={styles['footnote']}>{pricing.note}</p>

          <p className={styles['priceAction']}>
            <ButtonLink
              to={primaryCta.to}
              onClick={() => track('cta_clicked', { location: 'services-pricing' })}
            >
              {primaryCta.label}
            </ButtonLink>
          </p>
        </Container>
      </Section>

      {/*
       * All thirty-one questions, in full.
       *
       * The homepage carries eight and links here for the rest. Both lists come from the
       * same `faqItems`, so the overlap is the first eight rather than a second set of
       * answers somebody has to keep in step — and this is the page a reader is on when
       * they have stopped skimming and started checking.
       */}
      <Section tone="muted" labelledBy="services-faq-heading">
        <Container>
          <SectionHeading
            id="services-faq-heading"
            eyebrow="Questions"
            title="Everything people ask"
            lede="The whole list, including the ones that only come up once somebody is seriously considering it. If yours is not here, ask it directly."
          />
          <FaqList />
        </Container>
      </Section>

      <CtaBanner
        heading="Tell me what you are working with"
        body="Send your website address, or just describe the business. I will come back with what I would do first, what it would cost to build, and what it would cost to keep it looked after."
      />
    </>
  );
}
