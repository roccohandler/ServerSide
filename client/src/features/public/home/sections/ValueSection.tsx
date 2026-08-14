import { valueEducation } from '../../../../content';
import { Container, Section, SectionHeading } from '../../../../components/ui/Layout';
import { Icon } from '../../../../components/ui/Icon';
import { Reveal } from '../../../../components/ui/Reveal';
import styles from '../Value.module.css';

const HEADING_ID = 'value-heading';
const CLOSING_HEADING_ID = 'value-closing-heading';

/**
 * The business case, before any of the product is described.
 *
 * Six stages, each one the same three sentences: what goes wrong, what we improve, what
 * that is worth. The repetition is the design — a reader who understands the first row
 * can skim the other five and still take the whole argument away.
 *
 * The chips on each row name which of the six system components does that work, which is
 * how this section and `SystemSection` stop being two unrelated lists: one is what the
 * customer gets, the other is why any of it matters.
 */
export function ValueSection() {
  return (
    <Section labelledBy={HEADING_ID}>
      <Container>
        <SectionHeading
          id={HEADING_ID}
          eyebrow={valueEducation.eyebrow}
          title={valueEducation.heading}
          lede={valueEducation.lede}
        />

        <ol className={styles['stages']}>
          {valueEducation.stages.map((stage, index) => (
            <Reveal as="li" key={stage.id} sequence={index} className={styles['stage']}>
              <div className={styles['stageHead']}>
                <span className={styles['stageIcon']}>
                  <Icon name={stage.icon} size={20} />
                </span>
                <h3 className={styles['stageName']}>{stage.stage}</h3>

                <ul className={styles['componentChips']}>
                  {stage.components.map((component) => (
                    <li key={component} className={styles['componentChip']}>
                      {component}
                    </li>
                  ))}
                </ul>
              </div>

              <dl className={styles['stageGrid']}>
                <div className={styles['stageCell']}>
                  <dt className={styles['stageLabel']}>The problem</dt>
                  <dd className={styles['stageProblem']}>{stage.problem}</dd>
                </div>
                <div className={styles['stageCell']}>
                  <dt className={styles['stageLabel']}>What we improve</dt>
                  <dd className={styles['stageValue']}>{stage.improvement}</dd>
                </div>
                <div className={styles['stageCell']}>
                  <dt className={styles['stageLabel']}>What that is worth</dt>
                  <dd className={styles['stageValue']}>{stage.value}</dd>
                </div>
              </dl>
            </Reveal>
          ))}
        </ol>

        <div className={styles['closing']}>
          <h3 id={CLOSING_HEADING_ID} className={styles['closingHeading']}>
            {valueEducation.closing.heading}
          </h3>

          <ol className={styles['closingList']}>
            {valueEducation.closing.items.map((item, index) => (
              <li key={item.id} className={styles['closingItem']}>
                <span className={styles['closingNumber']} aria-hidden="true">
                  {index + 1}
                </span>
                <div>
                  <h4 className={styles['closingTitle']}>{item.title}</h4>
                  <p className={styles['closingBody']}>{item.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <p className={styles['closingNote']}>{valueEducation.closing.note}</p>
        </div>
      </Container>
    </Section>
  );
}
