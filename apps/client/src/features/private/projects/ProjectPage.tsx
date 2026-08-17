import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  appProjectFeedbackPath,
  appProjectPath,
  appProjectPreviewPath,
  appProjectTasksPath,
} from '../../../config/routes';
import { useDocumentMeta } from '../../../hooks/useDocumentMeta';
import type { ApiFailure, ApiResult, ProjectView } from '@jobforge/shared';
import { addComment, approveProject, completeTask, requestChanges } from '../services/appApi';
import { AppError, AppLoading } from '../../../components/patterns/AppState';
import { Tabs } from '@jobforge/ui';
import { Notice } from '../../../components/patterns/Notice';
import { useAnnounce } from '../../../components/patterns/useAnnounce';
/*
 * Reached directly rather than through `content/index.ts`, and deliberately — the same
 * reason `content/capabilities.ts` is absent from that barrel. Every marketing component
 * imports the barrel, so a module re-exported from it lands in the chunk every visitor to
 * the homepage downloads, however carefully the component using it was split.
 */
import { workspace } from '../../../content/app';
import { ProgressBar } from '../components/ProgressBar';
import { useProjectOverview } from './useProjectOverview';
import { TaskList } from './TaskList';
import { FilesPanel } from './FilesPanel';
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

/**
 * The launch estimate, as a sentence rather than a labelled field.
 *
 * "We are aiming to have this live by 4 September" is a person speaking. A `<dt>Estimated
 * completion</dt>` beside a date is a database column, and the difference matters here more
 * than anywhere else on the page: this is the number a customer repeats to their own
 * customers, and the words around it are what say how firm it is.
 *
 * The locale is the reader's — this runs in their browser, which is exactly the case
 * `packages/ui/src/intl.test.ts` exists to protect, and the opposite of the server-side
 * formatter in `notification.service.ts` where there is no reader to ask. `month: 'long'`
 * regardless, because `04/09` is two different days on two sides of an ocean.
 */
function estimateSentence(project: ProjectView): string {
  const target = new Date(project.estimatedCompletionAt ?? '');
  if (Number.isNaN(target.getTime())) return '';

  const date = target.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const said = project.estimateUpdatedAt ? new Date(project.estimateUpdatedAt) : null;
  const age =
    said && !Number.isNaN(said.getTime())
      ? ` We last updated this on ${said.toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}.`
      : '';

  return `We are aiming to have your website live by ${date}.${age}`;
}

export interface ProjectPageProps {
  readonly tab?: Tab;
}

