import { useState } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import {
  appProjectFeedbackPath,
  appProjectPath,
  appProjectPreviewPath,
  appProjectTasksPath,
} from '../../../config/routes';
import { useDocumentMeta } from '../../../hooks/useDocumentMeta';
import type { ApiFailure, ApiResult } from '../../../types/api';
import { addComment, approveProject, completeTask, requestChanges } from '../api/appApi';
import { AppError, AppLoading } from '../components/AppState';
import { ProgressBar } from '../components/ProgressBar';
import { useProjectOverview } from './useProjectOverview';
import { TaskList } from './TaskList';
import { FeedbackThread } from './FeedbackThread';
import { ApprovalPanel } from './ApprovalPanel';
import { PreviewPanel } from './PreviewPanel';
import styles from './Project.module.css';

/*
 * ============================================================================
 * `/app/projects/:projectId` — THE PROJECT PORTAL
 * ============================================================================
 *
 * One page with four tabs, rather than four pages, because all four read the same
 * `/overview` response and splitting them would mean four requests for one project.
 * The tabs are real routes so a customer can link somebody to their preview.
 *
 * ## What is deliberately never on this page
 *
 * Git output, build logs, deployment ids, database state, internal error text. A
 * customer looking at their own website project is entitled to know what is happening
 * and whose move it is; they are not entitled to our stack traces, and showing them one
 * makes a problem look like their problem.
 *
 * The one place a technical failure could surface is a deployment that errored, and that
 * activity entry is marked internal on the server — so it cannot reach here at all.
 * ============================================================================
 */

type Tab = 'overview' | 'preview' | 'feedback' | 'tasks';

export interface ProjectPageProps {
  readonly tab?: Tab;
}

export function ProjectPage({ tab = 'overview' }: ProjectPageProps) {
  const { projectId } = useParams<{ projectId: string }>();
  const { data, failure, isLoading, isMutating, reload, mutate } = useProjectOverview(projectId);
  const [actionFailure, setActionFailure] = useState<ApiFailure | null>(null);

  useDocumentMeta({
    path: projectId ? appProjectPath(projectId) : '/app/projects',
    title: data ? `${data.project.businessName} — your website` : 'Your website',
    description: 'Your website project: progress, preview, feedback and approval.',
  });

  if (failure) return <AppError failure={failure} onRetry={reload} />;
  if (isLoading || !data) return <AppLoading label="Loading your project" />;

  const { project, tasks, feedback, deployments } = data;
  const openTasks = tasks.filter((task) => task.status === 'open');

  async function run(action: () => Promise<ApiResult<unknown>>) {
    setActionFailure(await mutate(action));
  }

  return (
    <div className={styles['page']}>
      <header className={styles['header']}>
        <h1 className={styles['title']}>{project.businessName}</h1>

        <p className={styles['status']}>{project.milestoneLabel}</p>
        <p className={styles['statusDetail']}>{project.milestoneDetail}</p>

        <ProgressBar
          step={project.progress.step}
          total={project.progress.total}
          label={`Step ${project.progress.step} of ${project.progress.total}`}
        />
      </header>

      {/*
       * Real links rather than buttons, so each view has a URL somebody can share and
       * the browser's back button behaves. The counts are part of the label so a screen
       * reader hears "Things we need, 3" rather than a number floating beside it.
       */}
      <nav className={styles['tabs']} aria-label="This project">
        <NavLink end to={appProjectPath(project.id)} className={tabClass}>
          Overview
        </NavLink>
        <NavLink to={appProjectPreviewPath(project.id)} className={tabClass}>
          Preview
        </NavLink>
        <NavLink to={appProjectFeedbackPath(project.id)} className={tabClass}>
          Feedback
          {feedback.filter((thread) => !thread.resolved).length > 0
            ? ` (${feedback.filter((thread) => !thread.resolved).length})`
            : ''}
        </NavLink>
        <NavLink to={appProjectTasksPath(project.id)} className={tabClass}>
          Things we need{openTasks.length > 0 ? ` (${openTasks.length})` : ''}
        </NavLink>
      </nav>

      {actionFailure ? (
        <p className={styles['actionError']} role="alert">
          {actionFailure.error.message}
        </p>
      ) : null}

      {tab === 'overview' ? (
        <div className={styles['sections']}>
          <PreviewPanel project={project} deployments={deployments} />
          <ApprovalPanel
            project={project}
            busy={isMutating}
            onApprove={() => run(() => approveProject(project.id))}
            onRequestChanges={() => run(() => requestChanges(project.id))}
          />
          <TaskList
            tasks={tasks}
            busy={isMutating}
            onComplete={(taskId) => run(() => completeTask(project.id, taskId))}
          />
        </div>
      ) : null}

      {tab === 'preview' ? (
        <div className={styles['sections']}>
          <PreviewPanel project={project} deployments={deployments} />
          <ApprovalPanel
            project={project}
            busy={isMutating}
            onApprove={() => run(() => approveProject(project.id))}
            onRequestChanges={() => run(() => requestChanges(project.id))}
          />
        </div>
      ) : null}

      {tab === 'feedback' ? (
        <FeedbackThread
          threads={feedback}
          busy={isMutating}
          onSubmit={(body, parentId) =>
            run(() => addComment(project.id, parentId ? { body, parentId } : { body }))
          }
        />
      ) : null}

      {tab === 'tasks' ? (
        <TaskList
          tasks={tasks}
          busy={isMutating}
          onComplete={(taskId) => run(() => completeTask(project.id, taskId))}
        />
      ) : null}
    </div>
  );
}

function tabClass({ isActive }: { isActive: boolean }): string {
  return [styles['tab'], isActive ? styles['tabActive'] : undefined].filter(Boolean).join(' ');
}
