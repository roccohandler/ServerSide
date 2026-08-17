import { lazy } from 'react';
import { Route } from 'react-router-dom';
import { routes } from '../../config/routes';
import { AuthLayout } from '../../components/layout/AuthLayout';

/*
 * ============================================================================
 * THE CREDENTIAL PAGES — THEIR OWN SHELL, NO MARKETING CHROME
 * ============================================================================
 *
 * These were inside `SiteLayout`, and the note there argued that somebody signing in is
 * still on the marketing site so the header should stay. That is true of a visitor
 * browsing and false of one filling in a credential form: five nav destinations, an
 * assessment call to action, a phone number and a full footer are all invitations to go
 * somewhere other than the single field being asked for.
 *
 * `AuthLayout` replaces the lot with one back control, and keeps the `<main>` landmark,
 * the focus move on navigation and the per-path error boundary — the parts of the shell
 * that are accessibility rather than marketing.
 *
 * ## All lazy, and the two sign-in pages share a chunk
 *
 * A visitor arriving at the homepage from a search for "hvac website" is, statistically,
 * never going to sign in. `LoginPage` and `SignupPage` share a chunk with each other and
 * with the Google button, because a visitor who opens one very often opens the other; the
 * three password and verification pages share `PasswordPages` for the same reason.
 * ============================================================================
 */

/*
 * The assessment funnel's front door, and the busiest destination in this file: every
 * primary call to action on the marketing site points at it. Same chunk as the other two
 * credential pages, which is right — it *is* one of them, with a different frame.
 */
const GetAssessmentPage = lazy(() =>
  import('../../features/auth/pages/GetAssessmentPage').then((module) => ({
    default: module.GetAssessmentPage,
  })),
);

const LoginPage = lazy(() =>
  import('../../features/auth/pages/LoginPage').then((module) => ({ default: module.LoginPage })),
);

const SignupPage = lazy(() =>
  import('../../features/auth/pages/SignupPage').then((module) => ({ default: module.SignupPage })),
);

const ForgotPasswordPage = lazy(() =>
  import('../../features/auth/pages/PasswordPages').then((module) => ({
    default: module.ForgotPasswordPage,
  })),
);

const ResetPasswordPage = lazy(() =>
  import('../../features/auth/pages/PasswordPages').then((module) => ({
    default: module.ResetPasswordPage,
  })),
);

const VerifyEmailPage = lazy(() =>
  import('../../features/auth/pages/PasswordPages').then((module) => ({
    default: module.VerifyEmailPage,
  })),
);

export const authRoutes = (
  <Route element={<AuthLayout />}>
    <Route path={routes.getAssessment} element={<GetAssessmentPage />} />
    <Route path={routes.login} element={<LoginPage />} />
    <Route path={routes.signup} element={<SignupPage />} />
    <Route path={routes.forgotPassword} element={<ForgotPasswordPage />} />
    <Route path={routes.resetPassword} element={<ResetPasswordPage />} />
    <Route path={routes.verifyEmail} element={<VerifyEmailPage />} />
  </Route>
);
