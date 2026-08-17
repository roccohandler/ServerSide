import type { EmailMessage, EmailService } from '../../infrastructure/email/email.service.js';
import { describeError, redactEmail, type Logger } from '../../lib/logger.js';
import {
  buildApprovalRequestedEmail,
  buildAssessmentDeliveredEmail,
  buildEstimateChangedEmail,
  buildFeedbackRepliedEmail,
  buildFileDeliveredEmail,
  buildOwnerActionEmail,
  buildPaymentDueEmail,
  buildPaymentFailedEmail,
  buildPreviewReadyEmail,
  buildProjectLaunchedEmail,
  buildReportPublishedEmail,
  buildTasksAssignedEmail,
} from './notification.email.js';
import { isImmediate, type NotificationKind } from './notification.types.js';

/**
 * Who a customer notification is going to.
 *
 * Taken as a value rather than looked up, because every caller already has the account —
 * `StoredProject` carries `email` and `contactName`, and the services that notify have the
 * project in hand. A lookup here would be a second query for something already loaded, and it
 * would give this feature a repository it has no other use for.
 */
export interface NotificationRecipient {
  readonly email: string;
  readonly name: string;
}

/**
 * The port every other feature depends on.
 *
 * ## Every method returns `Promise<void>` and none of them reject
 *
 * That is the contract, and it is the same one `ActivityRecorder` makes, for the same reason
 * stated in the same words: each call site is a business operation that has already succeeded,
 * and failing a milestone transition because a mail server was briefly unreachable would turn a
 * cosmetic problem into a lost state change.
 *
 * A consumer therefore never needs a `try` around a notification, and — more importantly —
 * never has a reason to `await` one before doing something else that matters. The failure is
 * logged loudly and the operation carries on.
 *
 * ## Why the methods are specific rather than one `notify(kind, data)`
 *
 * Because the data each one needs is different, and a single method taking a union would push
 * the "which fields does this kind require" question into the call site, where it would be
 * answered by a cast. Nine named methods with nine argument types is more lines and no
 * decisions.
 */
export interface Notifier {
  previewReady(params: {
    readonly to: NotificationRecipient;
    readonly businessName: string;
    readonly projectId: string;
  }): Promise<void>;

  approvalRequested(params: {
    readonly to: NotificationRecipient;
    readonly businessName: string;
    readonly projectId: string;
  }): Promise<void>;

  /**
   * Something — or several things — is needed from the customer.
   *
   * Takes the whole set rather than one task, which is what makes coalescing possible. See the
   * note on `buildTasksAssignedEmail`: `seedOnboarding` creates five in a loop, and five emails
   * in one second on the day somebody paid is how a notification system gets muted.
   */
  tasksAssigned(params: {
    readonly to: NotificationRecipient;
    readonly businessName: string;
    readonly projectId: string;
    readonly tasks: readonly { readonly title: string; readonly description: string }[];
  }): Promise<void>;

  feedbackReplied(params: {
    readonly to: NotificationRecipient;
    readonly businessName: string;
    /** Absent for an account-scoped message, which is about no website in particular. */
    readonly projectId?: string | undefined;
    readonly authorName: string;
    readonly body: string;
  }): Promise<void>;

  projectLaunched(params: {
    readonly to: NotificationRecipient;
    readonly businessName: string;
    readonly productionUrl: string | undefined;
  }): Promise<void>;

  /**
   * Money is owed on a build, and here is where to pay it.
   *
   * Two callers and two shapes: the console minting a deposit link for a client who may not
   * have an account yet, and the milestone reaching `launching`, which asks for the second
   * half. See the header of `buildPaymentDueEmail` for why those two want different addresses.
   *
   * `payUrl` is therefore optional, and the default is the billing page — which is the right
   * answer for every caller that has an account to send somebody to, and the only answer
   * `ProjectService` could give: it does not know the site's own origin, and giving it one so
   * it could build this URL would be a frontend route table inside the domain layer.
   */
  paymentDue(params: {
    readonly to: NotificationRecipient;
    readonly businessName: string;
    readonly stage: 'deposit' | 'final';
    readonly amountLabel: string;
    readonly payUrl?: string | undefined;
  }): Promise<void>;

