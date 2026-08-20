import { Link } from 'react-router-dom';
import { ButtonLink, Card, Container, Icon, Section, SectionHeading } from '@jobforge/ui';
import { routes } from '../../../config/routes';
import { findPageMeta } from '../../../content';
import { pricingPage } from '../../../content/pricingPage';
import { useDocumentMeta } from '../../../hooks/useDocumentMeta';
import { useInViewOnce } from '../../../hooks/useInViewOnce';
import { track } from '../../../lib/analytics';
import { PricingBlock } from '../home';
import styles from './Pricing.module.css';

const meta = findPageMeta(routes.pricing);

/*
 * ============================================================================
 * `/pricing`
 * ============================================================================
 *
 * The page a price-shopper types, and the one this site has been promising in writing since
 * before it existed: a follow-up email sent to every prospect who goes quiet tells them "the
 * pricing page says what it costs".
 *
 * ## What is here, and what is borrowed
 *
 * The offer itself — both figures, the founding condition, the deliverables, the plan, the
 * year-one economics, the market comparison and the published commercial terms — is
 * `PricingBlock`, rendered at full depth. It is the same component the homepage and
 * `/services` render, which is the whole point: three surfaces stating one price, from one
 * source, unable to disagree. The last two pricing defects in this repository were both two
 * renderings drifting apart.
 *
 * What is *only* here is the half those surfaces have no business carrying:
 *
 *   - **Ownership**, as a block rather than a bullet. The most common bad experience this
 *     market has had with a web developer is discovering at the exit that they did not own
 *     the domain.
 *   - **How paying works** — refunds, what a revision round is, what "finished" means, and
 *     what happens when either side goes quiet. Five clauses, each linking to the term it
 *     summarises, because a summary of a term is not the term.
 *   - **The objections**, including the one that tells some readers not to buy.
 *
 * ## Why the order is this order
 *
 * Ownership comes *before* the money. "What do I end up owning" is the question that decides
 * whether the price is worth weighing at all, and a reader who has not answered it reads
 * every figure below as rent.
 *
 * ## `lazy()` and the budget
 *
 * This route is dynamically imported from `app/routes/marketingRoutes.tsx`, and
 * `content/pricingPage.ts` is deliberately absent from the content barrel. Routing the import
 * through this feature's index or exporting its content from `content/index.ts` would put the
 * page in the chunk every visitor to the homepage downloads — see `scripts/check-budget.ts`
 * and the note at the bottom of `content/index.ts`.
 * ============================================================================
 */
