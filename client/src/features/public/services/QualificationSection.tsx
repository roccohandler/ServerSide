import { qualification } from '../../../content';
import { routes } from '../../../config/routes';
import { primaryCta } from '../../../content';
import { Container, Section, SectionHeading } from '../../../components/ui/Layout';
import { ButtonLink } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';
import { Reveal } from '../../../components/ui/Reveal';
import { track } from '../../../lib/analytics';
import styles from './Services.module.css';

const HEADING_ID = 'qualification-heading';

/**
 * Who the managed service is built for — and what to do if that is not you yet.
 *
 * This sits on the services page rather than on the PlayBook. The PlayBook is a gift;
 * putting a fit test in the middle of it turns it into a filter, and a reader can feel
 * the difference. Somebody reading the services page has already asked the commercial
 * question, so this is where it belongs.
 *
 * The section is a recommendation and never a rejection. Nobody is told they do not
 * qualify: below the profile the recommendation is the free PlayBook, which is the same
 * framework in full, and there is always a route to say "I still think I am a fit". A
 * business too small this year is a client in three, and the way this page treats them
 * now decides whether they come back.
 */
export function QualificationSection() {
  return (
    <Section tone="muted" labelledBy={HEADING_ID}>
      <Container>
        <SectionHeading
          id={HEADING_ID}
          eyebrow={qualification.eyebrow}
          title={qualification.heading}
          lede={qualification.lede}
        />

        <h3 className={styles['fitHeading']}>{qualification.signalsHeading}</h3>
        <ul className={styles['fitList']}>
          {qualification.signals.map((signal) => (
            <Reveal as="li" key={signal} className={styles['fitItem']}>
              <Icon name="check" size={16} className={styles['fitMarker']} />
              <span>{signal}</span>
            </Reveal>
          ))}
        </ul>

        {/*
         * The revenue guideline, second and quiet. `idealCustomer.showRevenueGuideline`
         * removes it entirely in one edit — a number in isolation reads as a rope across
         * a door, and it is only useful next to the reason it exists.
         */}
        {qualification.revenueNote ? (
          <p className={styles['fitNote']}>{qualification.revenueNote}</p>
        ) : null}

        <p className={styles['fitNote']}>{qualification.areaNote}</p>

        <div className={styles['fitPaths']}>
          {/* The below-profile path. Genuinely useful, or it is just a polite no. */}
          <div className={styles['fitPath']}>
            <h3 className={styles['fitPathHeading']}>{qualification.otherwise.heading}</h3>
            <p className={styles['fitPathBody']}>{qualification.otherwise.body}</p>
            <p className={styles['fitPathBody']}>{qualification.otherwise.reviewNote}</p>
            <ButtonLink
              to={routes.playbook}
              variant="secondary"
              onClick={() => track('cta_clicked', { location: 'qualification-playbook' })}
            >
              {qualification.otherwise.ctaLabel}
            </ButtonLink>
          </div>

          {/*
           * The exception path. The profile above is a generalisation, and generalisations
           * are wrong about individual businesses constantly.
           */}
          <div className={styles['fitPath']}>
            <h3 className={styles['fitPathHeading']}>{qualification.exception.heading}</h3>
            <p className={styles['fitPathBody']}>{qualification.exception.body}</p>
            <ButtonLink
              to={primaryCta.to}
              variant="secondary"
              onClick={() => track('cta_clicked', { location: 'qualification-exception' })}
            >
              {qualification.exception.ctaLabel}
            </ButtonLink>
          </div>
        </div>
      </Container>
    </Section>
  );
}