  /**
   * A subscription payment failed and the customer has to update a card.
   *
   * No business name, unlike every other customer method here, and the omission is deliberate:
   * this is billed to a person rather than to a project, and a customer on their second build
   * has one card and one subscription across both.
   */
  paymentFailed(params: { readonly to: NotificationRecipient }): Promise<void>;

  estimateChanged(params: {
    readonly to: NotificationRecipient;
    readonly businessName: string;
    readonly projectId: string;
    readonly previous: Date;
    readonly next: Date;
  }): Promise<void>;

  fileDelivered(params: {
    readonly to: NotificationRecipient;
    readonly businessName: string;
    readonly projectId: string;
    readonly filename: string;
    readonly note: string | undefined;
  }): Promise<void>;

  /** The free review the front page promised has been written and published. */
  assessmentDelivered(params: {
    readonly to: NotificationRecipient;
    readonly businessName: string;
    readonly findingCount: number;
    readonly preparedBy: string;
  }): Promise<void>;

  /** A month's Website Performance Report is out. */
  reportPublished(params: {
    readonly to: NotificationRecipient;
    readonly businessName: string;
    readonly monthLabel: string;
  }): Promise<void>;

  /**
   * One of the owner's immediate three, or a line for the digest.
   *
   * A single method for the owner where the customer gets eight, because what varies is one
   * sentence rather than a layout — and because the split between immediate and digest is
   * decided by `kind`, in one table, rather than by which method was called.
   */
  owner(params: {
    readonly kind: NotificationKind;
    readonly subject: string;
    readonly heading: string;
    readonly lines: readonly string[];
    /** The client's address, so a reply from the owner's mail app reaches them. */
    readonly replyTo?: string | undefined;
  }): Promise<void>;
}

export interface NotifierDependencies {
  readonly emailService: EmailService;
  /** Where links land. The same value billing uses for Stripe's redirects. */
  readonly siteUrl: string;
  /** Undefined when no notification address is configured; owner mail is then skipped. */
  readonly ownerAddress: string | undefined;
  readonly logger: Logger;
  /**
   * Where a digest-tier owner notification is put until the digest runs.
   *
   * Optional, and its absence is a supported state rather than a broken one: without it, a
   * digest-tier event is logged and dropped. That is deliberate for the first deployment —
   * every *immediate* notification still works, which is the half that matters — and it means
   * this feature can ship before the digest's storage does.
   */
  readonly queue?: DigestQueue | undefined;
}

/** Where digest-tier owner notifications wait. Implemented by `notification.digest.ts`. */
export interface DigestQueue {
  enqueue(entry: {
    readonly kind: NotificationKind;
    readonly subject: string;
    readonly lines: readonly string[];
  }): Promise<void>;
}

/* -------------------------------------------------------------------- paths */

/*
 * The customer-facing URLs, built here rather than passed in.
 *
 * These mirror `apps/client/src/config/routes.ts`, which the server cannot import — it is a
 * different workspace and importing a frontend's route table into the API would invert the
 * dependency. They are duplicated for the same reason and with the same discipline as the
 * shapes in `@jobforge/shared`: a small, pinned, deliberately boring list.
 *
 * `dashboard.currentAction.ts` already carries the same paths as literals for the same reason.
 */
const paths = {
  dashboard: (siteUrl: string) => `${siteUrl}/app`,
  billing: (siteUrl: string) => `${siteUrl}/app/billing`,
  project: (siteUrl: string, projectId: string) =>
    `${siteUrl}/app/projects/${encodeURIComponent(projectId)}`,
  projectTasks: (siteUrl: string, projectId: string) =>
    `${siteUrl}/app/projects/${encodeURIComponent(projectId)}/tasks`,
  projectFeedback: (siteUrl: string, projectId: string) =>
    `${siteUrl}/app/projects/${encodeURIComponent(projectId)}/feedback`,
  projectPreview: (siteUrl: string, projectId: string) =>
    `${siteUrl}/app/projects/${encodeURIComponent(projectId)}/preview`,
  assessment: (siteUrl: string) => `${siteUrl}/app/assessment`,
  reports: (siteUrl: string) => `${siteUrl}/app/reports`,
  messages: (siteUrl: string) => `${siteUrl}/app/messages`,
};

