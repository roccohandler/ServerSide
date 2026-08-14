import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../../lib/appError.js';
import { success } from '../../lib/apiResponse.js';
import { parseBody, parseQuery, pathParam } from '../../lib/requestSchema.js';
import { toActivityView, type ActivityService } from '../activity/index.js';
import { toAssessmentView, type AssessmentService } from '../assessments/index.js';
import {
  requireAdmin,
  requireCapability,
  requireRequestAuth,
  toAdminAccountView,
  type AuthRepository,
} from '../auth/index.js';
import { toDeploymentView, type DeploymentService } from '../deployments/index.js';
import { toThreadViews, type FeedbackService } from '../feedback/index.js';
import { createProjectAccess, requireProject, type ProjectService } from '../projects/index.js';
import {
  parseAddTask,
  parseSetDeploymentUrl,
  parseSetMilestone,
} from '../projects/project.schema.js';
import { toTaskView, type TaskService } from '../tasks/index.js';

export interface AdminRoutesDependencies {
  readonly projectService: ProjectService;
  readonly assessmentService: AssessmentService;
  readonly taskService: TaskService;
  readonly feedbackService: FeedbackService;
  readonly deploymentService: DeploymentService;
  readonly activityService: ActivityService;
  /**
   * The repository rather than the auth service, and deliberately.
   *
   * `AuthService` is the credential surface: it signs people in, mints sessions, resets
   * passwords and links identities. The admin surface needs exactly one thing from storage —
   * a bounded list of accounts — and handing it the service would put every one of those
   * operations one typo away from an admin route.
   */
  readonly authRepository: AuthRepository;
}

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

const addReplySchema = z.strictObject({
  body: z.string().trim().min(1).max(4000),
  parentId: z.string().trim().min(1).max(64).optional(),
});

/*
 * ============================================================================
 * THE ADMIN SURFACE
 * ============================================================================
 *
 * `/api/admin`. Its own boundary, behind `requireAdmin`, and deliberately not the
 * customer API with a role check bolted on.
 *
 * ## What makes this different from the customer routes
 *
 * The customer routes are scoped: they answer only about the caller's own records and
 * cannot be made to answer about anybody else's. These are the opposite — they exist
 * precisely to cross customer boundaries, and every one of them is a query with no
 * owner filter. That is exactly why they live behind their own mount, their own
 * middleware and their own file: the difference between the two is not a flag, it is
 * which router the request reached.
 *
 * `requireAdmin` answers NOT_FOUND rather than FORBIDDEN, matching the owner-only
 * billing endpoints. A customer probing `/api/admin` should not learn there is an admin.
 *
 * ## What is deliberately not here
 *
 * A second customer portal. Admin operates the domain — statuses, tasks, URLs, replies —
 * through the same services the customer routes use, so there is one set of rules about
 * what a milestone change does and one place it is written.
 * ============================================================================
 */
