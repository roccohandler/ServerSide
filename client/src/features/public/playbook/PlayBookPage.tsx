import { primaryCta } from '../../../content';
import { playbook } from '../../../content/playbook';
import { routes } from '../../../config/routes';
import { useDocumentMeta } from '../../../hooks/useDocumentMeta';
import { findPageMeta } from '../../../content';
import { track } from '../../../lib/analytics';
import { ButtonLink } from '../../../components/ui/Button';
import { Container, Section, SectionHeading } from '../../../components/ui/Layout';
import { CtaBanner } from '../../../components/marketing/CtaBanner';
import { PlayBookHero } from './sections/PlayBookHero';
import { PlayBookIntroduction } from './sections/PlayBookIntroduction';
import { PlayBookSystem } from './sections/PlayBookSystem';
import { PlayBookPrinciples } from './sections/PlayBookPrinciples';
import { PlayBookPriorities } from './sections/PlayBookPriorities';
import { PlayBookAssessment } from './sections/PlayBookAssessment';
import { PlayBookPdfOffer } from './sections/PlayBookPdfOffer';
import { useInViewOnce } from '../../../hooks/useInViewOnce';
import styles from './PlayBook.module.css';

const meta = findPageMeta(routes.playbook);

/**
 * The PlayBook: the free half of the offer, and deliberately the larger half.
 *
 * The whole resource is on this page, unfolded. Nothing essential sits behind an email
 * address — a reader who never gives us theirs should still leave able to find real
 * problems on their own website and knowing which to fix first. That is what makes the
 * paid service look like what it is: the same work, done for them, by somebody who does
 * it every day.
 *
 * The order is the argument:
 *
 *   what this is -> why a website is part of the sale
 *   -> the six stages, so twenty improvements read as a system rather than a listicle
 *   -> the twenty improvements, grouped and in full
 *   -> where to start if you read nothing else
 *   -> score your own site and get a work list that is yours
 *   -> the workbook, for anybody who wants the paperwork
 *   -> and only then, the paid version
 *
 * The page is also an argument by demonstration. It teaches speed, hierarchy, scanning,
 * accessible forms and restraint — so it has to be an example of all five.
 */
export function PlayBookPage() {
  useDocumentMeta(meta ?? { path: routes.playbook, title: 'PlayBook', description: '' });

  // Fires once the reader has actually started the improvements, rather than on mount —
  // a bounce and a read should not look the same in the numbers.
  const watchPlaybook = useInViewOnce(() => track('playbook_viewed'));

  return (
    <>
      <PlayBookHero />
      <PlayBookIntroduction />
      <PlayBookSystem />
      <PlayBookPrinciples ref={watchPlaybook} />
      <PlayBookPriorities />
      <PlayBookAssessment />
      <PlayBookPdfOffer />

      <Section labelledBy="playbook-service-heading">
        <Container narrow>
          <SectionHeading
            id="playbook-service-heading"
            eyebrow="The paid version of all this"
            title={playbook.service.heading}
          />

          {playbook.service.body.map((paragraph) => (
            <p key={paragraph} className={styles['prose']}>
              {paragraph}
            </p>
          ))}

          <p className={styles['serviceClosing']}>{playbook.service.closing}</p>

          <ButtonLink
            to={primaryCta.to}
            size="lg"
            onClick={() => track('cta_clicked', { location: 'playbook' })}
          >
            {primaryCta.label}
          </ButtonLink>
        </Container>
      </Section>

      <CtaBanner
        heading="Found something on this list that your site gets wrong?"
        body="Send it over and we will go through it the way a customer would, then write back with what we would change first. Free, and useful whether or not you ever hire anybody."
      />
    </>
  );
}
