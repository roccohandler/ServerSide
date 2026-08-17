import { Router } from 'express';
import { AppError } from '../../lib/appError.js';
import { success } from '../../lib/apiResponse.js';
import { pathParam } from '../../lib/requestSchema.js';
import { requireCapability, requireRequestAuth } from '../auth/index.js';
import { toActivityView, type ActivityService } from '../activity/index.js';
import { toDeploymentView, type DeploymentService } from '../deployments/index.js';
import { toThreadViews, type FeedbackService } from '../feedback/index.js';
import { createProjectFileRoutes, toFileView, type FileService } from '../files/index.js';
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
  /**
   * Undefined when no blob store is configured, which every file route answers 503 to.
   *
   * Optional here rather than required, because everything else on this router works without
   * it and a project portal that refused to load because a storage token was missing would be
   * a much worse failure than an upload button that explains itself.
   */
  readonly fileService?: FileService | undefined;
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
  const {
    projectService,
    taskService,
    feedbackService,
    deploymentService,
    activityService,
    fileService,
  } = dependencies;

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

    const [tasks, comments, deployments, activity, files] = await Promise.all([
      taskService.listForProject(project.id),
      feedbackService.listForProject(project.id),
      deploymentService.listForProject(project.id, RECENT_DEPLOYMENTS),
      activityService.listForProject({
        projectId: project.id,
        limit: RECENT_ACTIVITY,
        customerVisibleOnly: true,
      }),
      /*
       * An empty list when there is no store, rather than an absent field. The page renders
       * the same either way, and a customer with an unconfigured deployment sees "nothing
       * has been sent yet" — which is true — instead of a section that fails to appear.
       */
      fileService ? fileService.listForProject(project.id) : Promise.resolve([]),
    ]);

    response.json(
      success({
        project: toCustomerProjectView(project),
        tasks: tasks.map(toTaskView),
        feedback: toThreadViews(comments),
        deployments: deployments.map(toDeploymentView),
        activity: activity.map(toActivityView),
        files: files.map(toFileView),
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

      /*
       * ================================================================
       * A TASK THAT ASKED FOR A FILE IS NOT DONE UNTIL A FILE IS THERE
       * ================================================================
       *
       * "Send us your logo" marked complete with nothing attached is a claim, and it is the
       * claim that costs a week: the build waits on the last onboarding task, so a customer
       * who ticks this off believing they emailed it starts a build with no logo in it.
       *
       * Here rather than in `TaskService`, because the dependency runs projects → tasks and
       * must not run back — the same reason `refreshOnboardingProgress` is called from this
       * handler rather than from inside the task service. And skipped entirely when there is
       * no store: a rule that cannot be satisfied is not a rule, it is a locked door.
       */
      if (fileService && task.kind.startsWith('upload-')) {
        const attached = await fileService.countForTask(task.id);

        if (attached === 0) {
          throw new AppError(
            'VALIDATION_ERROR',
            'Add the file first — this one is not done until we have it.',
          );
        }
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
      /*
       * The same subject the console passes, and here it sends the notification the *other*
       * way: this author is the customer, so what it produces is a digest line for the owner
       * rather than an email to the person who just pressed the button.
       */
      subject: {
        businessName: project.businessName,
        email: project.email,
        contactName: project.contactName,
      },
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

  /* ---------------------------------------------------------------- files */

  /*
   * Mounted here, inside `one`, so every route in it inherits the ownership check that
   * resolved the project. `source: 'customer'` is what makes this mount the customer's
   * direction; the console mounts the same router as `team`.
   */
  one.use('/files', createProjectFileRoutes({ fileService, source: 'customer' }));

  router.use('/:projectId', one);

  return router;
}
