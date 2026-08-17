import { AppError } from '../../lib/appError.js';
import type { Logger } from '../../lib/logger.js';
import type { ActivityRecorder } from '../activity/index.js';
import type { StoredUser } from '../auth/index.js';
import { noopNotifier, type Notifier } from '../notifications/index.js';
import type { StoredTask, TaskKind, TaskService } from '../tasks/index.js';
import type { ProjectRepository } from './project.repository.js';
import {
  MILESTONE_PRESENTATION,
  type ApprovalState,
  type NewProjectInput,
  type ProjectDetailsUpdate,
  type ProjectMilestone,
  type StoredProject,
} from './project.types.js';

/**
 * How long after a milestone change it may still be undone.
 *
 * Fifteen minutes: long enough to cover "I did that to the wrong project", short enough that
 * an undo cannot quietly rewrite history a customer has already read. The dashboard changes
 * the instant the milestone does, so an undo an hour later is a second change rather than a
 * correction of the first — and it should be recorded as one.
 */
export const UNDO_WINDOW_MS = 15 * 60 * 1000;

export interface ProjectService {
  findById(id: string): Promise<StoredProject | null>;
  listForOwner(userId: string, limit: number): Promise<readonly StoredProject[]>;
  /** Staff only. `search` matches the business, the contact or the address by prefix. */
  listAll(limit: number, search?: string | undefined): Promise<readonly StoredProject[]>;
  /** The projects behind a set of ids, in one round trip. See the repository for why. */
  listByIds(ids: readonly string[]): Promise<readonly StoredProject[]>;
  /**
   * Creates a project for a customer and seeds its onboarding tasks. Idempotent per
   * account: a second call returns the project that already exists rather than a
   * second one, which is what makes payment-driven activation safe under Stripe's
   * retries.
   */
  activateForCustomer(params: {
    readonly owner: { readonly id: string; readonly email: string; readonly name: string };
    readonly businessName: string;
    readonly assessmentId?: string | undefined;
  }): Promise<{ readonly project: StoredProject; readonly created: boolean }>;
  /**
   * The launch instalment cleared on a project bought self-serve.
   *
   * ============================================================================
   * THE ONE PAYMENT WRITE THAT IS NOT IN THE BILLING FEATURE, AND WHY
   * ============================================================================
   *
   * Every other payment status is written by `applyCheckoutSession` against a `projectId` in
   * the Checkout metadata — the owner sent a link for a named project and the webhook comes
   * back naming it. A customer paying their own balance has no project id to send: the
   * session is created from their *session*, and `metadata.userId` is what the webhook
   * carries, because a browser must never be able to name the project a payment settles.
   *
   * So somebody has to turn an account into a project, and this is the side that knows how.
   * `BillingFulfillment` is billing's only edge to the platform and it already calls exactly
   * one thing here — `activateForCustomer` — for the deposit. This is that method's sibling
   * for the other half of the build.
   *
   * **It writes `finalStatus` and nothing else**, matching the owner-link path in
   * `applyCheckoutSession` field for field. Paying the balance does not move a milestone, does
   * not launch a site and does not complete a project: those are fulfilment facts and this is
   * a money fact. The two being written in two places is exactly why they are kept identical.
   *
   * Idempotent — Stripe delivers at least once, and a project already `paid` is returned
   * unchanged. Returns `null` when the account has no project, which is a real state worth
   * logging rather than throwing over: it means a payment arrived for somebody whose project
   * was detached between checkout and webhook.
   * ============================================================================
   */
  settleFinalPayment(params: {
    readonly ownerUserId: string;
    readonly paymentIntentId?: string | undefined;
  }): Promise<StoredProject | null>;
  /** Owner-set. Records activity and moves the customer-visible state. */
  setMilestone(params: {
    readonly project: StoredProject;
    readonly milestone: ProjectMilestone;
  }): Promise<StoredProject>;
  /**
   * Puts a milestone back, within a short window of it being moved.
   *
   * ## Why this exists, and why it is not a general undo
   *
   * The console's milestone control is a `<select>`, and until it gained a confirmation step a
   * scroll wheel over it was enough to rewrite what a customer's dashboard says. The
   * confirmation is the real fix; this is for the case the operator confirms and *then*
   * realises — which on a surface holding several customers' projects is a mis-click on the
   * wrong tab, not a change of mind.
   *
   * It is a domain operation rather than "call `setMilestone` with the old value", because
   * `CUSTOMER-PLATFORM.md` §10.3 says lifecycle state changes only through one, and because
   * the two are genuinely different events: an undo writes an *internal* activity entry
   * saying a change was reversed, where re-setting would write a second customer-visible
   * entry claiming the project moved backwards on purpose.
   *
   * ## The window, and why there is one
   *
   * Fifteen minutes. Long enough to cover "I did that to the wrong project", short enough
   * that it cannot be used to quietly rewrite history a customer has already read — they see
   * the dashboard change immediately, and an undo an hour later is a second change rather
   * than a correction of the first.
   *
   * Refused rather than silently ignored once the window has passed, because the operator
   * needs to know the customer has probably seen it.
   */
  undoMilestone(params: {
    readonly project: StoredProject;
    readonly previous: ProjectMilestone;
    readonly changedAt: Date;
  }): Promise<StoredProject>;
  /**
   * The customer's explicit approval. Records who, when, and which deployment — an
   * approval that cannot say what was approved is not worth having.
   */
  approve(params: {
    readonly project: StoredProject;
    readonly approvedBy: StoredUser;
  }): Promise<StoredProject>;
  /** The other explicit action: the customer wants changes before it goes live. */
  requestChanges(params: {
    readonly project: StoredProject;
    readonly requestedBy: StoredUser;
  }): Promise<StoredProject>;
  /** Owner-set: tells the customer the preview is ready to look at. */
  markReadyForReview(project: StoredProject): Promise<StoredProject>;
  /**
   * Asks the customer for something, and tells them it was asked.
   *
   * ## Why this is here rather than on `TaskService`
   *
   * Because the notification needs the business name and the address to write to, and a task
   * carries neither — it has a `projectId` and a `userId`. `TaskService` would have to load the
   * project to send the email, and it must not: this service already depends on it, so the
   * reverse edge would be a cycle.
   *
   * Putting the operation on the side that already holds the project resolves that without
   * anybody importing anybody, and it puts the decision where the rest of the customer-facing
   * decisions live. `TaskService` stays what it is — storage and status for a to-do list.
   *
   * The route calls this instead of `taskService.addTask`; that one is still the primitive and
   * is still what seeding uses.
   */
  addTask(params: {
    readonly project: StoredProject;
    readonly kind: TaskKind;
    readonly title: string;
    readonly description: string;
    readonly dueAt?: Date | undefined;
  }): Promise<StoredTask>;
  /**
   * Called after a task is completed. Moves a project out of `onboarding` once nothing
   * is outstanding.
   *
   * Without this, a customer who has sent everything we asked for keeps being told
   * "We need a few things from you" with an empty list underneath it — which reads as
   * the system having lost their work. Returns the project unchanged in every other
   * case, so it is safe to call after any completion.
   */
  refreshOnboardingProgress(project: StoredProject): Promise<StoredProject>;
  /**
   * Sets a preview or production URL by hand.
   *
   * The normal path is a deployment event — see the deployments feature, and the rule
   * that no URL is ever written in frontend code. This exists for the cases the
   * provider webhook cannot cover: a site hosted somewhere else, or a build that
   * happened before the integration was wired up. Owner-only.
   */
  setUrls(params: {
    readonly project: StoredProject;
    readonly previewUrl?: string | undefined;
    readonly productionUrl?: string | undefined;
  }): Promise<StoredProject>;
  createForOwner(input: NewProjectInput): Promise<StoredProject>;

