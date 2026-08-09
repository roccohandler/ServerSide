import { primaryCta, site } from '../../../content';
import { ButtonLink } from '../../../components/ui/Button';
import { Container, Section, SectionHeading } from '../../../components/ui/Layout';
import { Icon } from '../../../components/ui/Icon';
import styles from '../Home.module.css';

const HEADING_ID = 'review-heading';

/**
 * Explains the headline offer.
 *
 * Rendered only when `site.offer.freeReview.enabled` is true, so switching the offer
 * off removes every promise of a free review from the site rather than leaving an
 * orphaned section that contradicts the button.
 */
export function ReviewOfferSection() {
  const { freeReview } = site.offer;

  if (!freeReview.enabled) return null;

  return (
    <Section labelledBy={HEADING_ID}>
      <Container>
        <div className={styles['reviewGrid']}>
          <div>
            <SectionHeading
              id={HEADING_ID}
              eyebrow="Start here"
              title={freeReview.name}
              lede={freeReview.summary}
            />
            <ButtonLink to={primaryCta.to} size="lg">
              {primaryCta.label}
            </ButtonLink>
            <p className={styles['reviewCaveat']}>{freeReview.caveat}</p>
          </div>

          <ul className={styles['reviewIncludes']}>
            {freeReview.includes.map((item) => (
              <li key={item} className={styles['reviewItem']}>
                <Icon name="check" size={20} className={styles['reviewCheck']} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </Section>
  );
}
