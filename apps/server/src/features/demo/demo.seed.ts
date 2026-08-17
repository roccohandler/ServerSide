import type { ActivityRepository } from '../activity/activity.repository.js';
import type { AssessmentRepository } from '../assessments/assessment.repository.js';
import type { FeedbackRepository } from '../feedback/feedback.repository.js';
import type { ProjectRepository } from '../projects/project.repository.js';
import type { StoredProject } from '../projects/project.types.js';
import type { ReportRepository } from '../reports/report.repository.js';
import { monthOf, previousMonth } from '../reports/report.types.js';
import type { TaskRepository } from '../tasks/task.repository.js';
import { DEMO_BUSINESS, DEMO_EMAIL, DEMO_NAME } from './demo.types.js';

/*
 * ============================================================================
 * THE DATASET
 * ============================================================================
 *
 * One account, one project, and enough around it that **the first screen explains the
 * product**. A demonstration whose dashboard says "nothing here yet" demonstrates nothing;
 * somebody arriving has to land on a business mid-build with real-looking history behind it.
 *
 * ## Deterministic content, relative dates
 *
 * The prose, the ordering and the shape are fixed. Every date is an offset from a clock the
 * caller supplies, because "approved yesterday" has to still be yesterday next month — a
 * dataset with hard-coded dates ages into a demonstration of a project that stalled in August.
 *
 * ## Clearly synthetic, and that is a requirement rather than a courtesy
 *
 * `Cascade Heating & Air`, `dana@example.test`. `.test` is reserved by RFC 2606 and can never
 * resolve, so no mail addressed here reaches a person and nothing collides with a customer.
 * No real business, no real address, no real photograph, and no real customer's words. The
 * brief is explicit and it is also the only version anybody can show a stranger.
 *
 * ## The project sits at `review`
 *
 * Chosen deliberately over `onboarding` or `live`. At `review` the preview exists, the
 * approval decision is live, tasks are half done and money is half paid — so every part of
 * the product is reachable from the first screen without the tester having to advance
 * anything first. The two ends of the lifecycle each hide most of it.
 * ============================================================================
 */

const DAY = 24 * 60 * 60 * 1000;

/** `n` days before the seed clock. Every date in the dataset is one of these. */
const daysAgo = (now: Date, days: number): Date => new Date(now.getTime() - days * DAY);

export interface DemoSeedDependencies {
  readonly projects: ProjectRepository;
  readonly tasks: TaskRepository;
  readonly feedback: FeedbackRepository;
  readonly activity: ActivityRepository;
  readonly assessments: AssessmentRepository;
  readonly reports: ReportRepository;
}

/**
 * Writes the whole dataset for one account and returns the project it hangs off.
 *
 * Takes repositories rather than services, and that is the one place this feature reaches
 * past the domain layer on the *write* side. It is deliberate: a service call would run the
 * business rules — seeding tasks emails somebody, moving a milestone writes activity and
 * notifies — and the seed is not a customer's project actually happening. It is a fixture of
 * what one looks like after it already has.
 */
