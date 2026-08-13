import { hero, prices, primaryCta, site } from '../../../content';
import { track } from '../../../lib/analytics';
import { ButtonLink } from '../../../components/ui/Button';
import { Container } from '../../../components/ui/Layout';
import { Icon } from '../../../components/ui/Icon';
import { PhoneLink } from '../../../components/ui/ContactLink';
import { HeroLeadForm } from '../../contact/HeroLeadForm';
import { HeroVisual } from '../HeroVisual';
import styles from '../Home.module.css';

/**
 * The first screen answers four questions before it asks for anything: what this is, who
 * it is for, why it is different, and what to do next.
 *
 * Two visitors arrive here and they need opposite things. Somebody sent by a referral is
 * already sold and should not have to read a sales page to act; somebody comparing three
 * providers needs to scroll. The layout serves both — the offer on the left, the way in
 * on the right, and the rest of the page still underneath.
 *
 * `site.hero.variant` decides whether the right-hand side is the lead form or the
 * original illustration with buttons. Both are built; neither is guesswork dressed up as
 * a decision. See `HeroVariant`.
 *
 * The heading is the one element with no entrance animation: it is the
 * largest-contentful-paint candidate, and fading it in would delay the moment the page
 * counts as painted for the sake of an effect nobody asked for.
 */
export function Hero() {
  const showForm = site.hero.variant === 'form';

  return (
    <section className={styles['hero']} aria-labelledby="hero-heading">
      <Container>
        <div className={styles['heroInner']}>
          <div className={styles['heroCopy']}>
            <span className={styles['heroEyebrow']}>{hero.eyebrow}</span>

            {/* The one <h1> on the page: the outcome being sold. */}
            <h1 id="hero-heading">{hero.heading}</h1>

            <p className={styles['heroSubheading']}>{hero.subheading}</p>

            {/*
             * The price, on the first screen.
             *
             * Almost nobody in this market publishes one, which is exactly the argument
             * for doing it: a reader who cannot find a number assumes it is more than
             * they can afford and leaves without asking. Nobody who was ever going to buy
             * is lost by seeing it here, and the single biggest reason to stop reading is.
             */}
            {/*
             * Two figures with a rule between them read as a choice.
             *
             * They are not a choice — they are both halves of one offer, and a visitor
             * who spends five seconds on this screen and leaves thinking the price is
             * "$2,500 *or* $299 a month" has been misled by a divider. The word is there
             * instead of the rule, and it is read out rather than hidden, because the
             * ambiguity it fixes exists for a screen-reader user too.
             */}
            <p className={styles['heroPrice']}>
              <span className={styles['heroPriceFigure']}>{prices.launch}</span>
              <span className={styles['heroPriceLabel']}>{hero.priceLine.launch}</span>
              <span className={styles['heroPriceJoin']}>{hero.priceLine.join}</span>
              <span className={styles['heroPriceFigure']}>{prices.managementDisplay}</span>
              <span className={styles['heroPriceLabel']}>{hero.priceLine.management}</span>
            </p>
            <p className={styles['heroPriceNote']}>{hero.priceLine.note}</p>

            {showForm ? null : (
              <div className={styles['heroActions']}>
                <ButtonLink
                  to={primaryCta.to}
                  size="lg"
                  onClick={() => track('cta_clicked', { location: 'hero' })}
                >
                  {primaryCta.label}
                </ButtonLink>
                <ButtonLink to={site.cta.secondary.to} variant="secondary" size="lg">
                  {site.cta.secondary.label}
                </ButtonLink>
              </div>
            )}
          </div>

          <div className={styles['heroAction']}>
            {showForm ? <HeroLeadForm /> : <HeroVisual className={styles['heroVisual']} />}
          </div>

          {/*
           * The reassurance sits after the form on a phone and beneath the copy on a wide
           * screen — the same block, moved by the grid. On a 4.7-inch screen every line
           * placed above the form is a line between a convinced visitor and acting.
           */}
          <div className={styles['heroTrust']}>
            <p className={styles['heroDifferentiator']}>
              <Icon name="check" size={20} className={styles['heroDifferentiatorIcon']} />
              <span>{hero.differentiator}</span>
            </p>

            <ul className={styles['trustPoints']}>
              {hero.trustPoints.map((point) => (
                <li key={point} className={styles['trustPoint']}>
                  <Icon name="check" size={18} className={styles['trustPointIcon']} />
                  <span>{point}</span>
                </li>
              ))}
            </ul>

            <p className={styles['heroPhone']}>
              <span>{hero.phonePrompt}</span>
              <PhoneLink className={styles['heroPhoneLink']} />
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
