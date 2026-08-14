import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { AppError, AppLoading } from '../private/components/AppState';
import { fetchAdminAccounts } from './api/adminApi';
import { useAdminResource } from './useAdminResource';
import styles from './Admin.module.css';

/*
 * Who has an account.
 *
 * ## Why this list exists
 *
 * The projects table can tell an operator that a project has no account attached, which is what
 * makes adding a task fail. It cannot tell them whether the person has an account under a
 * different address, which is the actual next question — and the answer decides between "ask
 * them to sign up" and "link the project to the account they already have".
 *
 * ## What is deliberately not on this page
 *
 * **No role control.** Promoting somebody to admin is not a button. It is
 * `npm run admin:create --workspace server`, run by an operator with server-side environment
 * access, and the reason is that a privilege grant should be a deliberate act with a person
 * behind it rather than a click available to anybody who has ever had a session. The repository
 * method that changes a role has exactly one caller and no HTTP route can reach it — a server
 * test asserts that.
 *
 * **No password anything.** No reset button, no "send a reset link", no hash. If a customer
 * cannot get in, they use the same forgotten-password flow everybody else uses; staff being
 * able to trigger a credential change on somebody else's account is a whole category of risk
 * bought for a convenience nobody has asked for yet.
 *
 * **No delete.** Deleting an account with a paid project attached is a data-integrity question
 * and a legal one (see the retention periods on the privacy page). It needs a decision about
 * what happens to the project, not a button.
 */
export function AdminAccountsPage() {
  useDocumentMeta({ path: '/admin/accounts', title: 'Internal — accounts', description: '' });

  const { data, failure, isLoading, reload } = useAdminResource('accounts', fetchAdminAccounts);

  if (failure) return <AppError failure={failure} onRetry={reload} />;
  if (isLoading || !data) return <AppLoading label="Loading accounts" />;

  const accounts = data.accounts;

  return (
    <div className={styles['panel']}>
      <h1 className={styles['heading']}>Accounts</h1>
      <p className={styles['muted']}>
        {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}, newest first. Roles are
        changed with the provisioning script, never from this page.
      </p>

      <div className={styles['tableScroll']} tabIndex={0} role="region" aria-label="All accounts">
        <table className={styles['table']}>
          <thead>
            <tr>
              <th scope="col">Email</th>
              <th scope="col">Name</th>
              <th scope="col">Business</th>
              <th scope="col">Role</th>
              <th scope="col">Verified</th>
              <th scope="col">Signs in with</th>
              <th scope="col">Has paid</th>
              <th scope="col">Last seen</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
              <tr key={account.id}>
                <th scope="row">{account.email}</th>
                <td>{account.name}</td>
                <td>{account.businessName ?? '—'}</td>
                <td>
                  {account.role === 'admin' ? (
                    <span className={styles['warn']}>admin</span>
                  ) : (
                    account.role
                  )}
                </td>
                <td>{account.emailVerified ? 'Yes' : 'No'}</td>
                <td>{account.authProviders.join(', ')}</td>
                <td>{account.hasStripeCustomer ? 'Yes' : 'No'}</td>
                <td>
                  {/*
                   * Date only. A timestamp to the second implies a precision that a rolling
                   * session's `lastUsedAt` does not have — it is written at most once an hour.
                   */}
                  {account.lastLoginAt ? account.lastLoginAt.slice(0, 10) : 'Never'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
