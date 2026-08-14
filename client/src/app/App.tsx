import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { adminRoutePatterns, appProjectRoutePatterns, routes } from '../config/routes';
import { industryPath, tradesWithPages } from '../config/trades';
import { AuthLayout } from '../components/layout/AuthLayout';
import { SiteLayout } from '../components/layout/SiteLayout';
import { ErrorBoundary } from './ErrorBoundary';
import { AuthProvider } from '../features/auth/AuthContext';
import { RequireAuth } from './router/RequireAuth';
import { RequireAdmin } from './router/RequireAdmin';
import { HomePage } from '../features/public/home/HomePage';
import { AboutPage } from '../features/public/about/AboutPage';
import { ServicesPage } from '../features/public/services/ServicesPage';
import { PortfolioPage } from '../features/public/portfolio/PortfolioPage';
import { ContactPage } from '../features/public/contact/ContactPage';
import { PrivacyPage } from '../features/public/legal/PrivacyPage';
import { TermsPage } from '../features/public/legal/TermsPage';
import { NotFoundPage } from '../features/public/notFound/NotFoundPage';

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
  import('../features/public/audit/AuditPage').then((module) => ({ default: module.AuditPage })),
);

/*
 * The five industry pages share one lazy chunk rather than getting one each.
 *
 * They are a single component over five content entries, so five chunks would be five
 * copies of the same JSX plus five network round trips, and a visitor who reads two of
 * them is a visitor who was interested — not one who should pay for a second download.
 */
const IndustryPage = lazy(() =>
  import('../features/public/industries/IndustryPage').then((module) => ({
    default: module.IndustryPage,
  })),
);

/*
 * The teardown carries two `SiteMock` renderings and the whole sample review, and it is a
 * page somebody arrives at deliberately rather than on the way to somewhere else.
 */
const TeardownPage = lazy(() =>
  import('../features/public/teardown/TeardownPage').then((module) => ({
    default: module.TeardownPage,
  })),
);

const PlayBookPage = lazy(() =>
  import('../features/public/playbook/PlayBookPage').then((module) => ({
    default: module.PlayBookPage,
  })),
);

/*
 * The capability library. Lazy for the same reason the industry pages are, and with a
 * sharper edge: `content/capabilities.ts` is the largest single content module in the
 * repository, it is deliberately absent from `content/index.ts`, and only this route reads
 * it. Importing it eagerly would put forty capabilities into the chunk every visitor to the
 * homepage downloads — the exact failure documented at the bottom of `content/index.ts`, and
 * the one `scripts/check-budget.ts` exists to fail the build over.
 */
const CapabilitiesPage = lazy(() =>
  import('../features/public/capabilities/CapabilitiesPage').then((module) => ({
    default: module.CapabilitiesPage,
  })),
);

/*
 * ============================================================================
 * THE DEMONSTRATION SITES
 * ============================================================================
 *
 * Four lazy components sharing one chunk: the shell and the three page templates. Each
 * trade's *content* is a further chunk of its own, loaded by `content/demos/index.ts` —
 * so opening the HVAC demo costs the shell plus HVAC, not five businesses.
 *
 * That splits differently from the five industry pages on purpose. Those are pure text and
 * share one chunk because a reader of two of them should not pay a second round trip;
 * these carry a palette, a set of photographs and three pages of copy each, which is a
 * different weight class and a reader who opens one rarely opens two.
 *
 * ## Why they are registered outside `SiteLayout`
 *
 * `SiteLayout` paints the JobForge header and footer. A demonstration of an HVAC
 * company's website cannot be wrapped in another company's navigation — the thing being
 * demonstrated is what it is like to arrive at *that business*. `DemoLayout` is a second
 * shell with the same responsibilities, plus the disclosure bar.
 */
const DemoLayout = lazy(() =>
  import('../features/public/demo/DemoLayout').then((module) => ({ default: module.DemoLayout })),
);

const DemoHomePage = lazy(() =>
  import('../features/public/demo/DemoHomePage').then((module) => ({
    default: module.DemoHomePage,
  })),
);

const DemoServicesPage = lazy(() =>
  import('../features/public/demo/DemoServicesPage').then((module) => ({
    default: module.DemoServicesPage,
  })),
);

const DemoContactPage = lazy(() =>
  import('../features/public/demo/DemoContactPage').then((module) => ({
    default: module.DemoContactPage,
  })),
);

const WorkbookPage = lazy(() =>
  import('../features/public/playbook/WorkbookPage').then((module) => ({
    default: module.WorkbookPage,
  })),
);

/*
 * The post-deposit page. Lazy for the same arithmetic as the PlayBook: an onboarding
 * form only a paying client ever opens has no business in the bundle every visitor to
 * the homepage downloads.
 */
const WelcomePage = lazy(() =>
  import('../features/public/welcome/WelcomePage').then((module) => ({
    default: module.WelcomePage,
  })),
);

