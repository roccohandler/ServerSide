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
  /**
   * What one person has not caught up on.
   *
   * On the service rather than left to the route, so `since` is derived from the account in
   * exactly one place: a route that computed the fallback itself would be a second opinion
   * about what an account with no marker has missed, and the two would disagree the first
   * time either changed.
   *
   * `customerVisibleOnly` is hard-coded here rather than a parameter, because this answers a
   * question the *customer's* interface asks. Nothing counts internal entries; a badge that
   * included a failed webhook would be telling somebody about a system they cannot see.
   */
  unreadForUser(params: {
    readonly userId: string;
    /** The account's marker. Undefined means they have never caught up. */
    readonly readAt: Date | undefined;
    /** Where "never caught up" starts from. Their signup, not the epoch. */
    readonly accountCreatedAt: Date;
  }): Promise<UnreadActivity>;
}

/**
 * How far behind somebody is.
 *
 * `since` is returned rather than left to the caller to remember, because the interface says
 * "new since you were last here" and that sentence needs the date it is counting from. When
 * the marker is absent it is the account's own creation date, which is the honest answer:
 * everything since you arrived.
 */
export interface UnreadActivity {
  readonly count: number;
  readonly since: Date;
  /** True when the count hit the cap. The interface prints "50+" rather than a wrong number. */
  readonly capped: boolean;
}

/**
 * The largest unread count that will ever be computed.
 *
 * Fifty rather than a round hundred for one reason: it is the same bound the console's lists
 * use, and a second number would be a second thing to keep in step. See `countForUserSince`
 * for why a cap exists at all.
 */
export const UNREAD_CAP = 50;

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

    async unreadForUser({ userId, readAt, accountCreatedAt }) {
      const since = readAt ?? accountCreatedAt;

      const count = await repository.countForUserSince({
        userId,
        since,
        customerVisibleOnly: true,
        cap: UNREAD_CAP,
      });

      return { count, since, capped: count >= UNREAD_CAP };
    },
  };
}

/** Used by tests and by code paths that must not write. */
export const noopActivityRecorder: ActivityRecorder = {
  async record() {
    /* intentionally nothing */
  },
};
