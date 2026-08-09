import { routes } from '../../config/routes';
import { findPageMeta, site } from '../../content';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { Container, Section, SectionHeading } from '../../components/ui/Layout';
import { CtaBanner } from '../../components/marketing/CtaBanner';
import { ServiceList } from './ServiceList';
import styles from './Services.module.css';

const meta = findPageMeta(routes.services);

export function ServicesPage() {
  useDocumentMeta(meta ?? { path: routes.services, title: 'Services', description: '' });

  return (
    <>
      <Section labelledBy="services-heading">
        <Container>
          {/* The page's own <h1>; service names below are h3 under it. */}
          <SectionHeading
            id="services-heading"
            level={1}
            eyebrow="Services"
            title="What I do"
            lede={`Everything below is work I do myself for service businesses in ${site.serviceArea.label}. Most projects use some of it, not all of it — we work out which parts you actually need before anything is quoted.`}
          />

          <ServiceList headingLevel={3} />

          <p className={styles['footnote']}>
            Not sure which of these applies to you? That is what the review is for — send me your
            site and I will tell you which parts are worth paying for and which are not.
          </p>
        </Container>
      </Section>

      <CtaBanner
        heading="Tell me what you are working with"
        body="Send your website address, or just describe the business. I will come back with what I would do and what it would cost."
      />
    </>
  );
}