/**
 * A launch date, written so it cannot be misread.
 *
 * ============================================================================
 * THE ONE FORMATTER WITH NO READER TO ASK
 * ============================================================================
 *
 * `packages/ui/src/intl.test.ts` fails the build on a hard-coded locale tag, and it is right
 * to: `toLocaleDateString('en-US')` groups and orders for a reader who may be somewhere else,
 * and the browser already knows the answer. `apps/admin/src/utils/formatDate.ts` follows that
 * rule and additionally rejects pinning `America/Los_Angeles`, on the grounds that it hard-codes
 * a business fact into a formatter and is wrong the moment the owner reads from anywhere else.
 *
 * **Both arguments assume a reader whose environment can be asked, and email has none.** This
 * string is baked on a server, into a message that will be opened days later on a device this
 * process will never see. `undefined` here resolves to the *function's* locale, which is a
 * property of a Vercel region rather than of the person reading.
 *
 * So the requirement is different from either of theirs: not "the reader's format" — which is
 * unavailable — but **a format no reader can get wrong**. `month: 'long'` is what does that
 * work. `08/09/2026` is two different days depending on where it is opened; a named month is
 * one day everywhere, whichever order the parts arrive in.
 *
 * The locale argument is `undefined` so the guard's rule holds unchanged, and the timezone is
 * left alone for the reason the console gives. A date this coarse does not slip across a day
 * boundary from a region offset, and if it ever did, the fix is to store the estimate as a
 * calendar day rather than to pin a zone here.
 * ============================================================================
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/* ------------------------------------------------------------------ service */