  /**
   * Gives an existing project to an account, and finishes the job payment would have done.
   *
   * ## Why this is a domain operation and not a field write
   *
   * Because attaching an owner is not "set `ownerUserId`". Until this moment the project was
   * invisible: nobody could see it, nothing could be asked of anybody, and the customer had no
   * history. Attaching has to leave the same state a paid activation leaves — onboarding tasks
   * seeded, an activity entry in the customer's own timeline, and an email telling them what is
   * needed — or the operator has produced a project that appears in somebody's dashboard with
   * nothing in it and no explanation of how it got there.
   *
   * `CUSTOMER-PLATFORM.md` §10.3 states the rule; this is the second operation to need it.
   *
   * Refuses when the account already owns a project, matching `activateForCustomer`'s
   * cardinality — one account, one project, and a customer who genuinely needs a second
   * website is a conversation rather than a form.
   */
  attachOwner(params: {
    readonly project: StoredProject;
    readonly owner: StoredUser;
  }): Promise<StoredProject>;

  /**
   * Takes a project back out of an account's dashboard.
   *
   * Nothing is deleted and nothing is told to anybody. The tasks, the files and the history
   * stay on the project — this is a correction to who can see it, usually because it was
   * attached to the wrong account, and the version of it that also destroyed the work would
   * make a mis-click unrecoverable.
   */
  detachOwner(project: StoredProject): Promise<StoredProject>;