/*
 * ============================================================================
 * THE ACCOUNT PAGES AND THE PRIVATE APPLICATION
 * ============================================================================
 *
 * Every one of these is lazy, and the reason is the payload budget rather than taste.
 *
 * A visitor arriving at the homepage from a search for "hvac website" is, statistically,
 * never going to sign in. Putting the authentication context, five private pages, a
 * second layout and a Google integration into the chunk they download would be handing
 * the eager bundle an entire second application — on a site whose own audit tells local
 * business owners to be honest about whether every script is earning its place.
 *
 * `scripts/check-budget.ts` is what keeps that true rather than aspirational: it
 * measures the eager payload on every production build, and eagerly importing any of
 * the below would fail it.
 *
 * The two sign-in pages share a chunk with each other and with the Google button,
 * because a visitor who opens one very often opens the other.
 * ============================================================================
 */
const LoginPage = lazy(() =>
  import('../features/auth/pages/LoginPage').then((module) => ({ default: module.LoginPage })),
);

const SignupPage = lazy(() =>
  import('../features/auth/pages/SignupPage').then((module) => ({ default: module.SignupPage })),
);

const ForgotPasswordPage = lazy(() =>
  import('../features/auth/pages/PasswordPages').then((module) => ({
    default: module.ForgotPasswordPage,
  })),
);

const ResetPasswordPage = lazy(() =>
  import('../features/auth/pages/PasswordPages').then((module) => ({
    default: module.ResetPasswordPage,
  })),
);

const VerifyEmailPage = lazy(() =>
  import('../features/auth/pages/PasswordPages').then((module) => ({
    default: module.VerifyEmailPage,
  })),
);

const AppLayout = lazy(() =>
  import('../components/layout/AppLayout').then((module) => ({ default: module.AppLayout })),
);

/*
 * The internal surface. Four lazy chunks, so nothing about operating the business reaches the
 * bundle a customer — or a marketing visitor — downloads.
 */
const AdminLayout = lazy(() =>
  import('../features/admin/AdminLayout').then((module) => ({ default: module.AdminLayout })),
);

const AdminProjectsPage = lazy(() =>
  import('../features/admin/AdminProjectsPage').then((module) => ({
    default: module.AdminProjectsPage,
  })),
);

const AdminProjectPage = lazy(() =>
  import('../features/admin/AdminProjectPage').then((module) => ({
    default: module.AdminProjectPage,
  })),
);

const AdminAccountsPage = lazy(() =>
  import('../features/admin/AdminAccountsPage').then((module) => ({
    default: module.AdminAccountsPage,
  })),
);

const DashboardPage = lazy(() =>
  import('../features/private/dashboard/DashboardPage').then((module) => ({
    default: module.DashboardPage,
  })),
);

const PrivateAssessmentPage = lazy(() =>
  import('../features/private/assessment/AssessmentPage').then((module) => ({
    default: module.AssessmentPage,
  })),
);

const StartAssessmentPage = lazy(() =>
  import('../features/private/assessment/StartAssessmentPage').then((module) => ({
    default: module.StartAssessmentPage,
  })),
);

const ProjectsPage = lazy(() =>
  import('../features/private/projects/ProjectsPage').then((module) => ({
    default: module.ProjectsPage,
  })),
);

const ProjectPage = lazy(() =>
  import('../features/private/projects/ProjectPage').then((module) => ({
    default: module.ProjectPage,
  })),
);

const BillingPage = lazy(() =>
  import('../features/private/billing/BillingPage').then((module) => ({
    default: module.BillingPage,
  })),
);

const AccountPage = lazy(() =>
  import('../features/private/account/AccountPage').then((module) => ({
    default: module.AccountPage,
  })),
);

