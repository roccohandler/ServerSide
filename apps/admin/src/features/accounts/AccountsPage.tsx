import { useCallback } from 'react';
import { Table } from '@jobforge/ui';
import { Empty, Failure, Loading } from '../../components/State';
import { SearchField } from '../../components/SearchField';
import { useSearchTerm } from '../../hooks/useSearchTerm';
import { useTitle } from '../../hooks/useTitle';
import { formatDate } from '../../utils/formatDate';
import { fetchAccounts } from '../../lib/endpoints';
import { usePagedResource } from '../../hooks/usePagedResource';
import { ShowMore } from '../../components/ShowMore';
import styles from '../projects/Projects.module.css';

/*
 * Who has an account — and, since DECISION 028, who has an account and has asked for nothing.
 *
 * ## Why this list exists
 *
 * The projects table can tell an operator that a project has no account attached, which is what
 * makes adding a task fail. It cannot tell them whether the person has an account under a
 * different address, which is the actual next question — and the answer decides between "ask
 * them to sign up" and "link the project to the account they already have".
 *
 * ## And why it is now a call list
 *
 * The site's primary call to action used to be a seven-field form that stored nothing until it
 * was finished, so somebody who typed their name and their email address and stopped left no
 * trace anywhere. It is now an account first and the request second, which means that person
 * is a **row on this page** — and the "Asked for" column is what separates them from the
 * customers who did finish.
 *
 * A `no` in that column is not missing data. It is somebody who came looking for a website
 * assessment, went to the trouble of choosing a password, and then stopped — which is the
 * warmest lead this business gets that nobody has spoken to. See
 * `docs/ACCOUNT-FIRST-CAPTURE.md`.
 *
 * The inbox deliberately does not show them. Its definition is everybody *waiting on a reply*,
 * and somebody who has not asked a question is not waiting for an answer — a second definition
 * of "unanswered" is the failure `features/conversations` exists to avoid.
 *
 * ## What is deliberately not on this page
 *
 * **No role control.** Promoting somebody to admin is not a button. It is
 * `npm run admin:create --workspace @jobforge/server`, run by an operator with server-side
 * environment access, and the reason is that a privilege grant should be a deliberate act with a
 * person behind it rather than a click available to anybody who has ever had a session. The
 * repository method that changes a role has exactly one caller and no HTTP route can reach it —
 * a server test asserts that.
 *
 * **No password anything.** No reset button, no "send a reset link", no hash. If a customer
 * cannot get in, they use the same forgotten-password flow everybody else uses; staff being
 * able to trigger a credential change on somebody else's account is a whole category of risk
 * bought for a convenience nobody has asked for yet.
 *
 * **No delete.** Deleting an account with a paid project attached is a data-integrity question
 * and a legal one (see the retention periods on the privacy page). It needs a decision about
 * what happens to the project, not a button.
 *
 * ## Why it borrows the projects stylesheet
 *
 * The table itself is `Table` in `@jobforge/ui` — see the note in Projects.module.css about
 * why that moved. What is still shared by name is the panel around it and the two row
 * treatments, because both pages are one panel around one table and they are the only two.
 */