export function PricingPage() {
  /*
   * The `??` is the house pattern — every page here has one. `findPageMeta` returns
   * `undefined` for a route with no entry in `content/pages.ts`, which `content.test.ts`
   * already fails the build over, so the fallback is unreachable by construction and exists
   * only to satisfy the type.
   */
  useDocumentMeta(meta ?? { path: routes.pricing, title: 'Pricing', description: '' });

  /*
   * The price block reaching the viewport, reported from this page specifically.
   *
   * It shares `pricing_viewed` with the homepage and `/services` rather than getting a name of
   * its own — the question the event answers is "how many readers reach a price", and three
   * names would make that a sum across three columns instead of a count. `location` separates
   * them where the separation matters, which is what a value-carrying event is shaped for.
   */
  const watchPricing = useInViewOnce(() => track('pricing_viewed', { location: 'pricing-page' }));

  return (
    <>
      <Section labelledBy="pricing-heading">
        <Container>
          <SectionHeading
            id="pricing-heading"
            level={1}
            eyebrow={pricingPage.eyebrow}
            title={pricingPage.heading}
            lede={pricingPage.lede}
          />

          {/*
           * The tax line, beside the price rather than beneath it in a footnote.
           *
           * A cost that appears for the first time at checkout is the surprise that ends the
           * most sales, and this one is roughly a tenth of the figure. Saying it here costs a
           * sentence. The rate is not stated because it depends on the reader's own address —
           * see DECISION 037.
           */}
          <p className={styles['taxNote']}>
            <span className={styles['taxLabel']}>{pricingPage.tax.label}</span>
            {pricingPage.tax.detail}
          </p>
        </Container>
      </Section>

      <Section labelledBy="pricing-ownership-heading" tone="muted">
        <Container>
          <SectionHeading
            id="pricing-ownership-heading"
            level={2}
            title={pricingPage.ownership.heading}
            lede={pricingPage.ownership.lede}
          />

          <ul className={styles['ownershipList']}>
            {pricingPage.ownership.items.map((item) => (
              <li key={item.id} className={styles['ownershipItem']}>
                <Icon name="shield" size={20} className={styles['ownershipIcon'] ?? ''} />
                <div>
                  <p className={styles['ownershipTitle']}>{item.title}</p>
                  <p className={styles['ownershipDetail']}>{item.detail}</p>
                </div>
              </li>
            ))}
          </ul>

          <p className={styles['ownershipClosing']}>{pricingPage.ownership.closing}</p>
        </Container>
      </Section>

      <Section labelledBy="pricing-offer-heading">
        <Container>
          <div ref={watchPricing}>
            <SectionHeading id="pricing-offer-heading" level={2} title="The two prices" />
            <PricingBlock blockLevel={3} location="pricing" depth="full" />
          </div>
        </Container>
      </Section>

      <Section labelledBy="pricing-terms-heading" tone="muted">
        <Container>
          <SectionHeading
            id="pricing-terms-heading"
            level={2}
            eyebrow={pricingPage.howPayingWorks.eyebrow}
            title={pricingPage.howPayingWorks.heading}
            lede={pricingPage.howPayingWorks.lede}
          />

          <div className={styles['termsGrid']}>
            {pricingPage.howPayingWorks.items.map((item) => (
              <Card key={item.id} className={styles['termCard']}>
                <h3 className={styles['termQuestion']}>{item.question}</h3>
                <p className={styles['termAnswer']}>{item.answer}</p>
                {/*
                 * Into the clause, not onto the page. A reader sent to the top of a terms
                 * page with fourteen sections has been told to go and find it.
                 */}
                <Link to={`${routes.terms}#${item.termsAnchor}`} className={styles['termLink']}>
                  Read the term itself
                </Link>
              </Card>
            ))}
          </div>

          <p className={styles['termsFootnote']}>{pricingPage.howPayingWorks.footnote}</p>
        </Container>
      </Section>

      <Section labelledBy="pricing-objections-heading">
        <Container narrow>
          <SectionHeading
            id="pricing-objections-heading"
            level={2}
            title={pricingPage.objections.heading}
          />

          <dl className={styles['objections']}>
            {pricingPage.objections.items.map((item) => (
              <div key={item.id} className={styles['objection']}>
                <dt className={styles['objectionQuestion']}>{item.objection}</dt>
                <dd className={styles['objectionAnswer']}>{item.answer}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </Section>

      <Section labelledBy="pricing-close-heading" tone="muted">
        <Container narrow>
          <SectionHeading
            id="pricing-close-heading"
            level={2}
            title={pricingPage.close.heading}
            lede={pricingPage.close.lede}
          />

          {/*
           * Two actions for two readers, and only one wears the accent.
           *
           * A page that has just published a price produces more people who have decided than
           * any other on this site, and handing them a free assessment they have already moved
           * past is the funnel forgetting who it is talking to. So the direct route is here and
           * it carries `?intent=build`. It is still the secondary button, because ember is
           * rationed to the one primary action across the whole site.
           */}
          <div className={styles['closeActions']}>
            <div className={styles['closeAction']}>
              <ButtonLink
                to={pricingPage.close.primary.to}
                size="lg"
                onClick={() => track('cta_clicked', { location: 'pricing-page' })}
              >
                {pricingPage.close.primary.label}
              </ButtonLink>
              <p className={styles['closeNote']}>{pricingPage.close.primary.note}</p>
            </div>

            <div className={styles['closeAction']}>
              <ButtonLink
                to={pricingPage.close.secondary.to}
                variant="secondary"
                size="lg"
                onClick={() => track('cta_clicked', { location: 'pricing-page-build' })}
              >
                {pricingPage.close.secondary.label}
              </ButtonLink>
              <p className={styles['closeNote']}>{pricingPage.close.secondary.note}</p>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
