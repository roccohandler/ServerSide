import { routes, sections } from '../../config/routes';
import { findPageMeta } from '../../content';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { ButtonLink } from '../../components/ui/Button';
import { Container, Section, SectionHeading } from '../../components/ui/Layout';
import { CtaBanner } from '../../components/marketing/CtaBanner';
import { FaqList } from '../faq/FaqList';
import { PortfolioGrid } from '../portfolio/PortfolioGrid';
import { ServiceList } from '../services/ServiceList';
import { Hero } from './sections/Hero';
import { OutcomesSection } from './sections/OutcomesSection';
import { ProblemSection } from './sections/ProblemSection';
import { ProcessSection } from './sections/ProcessSection';
import { ReviewOfferSection } from './sections/ReviewOfferSection';
import { TradesSection } from './sections/TradesSection';
import { TrustSection } from './sections/TrustSection';
import pageStyles from './Home.module.css';

const meta = findPageMeta(routes.home);

/**
 * The homepage follows the funnel end to end:
 *
 *   who this is for -> the outcome -> what could be wrong -> what good looks like
 *   -> what I do -> proof -> how it works -> the offer -> objections -> contact
 *
 * Each step is a section component, and every word in them comes from `src/content`.
 */
export function HomePage() {
  useDocumentMeta(meta ?? { path: routes.home, title: 'Home', description: '' });

  return (
    <>
      <Hero />
      <TradesSection />
      <ProblemSection />
      <OutcomesSection />

      <Section id={sections.services} tone="muted" labelledBy="home-services-heading">
        <Container>
          <SectionHeading
            id="home-services-heading"
            eyebrow="Services"
            title="What I do"
            lede="Design and build, plus the parts that are easy to forget: launch, forms that work, and keeping it current afterwards."
          />
          <ServiceList limit={6} showDetails={false} />
          <p className={pageStyles['industryNote']}>
            <ButtonLink to={routes.services} variant="secondary">
              See all services
            </ButtonLink>
          </p>
        </Container>
      </Section>

      <Section id={sections.portfolio} labelledBy="home-examples-heading">
        <Container>
          <SectionHeading
            id="home-examples-heading"
            eyebrow="Examples"
            title="What these sites look like"
            lede="Demonstration sites built for five different trades. Each one solves the same problem in the way that trade needs."
          />
          <PortfolioGrid limit={3} />
          <p className={pageStyles['industryNote']}>
            <ButtonLink to={routes.portfolio} variant="secondary">
              View all examples
            </ButtonLink>
          </p>
        </Container>
      </Section>

      <ProcessSection />
      <ReviewOfferSection />
      <TrustSection />

      <Section id={sections.faq} tone="muted" labelledBy="home-faq-heading">
        <Container>
          <SectionHeading
            id="home-faq-heading"
            eyebrow="Questions"
            title="Before you get in touch"
            lede="The things people ask first. If yours is not here, ask it directly."
          />
          <FaqList limit={6} />
        </Container>
      </Section>

      <CtaBanner />
    </>
  );
}