export function AccountsPage() {
  useTitle('Accounts');

  const term = useSearchTerm();

  /* See the note on the same pattern in `ProjectsPage`: the key stays constant so the rows
     on screen survive a search, and it is the fetcher's identity that re-runs the load. */
  const load = useCallback(
    (limit: number, signal?: AbortSignal) => fetchAccounts(limit, term.committed, signal),
    [term.committed],
  );

  const { data, failure, isLoading, reload, showMore, loadingMore } = usePagedResource(
    'accounts',
    load,
  );

  if (failure) return <Failure failure={failure} onRetry={reload} />;
  if (isLoading || !data) return <Loading label="Loading accounts" />;

  const accounts = data.accounts;

  /*
   * Zero accounts rendered a table head, no rows, and the sentence "0 accounts, newest
   * first." — which reads as a query that went wrong rather than as a business that has not
   * had a sign-up yet. The neighbouring two screens both say why they are empty; this one
   * imported `Failure` and `Loading` and not `Empty`, and nothing pointed that out.
   *
   * The search box stays on screen when a search is what emptied it. Removing the control
   * that produced the empty state leaves somebody with no way back except the browser.
   */
  if (accounts.length === 0) {
    return (
      <div className={styles['panel']}>
        <h1 className={styles['heading']}>Accounts</h1>
        <SearchField id="account-search" label="Find an account" term={term} />
        {term.committed ? (
          <Empty
            title="Nothing matches"
            body="The search matches the start of an address, a name or a business — so “heating” will not find “Cascade Heating”. Try the first word."
          />
        ) : (
          <Empty
            title="No accounts yet"
            body="One appears here the moment somebody signs up — including anybody who creates an account for an assessment and stops before asking for it. Nothing here is broken."
          />
        )}
      </div>
    );
  }

  /*
   * Counted rather than implied. "Nine of twelve have not asked for anything" is a sentence an
   * owner acts on; a column somebody has to scan twelve rows to add up is a column they read
   * once and then stop reading.
   */
  const waiting = accounts.filter((account) => account.hasRequested === false).length;

  return (
    <div className={styles['panel']}>
      <h1 className={styles['heading']}>Accounts</h1>

      <SearchField id="account-search" label="Find an account" term={term} />

      <p className={styles['muted']}>
        {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}
        {term.committed ? ' matching' : ''}, newest first.{' '}
        {waiting > 0 ? (
          <>
            <strong>
              {waiting} {waiting === 1 ? 'has' : 'have'} not asked for anything yet
            </strong>{' '}
            — they made an account for an assessment and stopped. Roles are changed with the
            provisioning script, never from this page.
          </>
        ) : (
          'Roles are changed with the provisioning script, never from this page.'
        )}
      </p>

      <Table label="All accounts">
        <thead>
          <tr>
            <th scope="col">Email</th>
            <th scope="col">Name</th>
            <th scope="col">Business</th>
            {/* The two columns that make this a call list. See the note at the top. */}
            <th scope="col">Asked for</th>
            <th scope="col">Signed up</th>
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
              {/*
               * `data-label` on every cell. Below the tablet step the table stacks and the
               * column header moves into the cell from this attribute — see the media
               * query in Projects.module.css, which this page shares.
               */}
              <td data-label="Name">{account.name}</td>
              <td data-label="Business">{account.businessName ?? '—'}</td>
              {/*
               * "Nothing yet" rather than "No", and it carries the warning tone.
               *
               * "No" reads as a property of the person. This is a state of the funnel, and
               * it is the one row on the page worth doing something about — so it is
               * marked the same way an admin role is, because both are things an operator
               * should notice without looking for them.
               *
               * `undefined` prints an em dash: the field is optional on the view, and a
               * response from an older deployment saying nothing must not render as
               * "nothing yet", which is a claim.
               */}
              <td data-label="Asked for">
                {account.hasRequested === undefined ? (
                  '—'
                ) : account.hasRequested ? (
                  'An assessment'
                ) : (
                  <span className={styles['warn']}>Nothing yet</span>
                )}
              </td>
              {/*
               * Date only, matching "Last seen" below — and formatted rather than sliced.
               * `createdAt.slice(0, 10)` printed the UTC calendar day as though it were the
               * reader's, so an account created at 23:30 in Seattle showed tomorrow's date.
               * See `utils/formatDate.ts`.
               */}
              <td data-label="Signed up">{formatDate(account.createdAt)}</td>
              <td data-label="Role">
                {account.role === 'admin' ? (
                  <span className={styles['warn']}>admin</span>
                ) : (
                  account.role
                )}
              </td>
              <td data-label="Verified">{account.emailVerified ? 'Yes' : 'No'}</td>
              <td data-label="Signs in with">{account.authProviders.join(', ')}</td>
              <td data-label="Has paid">{account.hasStripeCustomer ? 'Yes' : 'No'}</td>
              <td data-label="Last seen">
                {/*
                 * Date only. A timestamp to the second implies a precision that a rolling
                 * session's `lastUsedAt` does not have — it is written at most once an hour.
                 *
                 * "Never" rather than the formatter's em dash: an account that has never
                 * signed in is a fact worth stating, not a missing field.
                 */}
                {account.lastLoginAt ? formatDate(account.lastLoginAt) : 'Never'}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <ShowMore
        showing={accounts.length}
        hasMore={data.hasMore}
        busy={loadingMore}
        onShowMore={showMore}
        noun="accounts"
      />
    </div>
  );
}
