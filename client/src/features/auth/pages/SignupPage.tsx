import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { routes } from '../../../config/routes';
import { findPageMeta } from '../../../content';
import { useDocumentMeta } from '../../../hooks/useDocumentMeta';
import { useAuth } from '../useAuth';
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

  if (status === 'authenticated') {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from ?? DEFAULT_LANDING} replace />;
  }

  return (
    <AuthShell
      title="Create an account"
      lede="Free, and nothing is charged until you choose to go ahead."
      notice={
        hasDraft ? (
          <p>
            <strong>Your assessment answers are saved.</strong> Create an account and your score and
            recommendations will be waiting on your dashboard.
          </p>
        ) : null
      }
      alternative={<GoogleSignInButton busy={busy} onCredential={submitGoogleCredential} />}
      footer={
        <>
          {/* `state` and the typed address both cross with them — see `LoginPage`. */}
          Already have an account?{' '}
          <Link to={credentialPagePath(routes.login, typedEmail)} state={location.state}>
            Sign in
          </Link>
          .
        </>
      }
    >
      <CredentialForm
        mode="signup"
        busy={busy}
        failure={failure}
        onSubmit={submitCredentials}
        onEmailChange={setTypedEmail}
      />
    </AuthShell>
  );
}