  /**
   * Corrects the description of a project: who the client is, how to reach them, what the
   * owner has noted, and the commercial label.
   *
   * See `ProjectDetailsUpdate` for what is deliberately not reachable through it.
   */
  updateDetails(params: {
    readonly project: StoredProject;
    readonly changes: ProjectDetailsUpdate;
  }): Promise<StoredProject>;
}

export interface ProjectServiceDependencies {
  readonly repository: ProjectRepository;
  readonly tasks: TaskService;
  readonly activity: ActivityRecorder;
  /**
   * How the customer is told any of this happened.
   *
   * Optional and defaulting to a no-op, matching `BillingFulfillment` on the billing service and
   * for the same two reasons: the port never throws, so no call site below needs a `try`; and the
   * tests that predate it are about lifecycle state and have no mail to assert, so requiring a
   * stub in each would have been churn rather than coverage.
   */
  readonly notifier?: Notifier | undefined;
  /**
   * What the launch instalment costs, already written for a person — `"$2,450"`.
   *
   * ============================================================================
   * A STRING, INJECTED, RATHER THAN AN IMPORT — AND THE REASON IS A REAL CYCLE
   * ============================================================================
   *
   * `amountLabel('build-final')` in `features/billing` is where this figure is produced, and
   * calling it from here would be the obvious thing. It cannot be done: `billing.types.ts`
   * re-exports the project vocabulary from `features/projects`, so an import in this direction
   * closes a module cycle — projects → billing → projects — and the const holding the formatter
   * would be reachable in its temporal dead zone depending on which module the process entered
   * first. That is a failure that appears in production and not in a test that imports the two
   * in the lucky order.
   *
   * So the value arrives from the composition root, which is the one place that is allowed to
   * know both features. The same shape and the same argument as `findProjectIdByEmail` on the
   * onboarding service: the narrowest dependency that does the job is the one that cannot be
   * made to do another. This one cannot even be called.
   *
   * **Optional, and its absence silences one email.** A "the launch payment is ready" message
   * with a blank where the amount should be is worse than no message, so `setMilestone` sends
   * nothing when this is unset. The cost of that default is the same one the `activity` and
   * `notificationRecipient` notes warn about elsewhere and is stated here for the same reason:
   * a composition root that forgets this produces no error and no warning, just a customer who
   * is never told their balance is due.
   * ============================================================================
   */
  readonly finalPaymentLabel?: string | undefined;
  readonly logger: Logger;
  readonly now?: () => Date;
}

/**
 * Who to write to about a project.
 *
 * Read off the stored record rather than looked up, because the project *is* the contact detail:
 * `email` and `contactName` are set at creation from the paying account and are the address the
 * business already corresponds with. A lookup through the auth repository would be a second
 * query for something already in hand, and it would fail for a project with no `ownerUserId` —
 * which is exactly the project an operator is most likely to be moving by hand.
 */
function recipientFor(project: StoredProject): { readonly email: string; readonly name: string } {
  return { email: project.email, name: project.contactName };
}

