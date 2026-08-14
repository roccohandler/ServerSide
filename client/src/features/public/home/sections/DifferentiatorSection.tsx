import { differentiator } from '../../../../content';
import { Container, Section } from '../../../../components/ui/Layout';
import { Icon } from '../../../../components/ui/Icon';
import { Reveal } from '../../../../components/ui/Reveal';
import styles from '../Offer.module.css';

const HEADING_ID = 'differentiator-heading';

/**
 * The single strongest claim on the page, so it gets the brand surface and no
 * competition: what happens after launch is the difference between this and hiring
 * somebody to build a website.
 *
 * The two lanes do the persuading. Read on its own, a monthly fee is an extra cost; read
 * against a lane that stops at "you're on your own", it is the part that was missing
 * from every website project the reader has already paid for.
 */
export function DifferentiatorSection() {
  return (
    <Section tone="brand" labelledBy={HEADING_ID}>
      <Container>
        <div className={styles['differentiator']}>
          <h2 id={HEADING_ID} className={styles['differentiatorHeading']}>
            {differentiator.heading}
          </h2>

          {differentiator.body.map((paragraph) => (
            <p key={paragraph} className={styles['differentiatorBody']}>
              {paragraph}
            </p>
          ))}
        </div>

        <ul className={styles['laneList']}>
          {differentiator.lanes.map((lane, index) => (
            <Reveal
              as="li"
              key={lane.id}

              className={index === 0 ? styles['lane'] : `${styles['lane']} ${styles['laneStrong']}`}
            >
              <h3 className={styles['laneLabel']}>{lane.label}</h3>

              <ol className={styles['laneSteps']}>
                {lane.steps.map((step, stepIndex) => (
                  <li key={step} className={styles['laneStep']}>
                    <span>{step}</span>
                    {stepIndex < lane.steps.length - 1 ? (
                      <span className={styles['laneArrow']} aria-hidden="true">
                        <Icon name="arrow-right" size={16} />
                      </span>
                    ) : null}
                  </li>
                ))}
              </ol>

              <p className={styles['laneNote']}>{lane.note}</p>
            </Reveal>
          ))}
        </ul>

        <p className={styles['laneClosing']}>{differentiator.closing}</p>
      </Container>
    </Section>
  );
}
