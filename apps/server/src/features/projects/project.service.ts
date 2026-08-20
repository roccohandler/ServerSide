import { AppError } from '../../lib/appError.js';
import type { Logger } from '../../lib/logger.js';
import type { ActivityRecorder } from '../activity/index.js';
import type { StoredUser } from '../auth/index.js';
import { noopNotifier, type Notifier } from '../notifications/index.js';
import type { StoredTask, TaskKind, TaskService } from '../tasks/index.js';
import type { ProjectRepository } from './project.repository.js';
import {
  MILESTONE_PRESENTATION,
  isLegalMilestoneMove,
  type ApprovalState,
  type NewProjectInput,
  type ProjectDetailsUpdate,
  type ProjectMilestone,
  type StoredProject,
} from './project.types.js';
import type { ProjectScope, ScopeInput } from './scope.types.js';

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
    /**
     * The PaymentIntent this deposit was taken on.
     *
     * How a later refund finds its project — the same reason the owner-link path stores one —
     * and, more usefully here, how a **duplicate** is told apart from a redelivery. Stripe
     * delivers at least once, so seeing a deposit for an already-paid project is ordinary;
     * seeing one on a *different* PaymentIntent means the customer has been charged twice, and
     * those two are indistinguishable without this.
     */
    readonly paymentIntentId?: string | undefined;
  }): Promise<{
    readonly project: StoredProject;
    readonly created: boolean;
    /**
     * True when this payment is a second, distinct charge against a deposit already settled.
     *
     * The caller alerts the owner. It is deliberately *not* refunded automatically: a refund
     * is money moving, and the shape that took the second payment — two tabs, or a
     * double-tap — is close enough to the shape of a legitimate second project that a person
     * should look before anything is reversed.
     */
    readonly duplicate: boolean;
  }>;
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
  /**
   * ============================================================================
   * A GROWTH PARTNER SUBSCRIPTION BOUGHT FROM THE PORTAL
   * ============================================================================
   *
   * The self-serve twin of the owner-link path, and it exists for the same reason
   * `settleFinalPayment` does: a customer subscribing from their own billing page sends
   * `userId`, never a project id, so the subscription arrives naming an *account*.
   *
   * Without this the money is taken and nothing is attached: `subscriptionStatus` stays
   * `none`, the billing page keeps reading *Not started*, the subscription webhooks that
   * follow cannot find a project to update — and `available.plan` stays true, so the
   * page goes on offering a plan they are already paying for.
   *
   * Newest project, as above, and for the same reason: one account holds one project.
   * ============================================================================
   */
  attachSubscription(params: {
    readonly ownerUserId: string;
    readonly subscriptionId?: string | undefined;
    readonly stripeCustomerId?: string | undefined;
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
   * ==========================================================================
   * THE AGREED SCOPE — DECISION 040
   * ==========================================================================
   *
   * `sendScope` is the owner writing the agreement down; `acceptScope` is the customer
   * agreeing to it. Together they make `docs/business-offer.md` rule #35 — "scope is agreed
   * in writing before any payment" — something the server enforces rather than something the
   * business intends.
   *
   * Two properties are load-bearing and each one fails quietly if broken:
   *
   *   1. **A send always clears any acceptance.** An owner correcting a typo and an owner
   *      adding two thousand dollars of work are indistinguishable from here, and only one of
   *      them is safe to carry an old acceptance forward. So neither does.
   *   2. **Acceptance is idempotent and never moves.** A second click returns the first
   *      acceptance with its timestamp intact, exactly as `approve` does — the date is the
   *      thing the record exists to hold, and a refreshed page must not refresh it.
   */
  sendScope(params: {
    readonly project: StoredProject;
    readonly scope: ScopeInput;
  }): Promise<StoredProject>;
  /**
   * The customer accepting the scope they were sent.
   *
   * Refuses when there is nothing to accept, which is a real state rather than a defensive
   * check: the console can be mid-conversation with somebody whose project exists and whose
   * agreement has not been written up yet.
   */
  acceptScope(params: {
    readonly project: StoredProject;
    readonly acceptedBy: StoredUser;
  }): Promise<StoredProject>;
  /**
   * The customer's explicit approval. Records who, when, and which deployment — an
   * approval that cannot say what was approved is not worth having.
   */
  approve(params: {
    readonly project: StoredProject;
    readonly approvedBy: StoredUser;
    /**
     * Which deployment they were looking at, when there is one to name.
     *
     * Resolved by the route rather than here, because this service does not depend on
     * deployments and must not — `DeploymentService` already depends on the project
     * repository, so the reverse edge would close a cycle. Optional because a preview URL set
     * by hand has no deployment behind it, and an absent answer is better than a guessed one.
     */
    readonly approvedDeploymentId?: string | undefined;
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

  /**
   * Sets, revises or clears the estimated launch date.
   *
   * ==========================================================================
   * A DATE THAT MOVES SILENTLY IS WORSE THAN NO DATE
   * ==========================================================================
   *
   * This is a domain operation rather than a field on `updateDetails` for one reason: the
   * *second* time it is called it has to send an email, and the first time it must not.
   *
   * Setting a first estimate is good news arriving — the customer had nothing and now has
   * something, and they will see it the moment they open the portal. **Moving** one is
   * different in kind. It is a promise being changed, and a customer who finds out by
   * noticing a different number on a page they happened to revisit has been told nothing;
   * they have been left to discover it. `notifier.estimateChanged` refuses a same-day
   * re-save on top of this, so an operator pressing save twice sends nothing.
   *
   * `null` clears it, and clearing is deliberately silent. "We no longer know when this will
   * be finished" is not a sentence to put in an email without a human writing the rest of it.
   * ==========================================================================
   */
  setEstimate(params: {
    readonly project: StoredProject;
    /** `null` returns the project to "not set yet". */
    readonly estimatedCompletionAt: Date | null;
    /** Whose name goes on the change. From the session, never from a body. */
    readonly by: string;
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

    async activateForCustomer({ owner, businessName, assessmentId, paymentIntentId }) {
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
      let found = existing[0];

      if (found) {
        logger.info('project.activation_skipped_existing', {
          userId: owner.id,
          projectId: found.id,
        });

        /*
         * ==================================================================
         * AN EXISTING PROJECT STILL HAS TO BE MARKED PAID
         * ==================================================================
         *
         * This branch used to do nothing but re-seed, and it was correct for as long as the
         * only way to reach it was a *redelivery* of a payment that had already created the
         * project — where the deposit was paid by definition.
         *
         * DECISION 040 made it the ordinary path. The scope is now agreed before any money
         * moves, which means the owner creates the project first (`status: 'agreed'`, which
         * `PROJECT_STATUSES` has always defined as exactly this) and the customer pays against
         * a project that already exists. Without this the deposit would clear at Stripe and
         * the project would sit at `pending` forever: the portal would keep offering the
         * button, the console would show an unpaid build, and the only place the money existed
         * would be Stripe's dashboard.
         *
         * Guarded on the current value rather than written unconditionally, so a redelivery is
         * still a no-op and no second activity entry appears — the property this whole method
         * exists to hold.
         * ==================================================================
         */
        if (found.depositStatus !== 'paid') {
          const settled = await repository.update(found.id, {
            depositStatus: 'paid',
            status: 'deposit-paid',
            ...(paymentIntentId ? { depositPaymentIntentId: paymentIntentId } : {}),
          });

          if (settled) {
            logger.info('project.deposit_settled_on_existing', {
              userId: owner.id,
              projectId: found.id,
            });
            found = settled;
          }
        }

        /*
         * ==================================================================
         * TWO TABS, TWO CHARGES
         * ==================================================================
         *
         * `available.deposit` is checked when a Checkout session is *created*, so two tabs
         * opened before either is paid both get a valid session and both can complete. The
         * state converges — the project ends up paid either way — and Stripe has taken the
         * money twice.
         *
         * Preventing it properly means a claim at session creation, which is a lock across two
         * systems for a race that needs two tabs and a decisive customer. Detecting it costs a
         * comparison, and detection is what actually matters: the customer needs the second
         * charge back, and nothing anywhere noticed it had happened.
         *
         * **A different PaymentIntent is the whole test.** A redelivery of the same payment —
         * which Stripe does routinely — carries the same one, and this must stay silent for
         * those or it becomes an alert nobody reads.
         */
        const duplicate = Boolean(
          paymentIntentId &&
          found.depositPaymentIntentId &&
          found.depositPaymentIntentId !== paymentIntentId,
        );

        if (duplicate) {
          logger.error('project.duplicate_deposit', {
            userId: owner.id,
            projectId: found.id,
            paymentIntentId,
          });
        }

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

        return { project: found, created: false, duplicate };
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
        ...(paymentIntentId ? { depositPaymentIntentId: paymentIntentId } : {}),
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

      return { project, created: true, duplicate: false };
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

    async attachSubscription({ ownerUserId, subscriptionId, stripeCustomerId }) {
      const [newest] = await repository.listByOwner(ownerUserId, 1);

      if (!newest) {
        logger.error('project.subscription_no_project', { userId: ownerUserId });
        return null;
      }

      /* Stripe delivers at least once, and the same subscription arrives again on renewal. */
      if (newest.subscriptionId === subscriptionId && newest.subscriptionStatus === 'active') {
        return newest;
      }

      const updated = await repository.update(newest.id, {
        ...(subscriptionId ? { subscriptionId } : {}),
        ...(stripeCustomerId && !newest.stripeCustomerId ? { stripeCustomerId } : {}),
        subscriptionStatus: 'active',
      });

      logger.info('project.subscription_attached', {
        userId: ownerUserId,
        projectId: newest.id,
      });

      /*
       * No activity entry, for the reason given on `settleFinalPayment`: the fulfilment
       * port has already written "We received your payment" for this event.
       */
      return updated;
    },

    async setMilestone({ project, milestone }) {
      if (project.milestone === milestone) return project;

      /*
       * The legality check the comment on `ProjectDetailsUpdate` has claimed lived here since
       * it was written, and which did not. Every transition was permitted, so a `<select>` on
       * a page holding several customers' projects could take a launched site back to
       * `onboarding` — emailing the customer and writing a real stage change into their
       * history. The rules and their reasoning are in `isLegalMilestoneMove`.
       *
       * The message names the alternative rather than only the refusal, because an operator
       * who meant it has a legitimate route and should not have to guess what it is.
       */
      if (!isLegalMilestoneMove(project.milestone, milestone)) {
        throw new AppError(
          'VALIDATION_ERROR',
          `A project cannot move from ${MILESTONE_PRESENTATION[project.milestone].label.toLowerCase()} to ${MILESTONE_PRESENTATION[milestone].label.toLowerCase()}. ` +
            'If this was a mis-click, undo it; if the project genuinely needs to go back, move it one stage at a time so the client sees what happened.',
        );
      }

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

        /*
         * ==================================================================
         * THE ONE TASK THAT ARRIVES AFTER A LAUNCH
         * ==================================================================
         *
         * Every other task blocks a build. This asks a client whose site is now live to keep
         * their Google listing current and to ask a happy customer for a review.
         *
         * It is a task rather than a line in the launch email for the reason tasks exist at
         * all: an email is read once and a task is a thing that stays until it is done. And it
         * is the highest-value thing this business can ask a new client to do — every buyer in
         * this market checks third-party reviews before ringing anybody, and a well-kept
         * profile does more for a local service business than anything on the website.
         *
         * The site already says exactly that, in `localSearch.caveat`: "for most local service
         * businesses a well-kept Google Business Profile matters more than anything on the
         * website itself, and we will tell you that rather than sell you around it." This is
         * that sentence arriving at the moment it is useful rather than while somebody is
         * still deciding whether to buy.
         *
         * Guarded on there being an account, like every other task: one with no owner has
         * nobody to appear for. `addTask` is the domain operation, so it emails them too.
         */
        if (updated.ownerUserId) {
          await this.addTask({
            project: updated,
            kind: 'review-listing',
            title: 'Check your Google listing, and ask one customer for a review',
            description:
              'Your website is live, and this is the highest-value hour you can spend on it. Make sure your Google Business Profile has your new address, your hours and a few recent photos — then ask one customer who was happy to leave a review. For most local service businesses that listing does more than the website does.',
          });
        }
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

    async setEstimate({ project, estimatedCompletionAt, by }) {
      const previous = project.estimatedCompletionAt;

      const updated = await repository.update(project.id, {
        estimatedCompletionAt,
        estimateUpdatedAt: now(),
        estimateUpdatedBy: by,
      });

      if (!updated) throw new AppError('NOT_FOUND', 'No project with that id.');

      logger.info('project.estimate_set', {
        projectId: project.id,
        cleared: estimatedCompletionAt === null,
        moved: previous !== undefined && estimatedCompletionAt !== null,
      });

      /*
       * On movement only, and the condition says both halves of that out loud: there has to
       * have been a previous date for anything to have moved *from*, and there has to be a new
       * one for it to have moved *to*. A first estimate and a cleared estimate both fall out
       * here, which is the whole rule.
       */
      if (previous && estimatedCompletionAt) {
        await notifier.estimateChanged({
          to: recipientFor(updated),
          businessName: updated.businessName,
          projectId: updated.id,
          previous,
          next: estimatedCompletionAt,
        });
      }

      return updated;
    },

    async setUrls({ project, previewUrl, productionUrl }) {
      /*
       * ==================================================================
       * A PRODUCTION URL APPEARING *IS* THE LAUNCH, AND THE MILESTONE HAS TO AGREE
       * ==================================================================
       *
       * This method already treated a production URL as the launch: it writes
       * `deployment.production_ready` to the customer's stream and sends the "your website is
       * live" email, on the argument — correct — that a deployment on a host the webhook
       * cannot see would otherwise launch a website and tell nobody.
       *
       * It left the milestone where it was. So for every site hosted outside Vercel the
       * customer received an email saying their website was live while their dashboard went on
       * saying "We are putting your website live", indefinitely, until somebody remembered a
       * second action. The two halves of one event, half-done.
       *
       * ## And the second half, which the first half exposed
       *
       * The announcement used to fire on *any* production-URL change, so correcting a typo in
       * a domain on a site that had been up for a month emailed the client "your website is
       * live" a second time. That was invisible while nothing else in this method knew the
       * difference between launching and editing; `launching` is now the thing that knows, and
       * both the email and the customer-visible entry hang off it.
       *
       * A URL change on an already-live site is still recorded — as `internal`. The audit trail
       * keeps it, which is what an audit trail is for, and the customer is not told their
       * website went live again.
       * ==================================================================
       */
      const launching =
        productionUrl !== undefined &&
        project.productionUrl !== productionUrl &&
        project.milestone !== 'live';

      const updated = await repository.update(project.id, {
        ...(previewUrl === undefined ? {} : { previewUrl }),
        ...(productionUrl === undefined ? {} : { productionUrl }),
        ...(launching ? { milestone: 'live' as const } : {}),
      });

      if (!updated) throw new AppError('NOT_FOUND', 'No project with that id.');

      logger.info('project.urls_set_manually', {
        projectId: project.id,
        preview: previewUrl !== undefined,
        production: productionUrl !== undefined,
        launched: launching,
      });

      /*
       * The stage change, in the customer's history, beside the launch it belongs to.
       *
       * Written here rather than by calling `setMilestone` because that would send a second
       * "your website is live" email — this method sends its own below, deliberately, and for
       * a host the deployment webhook cannot see it is the only one that will be sent.
       */
      if (launching) {
        await activity.record({
          type: 'project.milestone_changed',
          summary: MILESTONE_PRESENTATION['live'].label,
          audience: 'customer',
          projectId: project.id,
          userId: project.ownerUserId,
        });
      }

      /*
       * A production URL appearing is the customer's launch, however it got there — and
       * `launching` is what distinguishes that from an operator correcting the address of a
       * site that has been up for a month.
       *
       * The condition used to be the URL change alone, which meant a typo fix emailed the
       * client "your website is live" a second time. Nothing in the method knew the difference
       * until the milestone move above gave it a name.
       */
      if (launching) {
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
      } else if (productionUrl !== undefined && project.productionUrl !== productionUrl) {
        /*
         * The address of a live site changed. `internal`, and the audience is the whole
         * decision: it is a real event and the audit trail should have it, and it is not news
         * the customer needs — being told their website went live again, a month after it did,
         * is worse than being told nothing.
         */
        await activity.record({
          type: 'deployment.production_ready',
          summary: `The production address was changed to ${updated.productionUrl ?? 'a new URL'}.`,
          audience: 'internal',
          projectId: project.id,
          userId: project.ownerUserId,
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

    async sendScope({ project, scope }) {
      /*
       * The version always moves and the acceptance always goes. See the interface note: an
       * acceptance that survives a replacement points at a document that has changed, which
       * is the one thing this record exists to make impossible.
       */
      const next: ProjectScope = {
        version: (project.scope?.version ?? 0) + 1,
        summary: scope.summary,
        lines: scope.lines,
        priceCents: scope.priceCents,
        ...(scope.notes ? { notes: scope.notes } : {}),
        ...(scope.caseStudy ? { caseStudy: true } : {}),
        sentAt: now(),
        sentBy: scope.sentBy,
      };

      const updated = await repository.update(project.id, { scope: next });
      if (!updated) throw new AppError('NOT_FOUND', 'No project with that id.');

      logger.info('project.scope_sent', { projectId: project.id, version: next.version });

      await activity.record({
        type: 'project.scope_sent',
        summary:
          next.version === 1
            ? 'We sent you the scope and price to look over.'
            : 'We sent you an updated scope and price to look over.',
        audience: 'customer',
        projectId: project.id,
        userId: project.ownerUserId,
      });

      /*
       * The customer is emailed, and this is one of the few places that is unambiguously
       * right: the next move is theirs, they cannot make it without knowing, and it is the
       * gate on everything after it — an unaccepted scope means no deposit button, so a
       * client waiting for one would be waiting for something they were never told about.
       *
       * `previewReady` is the closest sibling and takes the same shape: something is ready,
       * here is where it is, the link goes to their own project rather than to a document.
       */
      await notifier.scopeReady({
        to: recipientFor(updated),
        businessName: updated.businessName,
        projectId: updated.id,
        revised: next.version > 1,
      });

      return updated;
    },

    async acceptScope({ project, acceptedBy }) {
      const current = project.scope;

      if (!current) {
        throw new AppError(
          'VALIDATION_ERROR',
          'There is nothing to accept yet — we have not sent you the scope and price for this project.',
        );
      }

      // Idempotent, exactly as `approve` is. A second click returns the first acceptance.
      if (current.acceptedAt) return project;

      const updated = await repository.update(project.id, {
        scope: {
          ...current,
          acceptedAt: now(),
          acceptedByUserId: acceptedBy.id,
          acceptedName: acceptedBy.name,
        },
      });

      if (!updated) throw new AppError('NOT_FOUND', 'No project with that id.');

      logger.info('project.scope_accepted', {
        projectId: project.id,
        userId: acceptedBy.id,
        version: current.version,
      });

      await activity.record({
        type: 'project.scope_accepted',
        summary: `${acceptedBy.name} accepted the scope and price.`,
        audience: 'customer',
        projectId: project.id,
        userId: project.ownerUserId,
      });

      /*
       * The owner, immediately, and not the customer — the same asymmetry `approve` makes and
       * for the same reason. The customer just pressed the button; the panel changing is the
       * confirmation. For the owner this is the signal that the deposit has become payable,
       * which is the moment a build stops being a conversation.
       */
      await notifier.owner({
        kind: 'owner.scope_accepted',
        subject: `Scope accepted — ${updated.businessName}`,
        heading: 'A scope was accepted',
        lines: [
          `${acceptedBy.name} accepted the scope for ${updated.businessName}.`,
          'The deposit is now offered on their billing page.',
        ],
        replyTo: updated.email,
      });

      return updated;
    },

    async approve({ project, approvedBy, approvedDeploymentId }) {
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
        /*
         * Written at last. The field has existed, been documented and been cleared by
         * `requestChanges` since the approval feature shipped, and nothing ever set it — so
         * every approval on record was one this system could not say the subject of.
         */
        ...(approvedDeploymentId ? { approvedDeploymentId } : {}),
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
      /*
       * ========================================================================
       * CHANGING YOUR MIND IS ALLOWED. UNDOING A LAUNCH OR A PAYMENT IS NOT.
       * ========================================================================
       *
       * `approve` has always required a preview to approve; this had no precondition at
       * all, and the two cases below are where that mattered — pressing it dragged a
       * *launched* project back to `revisions` and withdrew an approval that a payment
       * had already been taken against.
       *
       * The line is deliberately not "after approval". Approving and then thinking better
       * of it minutes later is a real thing people do, the portal offers it in those words
       * ("I would like changes after all"), and `approve` moves the milestone to
       * `launching` immediately — so a guard on `launching` alone would remove the
       * affordance the product intends. Reversal stays open for exactly as long as the
       * approval is still only an approval.
       *
       * Once the site is live, or once the balance has been paid against that approval,
       * the record is load-bearing: it is what the payment was owed on and what a dispute
       * would be answered with. Wanting a change then is still a real thing, and it has a
       * real home — the feedback thread, which reaches the same person and does not
       * rewrite what happened.
       * ========================================================================
       */
      if (project.milestone === 'live' || project.finalStatus === 'paid') {
        throw new AppError(
          'VALIDATION_ERROR',
          'Your website has already gone live, so it cannot be sent back for changes here. Send us a message with what you would like changed and we will pick it up.',
        );
      }

      const updated = await repository.update(project.id, {
        approval: 'changes_requested' as ApprovalState,
        milestone: 'revisions',
        /*
         * One press, one round — which is exactly what the published terms define a round as:
         * "one consolidated set of requested changes submitted together". Fifteen items in one
         * message is a round; fifteen messages over a fortnight is still a round, because a
         * comment is not this button.
         *
         * Counted here rather than derived from the activity stream, because it is the number
         * a customer is shown against a published allowance and it has to be a fact the system
         * asserts. The site publishes "two revision rounds" and the portal now says which one
         * they are on — a client who cannot tell has no way to spend the second one
         * deliberately, which is where the argument about it starts.
         */
        revisionRounds: (project.revisionRounds ?? 0) + 1,
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
