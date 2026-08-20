import type { AssessmentService } from '../assessments/index.js';
import type { AuthRepository } from '../auth/index.js';
import type { LeadService } from '../leads/index.js';
import type { OnboardingService } from '../onboarding/index.js';
import type { ProjectService, StoredProject } from '../projects/index.js';
import type { ReportService } from '../reports/index.js';

/*
 * ============================================================================
 * THE WORKLIST — WHAT IS GOING STALE
 * ============================================================================
 *
 * The console's front page is the inbox, and it answers **who is waiting on a reply**. This
 * answers a different question — **what has quietly stopped moving** — and the two are not the
 * same list because nobody is waiting on most of what appears here. A project that has not
 * moved in nine days has no unanswered message on it; that is precisely the problem.
 *
 * ## Five sources, and not one of them defines anything
 *
 * Every group below is a call to a method that already existed for another screen:
 *
 *   - `assessmentService.listAwaitingReport` — the Phase 5 queue
 *   - `reportService.findOverdue`            — the monthly commitment's own measure
 *   - `onboardingService.listUnmatched`      — the console's existing unmatched panel
 *   - `leadService.findUserIdsWithRequests`  — `/admin/accounts`'s `hasRequested` column
 *   - `projectService.listAll` + `updatedAt` — the project list, filtered
 *
 * That is deliberate and it is the whole design. A worklist is exactly the kind of screen that
 * grows its own opinion of what "overdue" means, and the day it does, the console has two
 * numbers for one thing and no way to tell which is right. **Nothing here decides anything;
 * it arranges answers other features already give.**
 *
 * The one thing this file does own is `STALE_AFTER_DAYS`, because nowhere else needed it.
 *
 * ## Why it is one endpoint rather than five
 *
 * Because the question is "what should I do today", and five requests that arrive separately
 * produce a screen that assembles itself in front of somebody trying to decide. The five reads
 * are independent, so they go out together.
 * ============================================================================
 */

/**
 * How long a project may sit at the same milestone before it is worth a look.
 *
 * Seven days. Short enough that a fortnight's silence is impossible, long enough that a build
 * legitimately waiting on a customer's photos does not appear every Monday. It is a *prompt*
 * rather than a verdict — the answer is often "they still have not sent the logo", which is
 * itself worth knowing and is the reason the row says which milestone it is stuck at.
 */
const STALE_AFTER_DAYS = 7;

/** How many rows any one group returns. A worklist longer than this is a staffing problem. */
const PER_GROUP = 20;

/**
 * A quiet account: made an account, never asked for anything, and is past the point where a
 * nudge would have gone out. Deliberately not "signed up recently" — `features/followup` has
 * that covered automatically, and what belongs on a human's list is the ones automation has
 * finished with.
 */
const QUIET_AFTER_DAYS = 5;

export interface WorklistItem {
  /** Stable across runs, so the console can key a list without an index. */
  readonly id: string;
  readonly title: string;
  /** One sentence naming what is actually stale and for how long. */
  readonly detail: string;
  /** Where in the console to go. Relative, resolved by the console's own router. */
  readonly href?: string | undefined;
  /** Whole days. The console sorts on this rather than re-deriving it from a date. */
  readonly waitingDays: number;
}

export interface WorklistGroup {
  readonly key: string;
  readonly title: string;
  /** What this group is for, in the console's own voice. Shown when the group is empty. */
  readonly emptyLabel: string;
  readonly items: readonly WorklistItem[];
}

export interface WorklistDependencies {
  readonly assessmentService: AssessmentService;
  readonly reportService: ReportService;
  readonly onboardingService: OnboardingService;
  readonly projectService: ProjectService;
  readonly leadService: LeadService;
  readonly authRepository: AuthRepository;
  /** Excludes the demonstration account, as every other console list does. */
  readonly demoOwnerId: () => Promise<string | undefined>;
  readonly now?: () => Date;
}

const daysBetween = (from: Date, to: Date) =>
  Math.max(0, Math.floor((to.getTime() - from.getTime()) / 86_400_000));

