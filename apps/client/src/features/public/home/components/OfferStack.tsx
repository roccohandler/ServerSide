import { offerStack } from '../../../../content';
import { Grid } from '@jobforge/ui';
import { Card } from '@jobforge/ui';
import { Icon } from '@jobforge/ui';
import { Reveal } from '@jobforge/ui';
import styles from './OfferStack.module.css';
import offer from '../Offer.module.css';

/*
 * ============================================================================
 * THE SEVEN PROMISES, AT TWO DEPTHS
 * ============================================================================
 *
 * One component with a `variant`, rendering the same seven groups either as a scannable
 * grid or in full.
 *
 * ## Why the homepage stopped rendering the full version
 *
 * It was measured. The section this sits in was 14,160px tall and 3,743 words — 34% of
 * the entire homepage, in one section, at position 15 of 18. Each of the seven cards
 * carried a promise, a mechanism, a "why it matters" paragraph, a summary paragraph and a
 * bulleted deliverables list: three prose blocks and a list, seven times over, for a
 * reader who has not yet decided whether to scroll.
 *
 * The compact variant keeps what a scanning reader can use — what changes, and the name of
 * the thing that changes it — and hands the rest to `/services`, which is the page
 * somebody opens once they have decided to look properly. This is the pattern the
 * homepage already documents itself using for three other sections; see the note at the
 * top of `HomePage.tsx`.
 *
 * **Nothing is deleted.** Before this split the full detail rendered on the homepage and
 * *nowhere else* — `/services` imported `offerStack` for its summary line and never
 * touched `groups`. The depth page now renders it, which is the first time it has been
 * somewhere a reader looking for depth would actually find it.
 * ============================================================================
 */

export interface OfferStackProps {
  /**
   * `compact` is icon, promise and mechanism — the homepage. `full` adds why it matters,
   * the summary and the deliverables list, and belongs on a page somebody chose to open.
   */
  readonly variant: 'compact' | 'full';
}

export function OfferStack({ variant }: OfferStackProps) {
  const full = variant === 'full';

  return (
    <Grid as="ul" columns={full ? 2 : 3}>
      {offerStack.groups.map((group) => (
        <Reveal as="li" key={group.id} className={offer['careItem']}>
          <Card className={full ? styles['stackCard'] : styles['stackCardCompact']}>
            <div className={styles['stackHead']}>
              <span className={styles['stackStep']} aria-hidden="true">
                {group.step}
              </span>
              <span className={styles['stackIcon']}>
                <Icon name={group.icon} size={22} />
              </span>
            </div>

            {/*
             * Promise → mechanism → why → deliverables, in that order and no other.
             *
             * The heading is what changes for the reader's customer ("Your customers
             * find you"). The mechanism is named immediately under it, because a buyer
             * needs a word for the thing they bought and "conversion paths" is that
             * word — but it is the second line. Leading with it is how a value stack
             * turns back into a scope document.
             *
             * The compact variant stops here. Those first two lines are the promise and
             * its name, which is everything a scanning reader can act on.
             */}
            <h3 className={styles['stackName']}>{group.name}</h3>
            <p className={styles['stackMechanism']}>{group.mechanism}</p>

            {full ? (
              <>
                <p className={styles['stackWhy']}>
                  <span className={styles['stackWhyLabel']}>Why it matters</span>
                  {group.whyItMatters}
                </p>

                <p className={styles['stackSummary']}>{group.summary}</p>

                <ul className={styles['stackList']}>
                  {group.includes.map((item) => (
                    <li key={item} className={offer['stackListItem']}>
                      <Icon name="check" size={16} className={offer['stackMarker']} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </Card>
        </Reveal>
      ))}
    </Grid>
  );
}
