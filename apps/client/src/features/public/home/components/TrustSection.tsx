import { trust } from '../../../../content';
import { Container, Section, SectionHeading } from '@jobforge/ui';
import { Icon } from '@jobforge/ui';
import styles from '../Home.module.css';

const HEADING_ID = 'trust-heading';

/**
 * The trust section.
 *
 * It contains commitments about how the work is done, and an explicit admission that
 * there is no client work to show yet — see the reasoning in `content/trust.ts`.
 */
export function TrustSection() {
  return (
    <Section tone="muted" labelledBy={HEADING_ID}>
      <Container>
        <SectionHeading
          id={HEADING_ID}
          eyebrow="Straight answers"
          title={trust.heading}
          lede={trust.intro}
        />

        <p className={styles['disclosure']}>{trust.disclosure}</p>

        <ul className={styles['commitmentList']}>
          {trust.commitments.map((commitment) => (
            <li key={commitment.id} className={styles['commitment']}>
              <Icon name="check" size={22} className={styles['commitmentMarker']} />
              <div>
                <h3 className={styles['commitmentTitle']}>{commitment.title}</h3>
                <p className={styles['commitmentBody']}>{commitment.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
