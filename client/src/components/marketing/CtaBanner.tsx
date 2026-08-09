import { finalCta, primaryCta, site } from '../../content';
import { ButtonLink } from '../ui/Button';
import { PhoneLink } from '../ui/ContactLink';
import { Container, Section } from '../ui/Layout';
import styles from './CtaBanner.module.css';

export interface CtaBannerProps {
  /** Defaults to the closing call to action from `content/home.ts`. */
  readonly heading?: string;
  readonly body?: string;
  /** Must be unique on the page — it is what the section is labelled by. */
  readonly headingId?: string;
}

/**
 * The closing call to action, reused at the foot of every marketing page.
 *
 * One primary action, with the phone number beside it for anyone who would rather
 * talk than type. Both come from `content/site.ts`.
 */
export function CtaBanner({
  heading = finalCta.heading,
  body = finalCta.body,
  headingId = 'closing-cta-heading',
}: CtaBannerProps) {
  return (
    <Section tone="brand" labelledBy={headingId}>
      <Container>
        <div className={styles['inner']}>
          <h2 id={headingId}>{heading}</h2>
          <p className={styles['body']}>{body}</p>

          <div className={styles['actions']}>
            <ButtonLink to={primaryCta.to} variant="inverse" size="lg">
              {primaryCta.label}
            </ButtonLink>
            <PhoneLink className={styles['phone']} />
          </div>

          <p className={styles['body']}>Serving {site.serviceArea.label}.</p>
        </div>
      </Container>
    </Section>
  );
}
