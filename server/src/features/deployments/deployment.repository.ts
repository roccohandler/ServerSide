import { DeploymentModel, toStoredDeployment } from './deployment.model.js';
import type { DeploymentEvent, StoredDeployment } from './deployment.types.js';

export interface DeploymentRepository {
  /**
   * Records a deployment state, creating the row on first sight and updating it after.
   *
   * Returns whether anything actually changed. That answer is what stops a redelivered
   * webhook writing a second "your preview is ready" activity entry — the row converges
   * either way, but the side effects only run on a real transition.
   */
  upsert(event: DeploymentEvent): Promise<{
    readonly deployment: StoredDeployment;
    readonly stateChanged: boolean;
  }>;
  listForProject(projectId: string, limit: number): Promise<readonly StoredDeployment[]>;
  findLatestReady(
    projectId: string,
    environment: DeploymentEvent['environment'],
  ): Promise<StoredDeployment | null>;
}

export interface MongoDeploymentRepositoryDependencies {
  readonly connect: () => Promise<void>;
}

export function createMongoDeploymentRepository(
  dependencies: MongoDeploymentRepositoryDependencies,
): DeploymentRepository {
  const { connect } = dependencies;

  return {
    async upsert(event) {
      await connect();

      const existing = await DeploymentModel.findOne({
        provider: event.provider,
        externalId: event.externalId,
      })
        .lean()
        .exec();

      const document = await DeploymentModel.findOneAndUpdate(
        { provider: event.provider, externalId: event.externalId },
        {
          $set: {
            projectId: event.projectId,
            environment: event.environment,
            state: event.state,
            ...(event.url ? { url: event.url } : {}),
            ...(event.commitSha ? { commitSha: event.commitSha } : {}),
            ...(event.commitMessage ? { commitMessage: event.commitMessage } : {}),
            occurredAt: event.occurredAt,
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true },
      )
        .lean()
        .exec();

      return {
        deployment: toStoredDeployment(document),
        stateChanged: existing?.state !== event.state,
      };
    },

    async listForProject(projectId, limit) {
      await connect();
      const documents = await DeploymentModel.find({ projectId })
        .sort({ occurredAt: -1 })
        .limit(limit)
        .lean()
        .exec();
      return documents.map(toStoredDeployment);
    },

    async findLatestReady(projectId, environment) {
      await connect();
      const document = await DeploymentModel.findOne({ projectId, environment, state: 'ready' })
        .sort({ occurredAt: -1 })
        .lean()
        .exec();
      return document ? toStoredDeployment(document) : null;
    },
  };
}
