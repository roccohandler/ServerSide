import { system, systemComponents, systemPhases } from '../../../../content';
import { sections } from '../../../../config/routes';
import { Container, Section, SectionHeading } from '@jobforge/ui';
import { Icon } from '@jobforge/ui';
import { Reveal } from '@jobforge/ui';
import styles from './SystemSection.module.css';

const HEADING_ID = 'system-heading';

/**
 * The centre of the page: the offer as a lifecycle rather than a list.
 *
 * The split into two phases is the argument for the monthly fee, drawn rather than
 * stated. Four components get the website live; six keep happening, and the second group
 * carries a loop marker so it reads as something that comes round again rather than as a
 * longer tail on the first.
 *
 * The list is an ordered list because the order is the product, and the staggered reveal
 * runs in the same direction, so scrolling the section reads as the sequence itself.
 */
export function SystemSection() {
  return (
    <Section id={sections.system} labelledBy={HEADING_ID}>
      <Container>
        <SectionHeading
          id={HEADING_ID}
          eyebrow={system.eyebrow}
          title={system.heading}
          lede={system.lede}
        />

        {systemPhases.map((phase) => {
          const components = systemComponents.filter((component) => component.phase === phase.id);
          const isOngoing = phase.id === 'ongoing';

          return (
            <div key={phase.id} className={styles['phase']}>
              <div className={styles['phaseHead']}>
                <h3 className={styles['phaseLabel']}>{phase.label}</h3>
                <p className={styles['phaseSummary']}>{phase.summary}</p>

                {isOngoing ? (
                  <p className={styles['phaseLoop']}>
                    <Icon name="arrow-right" size={16} />
                    <span>and round again, every month</span>
                  </p>
                ) : null}
              </div>

              <ol
                className={
                  isOngoing
                    ? `${styles['systemList']} ${styles['systemListLoop']}`
                    : styles['systemList']
                }
              >
                {components.map((component, index) => (
                  <Reveal
                    as="li"
                    key={component.id}
                    sequence={index}
                    className={styles['systemItem']}
                  >
                    <div className={styles['systemCard']}>
                      <div className={styles['systemHead']}>
                        <span className={styles['systemStep']} aria-hidden="true">
                          {component.step}
                        </span>
                        <span className={styles['systemIcon']}>
                          <Icon name={component.icon} size={22} />
                        </span>
                      </div>

                      <h4 className={styles['systemName']}>{component.name}</h4>
                      <p className={styles['systemSummary']}>{component.summary}</p>
                    </div>
                  </Reveal>
                ))}
              </ol>
            </div>
          );
        })}

        <p className={styles['systemClosing']}>{system.closing}</p>
      </Container>
    </Section>
  );
}
