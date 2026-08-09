import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { routes } from '../config/routes';
import { SiteLayout } from '../components/layout/SiteLayout';
import { HomePage } from '../features/home/HomePage';
import { AboutPage } from '../features/about/AboutPage';
import { ServicesPage } from '../features/services/ServicesPage';
import { PortfolioPage } from '../features/portfolio/PortfolioPage';
import { ContactPage } from '../features/contact/ContactPage';
import { PrivacyPage } from '../features/legal/PrivacyPage';
import { TermsPage } from '../features/legal/TermsPage';
import { NotFoundPage } from '../features/notFound/NotFoundPage';

/*
 * Client-side routing is used because the site has seven pages that each need their own
 * descriptive URL and their own title and description for search results.
 *
 * Every route is imported eagerly rather than lazily. The whole site is small enough
 * that splitting it would add a network round trip on navigation to save a few
 * kilobytes on first load — the wrong trade for a five-page marketing site.
 */
export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<SiteLayout />}>
          <Route path={routes.home} element={<HomePage />} />
          <Route path={routes.services} element={<ServicesPage />} />
          <Route path={routes.portfolio} element={<PortfolioPage />} />
          <Route path={routes.about} element={<AboutPage />} />
          <Route path={routes.contact} element={<ContactPage />} />
          <Route path={routes.privacy} element={<PrivacyPage />} />
          <Route path={routes.terms} element={<TermsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
