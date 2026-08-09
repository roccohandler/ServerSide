import { audience } from '../../../content';
import { Container, Section, SectionHeading } from '../../../components/ui/Layout';
import styles from '../Home.module.css';

const HEADING_ID = 'trades-heading';

/**
 * Establishes who the site is for before anything is asked of the reader.
 *
 * The industry list is content, not markup, so widening the audience later is an edit
 * to `content/home.ts` rather than a change to this component.
 */
export function TradesSection() {
  return (
    <Section tight labelledBy={HEADING_ID}>
      <Container>
        <SectionHeading id={HEADING_ID} title={audience.heading} lede={audience.body} />

        <ul className={styles['industries']}>
          {audience.industries.map((industry) => (
            <li key={industry} className={styles['industryChip']}>
              {industry}
            </li>
          ))}
        </ul>

        <p className={styles['industryNote']}>{audience.note}</p>
      </Container>
    </Section>
  );
}
