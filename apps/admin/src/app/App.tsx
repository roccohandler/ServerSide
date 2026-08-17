import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { routePatterns } from '../config/routes';
import { AnnouncerProvider } from '../components/Announcer';
import { ConsoleFallback } from '../components/ConsoleFallback';
import { AdminSessionProvider } from '../session/AdminSession';
import { useAdminSession } from '../session/useAdminSession';
import { SignInPage } from '../features/signIn/SignInPage';
import { ConsoleLayout } from './ConsoleLayout';
import { InboxPage } from '../features/inbox/InboxPage';
import { ProjectsPage } from '../features/projects/ProjectsPage';
import { ProjectPage } from '../features/projects/ProjectPage';
import { AccountsPage } from '../features/accounts/AccountsPage';
import { OnboardingPage } from '../features/onboarding/OnboardingPage';

/*
 * ============================================================================
 * THE OWNER CONSOLE
 * ============================================================================
 *
 * One of two interfaces onto one system. The customer application is the other, and the
 * two never speak to each other — everything either of them knows came from
 * `apps/server`, which is where identity, authorisation and the database live.
 *
 * That is not a stylistic preference. Two browsers cannot trust each other: anything this
 * bundle "verifies" about a customer is a claim made by code the customer could have
 * modified. The server is the only place a claim can be checked, so it is the only place
 * a claim is checked.
 *
 *   customer app ─┐
 *                 ├─→ apps/server ─→ MongoDB
 *   owner console ┘
 *
 * ## Two states, and only two
 *
 * Signed out, the whole console is one form. Signed in *as an owner*, it is the console.
 * There is no third state where some of it renders — a half-authorised console teaches the
 * operator that some failures are normal, and this is the surface where that lesson is
 * most expensive.
 * ============================================================================
 */

function Console() {
  const session = useAdminSession();

  if (session.status === 'loading') {
    /*
     * Blank for the first 400ms, which is what this was and what its reasoning justified:
     * one request against a cookie the browser already has, and a spinner that flashes for
     * 40ms reads as jank.
     *
     * Past that the request is not landing — a cold serverless function, a slow link, or an
     * API that is down — and a blank charcoal page with no explanation is the worst of the
     * three ways to say so. `useDelayedFlag` keeps the fast case exactly as it was.
     */
    return <ConsoleFallback />;
  }

  if (session.status === 'anonymous') {
    return (
      <Routes>
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="*" element={<Navigate to="/sign-in" replace />} />
      </Routes>
    );
  }

  /*
   * Nothing here is lazy, and that is a decision rather than an oversight.
   *
   * The customer application splits every route because a visitor downloads it once over a
   * phone connection and most of them never reach a second page. This is four screens
   * behind a sign-in, opened by one person all day. Splitting it would trade a smaller
   * first paint for a spinner between Inbox and Projects — the wrong side of that trade for
   * a tool, and `scripts/check-budget.ts` guards the bundle that actually matters.
   */
  return (
    <Routes>
      <Route element={<ConsoleLayout />}>
        <Route index element={<InboxPage />} />
        <Route path={routePatterns.projects} element={<ProjectsPage />} />
        <Route path={routePatterns.project} element={<ProjectPage />} />
        <Route path={routePatterns.accounts} element={<AccountsPage />} />
        <Route path={routePatterns.onboarding} element={<OnboardingPage />} />
        {/* Signing in again when already signed in is just the console. */}
        <Route path="sign-in" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      {/*
       * Above the session, so the live region exists in both of the console's two states.
       * A sign-in failure and a reply-sent confirmation then travel the same way; see the
       * note in `components/Announcer`.
       */}
      <AnnouncerProvider>
        <AdminSessionProvider>
          <Console />
        </AdminSessionProvider>
      </AnnouncerProvider>
    </BrowserRouter>
  );
}