export function App() {
  return (
    /*
     * The outermost boundary, and the only one that can catch a throw in the layout
     * itself — `SiteLayout` has its own around the routed page, which handles the far more
     * common case without taking the header and footer down with it. See `ErrorBoundary`.
     */
    <ErrorBoundary variant="whole" label="app">
      <BrowserRouter>
        {/*
         * One `AuthProvider` around the whole router, public routes included.
         *
         * The marketing header needs to know whether somebody is signed in — a returning
         * customer should see "Dashboard" rather than "Sign in" — so the provider cannot
         * live inside the `/app` boundary. It is a single `/api/auth/me` on load and
         * nothing else for an anonymous visitor.
         */}
        <AuthProvider>
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
              <Route path={routes.capabilities} element={<CapabilitiesPage />} />
              {/* Unlinked and noindex. Opened to print the workbook to PDF — see the route table. */}
              <Route path={routes.workbook} element={<WorkbookPage />} />
              <Route path={routes.about} element={<AboutPage />} />
              <Route path={routes.contact} element={<ContactPage />} />
              {/* Post-deposit onboarding, reached from Stripe's checkout redirect. */}
              <Route path={routes.welcome} element={<WelcomePage />} />
              <Route path={routes.privacy} element={<PrivacyPage />} />
              <Route path={routes.terms} element={<TermsPage />} />

              <Route path="*" element={<NotFoundPage />} />
            </Route>

            {/*
             * ====================================================================
             * THE CREDENTIAL PAGES — THEIR OWN SHELL, NO MARKETING CHROME
             * ====================================================================
             *
             * These were inside `SiteLayout`, and the note there argued that somebody
             * signing in is still on the marketing site so the header should stay. That is
             * true of a visitor browsing and false of one filling in a credential form:
             * five nav destinations, an assessment call to action, a phone number and a
             * full footer are all invitations to go somewhere other than the single field
             * being asked for.
             *
             * `AuthLayout` replaces the lot with one back control, and keeps the `<main>`
             * landmark, the focus move on navigation and the per-path error boundary — the
             * parts of the shell that are accessibility rather than marketing.
             * ====================================================================
             */}
            <Route element={<AuthLayout />}>
              <Route path={routes.login} element={<LoginPage />} />
              <Route path={routes.signup} element={<SignupPage />} />
              <Route path={routes.forgotPassword} element={<ForgotPasswordPage />} />
              <Route path={routes.resetPassword} element={<ResetPasswordPage />} />
              <Route path={routes.verifyEmail} element={<VerifyEmailPage />} />
            </Route>

            {/*
             * ====================================================================
             * THE PRIVATE APPLICATION
             * ====================================================================
             *
             * Outside `SiteLayout`, with its own shell and its own suspense boundary — the
             * same arrangement the demonstration sites use, and for a related reason: this
             * is a different surface, not a marketing page with a sidebar bolted on.
             *
             * `RequireAuth` is the only guard, and it is on the layout route. A page added
             * underneath it is protected before anybody writes a line of it. It is *not*
             * the security boundary; see the note in that file and the `requireAuth` on the
             * server's `/api/app` mount, which is.
             * ====================================================================
             */}
            <Route
              element={
                <Suspense fallback={null}>
                  <RequireAuth />
                </Suspense>
              }
            >
              <Route path={routes.appDashboard} element={<AppLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="assessment">
                  <Route index element={<PrivateAssessmentPage />} />
                  {/*
                   * The assessment itself, inside the workspace. A signed-in customer is
                   * never sent to `/audit` for this — see `appAssessmentStart`.
                   */}
                  <Route path="start" element={<StartAssessmentPage />} />
                </Route>

                <Route path="projects">
                  <Route index element={<ProjectsPage />} />
                  {/*
                   * The four project views are routes rather than local state, so a
                   * customer can send somebody a link to their preview and the back button
                   * moves between tabs the way it should.
                   */}
                  <Route
                    path={appProjectRoutePatterns.overview}
                    element={<ProjectPage tab="overview" />}
                  />
                  <Route
                    path={appProjectRoutePatterns.preview}
                    element={<ProjectPage tab="preview" />}
                  />
                  <Route
                    path={appProjectRoutePatterns.feedback}
                    element={<ProjectPage tab="feedback" />}
                  />
                  <Route
                    path={appProjectRoutePatterns.tasks}
                    element={<ProjectPage tab="tasks" />}
                  />
                </Route>

                <Route path="billing" element={<BillingPage />} />
                <Route path="account" element={<AccountPage />} />

                {/* An unknown path under `/app` is still a page that does not exist. */}
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Route>

            {/*
             * ==================================================================
             * THE INTERNAL ADMIN SURFACE
             * ==================================================================
             *
             * Its own guard and its own layout, outside `RequireAuth` rather than nested inside
             * it — `RequireAdmin` performs the signed-in check itself, and nesting would mean an
             * anonymous visitor bouncing to `/login` with `state.from` carrying a staff-only
             * path into a form's state.
             *
             * **`RequireAdmin` is not the security boundary and cannot be.** The role it reads
             * arrived over the network into a JavaScript variable, and anybody can edit that.
             * Defeating it renders an admin layout whose every request comes back 404 from
             * `requireAdmin` on the server. See the long note in that file.
             *
             * Lazy, so none of this reaches the bundle a customer downloads.
             * ==================================================================
             */}
            <Route
              element={
                <Suspense fallback={null}>
                  <RequireAdmin />
                </Suspense>
              }
            >
              <Route path={routes.admin} element={<AdminLayout />}>
                <Route index element={<AdminProjectsPage />} />
                <Route path={adminRoutePatterns.projects} element={<AdminProjectsPage />} />
                <Route path={adminRoutePatterns.project} element={<AdminProjectPage />} />
                <Route path={adminRoutePatterns.accounts} element={<AdminAccountsPage />} />

                {/* An unknown path under `/admin` is still a page that does not exist. */}
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Route>

            {/*
             * Outside `SiteLayout`, with a suspense boundary of its own.
             *
             * The boundary has to be here rather than inside `DemoLayout`, because the layout
             * itself suspends: it calls `use()` on the trade's content chunk to get the palette
             * and the business name, both of which the shell needs before it can paint
             * anything at all.
             */}
            <Route
              path="/demo/:trade"
              element={
                <Suspense fallback={null}>
                  <DemoLayout />
                </Suspense>
              }
            >
              <Route index element={<DemoHomePage />} />
              <Route path="services" element={<DemoServicesPage />} />
              <Route path="contact" element={<DemoContactPage />} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
