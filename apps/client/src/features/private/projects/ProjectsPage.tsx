import { Link, Navigate } from 'react-router-dom';
import { useResource } from '@jobforge/ui';
import { appProjectPath, routes } from '../../../config/routes';
import { useDocumentMeta } from '../../../hooks/useDocumentMeta';
import { fetchProjects } from '../services/appApi';
import { AppEmpty, AppError, AppLoading } from '../../../components/patterns/AppState';
import { ProgressBar } from '../components/ProgressBar';
import styles from './Project.module.css';

/*
 * `/app/projects`.
 *
 * Almost every customer has exactly one project, so this page mostly redirects straight
 * into it — a list of one is a click somebody did not need to make. The list is still
 * built, and rendered when there are two or more, because the domain has always allowed
 * several and "one user, one project" is exactly the assumption that becomes expensive
 * to unpick later.
 */
export function ProjectsPage() {
  useDocumentMeta({
    path: routes.appProjects,
    title: 'Your website',
    description: 'Your website project: progress, preview, feedback and approval.',
  });

  const { data, failure, isLoading, reload } = useResource('projects', fetchProjects);

  /*
   * `onRetry`, which this page was the only data-backed screen in the application not to
   * offer. Its failure was a dead end: most of what lands here is a network blip, and the
   * only way out was a browser reload — on the page a customer opens to find their own
   * website.
   */
  if (failure) return <AppError failure={failure} onRetry={reload} />;
  if (isLoading || !data) return <AppLoading label="Loading your projects" />;

  const projects = data.projects;

  if (projects.length === 0) {
    return (
      /*
       * ==========================================================================
       * WHY THIS POINTS AT THE DASHBOARD AND NOT AT BILLING
       * ==========================================================================
       *
       * It used to read "See what is involved" and go to `/app/billing`, which is right for
       * exactly one of the people who reach this page: somebody who has had the conversation
       * and is deciding whether to pay.
       *
       * Since DECISION 028 the commonest visitor here is somebody else entirely — an account
       * created by "Get my free website assessment" who has not yet asked for anything. The
       * console calls them the call list. Sending that person to a payment page, before
       * anybody has spoken to them, asks for money in answer to a question they have not been
       * given the chance to ask.
       *
       * This page cannot tell the two apart, and it must not try. `chooseCurrentAction` on
       * the server decides what somebody's next step is — one ordered walk, exactly one
       * answer, priority written down — and the dashboard is where that answer is rendered.
       * A second screen guessing at a next step is a second definition of the same rule in
       * the place least able to get it right, which is the failure `features/conversations`
       * exists to avoid and the same failure in a different corner of the product.
       *
       * So this says what is true here, and sends them to the one place that knows what is
       * true next.
       * ==========================================================================
       */
      <AppEmpty
        title="No website project yet"
        body="When your build starts, this is where it lives: progress, your preview link, and everything we need from you."
        action={{ label: 'See what happens next', to: routes.appDashboard }}
      />
    );
  }

  // `replace`, so the back button leaves the application rather than bouncing here.
  if (projects.length === 1 && projects[0]) {
    return <Navigate to={appProjectPath(projects[0].id)} replace />;
  }

  return (
    <div className={styles['page']}>
      <h1 className={styles['title']}>Your websites</h1>

      <ul className={styles['taskList']}>
        {projects.map((project) => (
          <li key={project.id} className={styles['task']}>
            <div className={styles['taskText']}>
              <h2 className={styles['taskTitle']}>
                <Link to={appProjectPath(project.id)}>{project.businessName}</Link>
              </h2>
              <p className={styles['taskDescription']}>{project.milestoneLabel}</p>
              <ProgressBar
                step={project.progress.step}
                total={project.progress.total}
                label={`Step ${project.progress.step} of ${project.progress.total}`}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
