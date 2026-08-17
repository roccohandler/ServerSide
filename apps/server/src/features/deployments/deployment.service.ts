import type { Logger } from '../../lib/logger.js';
import type { ActivityRecorder } from '../activity/index.js';
import { noopNotifier, type Notifier } from '../notifications/index.js';
import type { ProjectRepository } from '../projects/index.js';
import type { ProjectUpdate } from '../projects/index.js';
import type { DeploymentRepository } from './deployment.repository.js';
import type { DeploymentEvent, StoredDeployment } from './deployment.types.js';

export interface DeploymentService {
  /**
   * Applies one verified deployment event: records it, updates the project's URLs, and
   * writes activity — but only on a real state transition, so a redelivered webhook is
   * silent.
   */
  apply(event: DeploymentEvent): Promise<StoredDeployment>;
  listForProject(projectId: string, limit: number): Promise<readonly StoredDeployment[]>;
}

export interface DeploymentServiceDependencies {
  readonly repository: DeploymentRepository;
  readonly projects: ProjectRepository;
  readonly activity: ActivityRecorder;
  /** Optional and no-op by default, like every other consumer of this port. */
  readonly notifier?: Notifier | undefined;
  readonly logger: Logger;
}

export function createDeploymentService(
  dependencies: DeploymentServiceDependencies,
): DeploymentService {
  const { repository, projects, activity, logger } = dependencies;
  const notifier = dependencies.notifier ?? noopNotifier;

  return {
    async apply(event) {
      const { deployment, stateChanged } = await repository.upsert(event);

      /*
       * The project may not exist: a build can be configured with a project id that was
       * later deleted, or mistyped. The deployment is still recorded — it is a fact
       * that happened — but nothing downstream runs.
       */
      const project = await projects.findById(event.projectId);
      if (!project) {
        logger.warn('deployment.unknown_project', {
          projectId: event.projectId,
          externalId: event.externalId,
        });
        return deployment;
      }

      if (!stateChanged) {
        logger.info('deployment.duplicate_ignored', { externalId: event.externalId });
        return deployment;
      }

      if (event.state === 'failed') {
        /*
         * Internal only. A customer being told "your deployment failed" learns nothing
         * they can act on and everything about a problem that is ours to fix — see the
         * portal rules in the brief about never showing build output.
         */
        logger.error('deployment.failed', {
          projectId: project.id,
          environment: event.environment,
          externalId: event.externalId,
        });
        await activity.record({
          type: 'deployment.failed',
          summary: `A ${event.environment} deployment failed.`,
          audience: 'internal',
          projectId: project.id,
        });
        return deployment;
      }

      if (event.state !== 'ready' || !deployment.url) return deployment;

      if (event.environment === 'preview') {
        /*
         * The first preview is what moves a project into review — but only forwards.
         * A project already in `revisions` or past it must not be dragged backwards
         * by a routine rebuild, which would tell the customer to review a website
         * they have already approved.
         */
        const entersReview = project.milestone === 'building' || project.milestone === 'planning';

        const update: ProjectUpdate = {
          previewUrl: deployment.url,
          ...(entersReview
            ? { milestone: 'review' as const, approval: 'ready_for_review' as const }
            : {}),
        };

        await projects.update(project.id, update);

        await activity.record({
          type: 'deployment.preview_ready',
          summary: 'Your website preview has been updated.',
          audience: 'customer',
          projectId: project.id,
          userId: project.ownerUserId,
        });

        /*
         * ================================================================
         * ONLY THE PREVIEW THAT CHANGES THE MILESTONE IS WORTH AN EMAIL
         * ================================================================
         *
         * `entersReview` is already the exact question, computed above for the update — it is
         * true for the deployment that first makes a website reviewable and false for every
         * rebuild afterwards. Reusing it here rather than re-deriving the condition is what
         * keeps the two from drifting.
         *
         * The distinction is the difference between a useful notification and a hated one. A
         * build during revisions can deploy several times in an afternoon, and a customer
         * emailed each time learns to ignore the one that says their site is ready. The activity
         * entry above still records every one, because the stream is a record and the customer
         * can see it when they look.
         *
         * `setMilestone` on the project service sends the same email when an operator moves the
         * tab by hand. Both paths lead to one message per genuine transition, which is the
         * property that matters — not which of them happened to cause it.
         */
        if (entersReview) {
          await notifier.previewReady({
            to: { email: project.email, name: project.contactName },
            businessName: project.businessName,
            projectId: project.id,
          });
        }

        logger.info('deployment.preview_ready', { projectId: project.id });
        return deployment;
      }

      /* Production. This is the moment a project is live. */
      await projects.update(project.id, {
        productionUrl: deployment.url,
        milestone: 'live',
        status:
          project.status === 'in-build' || project.status === 'deposit-paid'
            ? 'launched'
            : project.status,
      });

      await activity.record({
        type: 'deployment.production_ready',
        summary: 'Your website is live.',
        audience: 'customer',
        projectId: project.id,
        userId: project.ownerUserId,
      });

      await activity.record({
        type: 'project.launched',
        summary: 'Your website was launched.',
        audience: 'customer',
        projectId: project.id,
        userId: project.ownerUserId,
      });

      /*
       * Unconditional, unlike the preview branch, because a production deployment is not a
       * routine event: it is the launch. `stateChanged` above has already made this idempotent
       * under a redelivered webhook — a duplicate returns before reaching here — so a customer
       * gets exactly one "your website is live", on the day it is.
       *
       * `deployment.url` rather than `project.productionUrl`: the update above wrote it and the
       * `project` in hand is the record as it was read, so reading it back would send the
       * previous URL or none at all on a first launch.
       */
      await notifier.projectLaunched({
        to: { email: project.email, name: project.contactName },
        businessName: project.businessName,
        productionUrl: deployment.url,
      });

      logger.info('deployment.production_ready', { projectId: project.id });
      return deployment;
    },

    listForProject: (projectId, limit) => repository.listForProject(projectId, limit),
  };
}
