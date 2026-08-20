import type { StoredAssessment } from '../assessments/index.js';
import type { StoredUser } from '../auth/index.js';
import type { CustomerBillingSummary } from '../billing/index.js';
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
  /*
   * Added with the account-first funnel. Somebody who created an account from
   * "Get my free website assessment" and then closed the tab on the request step lands
   * here, and the dashboard has to finish the sentence the button started. See DECISION 028.
   */
  'finish-request',
  'start-assessment',
  /*
   * ==========================================================================
   * TWO KINDS ARRIVED WITH THE SCOPE RECORD — DECISION 040
   * ==========================================================================
   *
   * `request-scope` is somebody with an assessment and no project: the next step is a
   * conversation that produces a written scope, not a payment. It replaces what `pay-deposit`
   * used to say to this person, which since the deposit gate would have pointed them at a
   * button that is no longer there.
   *
   * `accept-scope` is somebody whose scope has been written and not yet agreed. It is the
   * first customer-visible state of a project, and before the record existed it did not
   * exist — a project could not be seen at all until a payment created one.
   * ==========================================================================
   */
  'request-scope',
  'accept-scope',
  'pay-deposit',
  /*
   * The second instalment, owed once the site is going live. Ordered here with the other
   * money branches rather than beside `approve-website`, because it is not a decision — the
   * decision was made when they approved, and this is settling it.
   */
  'pay-final',
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
  /**
   * Whether this account has ever sent a request — the contact form, or the request step of
   * the account-first funnel, either counts. False for every account that made it as far as
   * choosing a password and no further, which is precisely the person this exists for.
   */
  readonly hasRequested: boolean;
}): CurrentAction {
  const { user, project, assessment, openTasks, billing, hasRequested } = params;

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
    /*
     * ==================================================================
     * THE UNFINISHED REQUEST — AND WHY IT NEEDS *BOTH* CONDITIONS
     * ==================================================================
     *
     * Somebody here clicked "Get my free website assessment", made an account, and left
     * before answering the four remaining questions. Offering them the twenty-question
     * scorecard instead would be the dashboard changing the subject away from the one thing
     * they pressed a button to do — so this sits above `start-assessment`.
     *
     * It does **not** sit above it for somebody who has since scored their own site, and
     * that is not a detail. Written as `if (!hasRequested)` alone, this branch caught every
     * customer who had completed the assessment and was ready to buy, and sent them back to
     * a contact form — replacing "your assessment scored 50 out of 100, here is what happens
     * when you want it built" with "finish your request". A lifecycle test caught it by
     * name, which is what that test is for.
     *
     * The rule the two conditions encode: this is for the person who has done *nothing*
     * since signing up. Anybody who has engaged since — by requesting, or by scoring their
     * own site — has moved past it, and the funnel moves with them.
     * ==================================================================
     */
    if (!hasRequested && !assessment) {
      return {
        kind: 'finish-request',
        heading: 'Finish your assessment request',
        body: 'We have your account. Four more questions — a number to reach you on and what you want looking at — and the review is on its way.',
        cta: { label: 'Finish the request', href: '/app/assessment/request' },
        waitingOnCustomer: true,
      };
    }

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

    /*
     * ====================================================================
     * THIS USED TO SAY "PAY THE DEPOSIT", AND IT POINTED AT A BUTTON
     * ====================================================================
     *
     * It read "the deposit is what puts you on the schedule" and sent them to `/app/billing`.
     * Since DECISION 040 the deposit is not offered until a scope has been sent and accepted,
     * so for somebody with no project at all that button is now absent — and an instruction
     * to go and press a control that is not there is worse than no instruction.
     *
     * The honest next step is the one rule #35 has always described: a conversation that
     * produces a written scope. Which is also what actually happened before this — the button
     * existed, and nobody bought a $4,900 build by clicking it without speaking to anybody.
     * What has changed is that the dashboard now says so.
     * ====================================================================
     */
    return {
      kind: 'request-scope',
      heading: 'Ready when you are',
      body: `Your assessment scored ${assessment.score} out of 100. When you want the website built, tell us and we will write up exactly what we would build and what it costs — nothing is charged until you have read it and agreed to it.`,
      cta: { label: 'Tell us you are ready', href: '/app/messages' },
      waitingOnCustomer: true,
    };
  }

  /*
   * ======================================================================
   * THE TWO STEPS BEFORE A BUILD STARTS — DECISION 040
   * ======================================================================
   *
   * A project can now exist before any money has changed hands: `PROJECT_STATUSES` has always
   * defined `agreed` as "scope agreed in writing; nothing paid yet", and the console can
   * create one. Before the scope record, that state was invisible to the customer — their
   * dashboard fell straight through to the milestone copy and said the build was underway.
   *
   * Both branches sit above the task list deliberately. An unpaid project has no onboarding
   * tasks yet (they are seeded on activation), but the ordering has to be right rather than
   * accidentally right: reading the agreement comes before doing the work it describes.
   * ======================================================================
   */
  if (project.scope && !project.scope.acceptedAt) {
    return {
      kind: 'accept-scope',
      heading: 'Your scope and price are ready to read',
      body: 'This is exactly what we would build and what it costs. Have a read, and if anything is wrong or missing tell us before you agree to it.',
      cta: { label: 'Read the scope', href: `/app/projects/${project.id}` },
      waitingOnCustomer: true,
    };
  }

  if (project.scope?.acceptedAt && billing.available.deposit) {
    return {
      kind: 'pay-deposit',
      heading: 'The deposit puts you on the schedule',
      body: 'You have agreed the scope and the price. Half to begin, half on the day it goes live — and the build starts as soon as this clears.',
      cta: { label: 'Pay the deposit', href: '/app/billing' },
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

  /*
   * 5. The build is finished and the second half is owed.
   *
   * Above the plan and below the two approval branches, and both placements are deliberate.
   * It is below them because a customer who has not yet approved has not agreed the work is
   * done, and asking for the balance first would be asking them to pay for something they are
   * still reviewing. It is above `choose-plan` because an outstanding invoice on the build
   * outranks an optional subscription — offering somebody a monthly service while they owe for
   * the thing it maintains reads as a business that is not paying attention.
   *
   * `billing.available.final` carries the whole rule, and it is the same boolean the billing
   * page renders and the checkout route enforces. Three surfaces, one condition.
   */
  if (billing.available.final) {
    return {
      kind: 'pay-final',
      heading: 'The launch payment is ready',
      body: 'Your website is approved and going live. The second half of the build settles it — the same amount as the deposit, and the last one for the build.',
      cta: { label: 'Pay the launch instalment', href: '/app/billing' },
      waitingOnCustomer: true,
    };
  }

  /* 6. Live, and no plan chosen. The only place the plan is offered. */
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

  /* 7. Low priority, and only once nothing else is outstanding. */
  if (!user.emailVerified) {
    return {
      kind: 'verify-email',
      heading: 'Confirm your email address',
      body: 'We sent you a link. Confirming it means you get the updates about your website as they happen.',
      cta: { label: 'Send it again', href: '/app/account' },
      waitingOnCustomer: true,
    };
  }

  /* 8. We are working. Say what we are doing. */
  const presentation = MILESTONE_PRESENTATION[project.milestone];
  return {
    kind: 'waiting-on-us',
    heading: presentation.label,
    body: presentation.detail,
    cta: { label: 'See your project', href: `/app/projects/${project.id}` },
    waitingOnCustomer: false,
  };
}
