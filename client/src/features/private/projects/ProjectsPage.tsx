import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { appProjectPath, routes } from '../../../config/routes';
import { useDocumentMeta } from '../../../hooks/useDocumentMeta';
import type { ApiFailure, ProjectView } from '../../../types/api';
import { fetchProjects } from '../api/appApi';
import { AppEmpty, AppError, AppLoading } from '../components/AppState';
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

  const [projects, setProjects] = useState<readonly ProjectView[] | null>(null);
  const [failure, setFailure] = useState<ApiFailure | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    void fetchProjects(controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      if (result.success) setProjects(result.data.projects);
      else setFailure(result);
    });

    return () => controller.abort();
  }, []);

  if (failure) return <AppError failure={failure} />;
  if (!projects) return <AppLoading label="Loading your projects" />;

  if (projects.length === 0) {
    return (
      <AppEmpty
        title="No website project yet"
        body="Once you go ahead, this is where your build lives: progress, your preview link, and everything we need from you."
        action={{ label: 'See what is involved', to: routes.appBilling }}
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
