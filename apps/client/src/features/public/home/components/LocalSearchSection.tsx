import { localSearch } from '../../../../content';
import { Container, Section, SectionHeading } from '@jobforge/ui';
import { Icon } from '@jobforge/ui';
import { Reveal } from '@jobforge/ui';
import styles from './LocalSearchSection.module.css';

const HEADING_ID = 'local-search-heading';

/**
 * The local-search foundation.
 *
 * Every line describes work that is actually within our control. There is no ranking
 * claim anywhere in this section, and the caveat that says so is part of the pitch
 * rather than small print — a business owner who has been sold "page one" before will
 * recognise the difference.
 */
export function LocalSearchSection() {
  return (
    <Section labelledBy={HEADING_ID}>
      <Container>
        <div className={styles['searchGrid']}>
          <div>
            <SectionHeading
              id={HEADING_ID}
              eyebrow={localSearch.eyebrow}
              title={localSearch.heading}
              lede={localSearch.lede}
            />
            <ol className={styles['searchChain']}>
              {localSearch.chain.map((link, index) => (
                <li key={link} className={styles['searchChainItem']}>
                  <span className={styles['searchChainIndex']} aria-hidden="true">
                    {index + 1}
                  </span>
                  <span>{link}</span>
                </li>
              ))}
            </ol>

            <p className={styles['searchCaveat']}>
              <Icon name="map-pin" size={20} className={styles['searchCaveatIcon']} />
              <span>{localSearch.caveat}</span>
            </p>
          </div>

          <ul className={styles['searchList']}>
            {localSearch.items.map((item) => (
              <Reveal as="li" key={item} className={styles['searchItem']}>
                <Icon name="check" size={18} className={styles['searchMarker']} />
                <span>{item}</span>
              </Reveal>
            ))}
          </ul>
        </div>
      </Container>
    </Section>
  );
}
