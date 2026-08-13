import { abTesting, campaignAlignment, seasonal } from '../../../content';
import { Container, Section, SectionHeading } from '../../../components/ui/Layout';
import { Icon } from '../../../components/ui/Icon';
import { Reveal } from '../../../components/ui/Reveal';
import { SiteMock } from '../SiteMock';
import styles from '../Offer.module.css';
import valueStyles from '../Value.module.css';

const HEADING_ID = 'campaign-heading';
const SEASONAL_HEADING_ID = 'seasonal-heading';
const TESTING_HEADING_ID = 'testing-heading';

/**
 * The three things the ongoing half of the system does that a maintenance plan never
 * does: align the website with the marketing, refresh it as the year turns, and test the
 * arguments nobody can settle by opinion.
 *
 * They share a section because they share a story — this is what the monthly fee is
 * actually funding. Splitting them into three sections would make three small claims
 * where there is one large one.
 *
 * Every example is illustrative and labelled. No result is attached to any of them,
 * because no test has been run here and a number would be a fabricated case study.
 */
export function GrowthSection() {
  return (
    <Section labelledBy={HEADING_ID}>
      <Container>
        <SectionHeading
          id={HEADING_ID}
          eyebrow={campaignAlignment.eyebrow}
          title={campaignAlignment.heading}
          lede={campaignAlignment.lede}
        />

        <ol className={styles['flow']}>
          {campaignAlignment.flow.map((step, index) => (
            <li key={step} className={styles['flowStep']}>
              <span>{step}</span>
              {index < campaignAlignment.flow.length - 1 ? (
                <span className={styles['flowArrow']} aria-hidden="true">
                  <Icon name="arrow-right" size={16} />
                </span>
              ) : null}
            </li>
          ))}
        </ol>

        {/* ------------------------------------------------------- the message match */}

        <div className={styles['match']}>
          <Reveal className={styles['matchAd']}>
            <p className={valueStyles['panelLabel']}>
              <span className={valueStyles['panelSide']}>{campaignAlignment.example.adLabel}</span>
              <span className={valueStyles['panelTag']}>{campaignAlignment.example.label}</span>
            </p>

            <div className={styles['ad']}>
              <p className={styles['adSource']}>{campaignAlignment.example.ad.source}</p>
              <p className={styles['adHeadline']}>{campaignAlignment.example.ad.headline}</p>
              <p className={styles['adBody']}>{campaignAlignment.example.ad.body}</p>
            </div>
          </Reveal>

          <div className={styles['matchPanels']}>
            <Reveal className={valueStyles['panel']}>
              <p className={valueStyles['panelLabel']}>
                <span className={valueStyles['panelSide']}>
                  {campaignAlignment.example.mismatchLabel}
                </span>
                <span className={valueStyles['panelTag']}>{campaignAlignment.example.label}</span>
              </p>
              <SiteMock spec={campaignAlignment.example.mismatch} />
            </Reveal>

            <Reveal className={valueStyles['panel']}>
              <p className={`${valueStyles['panelLabel']} ${valueStyles['panelLabelAfter']}`}>
                <span className={valueStyles['panelSide']}>
                  {campaignAlignment.example.alignedLabel}
                </span>
                <span className={valueStyles['panelTag']}>{campaignAlignment.example.label}</span>
              </p>
              <SiteMock spec={campaignAlignment.example.aligned} />
            </Reveal>
          </div>
        </div>

        <p className={styles['matchNote']}>{campaignAlignment.example.note}</p>

        <ul className={styles['includesList']}>
          {campaignAlignment.includes.map((item) => (
            <li key={item} className={styles['careListItem']}>
              <Icon name="check" size={16} className={styles['careMarker']} />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        {/* The scope boundary, stated as plainly as the offer. */}
        <p className={styles['boundary']}>
          <Icon name="alert" size={20} className={styles['boundaryIcon']} />
          <span>{campaignAlignment.boundary}</span>
        </p>

        {/* ------------------------------------------------------------- seasonal */}

        {seasonal.enabled ? (
          <div className={styles['block']}>
            <h3 id={SEASONAL_HEADING_ID} className={styles['blockHeading']}>
              {seasonal.heading}
            </h3>
            <p className={styles['blockLede']}>{seasonal.lede}</p>

            <ul className={styles['seasons']}>
              {seasonal.seasons.map((season) => (
                <Reveal as="li" key={season.id} className={styles['season']}>
                  <h4 className={styles['seasonName']}>{season.name}</h4>
                  <ul className={styles['seasonList']}>
                    {season.examples.map((example) => (
                      <li key={example} className={styles['seasonItem']}>
                        {example}
                      </li>
                    ))}
                  </ul>
                </Reveal>
              ))}
            </ul>

            <p className={styles['careNote']}>{seasonal.note}</p>
          </div>
        ) : null}

        {/* -------------------------------------------------------------- testing */}

        {abTesting.enabled ? (
          <div className={styles['block']}>
            <h3 id={TESTING_HEADING_ID} className={styles['blockHeading']}>
              {abTesting.heading}
            </h3>
            <p className={styles['blockLede']}>{abTesting.lede}</p>

            <ol className={styles['method']}>
              {abTesting.method.map((beat, index) => (
                <Reveal as="li" key={beat.id} sequence={index} className={styles['methodStep']}>
                  <span className={styles['methodIndex']} aria-hidden="true">
                    {index + 1}
                  </span>
                  <div>
                    <h4 className={styles['methodTitle']}>{beat.title}</h4>
                    <p className={styles['methodBody']}>{beat.body}</p>
                  </div>
                </Reveal>
              ))}
            </ol>

            <div className={styles['variants']}>
              <p className={valueStyles['panelLabel']}>
                <span className={valueStyles['panelSide']}>{abTesting.example.question}</span>
                <span className={valueStyles['panelTag']}>{abTesting.example.label}</span>
              </p>

              <div className={styles['variantGrid']}>
                <div className={styles['variant']}>
                  <p className={styles['variantLabel']}>{abTesting.example.variantALabel}</p>
                  <p className={styles['variantButton']}>{abTesting.example.variantA}</p>
                </div>
                <div className={styles['variant']}>
                  <p className={styles['variantLabel']}>{abTesting.example.variantBLabel}</p>
                  <p className={styles['variantButton']}>{abTesting.example.variantB}</p>
                </div>
              </div>

              <p className={styles['variantMeasure']}>
                <span className={styles['variantMeasureLabel']}>What gets counted</span>
                {abTesting.example.measured}
              </p>
              <p className={styles['variantNote']}>{abTesting.example.note}</p>
            </div>

            <div className={styles['eligibility']}>
              <h4 className={styles['eligibilityHeading']}>When a test is worth running</h4>
              <ul className={styles['careList']}>
                {abTesting.eligibility.map((item) => (
                  <li key={item} className={styles['careListItem']}>
                    <Icon name="check" size={16} className={styles['careMarker']} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className={styles['variantNote']}>{abTesting.caveat}</p>
            </div>
          </div>
        ) : null}
      </Container>
    </Section>
  );
}
