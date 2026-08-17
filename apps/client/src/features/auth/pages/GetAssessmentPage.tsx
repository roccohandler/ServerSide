import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { routes, sections } from '../../../config/routes';
import { findPageMeta } from '../../../content';
import { useDocumentMeta } from '../../../hooks/useDocumentMeta';
import { track } from '../../../lib/analytics';
import { useAuth } from '../../../session';
import { AuthShell } from '../components/AuthShell';
import { CredentialForm } from '../components/CredentialForm';
import { GoogleSignInButton } from '../components/GoogleSignInButton';
import { credentialPagePath, useCredentialPage } from '../useCredentialPage';

const meta = findPageMeta(routes.getAssessment);

/**
 * ============================================================================
 * `/get-my-assessment` — WHERE EVERY PRIMARY BUTTON ON THE SITE LANDS
 * ============================================================================
 *
 * The first of the two steps DECISION 028 replaced the contact form with. This one creates
 * the account; `/app/assessment/request` asks the four questions the account cannot answer.
 *
 * ## Why this is a page and not `/signup?intent=assessment`
 *
 * Because the frame is the point. `/signup` is headed "Create an account" and leads with
 * "nothing is charged until you choose to go ahead" — a true sentence that answers a
 * question nobody clicking "Get my free website assessment" was asking, and never mentions
 * the assessment at all. A button that lands somewhere which has changed the subject reads
 * as a bait-and-switch even when nothing is being switched.
 *
 * It is also the URL a campaign, a business card or a phone call can point at, and the one
 * a funnel report can be grouped by. `/signup` is reached from four places and cannot tell
 * you which of them was working.
 *
 * ## Why it is not a second credential form
 *
 * It is the same `AuthShell` and the same `CredentialForm` as `/signup`, in signup mode.
 * Everything specific to this page is copy. That matters more than it looks: the four-file
 * vocabulary rule in `CredentialForm` ("the phrase is *create an account*, and only the
 * person changes"), the password manager handling, the stepped focus management and the
 * server-error placement are all subtle and all hard-won, and a second form would have
 * exactly one of them at a time.
 *
 * ## Why it lives in `features/auth` rather than `features/public`
 *
 * The boundaries separate audiences, and the audience here is somebody with no session
 * proving who they are. That is what this boundary is. It also means this page shares the
 * lazy chunk with `/login` and `/signup`, which is right — a visitor who opens one very
 * often opens another.
 * ============================================================================
 */
export function GetAssessmentPage() {
  useDocumentMeta(
    meta ?? { path: routes.getAssessment, title: 'Get your assessment', description: '' },
  );

  const { status } = useAuth();
  const location = useLocation();
  const { busy, failure, hasDraft, submitCredentials, submitGoogleCredential } = useCredentialPage(
    'signup',
    {
      /*
       * The request step, not the dashboard. They pressed a button asking for an
       * assessment; the account is halfway. See `CredentialPageOptions`.
       */
      defaultLanding: routes.appAssessmentRequest,
      /* The conversion this page exists to produce. See `lib/analytics.ts`. */
      onAuthenticated: () => track('assessment_account_created'),
    },
  );

  /* A mirror of the form's email field, for the cross-link. See `LoginPage`. */
  const [typedEmail, setTypedEmail] = useState('');

  /* Whether the ways *in* are still live choices. See the note in `AuthShell`. */
  const [atEntryStep, setAtEntryStep] = useState(true);

  /*
   * Once per visit, latched, and before the redirect below can fire.
   *
   * The denominator for the whole funnel: how many people the button actually delivers here
   * against how many of them finish the account step. Firing it on every render would make
   * the ratio meaningless, and firing it after the authenticated redirect would count
   * somebody who never saw the page.
   */
  const viewedRef = useRef(false);
  useEffect(() => {
    if (viewedRef.current) return;
    viewedRef.current = true;
    track('assessment_signup_viewed');
  }, []);

  /*
   * Somebody who is already signed in does not need an account. They go straight to the
   * step that is actually outstanding — and if they have already sent a request, that page
   * says so rather than asking twice.
   */
  if (status === 'authenticated') {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from ?? routes.appAssessmentRequest} replace />;
  }

  return (
    <AuthShell
      title="Get your free website assessment"
      /*
       * What they get, then what it costs them, in that order and in one line each. The
       * second half is the one that does the work: the objection at this exact moment is
       * "why do I have to make an account to get a free thing", and the honest answer —
       * it is where the findings go — is better than not mentioning it.
       */
      lede="We look at your website the way a customer does and tell you what is costing you calls. Start with your email address; the findings and your score live in your account."
      /* The one page where an agreement is actually being entered into. */
      legal
      notice={
        hasDraft ? (
          <p>
            <strong>Your assessment answers are saved.</strong> Create an account and your score and
            recommendations will be waiting on your dashboard.
          </p>
        ) : (
          <p>
            Free, and there is nothing to pay at any point in this. Two minutes, then four short
            questions.
          </p>
        )
      }
      alternative={
        atEntryStep ? (
          <GoogleSignInButton busy={busy} onCredential={submitGoogleCredential} />
        ) : null
      }
      footer={
        atEntryStep ? (
          <>
            {/*
             * Two ways out, and both are deliberate.
             *
             * The first is for the returning customer — `state` and the typed address cross
             * with them, see `LoginPage`.
             *
             * The second is the escape hatch this whole change is only defensible with.
             * Putting an account in front of the primary call to action trades some volume
             * for a record that survives abandonment, and the honest version of that trade
             * leaves the door open for somebody who would simply rather send a message.
             * `/contact` is unchanged and one click away.
             */}
            Already have an account?{' '}
            <Link to={credentialPagePath(routes.login, typedEmail)} state={location.state}>
              Sign in
            </Link>
            . Or <Link to={`${routes.contact}#${sections.request}`}>send us a message instead</Link>
            .
          </>
        ) : null
      }
    >
      <CredentialForm
        mode="signup"
        busy={busy}
        failure={failure}
        onSubmit={submitCredentials}
        onEmailChange={setTypedEmail}
        onEntryStepChange={setAtEntryStep}
      />
    </AuthShell>
  );
}
