import { hero, primaryCta, site } from '../../../content';
import { ButtonLink } from '../../../components/ui/Button';
import { Container } from '../../../components/ui/Layout';
import { PhoneLink } from '../../../components/ui/ContactLink';
import { HeroVisual } from '../HeroVisual';
import styles from '../Home.module.css';

export function Hero() {
  return (
    <section className={styles['hero']} aria-labelledby="hero-heading">
      <Container>
        <div className={styles['heroInner']}>
          <div>
            <span className={styles['heroEyebrow']}>{hero.eyebrow}</span>

            {/* The one <h1> on the page: what the business does, for whom. */}
            <h1 id="hero-heading">{hero.heading}</h1>

            <p className={styles['heroSubheading']}>{hero.subheading}</p>

            <div className={styles['heroActions']}>
              <ButtonLink to={primaryCta.to} size="lg">
                {primaryCta.label}
              </ButtonLink>
              <ButtonLink to={site.cta.secondary.to} variant="secondary" size="lg">
                {site.cta.secondary.label}
              </ButtonLink>
            </div>

            <p className={styles['heroPhone']}>
              <span>{hero.phonePrompt}</span>
              <PhoneLink className={styles['heroPhoneLink']} />
            </p>
          </div>

          <HeroVisual className={styles['heroVisual']} />
        </div>
      </Container>
    </section>
  );
}
