import { describe, expect, it, vi } from 'vitest';
import { createActivityService, UNREAD_CAP } from './activity.service.js';
import type { ActivityRepository } from './activity.repository.js';
import type { Logger } from '../../lib/logger.js';

/*
 * ============================================================================
 * BEING BEHIND ON YOUR OWN STREAM
 * ============================================================================
 *
 * Four rules, and each one is a decision that could have gone the other way:
 *
 *   1. Never having caught up counts from the account's creation, not from the epoch.
 *   2. The count stops at a cap, and says so, rather than being wrong quietly.
 *   3. Internal entries never reach a customer's count.
 *   4. Recording activity still cannot throw. It is the same object, and the write-side
 *      guarantee is the reason every service in the system will call it.
 * ============================================================================
 */

const SILENT: Logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: () => SILENT,
};

function build(overrides: Partial<ActivityRepository> = {}) {
  const repository: ActivityRepository = {
    record: vi.fn(),
    listForUser: vi.fn().mockResolvedValue([]),
    listForProject: vi.fn().mockResolvedValue([]),
    countForUserSince: vi.fn().mockResolvedValue(0),
    ...overrides,
  };

  return {
    service: createActivityService({ repository, logger: SILENT }),
    /* Read off the merged object, not the default — an override has to be the one asserted on. */
    countForUserSince: repository.countForUserSince,
  };
}

const CREATED = new Date('2026-01-01T00:00:00.000Z');
const READ = new Date('2026-08-01T00:00:00.000Z');

describe('how far behind somebody is', () => {
  it('counts from when they last caught up', async () => {
    const { service, countForUserSince } = build({
      countForUserSince: vi.fn().mockResolvedValue(3),
    });

    const unread = await service.unreadForUser({
      userId: 'user-1',
      readAt: READ,
      accountCreatedAt: CREATED,
    });

    expect(unread).toEqual({ count: 3, since: READ, capped: false });
    expect(countForUserSince).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', since: READ }),
    );
  });

  /*
   * The alternative is the epoch, and it is worse in the one case that matters: an account
   * created this morning would be told that everything that has ever happened to it is
   * unread, which is true and useless. "Since you arrived" is the honest reading of a
   * marker that was never set.
   */
  it('counts from the account itself when they never have', async () => {
    const { service, countForUserSince } = build();

    const unread = await service.unreadForUser({
      userId: 'user-1',
      readAt: undefined,
      accountCreatedAt: CREATED,
    });

    expect(unread.since).toBe(CREATED);
    expect(countForUserSince).toHaveBeenCalledWith(expect.objectContaining({ since: CREATED }));
  });

  /*
   * A badge reading "412" and a badge reading "50+" say the same thing to a person, and only
   * one of them costs a collection scan. What must not happen is the cap being reached and
   * not reported — that is a number that is simply wrong.
   */
  it('says when it stopped counting rather than reporting the cap as a total', async () => {
    const { service, countForUserSince } = build({
      countForUserSince: vi.fn().mockResolvedValue(UNREAD_CAP),
    });

    const unread = await service.unreadForUser({
      userId: 'user-1',
      readAt: READ,
      accountCreatedAt: CREATED,
    });

    expect(unread.capped).toBe(true);
    expect(countForUserSince).toHaveBeenCalledWith(expect.objectContaining({ cap: UNREAD_CAP }));
  });

  /*
   * `audience: 'internal'` exists for the owner — a webhook that arrived out of order, a
   * deployment being retried. A customer's badge counting those would be telling somebody
   * about a system they cannot see and cannot act on, and it is not a parameter for exactly
   * that reason.
   */
  it('never counts entries written for the owner', async () => {
    const { service, countForUserSince } = build();

    await service.unreadForUser({
      userId: 'user-1',
      readAt: READ,
      accountCreatedAt: CREATED,
    });

    expect(countForUserSince).toHaveBeenCalledWith(
      expect.objectContaining({ customerVisibleOnly: true }),
    );
  });
});

describe('recording an event', () => {
  /*
   * The property every caller depends on. A payment applied and a milestone moved are done
   * before this is called, and failing them because an audit line could not be written would
   * turn a cosmetic problem into a lost payment.
   */
  it('never throws, however badly the write fails', async () => {
    const { service } = build({
      record: vi.fn().mockRejectedValue(new Error('the database is gone')),
    });

    await expect(
      service.record({ type: 'project.approved', summary: 'Approved.', audience: 'customer' }),
    ).resolves.toBeUndefined();

    expect(SILENT.error).toHaveBeenCalledWith('activity.record_failed', expect.anything());
  });
});
