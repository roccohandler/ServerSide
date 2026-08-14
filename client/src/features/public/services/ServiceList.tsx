import { systemComponents } from '../../../content';
import { Card, Grid } from '../../../components/ui/Layout';
import { Icon } from '../../../components/ui/Icon';
import { Reveal } from '../../../components/ui/Reveal';
import styles from './Services.module.css';

export interface ServiceListProps {
  /** Show only the first N components. */
  readonly limit?: number;
  /** Hide the supporting bullet points for a more compact card. */
  readonly showDetails?: boolean;
  /**
   * Heading rank for each name. **It has to match where the list is on the page.**
   *
   * `2` on `/services`, where it sits directly under the page's `h1`. It was passed `3`
   * there, which put an `h3` immediately after the `h1` and left level 2 missing — a
   * screen-reader user navigating by heading is told a level was skipped and has no way
   * to find out what was in it.
   */
  readonly headingLevel?: 2 | 3 | 4;
}

/**
 * The six components of the offer, in depth.
 *
 * Renders whatever is in `content/offer.ts`, which is the same array the homepage
 * summarises — so the two pages cannot describe different services.
 */
export function ServiceList({ limit, showDetails = true, headingLevel = 3 }: ServiceListProps) {
  const visible = limit ? systemComponents.slice(0, limit) : systemComponents;
  const Heading = `h${headingLevel}` as const;

  return (
    <Grid as="ul" columns={3}>
      {visible.map((component) => (
        <Reveal as="li" key={component.id} className={styles['item']}>
          <Card className={styles['card']} interactive>
            <div className={styles['head']}>
              <span className={styles['step']} aria-hidden="true">
                {component.step}
              </span>
              <span className={styles['icon']}>
                <Icon name={component.icon} size={22} />
              </span>
            </div>

            <Heading className={styles['name']}>{component.title}</Heading>
            <p className={styles['summary']}>{component.summary}</p>

            {showDetails ? (
              <ul className={styles['details']}>
                {component.details.map((detail) => (
                  <li key={detail} className={styles['detail']}>
                    <Icon name="check" size={16} className={styles['detailMarker']} />
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </Card>
        </Reveal>
      ))}
    </Grid>
  );
}
