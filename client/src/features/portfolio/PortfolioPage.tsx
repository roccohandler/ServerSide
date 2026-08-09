import { routes } from '../../config/routes';
import { findPageMeta, trust } from '../../content';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { Container, Section, SectionHeading } from '../../components/ui/Layout';
import { CtaBanner } from '../../components/marketing/CtaBanner';
import { PortfolioGrid } from './PortfolioGrid';
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

          <PortfolioGrid />
        </Container>
      </Section>

      <CtaBanner
        heading="Want to see what yours could look like?"
        body="Send me your current site, or tell me about the business if you do not have one yet."
      />
    </>
  );
}
