import { playbook } from '../../../content/playbook';
import { Container, Section, SectionHeading } from '../../../components/ui/Layout';
import { Icon } from '../../../components/ui/Icon';
import styles from '../PlayBook.module.css';

const HEADING_ID = 'playbook-intro-heading';

/** The frame the rest of the PlayBook hangs on: the website is part of the sales call. */
export function PlayBookIntroduction() {
  return (
    <Section tone="muted" labelledBy={HEADING_ID}>
      <Container narrow>
        <SectionHeading id={HEADING_ID} title={playbook.introduction.heading} />

        {playbook.introduction.body.map((paragraph) => (
          <p key={paragraph} className={styles['prose']}>
            {paragraph}
          </p>
        ))}

        <ol className={styles['chain']}>
          {playbook.introduction.chain.map((link, index) => (
            <li key={link} className={styles['chainStep']}>
              <span>{link}</span>
              {index < playbook.introduction.chain.length - 1 ? (
                <span className={styles['chainArrow']} aria-hidden="true">
                  <Icon name="arrow-right" size={16} />
                </span>
              ) : null}
            </li>
          ))}
        </ol>

        <p className={styles['proseStrong']}>{playbook.introduction.closing}</p>
      </Container>
    </Section>
  );
}
