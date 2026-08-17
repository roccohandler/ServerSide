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

const meta = findPageMeta(routes.login);

/**
 * `/login`.
 *
 * Public, and the only page in the application that a signed-in visitor is bounced
 * *away* from: arriving here with a live session means a stale bookmark, and showing
 * somebody a sign-in form they do not need is the same confusion as showing an
 * anonymous visitor a dashboard.
 */
export function LoginPage() {
  useDocumentMeta(meta ?? { path: routes.login, title: 'Sign in', description: '' });

  const { status } = useAuth();
  const location = useLocation();
  const { busy, failure, hasDraft, submitCredentials, submitGoogleCredential } =
    useCredentialPage('login');

  /*
   * A mirror of the form's email field, held only so the link below can carry it. The
   * field itself belongs to `CredentialForm`; the cross-link belongs here, because it sits
   * in the shell's footer under the Google option rather than inside the form.
   */
  const [typedEmail, setTypedEmail] = useState('');

  /* Whether the ways *in* are still live choices. See the note in `AuthShell`. */
  const [atEntryStep, setAtEntryStep] = useState(true);

  if (status === 'authenticated') {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from ?? DEFAULT_LANDING} replace />;
  }

  return (
    <AuthShell
      title="Sign in"
      /*
       * One line, not two. The long version — "your assessment, your website project and
       * your billing are all in one place" — is a benefit statement, and the person reading
       * it has already decided: they have an account and they are signing into it. It wrapped
       * to two lines in a 27rem card and pushed the fold on a laptop to say something nobody
       * on this page needed persuading of. The full sentence still does its job on the page
       * where the decision is live, which is the marketing site.
       */
      lede="Your project, your assessment and your billing."
      notice={
        hasDraft ? (
          <p>
            <strong>Your assessment answers are saved.</strong> Sign in and we will file them
            against your account straight away — you will not have to answer anything twice.
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
            {/*
             * `state` is passed on deliberately. The route guard stashed where this visitor
             * was going, and a plain link dropped it — so somebody who followed a deep link
             * into the application, decided they needed an account and switched pages was
             * landed on the dashboard instead of where they had asked to go.
             */}
            New here?{' '}
            <Link to={credentialPagePath(routes.signup, typedEmail)} state={location.state}>
              Create an account
            </Link>
            .
          </>
        ) : null
      }
    >
      <CredentialForm
        mode="login"
        busy={busy}
        failure={failure}
        onSubmit={submitCredentials}
        onEmailChange={setTypedEmail}
        onEntryStepChange={setAtEntryStep}
      />
    </AuthShell>
  );
}
