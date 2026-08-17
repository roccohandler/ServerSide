import { Container, Section, SectionHeading } from '@jobforge/ui';
import { Badge } from '@jobforge/ui';
import {
  availabilityLabels,
  capabilities,
  capabilityIntegrations,
  capabilityPage,
} from './content/capabilities';
import { usingIntegration } from './utils/capabilityMatch';
import styles from './Capabilities.module.css';

const HEADING_ID = 'integrations-heading';

/**
 * The third-party systems, described by what they would do for the business.
 *
 * ## The two things this section refuses to do
 *
 * **It does not draw logos.** A wall of recognisable marks is the standard way to present
 * integrations and it works by implication: eleven logos say "we are plugged into all of
 * this", and the reader never checks which ones are real. Four of the twelve below are not
 * available, and two are things this business has decided against — a logo grid could not
 * say that, and a list can.
 *
 * **It does not use the word "integration" as a benefit.** Every row leads with what the
 * system is for and what connecting it changes. "Two-way sync" is not an outcome; not
 * retyping an enquiry into your scheduling software is.
 *
 * ## Why the capability count is derived
 *
 * Each row shows how many capabilities use the integration, read back from the capabilities
 * themselves via `usingIntegration`. The relation is stored once — on the capability — so an
 * integration cannot claim to power something that does not list it. The alternative, a
 * `capabilityIds` array on the integration, would be the same fact in two places and the two
 * would disagree the first time an entry moved.
 */
export function IntegrationList() {
  const { integrations } = capabilityPage;

  return (
    <Section labelledBy={HEADING_ID}>
      <Container>
        <SectionHeading
          id={HEADING_ID}
          eyebrow={integrations.eyebrow}
          title={integrations.heading}
          lede={integrations.lede}
        />

        <ul className={styles['integrationList']}>
          {capabilityIntegrations.map((integration) => {
            const availability = availabilityLabels[integration.availability];
            const used = usingIntegration(capabilities, integration.id);

            return (
              <li key={integration.id} className={styles['integration']}>
                <div className={styles['integrationHead']}>
                  <h3 className={styles['integrationName']}>{integration.name}</h3>
                  <span
                    className={
                      availability.purchasable
                        ? `${styles['availability']} ${styles['availableNow']}`
                        : `${styles['availability']} ${styles['availableNot']}`
                    }
                  >
                    {availability.label}
                  </span>
                </div>

                <p className={styles['integrationWhat']}>{integration.whatItDoes}</p>
                <p className={styles['integrationWhy']}>{integration.whyConnect}</p>

                <p className={styles['integrationMeta']}>
                  <Badge>{integrations.ownerLabels[integration.owner]}</Badge>
                  {/*
                   * Only rendered when something actually uses it. An integration listed with
                   * "used by 0 capabilities" invites the obvious question, and the answer —
                   * that it is here to be explained rather than to be connected — is already
                   * in `whyConnect`.
                   */}
                  {used.length > 0 ? (
                    <span className={styles['integrationUsage']}>
                      Used by: {used.map((capability) => capability.name).join(', ')}
                    </span>
                  ) : null}
                </p>
              </li>
            );
          })}
        </ul>
      </Container>
    </Section>
  );
}
