import { processSteps } from '../../../content';
import { Container, Section, SectionHeading } from '../../../components/ui/Layout';
import { sections } from '../../../config/routes';
import styles from '../Home.module.css';

const HEADING_ID = 'process-heading';

/** An ordered list, because the order is the point. */
export function ProcessSection() {
  return (
    <Section id={sections.process} tone="muted" labelledBy={HEADING_ID}>
      <Container>
        <SectionHeading
          id={HEADING_ID}
          eyebrow="How it works"
          title="Four steps, no surprises"
          lede="You will know what happens next at every stage, and what it costs before anything is built."
        />

        <ol className={styles['processList']}>
          {processSteps.map((step, index) => (
            <li key={step.id} className={styles['processStep']}>
              <span className={styles['processNumber']} aria-hidden="true">
                {index + 1}
              </span>
              <h3 className={styles['processTitle']}>
                {/* The number is decorative above; screen readers get it from the list itself. */}
                {step.title}
              </h3>
              <p className={styles['processBody']}>{step.description}</p>
            </li>
          ))}
        </ol>
      </Container>
    </Section>
  );
}
