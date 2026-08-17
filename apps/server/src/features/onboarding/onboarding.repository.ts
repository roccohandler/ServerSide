import { OnboardingModel, toStoredOnboarding } from './onboarding.model.js';
import type { NewOnboardingRecord, StoredOnboarding } from './onboarding.types.js';

/** Everything the onboarding feature needs from storage. */
export interface OnboardingRepository {
  create(record: NewOnboardingRecord): Promise<StoredOnboarding>;
  /**
   * The submissions nobody has matched to a project, oldest first.
   *
   * Oldest first for the reason the inbox is: an unmatched submission is a paying client whose
   * materials are sitting in a table nobody is looking at, and the one that has been waiting
   * longest is the one costing the most.
   */
  listUnmatched(limit: number): Promise<readonly StoredOnboarding[]>;
  /** The material behind one project. At most one; the newest wins if a client sent two. */
  findForProject(projectId: string): Promise<StoredOnboarding | null>;
  /** Attaches a submission to a project after the fact — the console's manual match. */
  attachProject(id: string, projectId: string): Promise<StoredOnboarding | null>;
}

export interface MongoOnboardingRepositoryDependencies {
  /** Idempotent connect. Called before every operation because serverless starts cold. */
  readonly connect: () => Promise<void>;
}

const OBJECT_ID = /^[a-f\d]{24}$/i;

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

    async listUnmatched(limit) {
      await connect();
      /* `$exists: false` and an explicit null both mean unmatched — see `claimForOwner`. */
      const documents = await OnboardingModel.find({ projectId: null })
        .sort({ createdAt: 1 })
        .limit(limit)
        .lean()
        .exec();
      return documents.map(toStoredOnboarding);
    },

    async findForProject(projectId) {
      await connect();
      const document = await OnboardingModel.findOne({ projectId })
        .sort({ createdAt: -1 })
        .lean()
        .exec();
      return document ? toStoredOnboarding(document) : null;
    },

    async attachProject(id, projectId) {
      await connect();
      if (!OBJECT_ID.test(id)) return null;

      const document = await OnboardingModel.findByIdAndUpdate(
        id,
        { $set: { projectId } },
        { new: true, runValidators: true },
      )
        .lean()
        .exec();

      return document ? toStoredOnboarding(document) : null;
    },
  };
}
