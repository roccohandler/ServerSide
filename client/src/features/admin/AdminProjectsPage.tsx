import { Link } from 'react-router-dom';
import { adminProjectPath } from '../../config/routes';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { AppError, AppLoading } from '../private/components/AppState';
import { fetchAdminProjects } from './api/adminApi';
import { useAdminResource } from './useAdminResource';
import styles from './Admin.module.css';

/*
 * Every project, newest first — the surface an operator starts their day on.
 *
 * ## The columns are chosen from what actually blocks work
 *
 * Not "all the fields we have". Each one answers a question that otherwise costs a database
 * query or a guess:
 *
 *   - **Waiting on** — whose move it is. The single most useful column, and the same question
 *     the customer dashboard is built around.
 *   - **Account** — whether a customer account is attached. This is not trivia: adding a task
 *     to a project with no `ownerUserId` is refused by the server with "a task would have
 *     nobody to appear for", and before this column there was no way to see that coming.
 *   - **Paid** — deposit and final, because "can I start" and "can I launch" are both
 *     payment questions.
 *
 * ## Why the table is not sortable or filterable
 *
 * There is one operator and a handful of projects. A sort control is a feature to build,
 * maintain and test in exchange for solving a problem that arrives at a few hundred rows.
 * Newest-first from the server is the ordering that matters until then, and saying so is
 * cheaper than pretending an empty backlog is a design.
 */
export function AdminProjectsPage() {
  useDocumentMeta({ path: '/admin', title: 'Internal — projects', description: '' });

  const { data, failure, isLoading, reload } = useAdminResource('projects', fetchAdminProjects);

  if (failure) {
    /*
     * The likeliest failure here is a 404 from `requireAdmin` — a session that has lost its
     * admin role, or somebody who reached the page without one. The server's message is shown
     * as-is rather than being translated into "you are not an admin", because the server is
     * deliberately not saying that and the client should not fill the gap in.
     */
    return <AppError failure={failure} onRetry={reload} />;
  }

  if (isLoading || !data) return <AppLoading label="Loading projects" />;

  const projects = data.projects;

  if (projects.length === 0) {
    return (
      <div className={styles['panel']}>
        <h1 className={styles['heading']}>No projects yet</h1>
        <p className={styles['muted']}>
          A project is created when a deposit is paid, or by hand through the owner-only billing
          endpoints. Nothing here is broken.
        </p>
      </div>
    );
  }

  return (
    <div className={styles['panel']}>
      <h1 className={styles['heading']}>Projects</h1>
      <p className={styles['muted']}>
        {projects.length} {projects.length === 1 ? 'project' : 'projects'}, newest first.
      </p>

      <div className={styles['tableScroll']} tabIndex={0} role="region" aria-label="All projects">
        <table className={styles['table']}>
          <thead>
            <tr>
              <th scope="col">Business</th>
              <th scope="col">Milestone</th>
              <th scope="col">Waiting on</th>
              <th scope="col">Account</th>
              <th scope="col">Deposit</th>
              <th scope="col">Final</th>
              <th scope="col">Plan</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id}>
                <th scope="row">
                  <Link to={adminProjectPath(project.id)} className={styles['rowLink']}>
                    {project.businessName}
                  </Link>
                  <span className={styles['rowSub']}>{project.email}</span>
                </th>
                <td>{project.milestone}</td>
                <td>
                  {/*
                   * The raw approval state, not a re-derived "waiting on" verdict.
                   *
                   * The customer-facing `waitingOnCustomer` flag is computed on the server from
                   * the milestone, and it lives on `ProjectView` — which this surface
                   * deliberately does not use, because staff need the stored record. Mapping it
                   * again here would be a second copy of that rule in the least authoritative
                   * place, and the first version of this cell got the enum wrong while doing
                   * it: it tested for `changes-requested` when the value is `changes_requested`,
                   * so the branch was dead. Showing the stored value is both honest and correct.
                   */}
                  {project.approval}
                </td>
                <td>
                  {project.ownerUserId ? (
                    'Linked'
                  ) : (
                    <span className={styles['warn']}>None — tasks will fail</span>
                  )}
                </td>
                <td>{project.depositStatus}</td>
                <td>{project.finalStatus}</td>
                <td>{project.subscriptionStatus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
