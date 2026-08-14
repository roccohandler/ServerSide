import type { StoredAssessment } from '../assessments/index.js';
import type { StoredUser } from '../auth/index.js';
import type { CustomerBillingSummary } from '../billing/billing.summary.js';
import { MILESTONE_PRESENTATION, type StoredProject } from '../projects/index.js';
import type { StoredTask } from '../tasks/index.js';

/*
 * ============================================================================
 * WHAT DO I DO NOW?
 * ============================================================================
 *
 * The one question the dashboard exists to answer, resolved in one place.
 *
 * The alternative — five cards, each deciding whether it is the important one — is how
 * a dashboard ends up showing a customer three competing calls to action and, on the
 * day it matters, none. It is also how the answer drifts: the page says one thing, the
 * reminder email says another.
 *
 * So this is a single ordered walk. The first rule that matches wins, the order encodes
 * the priority, and there is always exactly one answer.
 *
 * The order is a business judgement, written down so it can be argued with:
 *
 *   1. **Something is blocking the build.** Their tasks. Nothing else matters while the
 *      work is stopped waiting on them.
 *   2. **Something needs their decision.** Reviewing or approving the website.
 *   3. **Something needs their money**, and only when there is a reason for it.
 *   4. **Nothing needs them** — say what is happening, so silence is not mistaken for
 *      nothing happening.
 *
 * Verification sits deliberately low. It is real, and it is not worth interrupting
 * somebody's website build over.
 * ============================================================================
 */

export const CURRENT_ACTION_KINDS = [
  'complete-tasks',
  'review-preview',
  'approve-website',
  'start-assessment',
  'pay-deposit',
  'choose-plan',
  'fix-payment',
  'verify-email',
  'waiting-on-us',
  'live',
] as const;

export type CurrentActionKind = (typeof CURRENT_ACTION_KINDS)[number];

export interface CurrentAction {
  readonly kind: CurrentActionKind;
  readonly heading: string;
  readonly body: string;
  /** Null when there is nothing to click, which is a legitimate state. */
  readonly cta: { readonly label: string; readonly href: string } | null;
  /** True when the next move is theirs. Drives the "are we working?" line. */
  readonly waitingOnCustomer: boolean;
}

export function chooseCurrentAction(params: {
  readonly user: StoredUser;
  readonly project: StoredProject | undefined;
  readonly assessment: StoredAssessment | null;
  readonly openTasks: readonly StoredTask[];
  readonly billing: CustomerBillingSummary;
}): CurrentAction {
  const { user, project, assessment, openTasks, billing } = params;

  /* 1. A payment that failed blocks everything, including the tasks. */
  if (billing.subscription.status === 'past_due') {
    return {
      kind: 'fix-payment',
      heading: 'A payment did not go through',
      body: 'Update your card and Growth Partner carries on as normal. Nothing has been switched off.',
      cta: { label: 'Update payment details', href: '/app/billing' },
      waitingOnCustomer: true,
    };
  }

  /* 2. No project yet: the funnel is still running. */
  if (!project) {
    if (!assessment) {
      return {
        kind: 'start-assessment',
        heading: 'Start with the free assessment',
        body: 'Twenty questions about your website, about five minutes, and you get the five things most likely costing you calls.',
        /*
         * The *private* copy of the assessment, never `/audit`.
         *
         * Every href this function returns is followed from inside the customer
         * workspace, so every one of them has to stay inside it. Pointing at the public
         * marketing page put a signed-in customer on a page selling them a website they
         * had already bought, with the workspace navigation gone.
         */
        cta: { label: 'Start the assessment', href: '/app/assessment/start' },
        waitingOnCustomer: true,
      };
    }

    return {
      kind: 'pay-deposit',
      heading: 'Ready when you are',
      body: `Your assessment scored ${assessment.score} out of 100. When you want the website built, the deposit is what puts you on the schedule.`,
      cta: { label: 'See what happens next', href: '/app/billing' },
      waitingOnCustomer: true,
    };
  }

  /* 3. The build is waiting on them. */
  if (openTasks.length > 0) {
    const first = openTasks[0];
    return {
      kind: 'complete-tasks',
      heading:
        openTasks.length === 1
          ? 'One thing left for you to do'
          : `${openTasks.length} things left for you to do`,
      body: first
        ? `Next: ${first.title}. ${first.description}`
        : 'We need a few details before the build can continue.',
      cta: { label: 'See what we need', href: `/app/projects/${project.id}/tasks` },
      waitingOnCustomer: true,
    };
  }

  /* 4. A decision is theirs to make. */
  if (project.milestone === 'review' && project.previewUrl) {
    return {
      kind: 'review-preview',
      heading: 'Your website preview is ready',
      body: 'Have a look and tell us what you would like changed. Nothing goes live until you say so.',
      cta: { label: 'Open the preview', href: `/app/projects/${project.id}/preview` },
      waitingOnCustomer: true,
    };
  }

  if (project.approval === 'ready_for_review' || project.milestone === 'approval') {
    return {
      kind: 'approve-website',
      heading: 'Ready for your approval',
      body: 'Your changes are done. Approve the website and we will put it live.',
      cta: { label: 'Review and approve', href: `/app/projects/${project.id}/preview` },
      waitingOnCustomer: true,
    };
  }

  /* 5. Live, and no plan chosen. The only place the plan is offered. */
  if (project.milestone === 'live' && billing.available.plan) {
    return {
      kind: 'choose-plan',
      heading: 'Your website is live',
      /*
       * Measurement first, upkeep last, and the order is the entire point of the rewrite.
       *
       * The previous sentence led with hosting, updates and monitoring. That is upkeep,
       * and upkeep is the one thing somebody with a working website can price against a
       * $20 host and decline in a second — which is what a monthly fee sounds like when
       * the first thing it names is a server. What is actually being sold is the monthly
       * Website Performance Report and the work it points at; hosting and monitoring are
       * the floor underneath that rather than the offer.
       *
       * Nothing here says the enquiry number goes up. The promise is that it is counted,
       * that any movement is explained, and that something is being worked on next —
       * three things that can be delivered every month regardless of the result, which is
       * exactly why they are what gets promised.
       */
      body: 'Growth Partner is optional. Each month you get a Website Performance Report — the enquiries that came in, whether that moved, what we changed and why, and what we are looking at next — with hosting, updates and monitoring underneath it.',
      cta: { label: 'See what Growth Partner includes', href: '/app/billing' },
      waitingOnCustomer: true,
    };
  }

  if (project.milestone === 'live') {
    return {
      kind: 'live',
      heading: 'Your website is live',
      body: project.productionUrl
        ? `It is up at ${project.productionUrl} and being looked after.`
        : 'It is up and being looked after.',
      cta: project.productionUrl ? { label: 'Open my website', href: project.productionUrl } : null,
      waitingOnCustomer: false,
    };
  }

  /* 6. Low priority, and only once nothing else is outstanding. */
  if (!user.emailVerified) {
    return {
      kind: 'verify-email',
      heading: 'Confirm your email address',
      body: 'We sent you a link. Confirming it means you get the updates about your website as they happen.',
      cta: { label: 'Send it again', href: '/app/account' },
      waitingOnCustomer: true,
    };
  }

  /* 7. We are working. Say what we are doing. */
  const presentation = MILESTONE_PRESENTATION[project.milestone];
  return {
    kind: 'waiting-on-us',
    heading: presentation.label,
    body: presentation.detail,
    cta: { label: 'See your project', href: `/app/projects/${project.id}` },
    waitingOnCustomer: false,
  };
}