export function createAdminRouter(dependencies: AdminRoutesDependencies): Router {
  const {
    projectService,
    assessmentService,
    taskService,
    feedbackService,
    deploymentService,
    activityService,
    authRepository,
  } = dependencies;

  const router = Router();
  router.use(requireAdmin);

  /* ------------------------------------------------------------- projects */

  router.get('/projects', async (request, response) => {
    const { limit } = parseQuery(listQuerySchema, request.query);
    const projects = await projectService.listAll(limit);

    /*
     * The full stored record, not the customer view. Staff legitimately need the
     * Stripe ids and the internal notes — that is what operating the business means —
     * and this response only ever reaches somebody `requireAdmin` let through.
     */
    response.json(success({ projects }));
  });

  const one = Router({ mergeParams: true });
  /* Ownership is bypassed by the `project:write:any` capability, which only staff hold. */
  one.use(createProjectAccess(projectService, 'write'));

  one.get('/', async (request, response) => {
    const project = requireProject(request);

    const [tasks, comments, deployments, activity] = await Promise.all([
      taskService.listForProject(project.id),
      feedbackService.listForProject(project.id),
      deploymentService.listForProject(project.id, 20),
      activityService.listForProject({
        projectId: project.id,
        limit: 50,
        /* Staff see the internal entries too — that is the point of the distinction. */
        customerVisibleOnly: false,
      }),
    ]);

    response.json(
      success({
        project,
        tasks: tasks.map(toTaskView),
        feedback: toThreadViews(comments),
        deployments: deployments.map(toDeploymentView),
        activity: activity.map(toActivityView),
      }),
    );
  });

  one.patch('/milestone', async (request, response) => {
    const project = requireProject(request);
    const { milestone } = parseSetMilestone(request.body);

    const updated = await projectService.setMilestone({ project, milestone });
    response.json(success({ project: updated }));
  });

  /*
   * A manual URL set, for the case the provider webhook cannot cover: a site hosted
   * somewhere else, or a deployment that happened before the integration was wired up.
   * The normal path is a deployment event — see the deployments feature.
   */
  one.patch('/urls', async (request, response) => {
    const project = requireProject(request);
    const input = parseSetDeploymentUrl(request.body);

    if (input.previewUrl === undefined && input.productionUrl === undefined) {
      throw new AppError('VALIDATION_ERROR', 'Give a preview URL, a production URL, or both.');
    }

    const updated = await projectService.setUrls({
      project,
      previewUrl: input.previewUrl,
      productionUrl: input.productionUrl,
    });

    response.json(success({ project: updated }));
  });

  one.post('/tasks', async (request, response) => {
    const project = requireProject(request);
    const input = parseAddTask(request.body);

    if (!project.ownerUserId) {
      throw new AppError(
        'VALIDATION_ERROR',
        'This project has no customer account attached, so a task would have nobody to appear for.',
      );
    }

    const task = await taskService.addTask({
      projectId: project.id,
      userId: project.ownerUserId,
      kind: input.kind,
      title: input.title,
      description: input.description,
      dueAt: input.dueAt,
    });

    response.status(201).json(success({ task: toTaskView(task) }));
  });

  one.post('/feedback', async (request, response) => {
    const project = requireProject(request);
    const auth = requireRequestAuth(request);
    const input = parseBody(addReplySchema, request.body);

    await feedbackService.addComment({
      projectId: project.id,
      author: auth.user,
      body: input.body,
      parentId: input.parentId,
    });

    const comments = await feedbackService.listForProject(project.id);
    response.status(201).json(success({ feedback: toThreadViews(comments) }));
  });

  one.post('/feedback/:commentId/resolve', async (request, response) => {
    const project = requireProject(request);
    const auth = requireRequestAuth(request);

    const comment = await feedbackService.findById(pathParam(request.params, 'commentId'));

    // Same rule as the customer route: the comment has to be on this project.
    if (!comment || comment.projectId !== project.id) {
      throw new AppError('NOT_FOUND', 'No comment with that id.');
    }

    await feedbackService.resolve({ comment, resolvedBy: auth.user });

    const comments = await feedbackService.listForProject(project.id);
    response.json(success({ feedback: toThreadViews(comments) }));
  });

  router.use('/projects/:projectId', one);

  /* ------------------------------------------------------------- accounts */

  /*
   * Who has an account, which is the question the rest of this surface cannot answer.
   *
   * It is not decoration: `POST /projects/:id/tasks` above refuses a project with no
   * `ownerUserId`, telling the operator a task "would have nobody to appear for" — and until
   * now there was no way to see which accounts exist or which project is attached to one. The
   * error was actionable and the information needed to act on it was nowhere.
   *
   * `requireCapability('customer:read:any')` in addition to the mount's `requireAdmin`. Today
   * it cannot fail — an admin holds every capability, and a customer was already answered
   * NOT_FOUND by the mount — so it is documentation plus the check that starts working on its
   * own the day a narrower staff role exists. That is the only reason it is here, and
   * `capabilities.test.ts` records which capabilities are and are not enforced anywhere so the
   * gap stays visible rather than becoming folklore.
   */
  router.get('/accounts', requireCapability('customer:read:any'), async (request, response) => {
    const { limit } = parseQuery(listQuerySchema, request.query);
    const users = await authRepository.listUsers(limit);

    /*
     * Mapped through `toAdminAccountView`, never spread. The stored record carries the
     * password hash field and the raw Google subject; an admin surface is still a browser,
     * and "staff can be trusted" is not a reason to send a credential to one.
     */
    response.json(success({ accounts: users.map(toAdminAccountView) }));
  });

  /* ---------------------------------------------------------- assessments */

  router.get('/assessments/:id', async (request, response) => {
    const assessment = await assessmentService.findById(pathParam(request.params, 'id'));
    if (!assessment) throw new AppError('NOT_FOUND', 'No assessment with that id.');
    response.json(success({ assessment: toAssessmentView(assessment) }));
  });

  return router;
}
