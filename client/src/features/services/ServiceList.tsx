import { services } from '../../content';
import { Card, Grid } from '../../components/ui/Layout';
import { Icon } from '../../components/ui/Icon';
import styles from './Services.module.css';

export interface ServiceListProps {
  /** Show only the first N services. Used by the homepage preview. */
  readonly limit?: number;
  /** Hide the supporting bullet points for a more compact card. */
  readonly showDetails?: boolean;
  /** Heading rank for each service name, so the page keeps a logical outline. */
  readonly headingLevel?: 3 | 4;
}

/**
 * Renders whatever is in `content/services.ts`. Both the homepage section and the
 * services page use this, so adding a service is a one-line content change.
 */
export function ServiceList({ limit, showDetails = true, headingLevel = 3 }: ServiceListProps) {
  const visible = limit ? services.slice(0, limit) : services;
  const Heading = headingLevel === 3 ? 'h3' : 'h4';

  return (
    <Grid as="ul" columns={3}>
      {visible.map((service) => (
        <Card as="li" key={service.id} interactive>
          <span className={styles['icon']}>
            <Icon name={service.icon} size={22} />
          </span>
          <Heading className={styles['name']}>{service.name}</Heading>
          <p className={styles['summary']}>{service.summary}</p>

          {showDetails ? (
            <ul className={styles['details']}>
              {service.details.map((detail) => (
                <li key={detail} className={styles['detail']}>
                  <Icon name="check" size={16} className={styles['detailMarker']} />
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </Card>
      ))}
    </Grid>
  );
}