export async function buildWorklist(
  dependencies: WorklistDependencies,
): Promise<readonly WorklistGroup[]> {
  const now = dependencies.now ?? (() => new Date());
  const at = now();
  const demoOwnerId = await dependencies.demoOwnerId();

  /*
   * Five independent reads. Nothing here depends on anything else here, so serialising them
   * would only make the screen slower — the same argument `ConversationService.list` makes
   * about its two sources.
   */
  const [awaitingReview, unmatched, projects, accounts] = await Promise.all([
    dependencies.assessmentService.listAwaitingReport(PER_GROUP),
    dependencies.onboardingService.listUnmatched(PER_GROUP),
    dependencies.projectService.listAll(200),
    dependencies.authRepository.listUsers(200),
  ]);

  /*
   * Everything still running. Stated as an exclusion rather than a list of live statuses so a
   * status added later appears on the worklist by default — the failure worth avoiding here is
   * work that silently stops being counted, not work that is counted twice.
   */
  const live = projects.filter(
    (project) =>
      project.status !== 'cancelled' &&
      project.status !== 'complete' &&
      !(demoOwnerId && project.ownerUserId === demoOwnerId),
  );

  const overdue = await dependencies.reportService.findOverdue(
    live.filter((project) => project.milestone === 'live').map((project) => project.id),
  );
  const byId = new Map<string, StoredProject>(live.map((project) => [project.id, project]));

  /* The customers, minus the demonstration and minus anybody who has already asked. */
  const customers = accounts.filter(
    (user) =>
      user.role === 'customer' && !user.demo && daysBetween(user.createdAt, at) >= QUIET_AFTER_DAYS,
  );
  const requested = await dependencies.leadService.findUserIdsWithRequests(
    customers.map((user) => user.id),
  );

  return [
    {
      key: 'assessments',
      title: 'Assessments waiting on a review',
      emptyLabel: 'Nobody is waiting for a review.',
      items: awaitingReview.map((assessment) => ({
        id: `assessment:${assessment.id}`,
        title: assessment.businessName ?? 'A website review',
        detail: `Submitted ${daysBetween(assessment.submittedAt, at)} days ago and not yet written.`,
        /*
         * The queue, not a per-assessment URL. This linked to `/assessments/${id}` and the
         * console has never registered that route — the queue opens its editor *in place*
         * when a row is selected, deliberately, because writing a review is the only thing
         * anybody comes to that screen for and a navigation between the operator and the work
         * is a navigation too many.
         *
         * So every row here led to a blank page. It fails silently in the way client-side
         * routing always does: no error, no log, just a screen with nothing on it.
         *
         * The queue is oldest-first, which is the same order as this list, so landing on it
         * puts the row that was clicked at or near the top.
         */
        href: '/assessments',
        waitingDays: daysBetween(assessment.submittedAt, at),
      })),
    },
    {
      key: 'stalled',
      title: 'Projects that have not moved',
      emptyLabel: 'Every live project has moved this week.',
      items: live
        .filter(
          (project) =>
            project.milestone !== 'live' && daysBetween(project.updatedAt, at) >= STALE_AFTER_DAYS,
        )
        .slice(0, PER_GROUP)
        .map((project) => ({
          id: `project:${project.id}`,
          title: project.businessName,
          /*
           * The milestone is named, because half of these are legitimately waiting on the
           * customer and the answer is "chase the photos" rather than "do some work". A row
           * that only said "stalled" would send somebody to the project to find that out.
           */
          detail: `${daysBetween(project.updatedAt, at)} days at ${project.milestone}.`,
          href: `/projects/${project.id}`,
          waitingDays: daysBetween(project.updatedAt, at),
        })),
    },
    {
      key: 'reports',
      title: 'Monthly reports not sent',
      emptyLabel: 'Every live website has its report.',
      items: overdue.slice(0, PER_GROUP).map((row) => ({
        id: `report:${row.projectId}:${row.month}`,
        title: byId.get(row.projectId)?.businessName ?? 'A live website',
        detail: `No report published for ${row.month}.`,
        href: `/projects/${row.projectId}`,
        /* Reported as zero rather than guessed: the month is the fact, a day count is not. */
        waitingDays: 0,
      })),
    },
    {
      key: 'onboarding',
      title: 'Briefs that matched no project',
      emptyLabel: 'Every brief found its project.',
      items: unmatched.map((submission) => ({
        id: `onboarding:${submission.id}`,
        title: submission.businessName,
        detail: `Sent ${daysBetween(submission.createdAt, at)} days ago with no project to attach it to.`,
        href: '/onboarding',
        waitingDays: daysBetween(submission.createdAt, at),
      })),
    },
    {
      key: 'quiet',
      title: 'Accounts that never asked for anything',
      emptyLabel: 'Everybody who signed up has asked for something.',
      items: customers
        .filter((user) => !requested.has(user.id))
        .slice(0, PER_GROUP)
        .map((user) => ({
          id: `account:${user.id}`,
          title: user.businessName ?? user.name,
          detail: `Signed up ${daysBetween(user.createdAt, at)} days ago and has not asked for an assessment.`,
          href: '/accounts',
          waitingDays: daysBetween(user.createdAt, at),
        })),
    },
  ];
}
