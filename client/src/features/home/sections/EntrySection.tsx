import { entryPaths } from '../../../content';
import { Card, Container, Grid, Section, SectionHeading } from '../../../components/ui/Layout';
import { Icon } from '../../../components/ui/Icon';
import { Reveal } from '../../../components/ui/Reveal';
import styles from '../Offer.module.css';

const HEADING_ID = 'entry-heading';

/**
 * The three situations people actually arrive in.
 *
 * Before this section existed the site answered one of them — "I need a website built" —
 * and left the other two to inference. Somebody who owns a working website and wants
 * somebody else to run it had to guess whether that was on offer, and the reliable
 * outcome of making a buyer guess is that they leave.
 *
 * Only the first carries a published number. The other two say "quoted per site" out
 * loud, which is a different thing from hiding the price: the reader learns immediately
 * that it depends on what they already have, rather than discovering it on a call.
 */
export function EntrySection() {
  return (
    <Section tone="muted" labelledBy={HEADING_ID}>
      <Container>
        <SectionHeading
          id={HEADING_ID}
          eyebrow={entryPaths.eyebrow}
          title={entryPaths.heading}
          lede={entryPaths.lede}
        />

        <Grid as="ul" columns={3}>
          {entryPaths.paths.map((path) => (
            <Reveal as="li" key={path.id} className={styles['entryItem']}>
              <Card className={styles['entryCard']}>
                <span className={styles['entryIcon']}>
                  <Icon name={path.icon} size={22} />
                </span>

                <h3 className={styles['entryTitle']}>{path.title}</h3>
                <p className={styles['entrySituation']}>{path.situation}</p>
                <p className={styles['entryResponse']}>{path.response}</p>

                <p className={styles['entryPrice']}>{path.price}</p>
                {/* The condition travels with the figure, not with the pricing section
                    two screens further down. See the note in content/entry.ts. */}
                {path.priceNote ? <p className={styles['entryNote']}>{path.priceNote}</p> : null}
                <p className={styles['entryThen']}>{path.then}</p>
              </Card>
            </Reveal>
          ))}
        </Grid>

        {/* Nobody has to self-diagnose before they are allowed to make contact. */}
        <p className={styles['entryClosing']}>{entryPaths.closing}</p>
      </Container>
    </Section>
  );
}
