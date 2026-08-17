import { lazy, Suspense } from 'react';
import { Route } from 'react-router-dom';
import { appProjectRoutePatterns, routes } from '../../config/routes';
import { NotFoundPage } from '../../features/public/notFound';
import { RouteFallback } from '../../components/patterns/RouteFallback';
import { RequireAuth } from '../router/RequireAuth';

/*
 * ============================================================================
 * THE CUSTOMER PORTAL
 * ============================================================================
 *
 * Outside `SiteLayout`, with its own shell and its own suspense boundary — the same
 * arrangement the demonstration sites use, and for a related reason: this is a different
 * surface, not a marketing page with a sidebar bolted on.
 *
 * `RequireAuth` is the only guard, and it is on the layout route. A page added underneath
 * it is protected before anybody writes a line of it. It is *not* the security boundary;
 * see the note in that file and the `requireAuth` on the server's `/api/app` mount, which
 * is.
 *
 * Every page here is lazy, and the reason is the payload budget rather than taste. Putting
 * the authentication context, five private pages, a second layout and a Google integration
 * into the chunk a marketing visitor downloads would be handing the eager bundle an entire
 * second application — on a site whose own audit tells local business owners to be honest
 * about whether every script is earning its place.
 *
 * This module and `adminRoutes.tsx` are deliberately separate and neither imports the
 * other. That is DECISION 021 option A, and ESLint enforces it in both directions: the
 * owner console and the customer portal stay separable without paying for two builds.
 * ============================================================================
 */

const AppLayout = lazy(() =>
  import('../../components/layout/AppLayout').then((module) => ({ default: module.AppLayout })),
);

const DashboardPage = lazy(() =>
  import('../../features/private/dashboard/DashboardPage').then((module) => ({
    default: module.DashboardPage,
  })),
);

const PrivateAssessmentPage = lazy(() =>
  import('../../features/private/assessment/AssessmentPage').then((module) => ({
    default: module.AssessmentPage,
  })),
);

const StartAssessmentPage = lazy(() =>
  import('../../features/private/assessment/StartAssessmentPage').then((module) => ({
    default: module.StartAssessmentPage,
  })),
);

/*
 * Where `/get-my-assessment` lands somebody the moment their account exists. The busiest
 * page in the private application by arrivals, and the one the dashboard sends anybody back
 * to who left before finishing it.
 */
const RequestAssessmentPage = lazy(() =>
  import('../../features/private/assessment/RequestAssessmentPage').then((module) => ({
    default: module.RequestAssessmentPage,
  })),
);

const ProjectsPage = lazy(() =>
  import('../../features/private/projects/ProjectsPage').then((module) => ({
    default: module.ProjectsPage,
  })),
);

const ProjectPage = lazy(() =>
  import('../../features/private/projects/ProjectPage').then((module) => ({
    default: module.ProjectPage,
  })),
);

const ReportsPage = lazy(() =>
  import('../../features/private/reports/ReportsPage').then((module) => ({
    default: module.ReportsPage,
  })),
);

const MessagesPage = lazy(() =>
  import('../../features/private/messages/MessagesPage').then((module) => ({
    default: module.MessagesPage,
  })),
);

const BillingPage = lazy(() =>
  import('../../features/private/billing/BillingPage').then((module) => ({
    default: module.BillingPage,
  })),
);

const AccountPage = lazy(() =>
  import('../../features/private/account/AccountPage').then((module) => ({
    default: module.AccountPage,
  })),
);

export const privateRoutes = (
  <Route
    element={
      /*
       * Two waits nest here — this boundary is for `AppLayout`'s own chunk, and `RequireAuth`
       * inside it waits on the session check. Both used to render `null`, so a first visit to
       * `/app` on a slow connection was a blank document for the sum of the two, with the
       * marketing shell already gone and nothing yet to replace it.
       */
      <Suspense fallback={<RouteFallback label="Loading your workspace" />}>
        <RequireAuth />
      </Suspense>
    }
  >
    <Route path={routes.appDashboard} element={<AppLayout />}>
      <Route index element={<DashboardPage />} />
      <Route path="assessment">
        <Route index element={<PrivateAssessmentPage />} />
        {/*
         * The assessment itself, inside the workspace. A signed-in customer is never sent
         * to `/audit` for this — see `appAssessmentStart`.
         */}
        <Route path="start" element={<StartAssessmentPage />} />
        {/*
         * The request — a review by a person — as opposed to `start`, which is the
         * twenty-question scorecard somebody fills in about themselves. Two different
         * things that the marketing site has always called by one name; see the note on
         * `appAssessmentRequest` in `config/routes.ts`.
         */}
        <Route path="request" element={<RequestAssessmentPage />} />
      </Route>

      <Route path="projects">
        <Route index element={<ProjectsPage />} />
        {/*
         * The four project views are routes rather than local state, so a customer can
         * send somebody a link to their preview and the back button moves between tabs the
         * way it should.
         */}
        <Route path={appProjectRoutePatterns.overview} element={<ProjectPage tab="overview" />} />
        <Route path={appProjectRoutePatterns.preview} element={<ProjectPage tab="preview" />} />
        <Route path={appProjectRoutePatterns.feedback} element={<ProjectPage tab="feedback" />} />
        <Route path={appProjectRoutePatterns.tasks} element={<ProjectPage tab="tasks" />} />
      </Route>

      <Route path="reports" element={<ReportsPage />} />
      <Route path="messages" element={<MessagesPage />} />
      <Route path="billing" element={<BillingPage />} />
      <Route path="account" element={<AccountPage />} />

      {/* An unknown path under `/app` is still a page that does not exist. */}
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Route>
);
