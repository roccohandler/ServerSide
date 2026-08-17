import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { routes } from '../../../config/routes';
import { findPageMeta } from '../../../content';
import { useDocumentMeta } from '../../../hooks/useDocumentMeta';
import { useAuth } from '../../../session';
import { AuthShell } from '../components/AuthShell';
import { CredentialForm } from '../components/CredentialForm';
import { GoogleSignInButton } from '../components/GoogleSignInButton';
import { credentialPagePath, DEFAULT_LANDING, useCredentialPage } from '../useCredentialPage';

const meta = findPageMeta(routes.signup);

/**
 * `/signup`.
 *
 * Deliberately not a separate page for Google. The same button appears here as on the
 * sign-in page and does the same thing: Google tells us whether this account already
 * exists, and it is not a question a visitor should have to answer by choosing the
 * right page first.
 */
export function SignupPage() {
  useDocumentMeta(meta ?? { path: routes.signup, title: 'Create an account', description: '' });

  const { status } = useAuth();
  const location = useLocation();
  const { busy, failure, hasDraft, submitCredentials, submitGoogleCredential } =
    useCredentialPage('signup');

  /* A mirror of the form's email field, for the cross-link. See `LoginPage`. */
  const [typedEmail, setTypedEmail] = useState('');

  /* Whether the ways *in* are still live choices. See the note in `AuthShell`. */
  const [atEntryStep, setAtEntryStep] = useState(true);

  if (status === 'authenticated') {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from ?? DEFAULT_LANDING} replace />;
  }

  return (
    <AuthShell
      title="Create an account"
      /*
       * What the account holds, then what it costs — in that order, which is the same
       * order `/get-my-assessment` puts its two clauses in.
       *
       * It used to be the second clause alone: "Free, and nothing is charged until you
       * choose to go ahead." That is a true sentence and it was the right one while every
       * visitor arrived here from a page full of prices, either by following the ember
       * button or by crossing over from `/login`. It answers a pricing objection.
       *
       * DECISION 031 put "Create an account" in the header of every page, and somebody who
       * clicks *that* has a different question — "what is the account for" — which the
       * pricing sentence never addressed. So the answer leads and the reassurance follows,
       * word for word as it was, because it is still worth saying second.
       */
      lede="Your assessment, your website project and your billing, in one place. Free, and nothing is charged until you choose to go ahead."
      /* The one page where an agreement is actually being entered into. */
      legal
      notice={
        hasDraft ? (
          <p>
            <strong>Your assessment answers are saved.</strong> Create an account and your score and
            recommendations will be waiting on your dashboard.
          </p>
        ) : null
      }
      alternative={
        atEntryStep ? (
          <GoogleSignInButton busy={busy} onCredential={submitGoogleCredential} />
        ) : null
      }
      footer={
        atEntryStep ? (
          <>
            {/* `state` and the typed address both cross with them — see `LoginPage`. */}
            Already have an account?{' '}
            <Link to={credentialPagePath(routes.login, typedEmail)} state={location.state}>
              Sign in
            </Link>
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