export function createProjectService(dependencies: ProjectServiceDependencies): ProjectService {
  const { repository, tasks, activity, finalPaymentLabel, logger } = dependencies;
  const notifier = dependencies.notifier ?? noopNotifier;
  const now = dependencies.now ?? (() => new Date());

  return {
    findById: (id) => repository.findById(id),
    listForOwner: (userId, limit) => repository.listByOwner(userId, limit),
    listAll: (limit, search) => repository.listAll(limit, search),
    listByIds: (ids) => repository.listByIds(ids),

    async createForOwner(input) {
      return repository.create({
        ...input,
        status: 'agreed',
        milestone: 'onboarding',
        approval: 'not_ready',
        depositStatus: 'pending',
        finalStatus: 'pending',
        subscriptionStatus: 'none',
      });
    },

    async activateForCustomer({ owner, businessName, assessmentId }) {
      /*
       * ==================================================================
       * IDEMPOTENT ACTIVATION
       * ==================================================================
       *
       * Called from the Stripe webhook, which is at-least-once. Two deliveries of one
       * payment must not produce two projects, two sets of onboarding tasks and two
       * "your project is ready" emails.
       *
       * Existing projects win. The check is "does this account have a project" rather
       * than a lock or a claim record, because the real-world cardinality is one, the
       * webhook handler is already serialised by the billing feature's own event claim,
       * and a customer who genuinely needs a second website is a conversation rather
       * than a second Checkout.
       * ==================================================================
       */
      const existing = await repository.listByOwner(owner.id, 1);
      const found = existing[0];

      if (found) {
        logger.info('project.activation_skipped_existing', {
          userId: owner.id,
          projectId: found.id,
        });
        // Still seed: a first delivery that created the project and then failed before
        // seeding must be completed by the retry. Seeding is itself idempotent.
        const late = await tasks.seedOnboarding({ projectId: found.id, userId: owner.id });

        /*
         * And still notify, for exactly the case this re-seed exists for: a first delivery that
         * created the project and died before seeding leaves a customer with a project and
         * nothing to do in it. The retry is what gives them their tasks, so the retry is what
         * has to tell them.
         *
         * On the ordinary redelivery — the common case — `late` is empty and the port sends
         * nothing, so this line costs one function call and cannot double-email anybody.
         */
        await notifier.tasksAssigned({
          to: recipientFor(found),
          businessName: found.businessName,
          projectId: found.id,
          tasks: late.map((task) => ({ title: task.title, description: task.description })),
        });

        return { project: found, created: false };
      }

      const project = await repository.create({
        businessName,
        contactName: owner.name,
        email: owner.email,
        ownerUserId: owner.id,
        assessmentId,
        status: 'deposit-paid',
        milestone: 'onboarding',
        approval: 'not_ready',
        depositStatus: 'paid',
        finalStatus: 'pending',
        subscriptionStatus: 'none',
      });

      logger.info('project.activated', { userId: owner.id, projectId: project.id });

      const seeded = await tasks.seedOnboarding({ projectId: project.id, userId: owner.id });

      await activity.record({
        type: 'project.created',
        summary: 'Your website project has started.',
        audience: 'customer',
        projectId: project.id,
        userId: owner.id,
      });

      /*
       * ==================================================================
       * ONE EMAIL FOR FIVE TASKS, ON THE DAY SOMEBODY PAID
       * ==================================================================
       *
       * `seedOnboarding` creates the whole onboarding set in a loop, and this is the call site
       * that made coalescing non-negotiable: five separate messages in the same second, arriving
       * minutes after a customer has paid several thousand dollars, is the worst possible first
       * impression of the system they have just bought — and the fastest route to somebody
       * filtering every message this application will ever send them.
       *
       * `tasksAssigned` takes the set and sends one. It is passed `seeded` rather than the full
       * task list deliberately: `seedOnboarding` returns **only what it actually created**, so a
       * redelivered Stripe webhook produces an empty array, and the port sends nothing. That is
       * what makes this branch idempotent under a retry without a second guard — the same
       * property `activateForCustomer` gets from the existing-project check above.
       * ==================================================================
       */
      await notifier.tasksAssigned({
        to: recipientFor(project),
        businessName: project.businessName,
        projectId: project.id,
        tasks: seeded.map((task) => ({ title: task.title, description: task.description })),
      });

      return { project, created: true };
    },

    async settleFinalPayment({ ownerUserId, paymentIntentId }) {
      const [newest] = await repository.listByOwner(ownerUserId, 1);

      if (!newest) {
        logger.error('project.final_payment_no_project', { userId: ownerUserId });
        return null;
      }

      /* Stripe delivers at least once. A balance already settled is not settled twice. */
      if (newest.finalStatus === 'paid') return newest;

      const updated = await repository.update(newest.id, {
        finalStatus: 'paid',
        ...(paymentIntentId ? { finalPaymentIntentId: paymentIntentId } : {}),
      });

      logger.info('project.final_payment_settled', {
        userId: ownerUserId,
        projectId: newest.id,
      });

      /*
       * No activity entry, and the omission is deliberate rather than an oversight.
       * `onPaymentSucceeded` in the fulfilment port has already written "We received your
       * payment. Thank you." into this customer's history for this exact event — it does so
       * for every product, before it branches. A second entry here would be the same payment
       * appearing twice in one timeline, which is how a history stops being read.
       */
      return updated;
    },

    async setMilestone({ project, milestone }) {
      if (project.milestone === milestone) return project;

      const updated = await repository.update(project.id, {
        milestone,
        /*
         * Moving into review is what makes a preview reviewable, and moving out of it
         * resets the approval — a project going back into `revisions` is not one the
         * customer has approved.
         */
        ...(milestone === 'review' ? { approval: 'ready_for_review' as const } : {}),
        ...(milestone === 'revisions' ? { approval: 'changes_requested' as const } : {}),
      });

      if (!updated) throw new AppError('NOT_FOUND', 'No project with that id.');

      logger.info('project.milestone_changed', { projectId: project.id, milestone });

      await activity.record({
        type: 'project.milestone_changed',
        summary: MILESTONE_PRESENTATION[milestone].label,
        audience: 'customer',
        projectId: project.id,
        userId: project.ownerUserId,
      });

      /*
       * ==================================================================
       * FOUR MILESTONES ARE WORTH AN EMAIL, AND FOUR ARE NOT
       * ==================================================================
       *
       * Every milestone change writes activity, because the stream is a record. Only the ones
       * where **the customer has something to do, or something has finished**, are worth
       * interrupting somebody's day for:
       *
       *   `review`    — there is a website to look at, and the build now waits on them
       *   `approval`  — their changes are done and it waits on their decision
       *   `launching` — the balance is now owed
       *   `live`      — it is up
       *
       * `onboarding`, `planning`, `building` and `revisions` are all "we are working on it",
       * which is the state the dashboard exists to answer and email does not improve. A
       * customer emailed on every internal transition learns to ignore the ones that matter,
       * which costs more than the four unsent messages are worth.
       *
       * **`launching` moved across, and it moved for a reason rather than a preference.** This
       * comment used to list it with the four silent ones, and that was right while it meant
       * only "pointing your domain" — a sentence about our afternoon. It now also means the
       * second instalment has become payable, which is the one thing on this list that is
       * genuinely the customer's to act on and the one thing they cannot discover by waiting.
       * The dashboard says so too (`pay-final`), and the two agreeing is the point: somebody
       * who reads the email and then opens the portal should find the same sentence.
       *
       * The message deliberately carries no Stripe link. It points at their billing page,
       * which is where the button lives and which cannot go stale the way a minted Checkout
       * session can — see `paymentDue`'s note on `payUrl`.
       *
       * `review` additionally requires a preview URL. Telling somebody their preview is ready
       * and landing them on a page with nothing to look at is worse than saying nothing —
       * `markReadyForReview` already refuses the same state for the same reason.
       *
       * `launching` has a condition of its own for the same shape of reason: a project whose
       * deposit never cleared, or whose balance is already settled, has no payment to be told
       * about, and "the launch payment is ready" to somebody who has already paid it is the
       * message that costs the most trust of any in this file.
       * ==================================================================
       */
      const to = recipientFor(updated);

      if (milestone === 'review' && updated.previewUrl) {
        await notifier.previewReady({
          to,
          businessName: updated.businessName,
          projectId: updated.id,
        });
      } else if (milestone === 'approval') {
        await notifier.approvalRequested({
          to,
          businessName: updated.businessName,
          projectId: updated.id,
        });
      } else if (
        milestone === 'launching' &&
        finalPaymentLabel &&
        updated.depositStatus === 'paid' &&
        updated.finalStatus !== 'paid'
      ) {
        await notifier.paymentDue({
          to,
          businessName: updated.businessName,
          stage: 'final',
          amountLabel: finalPaymentLabel,
        });
      } else if (milestone === 'live') {
        await notifier.projectLaunched({
          to,
          businessName: updated.businessName,
          productionUrl: updated.productionUrl,
        });
      }

      return updated;
    },

    async undoMilestone({ project, previous, changedAt }) {
      const elapsed = Date.now() - changedAt.getTime();

      if (elapsed > UNDO_WINDOW_MS || elapsed < 0) {
        throw new AppError(
          'VALIDATION_ERROR',
          'That change is too old to undo. The customer has almost certainly seen it, so ' +
            'move the milestone deliberately instead and tell them why.',
        );
      }

      if (project.milestone === previous) return project;

      const updated = await repository.update(project.id, {
        milestone: previous,
        /*
         * The same approval consequences `setMilestone` applies, because going back into
         * `review` or `revisions` means the same thing whichever direction it is travelled
         * in. Anything else would leave a project in `review` that nothing had marked
         * reviewable.
         */
        ...(previous === 'review' ? { approval: 'ready_for_review' as const } : {}),
        ...(previous === 'revisions' ? { approval: 'changes_requested' as const } : {}),
      });

      if (!updated) throw new AppError('NOT_FOUND', 'No project with that id.');

      logger.info('project.milestone_undone', {
        projectId: project.id,
        from: project.milestone,
        to: previous,
      });

      /*
       * `internal`, and this is the whole reason `undoMilestone` is its own operation.
       *
       * A customer reading their own history should see the stage they are at, not a pair of
       * entries saying it moved forward and then back within a minute — that is an operator's
       * mistake being narrated to somebody it did not happen to. The audit trail still has it,
       * because the console shows internal entries and that is what an audit trail is for.
       */
      await activity.record({
        type: 'project.milestone_changed',
        summary: `Milestone change undone: back to ${MILESTONE_PRESENTATION[previous].label}`,
        audience: 'internal',
        projectId: project.id,
        userId: project.ownerUserId,
      });

      return updated;
    },

    async markReadyForReview(project) {
      if (!project.previewUrl) {
        throw new AppError(
          'VALIDATION_ERROR',
          'This project has no preview URL yet, so there is nothing to ask the client to review.',
        );
      }
      return this.setMilestone({ project, milestone: 'review' });
    },

    async addTask({ project, kind, title, description, dueAt }) {
      /*
       * The same refusal the admin route makes, made here as well.
       *
       * The route's check is the one that produces the readable message an operator sees; this
       * one is the domain's, and it exists because the route is no longer the only caller. A
       * task with no account behind it is a task with nobody to appear for, and `TaskService`
       * cannot know that — it takes a `userId` and trusts it.
       */
      if (!project.ownerUserId) {
        throw new AppError(
          'VALIDATION_ERROR',
          'This project has no customer account attached, so a task would have nobody to appear for.',
        );
      }

      const task = await tasks.addTask({
        projectId: project.id,
        userId: project.ownerUserId,
        kind,
        title,
        description,
        dueAt,
      });

      /*
       * A single task, through the same coalescing port the onboarding set uses. The port
       * handles one and five identically, so there is no second template and no second decision
       * about tone — the email simply reads "one thing we need from you" instead of five.
       */
      await notifier.tasksAssigned({
        to: recipientFor(project),
        businessName: project.businessName,
        projectId: project.id,
        tasks: [{ title: task.title, description: task.description }],
      });

      return task;
    },

    async attachOwner({ project, owner }) {
      if (project.ownerUserId === owner.id) return project;

      if (project.ownerUserId) {
        throw new AppError(
          'VALIDATION_ERROR',
          'This project already belongs to another account. Detach it first if that is wrong.',
        );
      }

      /*
       * The same cardinality `activateForCustomer` enforces, and it has to be enforced here as
       * well rather than only there: a customer whose dashboard suddenly shows two projects has
       * no way to tell which one is theirs, and every "your project" sentence the portal writes
       * becomes ambiguous. One account, one project. A second website is a conversation.
       */
      const alreadyHas = await repository.countForOwner(owner.id);

      if (alreadyHas > 0) {
        throw new AppError(
          'VALIDATION_ERROR',
          `${owner.email} already has a project. One account holds one project — detach the other first, or use a different account.`,
        );
      }

      /*
       * `claimForOwner` rather than `update`, and the difference is a race. The filter is
       * `ownerUserId: null`, so two operators attaching two accounts to one project in the same
       * second produce one winner and one refusal rather than a silent overwrite.
       */
      const attached = await repository.claimForOwner(project.id, owner.id);

      if (!attached) {
        throw new AppError(
          'VALIDATION_ERROR',
          'That project was given to an account while this page was open. Reload and check.',
        );
      }

      logger.info('project.owner_attached', { projectId: project.id, userId: owner.id });

      await activity.record({
        type: 'project.created',
        summary: 'Your website project has started.',
        audience: 'customer',
        projectId: attached.id,
        userId: owner.id,
      });

      /*
       * ==================================================================
       * BACKFILL, BUT ONLY WHAT THE STAGE ACTUALLY WANTS
       * ==================================================================
       *
       * A project still at `onboarding` needs the five things a paid activation asks for. A
       * project already in `build` does not — seeding "send us your logo" onto a website that
       * is half finished would ask a new customer for materials somebody has already supplied,
       * on their first visit, which is the worst possible first impression of a portal.
       *
       * `seedOnboarding` is itself idempotent, so this is safe on a project that somehow has
       * them already; the milestone check is about relevance rather than duplication.
       */
      const seeded =
        attached.milestone === 'onboarding'
          ? await tasks.seedOnboarding({ projectId: attached.id, userId: owner.id })
          : [];

      await notifier.tasksAssigned({
        to: recipientFor(attached),
        businessName: attached.businessName,
        projectId: attached.id,
        tasks: seeded.map((task) => ({ title: task.title, description: task.description })),
      });

      return attached;
    },

    async detachOwner(project) {
      if (!project.ownerUserId) return project;

      const detached = await repository.update(project.id, { ownerUserId: null });
      if (!detached) throw new AppError('NOT_FOUND', 'No project with that id.');

      /*
       * `internal`, and it is the only sensible audience. The stream this would otherwise be
       * written to belongs to the account that can no longer see the project — so a customer
       * entry here is one nobody will ever read, filed against a project that has vanished from
       * their dashboard. The console keeps it, which is where the question gets asked.
       */
      await activity.record({
        type: 'project.created',
        summary: 'The customer account was detached from this project.',
        audience: 'internal',
        projectId: project.id,
        userId: project.ownerUserId,
      });

      logger.info('project.owner_detached', {
        projectId: project.id,
        userId: project.ownerUserId,
      });

      return detached;
    },

    async updateDetails({ project, changes }) {
      /*
       * ==================================================================
       * `status` MAY NOT CONTRADICT WHAT WAS PAID
       * ==================================================================
       *
       * `status` is a commercial label the owner maintains and `milestone` is the lifecycle —
       * two fields, kept apart on purpose, and `ProjectDetailsUpdate` is what stops this form
       * reaching the second one. What it cannot stop on its own is the label telling a story
       * the money contradicts.
       *
       * One rule, and only one, because only one of the six values is a claim about a payment:
       * `deposit-paid` means a deposit arrived, and a deposit arriving is Stripe's to say.
       * `launched` deliberately is *not* guarded — its own definition is "site live; final
       * payment received **or due**", so a launched site with an outstanding invoice is a real
       * and common state rather than a contradiction.
       */
      if (changes.status === 'deposit-paid' && project.depositStatus !== 'paid') {
        throw new AppError(
          'VALIDATION_ERROR',
          'No deposit has been recorded against this project, so it cannot be marked deposit-paid. The status follows the payment, not the other way round.',
        );
      }

      const updated = await repository.update(project.id, changes);
      if (!updated) throw new AppError('NOT_FOUND', 'No project with that id.');

      /*
       * Internal, and unsummarised. Which field an operator corrected is an audit question, and
       * printing "your contact name was changed" into a customer's own timeline would be the
       * system narrating our filing back at them.
       */
      await activity.record({
        type: 'project.milestone_changed',
        summary: `Project details edited: ${Object.keys(changes).sort().join(', ')}`,
        audience: 'internal',
        projectId: project.id,
        userId: project.ownerUserId,
      });

      logger.info('project.details_updated', {
        projectId: project.id,
        fields: Object.keys(changes).sort(),
      });

      return updated;
    },

    async refreshOnboardingProgress(project) {
      if (project.milestone !== 'onboarding') return project;

      const outstanding = await tasks.listForProject(project.id);
      if (outstanding.some((task) => task.status === 'open')) return project;

      // Everything we asked for has arrived. The build can start.
      const started = await this.setMilestone({ project, milestone: 'planning' });

      /*
       * The owner, immediately, because this is the one that unblocks *them*.
       *
       * Every other notification in this service tells somebody that work has been done. This
       * one says the waiting is over: the client has sent everything, and the build can start
       * today rather than whenever the projects table is next opened. At one operator with one
       * concurrent build, that difference is measured in days.
       *
       * `setMilestone` above sends the customer nothing for `planning`, deliberately — see the
       * note there. The customer already knows they finished their tasks; the person who needs
       * telling is the one who did not.
       */
      await notifier.owner({
        kind: 'owner.tasks_cleared',
        subject: `Ready to build — ${started.businessName}`,
        heading: 'A client has sent everything',
        lines: [
          `${started.businessName} has completed every outstanding task.`,
          'The project has moved to planning and nothing is waiting on them.',
        ],
        replyTo: started.email,
      });

      return started;
    },

    async setUrls({ project, previewUrl, productionUrl }) {
      const updated = await repository.update(project.id, {
        ...(previewUrl === undefined ? {} : { previewUrl }),
        ...(productionUrl === undefined ? {} : { productionUrl }),
      });

      if (!updated) throw new AppError('NOT_FOUND', 'No project with that id.');

      logger.info('project.urls_set_manually', {
        projectId: project.id,
        preview: previewUrl !== undefined,
        production: productionUrl !== undefined,
      });

      /*
       * A production URL appearing is the customer's launch, however it got there. The
       * activity entry is what puts it in their stream and their dashboard.
       */
      if (productionUrl !== undefined && project.productionUrl !== productionUrl) {
        await activity.record({
          type: 'deployment.production_ready',
          summary: 'Your website is live.',
          audience: 'customer',
          projectId: project.id,
          userId: project.ownerUserId,
        });

        /*
         * A production URL appearing by hand is the same event as one appearing from a webhook,
         * so it sends the same email. That equivalence is the point of putting the notification
         * here rather than only in `deployment.service.ts`: a deployment on a host the webhook
         * cannot see would otherwise launch a website and tell nobody, which is the failure mode
         * the manual path exists to avoid rather than create.
         */
        await notifier.projectLaunched({
          to: recipientFor(updated),
          businessName: updated.businessName,
          productionUrl: updated.productionUrl,
        });
      } else if (previewUrl !== undefined && project.previewUrl !== previewUrl) {
        await activity.record({
          type: 'deployment.preview_ready',
          summary: 'Your website preview has been updated.',
          audience: 'customer',
          projectId: project.id,
          userId: project.ownerUserId,
        });

        /*
         * Deliberately **no** email here, and the asymmetry with production above is the whole
         * judgement. A preview URL is set and re-set throughout a build — moving a site between
         * hosts, correcting a typo in a domain — and only the *first* one is news. Which one is
         * the first is a question this method cannot answer, because a manual set has no
         * deployment behind it to compare against.
         *
         * The milestone is what carries that meaning: moving a project to `review` is the act
         * that says "this is worth looking at now", and `setMilestone` sends the email. So the
         * operator's URL field stays quiet and the tab they press next is what tells the client.
         */
      }

      return updated;
    },

    async approve({ project, approvedBy }) {
      /*
       * Approval requires something to approve. A project with no preview cannot be
       * approved, because "you approved it" has to refer to a thing that existed.
       */
      if (!project.previewUrl) {
        throw new AppError(
          'VALIDATION_ERROR',
          'There is nothing to approve yet — your website preview is not ready.',
        );
      }

      // Idempotent. A second click returns the first approval, timestamp intact.
      if (project.approval === 'approved') return project;

      const updated = await repository.update(project.id, {
        approval: 'approved' as ApprovalState,
        approvedAt: now(),
        milestone: 'launching',
      });

      if (!updated) throw new AppError('NOT_FOUND', 'No project with that id.');

      logger.info('project.approved', { projectId: project.id, userId: approvedBy.id });

      await activity.record({
        type: 'project.approved',
        summary: `${approvedBy.name} approved the website.`,
        audience: 'customer',
        projectId: project.id,
        userId: project.ownerUserId,
      });

      /*
       * The owner, immediately, and deliberately not the customer.
       *
       * The customer just pressed the button — they know. Emailing somebody a confirmation of
       * the thing they did thirty seconds ago is the self-notification this feature's tests
       * assert against; the panel changing is the confirmation, and the announcer says it out
       * loud for anybody who cannot see it.
       *
       * For the owner it is the opposite: this is the signal that a build can be launched, and
       * it is one of the three owner notifications that skip the digest. `replyTo` is the
       * client's address so a "brilliant, going live today" can be sent from a phone.
       */
      await notifier.owner({
        kind: 'owner.approved',
        subject: `Approved — ${updated.businessName}`,
        heading: 'A website was approved',
        lines: [
          `${approvedBy.name} approved ${updated.businessName}.`,
          'It is now at the launching milestone, and the launch instalment is offered on their billing page.',
        ],
        replyTo: updated.email,
      });

      return updated;
    },

    async requestChanges({ project, requestedBy }) {
      const updated = await repository.update(project.id, {
        approval: 'changes_requested' as ApprovalState,
        milestone: 'revisions',
        /*
         * Requesting changes withdraws any previous approval outright rather than
         * leaving a stale timestamp beside a project nobody currently approves.
         */
        approvedAt: null,
        approvedDeploymentId: null,
      });

      if (!updated) throw new AppError('NOT_FOUND', 'No project with that id.');

      logger.info('project.changes_requested', { projectId: project.id, userId: requestedBy.id });

      await activity.record({
        type: 'project.changes_requested',
        summary: `${requestedBy.name} asked for changes.`,
        audience: 'customer',
        projectId: project.id,
        userId: project.ownerUserId,
      });

      /*
       * Immediate, and the most time-sensitive of the three owner notifications: from this
       * moment the build is stopped and a client is waiting. The comments explaining *what* they
       * want are on the feedback thread, which the console shows on the same page — so this
       * says a thing happened and where to look, rather than trying to carry the content.
       */
      await notifier.owner({
        kind: 'owner.changes_requested',
        subject: `Changes requested — ${updated.businessName}`,
        heading: 'A client asked for changes',
        lines: [
          `${requestedBy.name} asked for changes to ${updated.businessName}.`,
          'The project is back at the revisions milestone. What they want is on the feedback thread.',
        ],
        replyTo: updated.email,
      });

      return updated;
    },
  };
}
