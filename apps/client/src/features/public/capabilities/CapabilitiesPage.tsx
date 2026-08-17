import { useSearchParams } from 'react-router-dom';
import { findPageMeta } from '../../../content';
import { capabilities, capabilityPage } from './content/capabilities';
import { isTradeSlug } from '../../../config/trades';
import { routes } from '../../../config/routes';
import { useDocumentMeta } from '../../../hooks/useDocumentMeta';
import { useInViewOnce } from '../../../hooks/useInViewOnce';
import { countByAvailability } from './utils/capabilityMatch';
import { track } from '../../../lib/analytics';
import { Container, Section, SectionHeading } from '@jobforge/ui';
import { CtaBanner } from '../../../components/marketing/CtaBanner';
import { LifecycleDiagram } from './LifecycleDiagram';
import { CapabilityExplorer } from './CapabilityExplorer';
import { IntegrationList } from './IntegrationList';
import styles from './Capabilities.module.css';

const meta = findPageMeta(routes.capabilities);

const HERO_HEADING_ID = 'capabilities-heading';
const HONESTY_HEADING_ID = 'capabilities-honesty-heading';
const CLOSING_HEADING_ID = 'capabilities-closing-heading';

/**
 * What a website can do for a local service business — the whole library, labelled.
 *
 * ## What this page is for, and what it deliberately is not
 *
 * It is not a second pitch. `/services` sells the offer and `/` summarises it; both are
 * written for somebody deciding whether to buy. This is for the reader one step past that,
 * asking what is *possible* — and the honest answer to that question includes things this
 * business does not sell, which is precisely why it cannot live inside the offer.
 *
 * ## The section order, which is the argument
 *
 *   1. **The hero**, stating in its lede that every entry carries a status.
 *   2. **The honesty block**, with the four statuses and the counts. Second, not last: a
 *      reader who discovers on the way out that a third of what they just read is not
 *      purchasable has been misled by the ordering even though every badge was accurate.
 *   3. **The lifecycle**, because it is the frame everything else sits in — and because it
 *      is where the page says out loud that a website owns four of eight stages.
 *   4. **The explorer**, with the trade chooser above it so the recommendation is already
 *      personal by the time the library appears.
 *   5. **The integrations**, after the capabilities they serve. A logo wall up front would
 *      be the implication this page exists not to make.
 *   6. **The closing**, which sends the reader at the free assessment rather than at a
 *      price. Somebody who has read forty capabilities has questions about their own site.
 *
 * ## The counts are computed, not written
 *
 * "Nine in the build, seven in the plan, eleven quoted separately, six you cannot buy" is
 * exactly the sort of sentence that is true on the day it is typed and wrong two commits
 * later. `countByAvailability` derives it from the library on every render, so it cannot
 * drift — and `capabilities.test.ts` asserts the honesty copy does not restate any of the
 * numbers in prose.
 */
export function CapabilitiesPage() {
  useDocumentMeta(
    meta ?? { path: routes.capabilities, title: capabilityPage.heading, description: '' },
  );

  const [searchParams] = useSearchParams();

  /*
   * Validated against the closed union rather than trusted, exactly as `/audit` does with the
   * same parameter. `?trade=` arrives from the industry pages, and a URL is not a promise —
   * an unknown value produces no preselection rather than a broken filter.
   */
  const requested = searchParams.get('trade');
  const initialTrade = requested !== null && isTradeSlug(requested) ? requested : null;

  const watchPage = useInViewOnce(() =>
    track('capabilities_viewed', { trade: initialTrade ?? 'none' }),
  );

  const counts = countByAvailability(capabilities);

  return (
    <>
      <Section ref={watchPage} labelledBy={HERO_HEADING_ID}>
        <Container narrow>
          <SectionHeading
            id={HERO_HEADING_ID}
            eyebrow={capabilityPage.eyebrow}
            title={capabilityPage.heading}
            lede={capabilityPage.lede}
            level={1}
          />
        </Container>
      </Section>

      {/* ------------------------------------------------------------ read the labels */}

      <Section tone="brand" labelledBy={HONESTY_HEADING_ID}>
        <Container narrow>
          <h2 id={HONESTY_HEADING_ID} className={styles['honestyHeading']}>
            {capabilityPage.honesty.heading}
          </h2>
          <p className={styles['honestyBody']}>{capabilityPage.honesty.body}</p>

          <ul className={styles['honestyKeys']}>
            {capabilityPage.honesty.keys.map((key) => (
              <li key={key}>{key}</li>
            ))}
          </ul>

          {/*
           * The counts, derived. Four numbers rather than five: `roadmap` and `not-offered`
           * are one number to a reader, because the only thing they need from both is that
           * they cannot have it today.
           */}
          <dl className={styles['counts']}>
            <div>
              <dt>In the build</dt>
              <dd>{counts.includedInBuild}</dd>
            </div>
            <div>
              <dt>In Growth Partner</dt>
              <dd>{counts.includedInPartner}</dd>
            </div>
            <div>
              <dt>Extra scope, quoted</dt>
              <dd>{counts.extraScope}</dd>
            </div>
            <div>
              <dt>Not available today</dt>
              <dd>{counts.notAvailable}</dd>
            </div>
          </dl>
        </Container>
      </Section>

      <LifecycleDiagram />

      <CapabilityExplorer initialTrade={initialTrade} />

      <IntegrationList />

      {/*
       * The closing block is the banner, not a section above it.
       *
       * Written as its own `Section` first, with the shared `CtaBanner` underneath, it read
       * as two closings: a heading saying a list cannot tell you which capabilities you need,
       * then a second heading immediately below making the same move in different words. The
       * banner takes `heading`/`body` for exactly this, so the page's own argument becomes
       * the banner's copy and there is one ending rather than two.
       */}
      <CtaBanner
        heading={capabilityPage.closing.heading}
        body={capabilityPage.closing.body}
        headingId={CLOSING_HEADING_ID}
        location="capabilities-close"
      />
    </>
  );
}
