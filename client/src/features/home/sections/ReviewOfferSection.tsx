import { Link } from 'react-router-dom';
import { alreadyHaveAWebsite, primaryCta, site } from '../../../content';
import { routes } from '../../../config/routes';
import { track } from '../../../lib/analytics';
import { ButtonLink } from '../../../components/ui/Button';
import { Container, Section, SectionHeading } from '../../../components/ui/Layout';
import { Icon } from '../../../components/ui/Icon';
import { Reveal } from '../../../components/ui/Reveal';
import styles from '../Home.module.css';
import valueStyles from '../Value.module.css';

const HEADING_ID = 'review-heading';
const OBJECTION_HEADING_ID = 'already-have-heading';

/**
 * Explains the headline offer, then answers the objection that stops most of the people
 * who read it: "I already have a website."
 *
 * Every branch of that answer is useful to the reader whether or not they buy, which is
 * the only version of a free offer that a sceptical owner believes.
 *
 * Rendered only when `site.offer.freeReview.enabled` is true, so switching the offer off
 * removes every promise of a free assessment from the site rather than leaving an orphaned
 * section that contradicts the button.
 */
export function ReviewOfferSection() {
  const { freeReview } = site.offer;

  if (!freeReview.enabled) return null;

  return (
    // Default rather than muted since `EntrySection` left the homepage and the run below
    // the exit terms re-alternated. Everything in here is surface-agnostic — a check list
    // and a `valueStyles.objection` panel, which is a border-top rather than a filled
    // card — so it reads the same on either band.
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
            <ButtonLink
              to={primaryCta.to}
              size="lg"
              onClick={() => track('cta_clicked', { location: 'review' })}
            >
              {primaryCta.label}
            </ButtonLink>
            <p className={styles['reviewCaveat']}>{freeReview.caveat}</p>

            {/*
             * The objection this answers is not "is it really free" — it is "what am I
             * actually going to get". The sample on the teardown page answers it in one
             * click instead of one email exchange, which is the difference between a
             * reader who asks and a reader who does not bother.
             */}
            <p className={styles['reviewSample']}>
              {freeReview.sampleLede}{' '}
              <Link
                to={routes.teardown}
                onClick={() => track('cta_clicked', { location: 'review-sample' })}
              >
                {freeReview.sampleLabel}
              </Link>
              .
            </p>
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

        <div className={valueStyles['objection']}>
          <h3 id={OBJECTION_HEADING_ID} className={valueStyles['objectionHeading']}>
            {alreadyHaveAWebsite.heading}
          </h3>
          <p className={valueStyles['objectionLede']}>{alreadyHaveAWebsite.lede}</p>

          <ul className={valueStyles['objectionList']}>
            {alreadyHaveAWebsite.cases.map((item) => (
              <Reveal as="li" key={item.id} className={valueStyles['objectionItem']}>
                <p className={valueStyles['objectionCondition']}>{item.condition}</p>
                <p className={valueStyles['objectionResponse']}>{item.response}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </Container>
    </Section>
  );
}