export async function seedDemoData(
  dependencies: DemoSeedDependencies,
  params: { readonly userId: string; readonly now: Date },
): Promise<StoredProject> {
  const { projects, tasks, feedback, activity, assessments, reports } = dependencies;
  const { userId, now } = params;

  const project = await projects.create({
    businessName: DEMO_BUSINESS,
    contactName: DEMO_NAME,
    email: DEMO_EMAIL,
    phone: '(206) 555-0142',
    notes: 'Sample project. Everything on this account is invented for demonstration.',
    ownerUserId: userId,
    status: 'deposit-paid',
    milestone: 'review',
    approval: 'ready_for_review',
    /* Half paid, so both the paid state and the outstanding state are on one screen. */
    depositStatus: 'paid',
    finalStatus: 'pending',
    subscriptionStatus: 'none',
  });

  await projects.update(project.id, {
    previewUrl: 'https://preview.example.test/cascade-heating',
    estimatedCompletionAt: new Date(now.getTime() + 9 * DAY),
    estimateUpdatedAt: daysAgo(now, 2),
    estimateUpdatedBy: 'Dana Reyes',
  });

  /* Five tasks, three of them done — a list mid-flight rather than an empty or finished one. */
  const taskSpecs = [
    {
      kind: 'provide-business-details' as const,
      title: 'Confirm your business details',
      description: 'Trading name, the number you want calls on, and your hours.',
      done: true,
    },
    {
      kind: 'confirm-services' as const,
      title: 'Confirm the services you want listed',
      description: 'We have started from your existing site. Tell us what is missing.',
      done: true,
    },
    {
      kind: 'confirm-service-areas' as const,
      title: 'Confirm the areas you cover',
      description: 'A page per area is how people searching locally find you.',
      done: true,
    },
    {
      kind: 'upload-photos' as const,
      title: 'Send us photographs of recent jobs',
      description: 'Six or eight is plenty. Real work beats stock photography every time.',
      done: false,
    },
    {
      kind: 'review-preview' as const,
      title: 'Look through your preview',
      description: 'Tell us anything you want changed. Nothing goes live until you say so.',
      done: false,
    },
  ];

  for (const spec of taskSpecs) {
    const task = await tasks.create({
      projectId: project.id,
      userId,
      kind: spec.kind,
      title: spec.title,
      description: spec.description,
      status: spec.done ? 'completed' : 'open',
    });

    if (spec.done && task) await tasks.complete(task.id, daysAgo(now, 6));
  }

  /* A thread with a reply on it, so the feedback screen shows a conversation rather than a box. */
  const comment = await feedback.create({
    projectId: project.id,
    authorUserId: userId,
    authorName: DEMO_NAME,
    authorRole: 'customer',
    body: 'Can the emergency callout number sit at the top of every page rather than just the homepage?',
  });

  await feedback.create({
    projectId: project.id,
    parentId: comment.id,
    authorUserId: 'demo-team',
    authorName: 'Dana Reyes',
    authorRole: 'team',
    body: 'Done — it is in the header on every page now, and it dials on a phone. Have another look at the preview.',
  });

  /* A completed assessment with a *delivered* review, which is the whole primary offer. */
  const assessment = await assessments.create({
    userId,
    businessName: DEMO_BUSINESS,
    websiteUrl: 'https://old-site.example.test',
    trade: 'HVAC',
    answers: [
      { questionId: 'speed-1', category: 'speed', value: 1 },
      { questionId: 'mobile-1', category: 'mobile', value: 1 },
      { questionId: 'clarity-1', category: 'clarity', value: 2 },
      { questionId: 'trust-1', category: 'trust', value: 3 },
      { questionId: 'conversion-1', category: 'conversion', value: 1 },
      { questionId: 'visibility-1', category: 'visibility', value: 2 },
    ],
    status: 'submitted',
    score: 42,
    band: 'costing-you',
    weakestCategories: ['speed', 'mobile', 'conversion'],
    recommendations: [
      'Your website is slow enough to be losing visitors before they see anything.',
      'Most people looking for a local service business are on a phone.',
    ],
    submittedAt: daysAgo(now, 21),
  });

  await assessments.saveReport(assessment.id, {
    summary:
      'Your site is doing the hardest part already — you have real photographs and genuine reviews, which most of your competitors do not. What it is losing you is speed and a phone number nobody can find on a small screen.',
    findings: [
      {
        title: 'The homepage takes about eight seconds on a phone',
        detail:
          'Three photographs on the homepage are being sent at full camera resolution. On a 4G connection most people will have left before the page finishes.',
        severity: 'critical',
      },
      {
        title: 'The phone number is an image, and it does not dial',
        detail:
          'On a phone, tapping it does nothing. This is the single most common reason a local service site gets fewer calls than its traffic suggests it should.',
        severity: 'critical',
      },
      {
        title: 'There is one page for eleven service areas',
        detail:
          'Somebody searching "furnace repair Ballard" has nothing to find. A page per area is how that search reaches you.',
        severity: 'important',
      },
      {
        title: 'The contact form asks for nine things',
        detail:
          'Name, number and what is wrong is enough to call somebody back. Every extra field costs completions.',
        severity: 'minor',
      },
    ],
    recommendations: [
      'Compress the homepage photographs and serve them at the size they are shown.',
      'Make the phone number real text, in the header, on every page.',
      'Add a page for each of the eleven areas you cover.',
    ],
    preparedBy: 'Dana Reyes',
    deliveredAt: daysAgo(now, 18),
  });

  /* One published monthly report, so the Reports screen is not an empty state. */
  const month = previousMonth(monthOf(now));
  const report = await reports.save({
    projectId: project.id,
    userId,
    month,
    enquiries: 17,
    baseline: 6,
    changeExplanation:
      'Most of the new enquiries came through the service-area pages we added, and about a third of them arrived on a phone outside working hours — which is the traffic the old site could not do anything with.',
    whatWeChanged: [
      'Added service-area pages for Ballard, Fremont and Greenwood.',
      'Rewrote the homepage headline to name the trade and the area.',
      'Made the phone number tappable on every page.',
    ],
    whatIsNext: [
      'Photographs of three recent installs, once you send them.',
      'A page for commercial work, which is where the higher-value enquiries are.',
    ],
    preparedBy: 'Dana Reyes',
  });

  await reports.publish(report.id, daysAgo(now, 4));

  /*
   * Ten entries, oldest first, so the timeline reads as a history rather than as a burst. The
   * repository stamps `createdAt` itself, so these land in insertion order — which is the
   * order they are written in, and the reason this loop is sequential rather than a
   * `Promise.all`.
   */
  const timeline = [
    'Your account was created.',
    'Your website assessment scored 42 out of 100.',
    'Your website review is ready.',
    'We received your payment.',
    'We need a few things from you before we start.',
    'You confirmed your business details.',
    'You confirmed the services you want listed.',
    'You confirmed the areas you cover.',
    'Your website preview is ready.',
    'We answered your question about the callout number.',
  ] as const;

  const types = [
    'account.created',
    'assessment.submitted',
    'assessment.delivered',
    'billing.payment_succeeded',
    'task.created',
    'task.completed',
    'task.completed',
    'task.completed',
    'deployment.preview_ready',
    'feedback.replied',
  ] as const;

  for (const [index, summary] of timeline.entries()) {
    await activity.record({
      type: types[index] ?? 'account.created',
      summary,
      audience: 'customer',
      userId,
      ...(index >= 3 ? { projectId: project.id } : {}),
    });
  }

  return project;
}
