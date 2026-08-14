import { Badge, Container, Section, SectionHeading } from '../../../components/ui/Layout';
import { capabilityPage, lifecycleStages } from '../../../content/capabilities';
import type { JourneyOwner, LifecycleStage } from '../../../types/content';
import styles from './Capabilities.module.css';

const HEADING_ID = 'lifecycle-heading';

/**
 * The customer lifecycle, drawn — and the point of drawing it is the half a website does
 * not touch.
 *
 * ## Why this is not a funnel
 *
 * A funnel narrows, and the story it tells is "fewer people at each step". That is the
 * audit's diagram and it is the right shape there, because the audit is about leakage.
 *
 * This is a different claim: eight moments in one customer's relationship with a business,
 * of which the website owns two outright, precedes one, and has no part in five. Drawn as a
 * funnel that reads as "the website delivers advocacy", which is the overclaim the whole
 * capability layer is built to avoid. Drawn as a run of eight labelled stages, grouped by
 * who is responsible, it reads as what it is.
 *
 * ## The grouping is derived, not written down twice
 *
 * The stages are one ordered array in `content/capabilities.ts`. The three bands below are
 * produced by walking that array and starting a new band whenever `owner` changes — so the
 * sequence in the content is the sequence on the screen, and a stage moved from `website` to
 * `business` moves band without anybody editing this file.
 *
 * That also means a band can appear more than once if ownership ever alternates, which is
 * correct: the honest picture is whatever the array says, not three tidy thirds.
 */
interface OwnerBand {
  readonly key: string;
  readonly owner: JourneyOwner;
  readonly stages: readonly LifecycleStage[];
  /** Where this band's numbering starts, so eight stages read as one run of eight. */
  readonly offset: number;
}

function toBands(stages: readonly LifecycleStage[]): readonly OwnerBand[] {
  const bands: OwnerBand[] = [];

  stages.forEach((stage, index) => {
    const current = bands[bands.length - 1];

    if (current !== undefined && current.owner === stage.owner) {
      bands[bands.length - 1] = { ...current, stages: [...current.stages, stage] };
      return;
    }

    bands.push({
      key: `${stage.owner}-${String(index)}`,
      owner: stage.owner,
      stages: [stage],
      offset: index,
    });
  });

  return bands;
}

export function LifecycleDiagram() {
  const bands = toBands(lifecycleStages);
  const { lifecycle } = capabilityPage;

  return (
    <Section tone="muted" labelledBy={HEADING_ID}>
      <Container>
        <SectionHeading
          id={HEADING_ID}
          eyebrow={lifecycle.eyebrow}
          title={lifecycle.heading}
          lede={lifecycle.lede}
        />

        <div className={styles['lifecycle']}>
          {bands.map((band) => (
            <div key={band.key} className={styles['lifecycleBand']}>
              {/*
               * The band label is a real heading rather than a styled paragraph, because it
               * is the only thing that makes the list underneath it mean anything — a screen
               * reader user who hears eight stages with no ownership marker gets the funnel
               * version of the story, which is the wrong one.
               */}
              <h3 className={styles['bandLabel']}>
                <Badge tone={band.owner === 'website' ? 'accent' : 'neutral'}>
                  {lifecycle.ownerLabels[band.owner]}
                </Badge>
              </h3>

              <ol className={styles['stageList']} start={band.offset + 1}>
                {band.stages.map((stage, index) => (
                  <li
                    key={stage.id}
                    className={
                      band.owner === 'website'
                        ? `${styles['stage']} ${styles['stageOurs']}`
                        : styles['stage']
                    }
                  >
                    <span className={styles['stageNumber']} aria-hidden="true">
                      {band.offset + index + 1}
                    </span>
                    <div>
                      <h4 className={styles['stageLabel']}>{stage.label}</h4>
                      <p className={styles['stageMoment']}>{stage.customerMoment}</p>
                      {/*
                       * The business's own question, marked as a question rather than
                       * folded into the description. It is what turns a diagram of a
                       * customer's journey into something the reader can locate themselves
                       * in — they have asked at least four of these this month.
                       */}
                      <p className={styles['stageQuestion']}>{stage.businessQuestion}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>

        <p className={styles['lifecycleNote']}>{lifecycle.note}</p>
      </Container>
    </Section>
  );
}
