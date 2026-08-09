import { problem, site } from '../../../content';
import { Container, Section, SectionHeading } from '../../../components/ui/Layout';
import { Icon } from '../../../components/ui/Icon';
import styles from '../Home.module.css';

const HEADING_ID = 'problem-heading';

/**
 * The problem section, written as a checklist the reader can run against their own
 * site rather than as claims about the industry.
 *
 * That framing is deliberate: it is useful on its own, it needs no statistics to back
 * it up, and it leads naturally into the review offer.
 */
export function ProblemSection() {
  return (
    <Section tone="muted" labelledBy={HEADING_ID}>
      <Container>
        <SectionHeading id={HEADING_ID} title={problem.heading} lede={problem.intro} />

        <ul className={styles['checkList']}>
          {problem.checks.map((check) => (
            <li key={check.id} className={styles['checkItem']}>
              <span className={styles['checkMarker']} aria-hidden="true">
                <Icon name="alert" size={18} />
              </span>
              <div>
                <h3 className={styles['checkQuestion']}>{check.question}</h3>
                <p className={styles['checkDetail']}>{check.detail}</p>
              </div>
            </li>
          ))}
        </ul>

        {site.offer.freeReview.enabled ? (
          <p className={styles['checkClosing']}>{problem.closing}</p>
        ) : null}
      </Container>
    </Section>
  );
}
