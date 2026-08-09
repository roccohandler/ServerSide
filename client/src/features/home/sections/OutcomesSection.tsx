import { outcomes } from '../../../content';
import { Card, Container, Grid, Section, SectionHeading } from '../../../components/ui/Layout';
import { Icon } from '../../../components/ui/Icon';
import styles from '../Home.module.css';

const HEADING_ID = 'outcomes-heading';

/** What the site should do for the business — outcomes, not features. */
export function OutcomesSection() {
  return (
    <Section labelledBy={HEADING_ID}>
      <Container>
        <SectionHeading
          id={HEADING_ID}
          eyebrow="What you get"
          title="What a website should do for your business"
          lede="Not a list of technologies. A list of things that decide whether a stranger calls you or the next result down."
        />

        <Grid as="ul" columns={3}>
          {outcomes.map((outcome) => (
            <Card as="li" key={outcome.id}>
              <span className={styles['outcomeIcon']}>
                <Icon name={outcome.icon} size={22} />
              </span>
              <h3 className={styles['outcomeTitle']}>{outcome.title}</h3>
              <p className={styles['outcomeBody']}>{outcome.description}</p>
            </Card>
          ))}
        </Grid>
      </Container>
    </Section>
  );
}