export function createNotifier(dependencies: NotifierDependencies): Notifier {
  const { emailService, siteUrl, ownerAddress, logger, queue } = dependencies;

  /**
   * Sends one message and swallows everything.
   *
   * The single place this feature's "never throws" contract is implemented, so no method below
   * has to remember it and no method below can get it wrong.
   */
  async function deliver(kind: NotificationKind, build: () => EmailMessage): Promise<void> {
    try {
      const email = build();
      await emailService.send(email);
      logger.info('notification.sent', { kind, to: redactEmail(email.to) });
    } catch (error) {
      logger.error('notification.failed', { kind, ...describeError(error) });
    }
  }

  return {
    previewReady: ({ to, businessName, projectId }) =>
      deliver('preview.ready', () =>
        buildPreviewReadyEmail({
          to,
          businessName,
          projectUrl: paths.projectPreview(siteUrl, projectId),
        }),
      ),

    approvalRequested: ({ to, businessName, projectId }) =>
      deliver('approval.requested', () =>
        buildApprovalRequestedEmail({
          to,
          businessName,
          projectUrl: paths.projectPreview(siteUrl, projectId),
        }),
      ),

    async tasksAssigned({ to, businessName, projectId, tasks }) {
      /*
       * Nothing to say is not an error. `seedOnboarding` returns only the tasks it actually
       * created, and a retried webhook creates none — so an empty set here is the *normal*
       * outcome of Stripe's second delivery, and sending "0 things we need" would be the
       * duplicate-notification bug that idempotency exists to prevent.
       */
      if (tasks.length === 0) return;

      await deliver('tasks.assigned', () =>
        buildTasksAssignedEmail({
          to,
          businessName,
          titles: tasks.map((task) => task.title),
          firstDescription: tasks[0]?.description,
          tasksUrl: paths.projectTasks(siteUrl, projectId),
        }),
      );
    },

    feedbackReplied: ({ to, businessName, projectId, authorName, body }) =>
      deliver('feedback.replied', () =>
        buildFeedbackRepliedEmail({
          to,
          businessName,
          authorName,
          body,
          /*
           * Two scopes, two destinations. An answer about a website belongs on that website's
           * feedback tab; an answer to somebody with no project open belongs on Messages, and
           * sending them to a project id they do not have would be a link to a 404.
           */
          feedbackUrl: projectId
            ? paths.projectFeedback(siteUrl, projectId)
            : paths.messages(siteUrl),
        }),
      ),

    projectLaunched: ({ to, businessName, productionUrl }) =>
      deliver('project.launched', () =>
        buildProjectLaunchedEmail({
          to,
          businessName,
          productionUrl,
          dashboardUrl: paths.dashboard(siteUrl),
        }),
      ),

    paymentDue: ({ to, businessName, stage, amountLabel, payUrl }) =>
      deliver('payment.due', () =>
        buildPaymentDueEmail({
          to,
          businessName,
          stage,
          amountLabel,
          payUrl: payUrl ?? paths.billing(siteUrl),
        }),
      ),

    paymentFailed: ({ to }) =>
      deliver('payment.failed', () =>
        buildPaymentFailedEmail({ to, billingUrl: paths.billing(siteUrl) }),
      ),

    async estimateChanged({ to, businessName, projectId, previous, next }) {
      /*
       * Same day, no email. An estimate re-saved without moving is an operator pressing save
       * twice, and telling a customer their launch date changed when it did not is worse than
       * telling them nothing — it spends the credibility the notification exists to build.
       */
      const previousLabel = formatDate(previous);
      const nextLabel = formatDate(next);
      if (previousLabel === nextLabel) return;

      await deliver('estimate.changed', () =>
        buildEstimateChangedEmail({
          to,
          businessName,
          previous: previousLabel,
          next: nextLabel,
          later: next.getTime() > previous.getTime(),
          projectUrl: paths.project(siteUrl, projectId),
        }),
      );
    },

    fileDelivered: ({ to, businessName, projectId, filename, note }) =>
      deliver('file.delivered', () =>
        buildFileDeliveredEmail({
          to,
          businessName,
          filename,
          note,
          projectUrl: paths.project(siteUrl, projectId),
        }),
      ),

    assessmentDelivered: ({ to, businessName, findingCount, preparedBy }) =>
      deliver('assessment.delivered', () =>
        buildAssessmentDeliveredEmail({
          to,
          businessName,
          findingCount,
          preparedBy,
          assessmentUrl: paths.assessment(siteUrl),
        }),
      ),

    reportPublished: ({ to, businessName, monthLabel }) =>
      deliver('report.published', () =>
        buildReportPublishedEmail({
          to,
          businessName,
          monthLabel,
          reportsUrl: paths.reports(siteUrl),
        }),
      ),

    async owner({ kind, subject, heading, lines, replyTo }) {
      if (!ownerAddress) {
        /*
         * Not a failure. `CONTACT_NOTIFICATION_EMAIL` is optional by design and the whole system
         * runs without it; what must not happen is a silent drop, because the owner not knowing
         * they are not being told is the actual harm.
         */
        logger.info('notification.owner_skipped_no_address', { kind });
        return;
      }

      if (!isImmediate(kind)) {
        if (!queue) {
          logger.info('notification.digest_dropped_no_queue', { kind, subject });
          return;
        }

        try {
          await queue.enqueue({ kind, subject, lines });
        } catch (error) {
          logger.error('notification.digest_enqueue_failed', { kind, ...describeError(error) });
        }
        return;
      }

      await deliver(kind, () =>
        buildOwnerActionEmail({
          recipient: ownerAddress,
          subject,
          heading,
          lines,
          ...(replyTo ? { replyTo } : {}),
        }),
      );
    },
  };
}

/**
 * Used by tests, and by every service whose notifier dependency is left unset.
 *
 * Matches `noopActivityRecorder` and `noopBillingFulfillment` exactly, including in why it
 * exists: the tests that predate this feature are about domain state and have no mail to
 * assert, and requiring a stub in each would have been churn rather than coverage.
 */
export const noopNotifier: Notifier = {
  async previewReady() {
    /* intentionally nothing */
  },
  async approvalRequested() {
    /* intentionally nothing */
  },
  async tasksAssigned() {
    /* intentionally nothing */
  },
  async feedbackReplied() {
    /* intentionally nothing */
  },
  async projectLaunched() {
    /* intentionally nothing */
  },
  async paymentDue() {
    /* intentionally nothing */
  },
  async paymentFailed() {
    /* intentionally nothing */
  },
  async estimateChanged() {
    /* intentionally nothing */
  },
  async fileDelivered() {
    /* intentionally nothing */
  },
  async assessmentDelivered() {
    /* intentionally nothing */
  },
  async reportPublished() {
    /* intentionally nothing */
  },
  async owner() {
    /* intentionally nothing */
  },
};
