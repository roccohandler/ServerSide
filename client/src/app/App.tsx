import { lazy } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { routes } from '../config/routes';
import { industryPath, tradesWithPages } from '../config/trades';
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
 * Client-side routing, because every page needs its own descriptive URL and its own
 * title and description for search results.
 *
 * ## Most routes are eager, the PlayBook is not
 *
 * Everything above is imported eagerly: the marketing pages are small, they share almost
 * all of their components, and splitting them would add a network round trip on
 * navigation to save a few kilobytes.
 *
 * The PlayBook is the exception, and the reason is arithmetic rather than taste. Twenty
 * improvements written out in full, a forty-point assessment, and a workbook that renders
 * all of it again for print came to roughly a third of the entire bundle — carried by
 * every visitor to the homepage, most of whom never open it. On a page whose own
 * improvement 07 tells owners to be honest about whether every script is earning its
 * place, shipping that to everybody would have been hard to defend.
 *
 * So both PlayBook routes load on navigation. `/playbook/workbook` in particular is a
 * production tool nobody but the owner ever opens, and it has no business being in the
 * bundle a customer downloads.
 */
/*
 * The audit is lazy for the same arithmetic as the PlayBook: twenty scored categories, a
 * trade taxonomy, twenty trade-aware diagnosis strings and a scenario calculator are a
 * large chunk to hand to every visitor to the homepage, most of whom will never open it.
 */
const AuditPage = lazy(() =>
  import('../features/audit/AuditPage').then((module) => ({ default: module.AuditPage })),
);

/*
 * The five industry pages share one lazy chunk rather than getting one each.
 *
 * They are a single component over five content entries, so five chunks would be five
 * copies of the same JSX plus five network round trips, and a visitor who reads two of
 * them is a visitor who was interested — not one who should pay for a second download.
 */
const IndustryPage = lazy(() =>
  import('../features/industries/IndustryPage').then((module) => ({
    default: module.IndustryPage,
  })),
);

/*
 * The teardown carries two `SiteMock` renderings and the whole sample review, and it is a
 * page somebody arrives at deliberately rather than on the way to somewhere else.
 */
const TeardownPage = lazy(() =>
  import('../features/teardown/TeardownPage').then((module) => ({ default: module.TeardownPage })),
);

const PlayBookPage = lazy(() =>
  import('../features/playbook/PlayBookPage').then((module) => ({ default: module.PlayBookPage })),
);

const WorkbookPage = lazy(() =>
  import('../features/playbook/WorkbookPage').then((module) => ({ default: module.WorkbookPage })),
);

export function App() {
  return (
    <BrowserRouter>
      {/*
       * The suspense boundary is inside `SiteLayout`, around the outlet, so the header
       * and footer stay on screen while a lazy chunk arrives. Putting it here instead
       * would unmount the whole shell for those few frames.
       */}
      <Routes>
        <Route element={<SiteLayout />}>
          <Route path={routes.home} element={<HomePage />} />
          <Route path={routes.services} element={<ServicesPage />} />
          <Route path={routes.portfolio} element={<PortfolioPage />} />
          <Route path={routes.audit} element={<AuditPage />} />
          {/*
           * Generated from the same list the pages, the metadata and the audit's trade
           * question are generated from, so a sixth trade is one entry in
           * `config/trades.ts` plus one entry in `content/industries.ts` — never a route
           * somebody forgot to register.
           */}
          {tradesWithPages.map((trade) => (
            <Route
              key={trade.slug}
              path={industryPath(trade.slug)}
              element={<IndustryPage slug={trade.slug} />}
            />
          ))}
          <Route path={routes.teardown} element={<TeardownPage />} />
          <Route path={routes.playbook} element={<PlayBookPage />} />
          {/* Unlinked and noindex. Opened to print the workbook to PDF — see the route table. */}
          <Route path={routes.workbook} element={<WorkbookPage />} />
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
