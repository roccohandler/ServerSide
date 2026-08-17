import { Router } from 'express';
import { success } from '../../lib/apiResponse.js';
import { toActivityView, type ActivityService } from '../activity/index.js';
import { toAssessmentView, type AssessmentService } from '../assessments/index.js';
import { requireAuth, requireRequestAuth, toPublicUser } from '../auth/index.js';
import { buildCustomerBillingSummary } from '../billing/index.js';
import type { LeadService } from '../leads/index.js';
import { toCustomerProjectView, type ProjectService } from '../projects/index.js';
import { toTaskView, type TaskService } from '../tasks/index.js';
import { chooseCurrentAction } from './dashboard.currentAction.js';

export interface DashboardRoutesDependencies {
  readonly projectService: ProjectService;
  readonly assessmentService: AssessmentService;
  readonly taskService: TaskService;
  readonly activityService: ActivityService;
  /**
   * Read from, never written to, and only for one boolean: has this account ever sent a
   * request. The dashboard needs it to tell somebody who abandoned the account-first funnel
   * that they are one screen from finishing — see `chooseCurrentAction`.
   *
   * The service rather than the repository, unlike the admin routes' `authRepository`,
   * because `hasRequested` is a question about the domain and the service is where the
   * feature answers questions. Nothing on this router can file a lead: the only two write
   * methods take a whole validated submission and this handler has none.
   */
  readonly leadService: LeadService;
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
  const { projectService, assessmentService, taskService, activityService, leadService } =
    dependencies;
  const router = Router();

  router.get('/', requireAuth, async (request, response) => {
    const auth = requireRequestAuth(request);
    const userId = auth.user.id;

    const [projects, assessment, openTasks, activity, hasRequested, unread] = await Promise.all([
      projectService.listForOwner(userId, MAX_PROJECTS),
      assessmentService.findLatestForUser(userId),
      taskService.listOpenForUser(userId),
      activityService.listForUser({
        userId,
        limit: RECENT_ACTIVITY,
        customerVisibleOnly: true,
      }),
      /* In the same batch as the rest: it is one indexed existence check, and serialising
       * it behind four queries that do not need it would add a round trip to every load. */
      leadService.hasRequested(userId),
      /*
       * How much of the list above is new to them.
       *
       * Composed into this response rather than left to the page to fetch from
       * `/api/app/activity/unread`, because the two answers have to agree: the dashboard
       * prints "3 new" directly above the three entries it is describing, and a second
       * round trip is a second moment at which an event could land between them. The
       * standalone endpoint exists for the shell, which has no dashboard payload to read.
       */
      activityService.unreadForUser({
        userId,
        readAt: auth.user.activityReadAt,
        accountCreatedAt: auth.user.createdAt,
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
          hasRequested,
        }),
        project: activeProject ? toCustomerProjectView(activeProject) : null,
        projects: projects.map(toCustomerProjectView),
        assessment: assessment ? toAssessmentView(assessment) : null,
        tasks: openTasks.map(toTaskView),
        activity: activity.map(toActivityView),
        billing,
        unread: {
          count: unread.count,
          since: unread.since.toISOString(),
          capped: unread.capped,
        },
      }),
    );
  });

  return router;
}
