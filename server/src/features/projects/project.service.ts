import { AppError } from '../../lib/appError.js';
import type { Logger } from '../../lib/logger.js';
import type { ActivityRecorder } from '../activity/index.js';
import type { StoredUser } from '../auth/index.js';
import type { TaskService } from '../tasks/index.js';
import type { ProjectRepository } from './project.repository.js';
import {
  MILESTONE_PRESENTATION,
  type ApprovalState,
  type NewProjectInput,
  type ProjectMilestone,
  type StoredProject,
} from './project.types.js';

export interface ProjectService {
  findById(id: string): Promise<StoredProject | null>;
  listForOwner(userId: string, limit: number): Promise<readonly StoredProject[]>;
  listAll(limit: number): Promise<readonly StoredProject[]>;
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
  /** Owner-set. Records activity and moves the customer-visible state. */
  setMilestone(params: {
    readonly project: StoredProject;
    readonly milestone: ProjectMilestone;
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
}

export interface ProjectServiceDependencies {
  readonly repository: ProjectRepository;
  readonly tasks: TaskService;
  readonly activity: ActivityRecorder;
  readonly logger: Logger;
  readonly now?: () => Date;
}

export function createProjectService(dependencies: ProjectServiceDependencies): ProjectService {
  const { repository, tasks, activity, logger } = dependencies;
  const now = dependencies.now ?? (() => new Date());

  return {
    findById: (id) => repository.findById(id),
    listForOwner: (userId, limit) => repository.listByOwner(userId, limit),
    listAll: (limit) => repository.listAll(limit),

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
        await tasks.seedOnboarding({ projectId: found.id, userId: owner.id });
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

      await tasks.seedOnboarding({ projectId: project.id, userId: owner.id });

      await activity.record({
        type: 'project.created',
        summary: 'Your website project has started.',
        audience: 'customer',
        projectId: project.id,
        userId: owner.id,
      });

      return { project, created: true };
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

    async refreshOnboardingProgress(project) {
      if (project.milestone !== 'onboarding') return project;

      const outstanding = await tasks.listForProject(project.id);
      if (outstanding.some((task) => task.status === 'open')) return project;

      // Everything we asked for has arrived. The build can start.
      return this.setMilestone({ project, milestone: 'planning' });
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
      } else if (previewUrl !== undefined && project.previewUrl !== previewUrl) {
        await activity.record({
          type: 'deployment.preview_ready',
          summary: 'Your website preview has been updated.',
          audience: 'customer',
          projectId: project.id,
          userId: project.ownerUserId,
        });
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

      return updated;
    },
  };
}
