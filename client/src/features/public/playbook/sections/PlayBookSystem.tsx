import { playbook, playbookStages } from '../../../../content/playbook';
import { Container, Section, SectionHeading } from '../../../../components/ui/Layout';
import { Icon } from '../../../../components/ui/Icon';
import { Reveal } from '../../../../components/ui/Reveal';
import styles from '../PlayBook.module.css';

const HEADING_ID = 'playbook-system-heading';

/**
 * The six stages, before the twenty improvements.
 *
 * Twenty pieces of advice is a listicle. Twenty pieces of advice arranged into the six
 * things a website has to do, in the order a customer meets them, is a system — and the
 * difference is entirely in whether the reader can see the shape before they start.
 *
 * Each stage shows how many improvements sit under it, which does two things: it tells a
 * skimmer where the weight is, and it makes the twenty feel finite rather than endless.
 */
export function PlayBookSystem() {
  return (
    <Section tone="muted" labelledBy={HEADING_ID}>
      <Container>
        <SectionHeading
          id={HEADING_ID}
          eyebrow={playbook.system.eyebrow}
          title={playbook.system.heading}
          lede={playbook.system.lede}
        />

        <ol className={styles['stages']}>
          {playbookStages.map((stage, index) => {
            const count = playbook.principles.filter(
              (principle) => principle.stage === stage.id,
            ).length;

            return (
              <Reveal as="li" key={stage.id} sequence={index} className={styles['stageCard']}>
                <div className={styles['stageCardHead']}>
                  <span className={styles['stageCardIcon']}>
                    <Icon name={stage.icon} size={20} />
                  </span>
                  <span className={styles['stageCardNumber']} aria-hidden="true">
                    {stage.number}
                  </span>
                </div>

                <h3 className={styles['stageCardName']}>{stage.name}</h3>
                <p className={styles['stageCardQuestion']}>{stage.question}</p>
                <p className={styles['stageCardSummary']}>{stage.summary}</p>

                <p className={styles['stageCardCount']}>
                  {count} {count === 1 ? 'improvement' : 'improvements'}
                </p>
              </Reveal>
            );
          })}
        </ol>

        {/* The reason the order is the order. */}
        <p className={styles['stagesClosing']}>{playbook.system.closing}</p>
      </Container>
    </Section>
  );
}