export function ProjectPage({ tab = 'overview' }: ProjectPageProps) {
  const { projectId } = useParams<{ projectId: string }>();
  const { data, failure, isLoading, isMutating, reload, mutate } = useProjectOverview(projectId);
  const [actionFailure, setActionFailure] = useState<ApiFailure | null>(null);
  const announce = useAnnounce();

  useDocumentMeta({
    path: projectId ? appProjectPath(projectId) : '/app/projects',
    title: data ? `${data.project.businessName} — your website` : 'Your website',
    description: 'Your website project: progress, preview, feedback and approval.',
  });

  if (failure) return <AppError failure={failure} onRetry={reload} />;
  if (isLoading || !data) return <AppLoading label="Loading your project" />;

  const { project, tasks, feedback, deployments, files } = data;
  const openTasks = tasks.filter((task) => task.status === 'open');
  const unresolved = feedback.filter((thread) => !thread.resolved).length;

  /**
   * Runs one operation, reports what happened, and says it out loud.
   *
   * The announcement is the half that was missing. A failure was already announced —
   * `Notice` with the `problem` tone carries `role="alert"` — and a success was not, so
   * pressing "Approve website", which this page describes as the one irreversible thing on
   * it, produced no confirmation at all for somebody using a screen reader. The panel
   * changed, which is a confirmation only if you can see it.
   *
   * `succeeded` is required rather than optional, so a new operation cannot be added without
   * deciding what it says.
   */
  async function run(action: () => Promise<ApiResult<unknown>>, succeeded: string) {
    const rejected = await mutate(action);
    setActionFailure(rejected);
    if (!rejected) announce(succeeded);
  }

  return (
    <div className={styles['page']}>
      <header className={styles['header']}>
        <h1 className={styles['title']}>{project.businessName}</h1>

        <p className={styles['status']}>{project.milestoneLabel}</p>
        <p className={styles['statusDetail']}>{project.milestoneDetail}</p>

        {/*
         * The launch date, when there is one.
         *
         * Absent renders nothing at all — not "date to be confirmed", not a placeholder, not
         * a dash. Early in a build there genuinely is no answer, and a line of furniture where
         * a date will eventually go trains the reader to stop looking at that spot. When one
         * arrives it appears, and it arrives with the day it was last said beside it, because
         * a date whose age is unknowable is one they stop believing after the first slip.
         */}
        {project.estimatedCompletionAt ? (
          <p className={styles['statusDetail']}>{estimateSentence(project)}</p>
        ) : null}

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
       *
       * `Tabs` is a `<nav>` of links and deliberately not an ARIA tablist — see its header.
       */}
      <Tabs
        label="This project"
        items={[
          { to: appProjectPath(project.id), label: 'Overview', end: true },
          { to: appProjectPreviewPath(project.id), label: 'Preview' },
          {
            to: appProjectFeedbackPath(project.id),
            label: unresolved > 0 ? `Feedback (${unresolved})` : 'Feedback',
          },
          {
            to: appProjectTasksPath(project.id),
            label: openTasks.length > 0 ? `Things we need (${openTasks.length})` : 'Things we need',
          },
        ]}
      />

      {actionFailure ? <Notice tone="problem">{actionFailure.error.message}</Notice> : null}

      {tab === 'overview' ? (
        <div className={styles['sections']}>
          <PreviewPanel project={project} deployments={deployments} />
          <ApprovalPanel
            project={project}
            busy={isMutating}
            onApprove={() => run(() => approveProject(project.id), workspace.announce.approved)}
            onRequestChanges={() =>
              run(() => requestChanges(project.id), workspace.announce.changesRequested)
            }
          />
          <TaskList
            projectId={project.id}
            tasks={tasks}
            files={files}
            busy={isMutating}
            onComplete={(taskId) =>
              run(() => completeTask(project.id, taskId), workspace.announce.taskCompleted)
            }
            onUploaded={reload}
          />
          <FilesPanel projectId={project.id} files={files} onChanged={reload} />
        </div>
      ) : null}

      {tab === 'preview' ? (
        <div className={styles['sections']}>
          <PreviewPanel project={project} deployments={deployments} />
          <ApprovalPanel
            project={project}
            busy={isMutating}
            onApprove={() => run(() => approveProject(project.id), workspace.announce.approved)}
            onRequestChanges={() =>
              run(() => requestChanges(project.id), workspace.announce.changesRequested)
            }
          />
        </div>
      ) : null}

      {tab === 'feedback' ? (
        <FeedbackThread
          threads={feedback}
          busy={isMutating}
          onSubmit={(body, parentId) =>
            run(
              () => addComment(project.id, parentId ? { body, parentId } : { body }),
              workspace.announce.commentSent,
            )
          }
        />
      ) : null}

      {tab === 'tasks' ? (
        <div className={styles['sections']}>
          <TaskList
            projectId={project.id}
            tasks={tasks}
            files={files}
            busy={isMutating}
            onComplete={(taskId) =>
              run(() => completeTask(project.id, taskId), workspace.announce.taskCompleted)
            }
            onUploaded={reload}
          />
          {/*
           * The Files panel lives on the tasks tab as well as the overview, because the tasks
           * tab is where somebody arrives from "Send us what we need" on the dashboard — and
           * the second thing they want after sending a logo is to see that it arrived.
           */}
          <FilesPanel projectId={project.id} files={files} onChanged={reload} />
        </div>
      ) : null}
    </div>
  );
}
