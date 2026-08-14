import { OnboardingModel, toStoredOnboarding } from './onboarding.model.js';
import type { NewOnboardingRecord, StoredOnboarding } from './onboarding.types.js';

/** Everything the onboarding feature needs from storage. */
export interface OnboardingRepository {
  create(record: NewOnboardingRecord): Promise<StoredOnboarding>;
}

export interface MongoOnboardingRepositoryDependencies {
  /** Idempotent connect. Called before every operation because serverless starts cold. */
  readonly connect: () => Promise<void>;
}

export function createMongoOnboardingRepository(
  dependencies: MongoOnboardingRepositoryDependencies,
): OnboardingRepository {
  const { connect } = dependencies;

  return {
    async create(record) {
      await connect();
      const document = await OnboardingModel.create(record);
      return toStoredOnboarding(document.toObject());
    },
  };
}
