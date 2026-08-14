import { useId, useState, type FormEvent } from 'react';
import { Button } from '../../../components/ui/Button';
import { TextField } from '../../../components/ui/Field';
import { routes } from '../../../config/routes';
import { useDocumentMeta } from '../../../hooks/useDocumentMeta';
import type { ApiFailure } from '../../../types/api';
import { useAuth } from '../../auth/useAuth';
import * as authApi from '../../auth/api/authApi';
import styles from '../billing/Billing.module.css';

/*
 * `/app/account`.
 *
 * Three things: who you are, how you sign in, and your password.
 *
 * ## The sign-in methods list is honest about Google
 *
 * An account that has only ever used Google has no password, and this page says so
 * rather than showing a change-password form that could not work. The way to add one is
 * the reset flow, which proves control of the mailbox first — the same bar every other
 * password on the system had to clear.
 */
export function AccountPage() {
  useDocumentMeta({
    path: routes.appAccount,
    title: 'Account',
    description: 'Your name, your sign-in methods and your password.',
  });

  const prefix = useId();
  const { user, setUser } = useAuth();

  const [name, setName] = useState(user?.name ?? '');
  const [businessName, setBusinessName] = useState(user?.businessName ?? '');
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileFailure, setProfileFailure] = useState<ApiFailure | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordFailure, setPasswordFailure] = useState<ApiFailure | null>(null);

  const [verificationSent, setVerificationSent] = useState(false);

  if (!user) return null;

  const hasPassword = user.authProviders.includes('password');
  const hasGoogle = user.authProviders.includes('google');

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (profileBusy) return;

    setProfileBusy(true);
    setProfileSaved(false);
    setProfileFailure(null);

    const result = await authApi.updateProfile({
      name: name.trim(),
      ...(businessName.trim() ? { businessName: businessName.trim() } : {}),
    });

    setProfileBusy(false);

    if (result.success) {
      // Keeps the header in step without a reload.
      setUser(result.data.user);
      setProfileSaved(true);
    } else {
      setProfileFailure(result);
    }
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (passwordBusy) return;

    setPasswordBusy(true);
    setPasswordSaved(false);
    setPasswordFailure(null);

    const result = await authApi.changePassword({ currentPassword, newPassword });
    setPasswordBusy(false);

    if (result.success) {
      setPasswordSaved(true);
      setCurrentPassword('');
      setNewPassword('');
    } else {
      setPasswordFailure(result);
    }
  }

  return (
    <div className={styles['page']}>
      <h1 className={styles['title']}>Account</h1>

      <section className={styles['panel']} aria-labelledby="account-profile">
        <h2 id="account-profile" className={styles['panelTitle']}>
          Your details
        </h2>

        {profileFailure ? (
          <p className={styles['error']} role="alert">
            {profileFailure.error.message}
          </p>
        ) : null}

        <form onSubmit={saveProfile} noValidate>
          <TextField
            id={`${prefix}-name`}
            label="Your name"
            autoComplete="name"
            required
            value={name}
            error={profileFailure?.error.fields?.['name']}
            onChange={(event) => setName(event.target.value)}
          />
          <TextField
            id={`${prefix}-business`}
            label="Business name"
            optionalLabel="optional"
            autoComplete="organization"
            value={businessName}
            error={profileFailure?.error.fields?.['businessName']}
            onChange={(event) => setBusinessName(event.target.value)}
          />
          <div className={styles['actions']}>
            <Button type="submit" disabled={profileBusy}>
              {profileBusy ? 'Saving…' : 'Save changes'}
            </Button>
            {profileSaved ? (
              <p className={styles['panelMeta']} role="status">
                Saved.
              </p>
            ) : null}
          </div>
        </form>
      </section>

      <section className={styles['panel']} aria-labelledby="account-signin">
        <h2 id="account-signin" className={styles['panelTitle']}>
          How you sign in
        </h2>

        <dl className={styles['definitions']}>
          <div>
            <dt>Email address</dt>
            <dd>{user.email}</dd>
          </div>
          <div>
            <dt>Confirmed</dt>
            <dd>{user.emailVerified ? 'Yes' : 'Not yet'}</dd>
          </div>
          <div>
            <dt>Methods</dt>
            <dd>
              {[hasPassword ? 'Password' : null, hasGoogle ? 'Google' : null]
                .filter(Boolean)
                .join(' and ')}
            </dd>
          </div>
        </dl>

        {!user.emailVerified ? (
          <div className={styles['actions']}>
            <Button
              variant="secondary"
              disabled={verificationSent}
              onClick={() => {
                void authApi.resendVerification().then(() => setVerificationSent(true));
              }}
            >
              {verificationSent ? 'Sent — check your inbox' : 'Send the confirmation link again'}
            </Button>
          </div>
        ) : null}
      </section>

      <section className={styles['panel']} aria-labelledby="account-password">
        <h2 id="account-password" className={styles['panelTitle']}>
          Password
        </h2>

        {hasPassword ? (
          <>
            <p className={styles['panelBody']}>
              Changing your password signs out every other device.
            </p>

            {passwordFailure ? (
              <p className={styles['error']} role="alert">
                {passwordFailure.error.message}
              </p>
            ) : null}

            <form onSubmit={savePassword} noValidate>
              <TextField
                id={`${prefix}-current`}
                label="Current password"
                type="password"
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
              <TextField
                id={`${prefix}-new`}
                label="New password"
                type="password"
                autoComplete="new-password"
                required
                hint="At least 12 characters."
                value={newPassword}
                error={passwordFailure?.error.fields?.['newPassword']}
                onChange={(event) => setNewPassword(event.target.value)}
              />
              <div className={styles['actions']}>
                <Button type="submit" disabled={passwordBusy}>
                  {passwordBusy ? 'Saving…' : 'Change password'}
                </Button>
                {passwordSaved ? (
                  <p className={styles['panelMeta']} role="status">
                    Password changed.
                  </p>
                ) : null}
              </div>
            </form>
          </>
        ) : (
          <p className={styles['panelBody']}>
            You sign in with Google, so there is no password on this account. If you would like one,
            use <a href={routes.forgotPassword}>Forgot password</a> — we will email you a link to
            set one.
          </p>
        )}
      </section>
    </div>
  );
}
