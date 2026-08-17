import { Link } from 'react-router-dom';
import { routes } from '../../../config/routes';
import { findPageMeta, trust } from '../../../content';
import { useDocumentMeta } from '../../../hooks/useDocumentMeta';
import { Container, Section, SectionHeading } from '@jobforge/ui';
import { CtaBanner } from '../../../components/marketing/CtaBanner';
import { PortfolioShowcase } from './PortfolioShowcase';
import styles from './Portfolio.module.css';

const meta = findPageMeta(routes.portfolio);

export function PortfolioPage() {
  useDocumentMeta(meta ?? { path: routes.portfolio, title: 'Examples', description: '' });

  return (
    <>
      <Section labelledBy="portfolio-heading">
        <Container>
          <SectionHeading
            id="portfolio-heading"
            level={1}
            eyebrow="Examples"
            title="Demonstration sites"
            lede="Five trades, five different first screens. The layout changes because the way each trade gets hired changes — an emergency plumber and a landscaper are not selling the same decision."
          />

          {/* Stated in plain language before anything is shown. */}
          <p className={styles['demoNotice']}>{trust.disclosure}</p>

          {/*
           * Full-width rows rather than the homepage's three-column grid. This page's
           * entire job is showing the work, and at card size the details that do the
           * persuading — the call button, the headline, the disclosure bar in every
           * capture — stop being legible. The rows render their titles as h2, directly
           * under the page's own h1.
           */}
          <PortfolioShowcase />

          {/*
           * The examples show what a finished site looks like. The teardown shows the
           * reasoning, on a site that is deliberately wrong first — which is the half a
           * sceptical reader actually wants, and the reason this link is here rather than
           * only in the footer.
           */}
          <p className={styles['teardownLink']}>
            Want the reasoning rather than the result?{' '}
            <Link to={routes.teardown}>
              Read the teardown of a composite service-business website
            </Link>{' '}
            — six findings on one first screen, ordered by what they cost.
          </p>
        </Container>
      </Section>

      <CtaBanner
        heading="Want to see what yours could look like?"
        body="Send us your current site, or tell us about the business if you do not have one yet."
      />
    </>
  );
}
