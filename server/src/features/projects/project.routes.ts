import { Router } from 'express';
import { success } from '../../lib/apiResponse.js';
import { pathParam } from '../../lib/requestSchema.js';
import { requireCapability, requireRequestAuth } from '../auth/index.js';
import { toActivityView, type ActivityService } from '../activity/index.js';
import { toDeploymentView, type DeploymentService } from '../deployments/index.js';
import { toThreadViews, type FeedbackService } from '../feedback/index.js';
import { toTaskView, type TaskService } from '../tasks/index.js';
import { createProjectAccess, requireProject } from './project.access.js';
import { parseAddComment, parseListQuery } from './project.schema.js';
import type { ProjectService } from './project.service.js';
import { toCustomerProjectView } from './project.types.js';

export interface ProjectRoutesDependencies {
  readonly projectService: ProjectService;
  readonly taskService: TaskService;
  readonly feedbackService: FeedbackService;
  readonly deploymentService: DeploymentService;
  readonly activityService: ActivityService;
}

const RECENT_DEPLOYMENTS = 10;
const RECENT_ACTIVITY = 20;

/**
 * `/api/app/projects` — the customer's own projects.
 *
 * Two shapes of route, and the difference is the whole authorization story:
 *
 *   - `/` is scoped by the session. It cannot return anything but the caller's own.
 *   - `/:projectId/...` goes through `createProjectAccess`, which resolves the id and
 *     answers NOT_FOUND for anything that is not theirs. Everything nested under it
 *     inherits that check rather than repeating it.
 *
 * Nothing here returns a `StoredProject`. `toCustomerProjectView` is an explicit
 * allow-list, so the Stripe ids and internal notes on the same document cannot reach a
 * browser by somebody forgetting to strip them.
 */
export function createProjectRouter(dependencies: ProjectRoutesDependencies): Router {
  const { projectService, taskService, feedbackService, deploymentService, activityService } =
    dependencies;

  const router = Router();

  router.get('/', requireCapability('project:read:own'), async (request, response) => {
    const auth = requireRequestAuth(request);
    const { limit } = parseListQuery(request.query);

    const projects = await projectService.listForOwner(auth.user.id, limit);
    response.json(success({ projects: projects.map(toCustomerProjectView) }));
  });

  /*
   * Everything below is one project, already authorized. `mergeParams` is what lets the
   * nested routers see `:projectId`.
   */
  const one = Router({ mergeParams: true });
  one.use(requireCapability('project:read:own'), createProjectAccess(projectService));

  one.get('/', async (request, response) => {
    const project = requireProject(request);
    response.json(success({ project: toCustomerProjectView(project) }));
  });

  /** Everything the project page needs, in one request rather than five. */
  one.get('/overview', async (request, response) => {
    const project = requireProject(request);

    const [tasks, comments, deployments, activity] = await Promise.all([
      taskService.listForProject(project.id),
      feedbackService.listForProject(project.id),
      deploymentService.listForProject(project.id, RECENT_DEPLOYMENTS),
      activityService.listForProject({
        projectId: project.id,
        limit: RECENT_ACTIVITY,
        customerVisibleOnly: true,
      }),
    ]);

    response.json(
      success({
        project: toCustomerProjectView(project),
        tasks: tasks.map(toTaskView),
        feedback: toThreadViews(comments),
        deployments: deployments.map(toDeploymentView),
        activity: activity.map(toActivityView),
      }),
    );
  });

  /* ---------------------------------------------------------------- tasks */

  one.get('/tasks', async (request, response) => {
    const project = requireProject(request);
    const tasks = await taskService.listForProject(project.id);
    response.json(success({ tasks: tasks.map(toTaskView) }));
  });

  one.post(
    '/tasks/:taskId/complete',
    requireCapability('task:write:own'),
    async (request, response) => {
      const project = requireProject(request);
      const task = await taskService.findById(pathParam(request.params, 'taskId'));

      /*
       * The task has to be on *this* project. Without that comparison, a valid task id
       * from another customer's project would be completed here — the project check
       * above would pass, and the task id would be trusted on its own.
       */
      if (!task || task.projectId !== project.id) {
        response.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'No task with that id.' },
        });
        return;
      }

      const completed = await taskService.complete(task);

      /*
       * The last onboarding task arriving is what starts the build. Done here rather
       * than inside the task service, which knows nothing about projects and should
       * not — the dependency runs projects → tasks, never back.
       */
      const updated = await projectService.refreshOnboardingProgress(project);

      response.json(
        success({
          task: toTaskView(completed),
          project: toCustomerProjectView(updated),
        }),
      );
    },
  );

  /* ------------------------------------------------------------- feedback */

  one.get('/feedback', async (request, response) => {
    const project = requireProject(request);
    const comments = await feedbackService.listForProject(project.id);
    response.json(success({ feedback: toThreadViews(comments) }));
  });

  one.post('/feedback', requireCapability('feedback:write:own'), async (request, response) => {
    const project = requireProject(request);
    const auth = requireRequestAuth(request);
    const input = parseAddComment(request.body);

    await feedbackService.addComment({
      projectId: project.id,
      author: auth.user,
      body: input.body,
      parentId: input.parentId,
    });

    // The whole thread back, so the client re-renders from one source of truth rather
    // than splicing a new comment into a list it hopes is still current.
    const comments = await feedbackService.listForProject(project.id);
    response.status(201).json(success({ feedback: toThreadViews(comments) }));
  });

  /* ------------------------------------------------------------- approval */

  /*
   * The two explicit actions. A comment saying "looks good" is a comment; approval is
   * this endpoint, and it records who and when — see `project.service.ts`.
   */
  one.post('/approve', requireCapability('project:write:own'), async (request, response) => {
    const project = requireProject(request);
    const auth = requireRequestAuth(request);

    const approved = await projectService.approve({ project, approvedBy: auth.user });
    response.json(success({ project: toCustomerProjectView(approved) }));
  });

  one.post(
    '/request-changes',
    requireCapability('project:write:own'),
    async (request, response) => {
      const project = requireProject(request);
      const auth = requireRequestAuth(request);

      const updated = await projectService.requestChanges({ project, requestedBy: auth.user });
      response.json(success({ project: toCustomerProjectView(updated) }));
    },
  );

  /* ---------------------------------------------------------- deployments */

  one.get('/deployments', async (request, response) => {
    const project = requireProject(request);
    const deployments = await deploymentService.listForProject(project.id, RECENT_DEPLOYMENTS);
    response.json(success({ deployments: deployments.map(toDeploymentView) }));
  });

  router.use('/:projectId', one);

  return router;
}
