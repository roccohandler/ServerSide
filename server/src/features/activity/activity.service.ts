import { describeError, type Logger } from '../../lib/logger.js';
import type { ActivityRepository } from './activity.repository.js';
import type { NewActivityRecord, StoredActivity } from './activity.types.js';

/**
 * The narrow interface every other feature depends on.
 *
 * Deliberately one method, and deliberately *not* the repository: the recorder is
 * injected into the billing, project, task, feedback and deployment services, and the
 * only thing any of them is allowed to do is say what happened. None of them can read
 * the stream, which is what keeps this a write-only spine rather than a shared mutable
 * blackboard that features start coordinating through.
 *
 * When there is a reason for an event bus, this is the interface it implements.
 */
export interface ActivityRecorder {
  /**
   * Records one event. **Never throws.**
   *
   * That is the important property and it is a deliberate trade. Every call site is a
   * business operation that has already succeeded — a payment applied, a milestone
   * moved — and failing that operation because its audit line could not be written
   * would turn a cosmetic problem into a lost payment. The failure is logged loudly
   * instead.
   */
  record(record: NewActivityRecord): Promise<void>;
}

export interface ActivityService extends ActivityRecorder {
  listForUser(params: {
    readonly userId: string;
    readonly limit: number;
    readonly customerVisibleOnly: boolean;
  }): Promise<readonly StoredActivity[]>;
  listForProject(params: {
    readonly projectId: string;
    readonly limit: number;
    readonly customerVisibleOnly: boolean;
  }): Promise<readonly StoredActivity[]>;
}

export interface ActivityServiceDependencies {
  readonly repository: ActivityRepository;
  readonly logger: Logger;
}

export function createActivityService(dependencies: ActivityServiceDependencies): ActivityService {
  const { repository, logger } = dependencies;

  return {
    async record(record) {
      try {
        await repository.record(record);
      } catch (error) {
        logger.error('activity.record_failed', { type: record.type, ...describeError(error) });
      }
    },

    listForUser: (params) => repository.listForUser(params),
    listForProject: (params) => repository.listForProject(params),
  };
}

/** Used by tests and by code paths that must not write. */
export const noopActivityRecorder: ActivityRecorder = {
  async record() {
    /* intentionally nothing */
  },
};
