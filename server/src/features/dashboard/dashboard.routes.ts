import { Router } from 'express';
import { success } from '../../lib/apiResponse.js';
import { toActivityView, type ActivityService } from '../activity/index.js';
import { toAssessmentView, type AssessmentService } from '../assessments/index.js';
import { requireAuth, requireRequestAuth, toPublicUser } from '../auth/index.js';
import { buildCustomerBillingSummary } from '../billing/billing.summary.js';
import { toCustomerProjectView, type ProjectService } from '../projects/index.js';
import { toTaskView, type TaskService } from '../tasks/index.js';
import { chooseCurrentAction } from './currentAction.js';

export interface DashboardRoutesDependencies {
  readonly projectService: ProjectService;
  readonly assessmentService: AssessmentService;
  readonly taskService: TaskService;
  readonly activityService: ActivityService;
}

const RECENT_ACTIVITY = 12;
const MAX_PROJECTS = 10;

/**
 * `/api/app/dashboard` — one request, everything the private landing page renders.
 *
 * Composed here rather than left to the browser to assemble from five endpoints. The
 * dashboard is the first thing a customer sees after signing in; five round trips on a
 * phone is five chances to show a half-drawn page, on a site whose entire pitch is that
 * a slow page loses customers.
 *
 * The composition is read-only and every part of it is already scoped to the caller by
 * the service beneath it, so there is nothing here that widens access.
 */
export function createDashboardRouter(dependencies: DashboardRoutesDependencies): Router {
  const { projectService, assessmentService, taskService, activityService } = dependencies;
  const router = Router();

  router.get('/', requireAuth, async (request, response) => {
    const auth = requireRequestAuth(request);
    const userId = auth.user.id;

    const [projects, assessment, openTasks, activity] = await Promise.all([
      projectService.listForOwner(userId, MAX_PROJECTS),
      assessmentService.findLatestForUser(userId),
      taskService.listOpenForUser(userId),
      activityService.listForUser({
        userId,
        limit: RECENT_ACTIVITY,
        customerVisibleOnly: true,
      }),
    ]);

    /*
     * The active project is the newest. `listForOwner` sorts by creation date, and a
     * customer with two projects is looking at the one they most recently started —
     * the list is still returned so the UI can offer a switch.
     */
    const activeProject = projects[0];

    const billing = buildCustomerBillingSummary({ user: auth.user, projects });

    response.json(
      success({
        user: toPublicUser(auth.user),
        /*
         * The single most important field on the page: what to do next. Derived on the
         * server so the same answer drives the dashboard, an email and — later —
         * whatever prompts a customer who has gone quiet.
         */
        currentAction: chooseCurrentAction({
          user: auth.user,
          project: activeProject,
          assessment,
          openTasks,
          billing,
        }),
        project: activeProject ? toCustomerProjectView(activeProject) : null,
        projects: projects.map(toCustomerProjectView),
        assessment: assessment ? toAssessmentView(assessment) : null,
        tasks: openTasks.map(toTaskView),
        activity: activity.map(toActivityView),
        billing,
      }),
    );
  });

  return router;
}
