import { hero, primaryCta, site } from '../../../../content';
import { track } from '../../../../lib/analytics';
import { ButtonLink } from '@jobforge/ui';
import { Container } from '@jobforge/ui';
import { Icon } from '@jobforge/ui';
import { PhoneLink } from '../../../../components/marketing/ContactLink';
import { HeroLeadForm } from '../../contact/HeroLeadForm';
import { ProductShot } from '../ProductShot';
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
 * framed screenshots of a demonstration build with buttons. Both are built; neither is
 * guesswork dressed up as a decision. See `HeroVariant`.
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
             * Two labelled blocks, not one compound price.
             *
             * "$4,900 plus $299/mo" read as a single bill, which contradicted the page's
             * own claim that the monthly service is optional. Each figure now carries its
             * own label — "The build" / "Optional after launch" — and the sentence under
             * them settles the question the two numbers raise. The labels are real text,
             * because the ambiguity they fix exists for a screen-reader user too.
             */}
            <div className={styles['heroPrice']}>
              <div className={styles['heroPriceItem']}>
                <span className={styles['heroPriceItemLabel']}>{hero.priceBlock.build.label}</span>
                <span className={styles['heroPriceFigure']}>
                  {hero.priceBlock.build.figure}
                  <span className={styles['heroPriceCadence']}>
                    {' '}
                    {hero.priceBlock.build.cadence}
                  </span>
                </span>
                <span className={styles['heroPriceLabel']}>{hero.priceBlock.build.note}</span>
              </div>

              <div className={styles['heroPriceItem']}>
                <span className={styles['heroPriceItemLabel']}>
                  {hero.priceBlock.partner.label}
                </span>
                <span className={styles['heroPriceFigure']}>{hero.priceBlock.partner.figure}</span>
                <span className={styles['heroPriceLabel']}>{hero.priceBlock.partner.note}</span>
              </div>
            </div>

            {/*
             * The two qualifying facts, on one line rather than as two stacked
             * paragraphs.
             *
             * They were four lines of grey text between the price and the button — the
             * single densest thing on the first screen and the last thing standing
             * between a convinced reader and the call to action. Each keeps its own
             * element, because they are two separate claims and one of them disappears
             * when the founding offer does.
             */}
            <p className={styles['heroTerms']}>
              <span>{hero.priceBlock.choice}</span>{' '}
              {hero.priceBlock.foundingNote ? (
                <span className={styles['heroTermsFounding']}>{hero.priceBlock.foundingNote}</span>
              ) : null}
            </p>
            <p className={styles['heroTimeline']}>
              <Icon name="bolt" size={16} className={styles['heroTimelineIcon']} />
              <span>{hero.priceBlock.timeline}</span>
            </p>

            {showForm ? null : (
              <div className={styles['heroActions']}>
                <ButtonLink
                  to={primaryCta.to}
                  size="lg"
                  onClick={() => track('cta_clicked', { location: 'hero' })}
                >
                  {primaryCta.label}
                </ButtonLink>
                {/*
                 * Ghost rather than the outlined secondary, and the reason is not width.
                 *
                 * Two bordered buttons side by side are two things asking to be pressed,
                 * and the page has one action it actually wants. The outlined version also
                 * pushed the pair past the column and stacked them, which made the
                 * secondary look like a second offer rather than a way to read on.
                 */}
                <ButtonLink to={site.cta.secondary.to} variant="ghost" size="lg">
                  {site.cta.secondary.label}
                </ButtonLink>
              </div>
            )}
          </div>

          <div className={styles['heroAction']}>
            {showForm ? <HeroLeadForm /> : <ProductShot className={styles['heroShot']} />}
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
