import { describe, expect, it, vi } from 'vitest';
import { AppError } from '../../lib/appError.js';
import { silentLogger } from '../../lib/logger.js';
import {
  createInMemoryActivityRepository,
  createInMemoryProjectRepository,
  createInMemoryTaskRepository,
} from '../../testing/authFakes.js';
import { createActivityService } from '../activity/index.js';
import { createTaskService } from '../tasks/index.js';
import type { StoredUser } from '../auth/index.js';
import { createProjectService } from './project.service.js';

/*
 * ============================================================================
 * GIVING A PROJECT TO SOMEBODY, CORRECTING WHAT IT SAYS, AND SETTLING IT
 * ============================================================================
 *
 * The console could move a project along and could not bring one into existence, attach an
 * account to it, or fix a typo in a name. These are the rules those operations added, and
 * every one of them is a decision that could have gone the other way.
 *
 * The last section is about money and arrived with the self-serve launch payment: what
 * reaching `launching` tells the customer, and what happens when they settle the balance
 * without an owner-sent link to settle it against.
 * ============================================================================
 */

const LAUNCH_AMOUNT = '$2,450';

function build() {
  const projects = createInMemoryProjectRepository();
  const tasks = createInMemoryTaskRepository();
  const activity = createInMemoryActivityRepository();

  const notifier = {
    previewReady: vi.fn(),
    approvalRequested: vi.fn(),
    tasksAssigned: vi.fn(),
    feedbackReplied: vi.fn(),
    projectLaunched: vi.fn(),
    paymentDue: vi.fn(),
    paymentFailed: vi.fn(),
    estimateChanged: vi.fn(),
    fileDelivered: vi.fn(),
    owner: vi.fn(),
  };

  const activityService = createActivityService({ repository: activity, logger: silentLogger });

  const service = createProjectService({
    repository: projects,
    tasks: createTaskService({
      repository: tasks,
      activity: activityService,
      logger: silentLogger,
    }),
    activity: activityService,
    notifier,
    /*
     * Handed over rather than imported, exactly as `app.ts` hands it over. An import in that
     * direction closes a projects → billing → projects module cycle — see the note on the
     * dependency — and a harness that fabricated the figure locally would be testing a wiring
     * the composition root does not have.
     */
    finalPaymentLabel: LAUNCH_AMOUNT,
    logger: silentLogger,
  });

  return { service, projects, tasks, activity, notifier };
}

function makeUser(overrides: Partial<StoredUser> = {}): StoredUser {
  return {
    id: 'user-1',
    email: 'dana@cascadeheating.example',
    name: 'Dana Reyes',
    role: 'customer',
    emailVerified: true,
    identities: [],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

const NEW_PROJECT = {
  businessName: 'Cascade Heating',
  contactName: 'Dana Reyes',
  email: 'dana@cascadeheating.example',
};

describe('attaching an account to a project', () => {
  /*
   * The whole reason this is a domain operation. Until the moment an account is attached the
   * project is invisible; attaching has to leave the same state a paid activation leaves, or
   * the operator has produced a project that appears in somebody's dashboard with nothing in
   * it and no explanation of how it got there.
   */
  it('seeds the onboarding tasks and tells them what is needed', async () => {
    const { service, tasks, notifier } = build();
    const project = await service.createForOwner(NEW_PROJECT);

    await service.attachOwner({ project, owner: makeUser() });

    expect(tasks.tasks.length).toBeGreaterThan(0);
    expect(notifier.tasksAssigned).toHaveBeenCalledWith(
      expect.objectContaining({ businessName: 'Cascade Heating' }),
    );
  });

  it('starts the customer own history', async () => {
    const { service, activity } = build();
    const project = await service.createForOwner(NEW_PROJECT);

    await service.attachOwner({ project, owner: makeUser() });

    expect(activity.entries).toContainEqual(
      expect.objectContaining({ type: 'project.created', audience: 'customer' }),
    );
  });

  /*
   * A project already in build does not want "send us your logo" seeded onto it. That would
   * ask a client for materials somebody has already supplied, on their first visit, which is
   * the worst possible first impression of a portal.
   */
  it('does not seed onboarding tasks onto a project that is past onboarding', async () => {
    const { service, projects, tasks } = build();
    const created = await service.createForOwner(NEW_PROJECT);
    const building = await projects.update(created.id, { milestone: 'building' });
    if (!building) throw new Error('the fixture project vanished');

    await service.attachOwner({ project: building, owner: makeUser() });

    expect(tasks.tasks).toHaveLength(0);
  });

  /*
   * The cardinality `activateForCustomer` enforces, enforced here too. A customer whose
   * dashboard shows two projects has no way to tell which is theirs, and every "your project"
   * sentence the portal writes becomes ambiguous.
   */
  it('refuses an account that already has a project', async () => {
    const { service } = build();
    const owner = makeUser();

    const first = await service.createForOwner(NEW_PROJECT);
    await service.attachOwner({ project: first, owner });

    const second = await service.createForOwner({ ...NEW_PROJECT, businessName: 'Second' });

    await expect(service.attachOwner({ project: second, owner })).rejects.toBeInstanceOf(AppError);
  });

  it('refuses a project that already belongs to somebody else', async () => {
    const { service } = build();
    const project = await service.createForOwner(NEW_PROJECT);
    const attached = await service.attachOwner({ project, owner: makeUser() });

    await expect(
      service.attachOwner({ project: attached, owner: makeUser({ id: 'user-2' }) }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it('is idempotent for the account that already holds it', async () => {
    const { service, tasks } = build();
    const owner = makeUser();
    const project = await service.createForOwner(NEW_PROJECT);

    const attached = await service.attachOwner({ project, owner });
    const seeded = tasks.tasks.length;

    await service.attachOwner({ project: attached, owner });

    expect(tasks.tasks).toHaveLength(seeded);
  });
});

describe('detaching an account', () => {
  /*
   * Nothing is deleted. This is a correction to who can see a project, usually because it was
   * attached to the wrong account, and the version that also destroyed the work would make a
   * mis-click unrecoverable.
   */
  it('leaves the tasks and the history where they are', async () => {
    const { service, tasks, activity } = build();
    const project = await service.createForOwner(NEW_PROJECT);
    const attached = await service.attachOwner({ project, owner: makeUser() });

    const seeded = tasks.tasks.length;
    const detached = await service.detachOwner(attached);

    expect(detached.ownerUserId).toBeUndefined();
    expect(tasks.tasks).toHaveLength(seeded);
    expect(activity.entries.length).toBeGreaterThan(0);
  });

  /*
   * The entry is internal, because the stream it would otherwise be written to belongs to the
   * account that can no longer see the project: an entry nobody will ever read, on a project
   * that has vanished from their dashboard.
   */
  it('records the detach where only staff can read it', async () => {
    const { service, activity } = build();
    const project = await service.createForOwner(NEW_PROJECT);
    const attached = await service.attachOwner({ project, owner: makeUser() });

    await service.detachOwner(attached);

    const detachEntry = activity.entries.find((entry) => entry.summary.includes('detached'));
    expect(detachEntry?.audience).toBe('internal');
  });
});

describe('the launch payment', () => {
  /**
   * A project that has paid its deposit and reached the point of going live.
   *
   * Written through the repository rather than through `setMilestone`, because walking the
   * project up the milestone list would fire the preview and approval notifications on the
   * way and every assertion below would be about the wrong call.
   */
  async function readyToLaunch(
    harness: ReturnType<typeof build>,
    overrides: { finalStatus?: 'pending' | 'paid'; depositStatus?: 'pending' | 'paid' } = {},
  ) {
    const created = await harness.service.createForOwner(NEW_PROJECT);
    const attached = await harness.service.attachOwner({ project: created, owner: makeUser() });

    const staged = await harness.projects.update(attached.id, {
      milestone: 'approval',
      depositStatus: overrides.depositStatus ?? 'paid',
      finalStatus: overrides.finalStatus ?? 'pending',
    });
    if (!staged) throw new Error('the fixture project vanished');

    harness.notifier.paymentDue.mockClear();
    return staged;
  }

  /*
   * `launching` used to be one of the four silent milestones — "pointing your domain", which
   * is a sentence about our afternoon. It now also means the balance has become payable, and
   * that is the one thing on the list the customer has to act on and cannot discover by
   * waiting. The dashboard says the same thing through `pay-final`.
   */
  it('tells the customer the balance is due when the build reaches launching', async () => {
    const harness = build();
    const project = await readyToLaunch(harness);

    await harness.service.setMilestone({ project, milestone: 'launching' });

    expect(harness.notifier.paymentDue).toHaveBeenCalledWith(
      expect.objectContaining({ stage: 'final', amountLabel: LAUNCH_AMOUNT }),
    );
  });

  /*
   * "The launch payment is ready" to somebody who has already paid it is the message in this
   * file that would cost the most trust, and a project whose deposit never cleared has no
   * balance to be told about either.
   */
  it('says nothing when there is no balance to settle', async () => {
    const settled = build();
    const alreadyPaid = await readyToLaunch(settled, { finalStatus: 'paid' });
    await settled.service.setMilestone({ project: alreadyPaid, milestone: 'launching' });
    expect(settled.notifier.paymentDue).not.toHaveBeenCalled();

    const unpaid = build();
    const noDeposit = await readyToLaunch(unpaid, { depositStatus: 'pending' });
    await unpaid.service.setMilestone({ project: noDeposit, milestone: 'launching' });
    expect(unpaid.notifier.paymentDue).not.toHaveBeenCalled();
  });

  /*
   * ==========================================================================
   * SETTLING A BALANCE THE CUSTOMER PAID FOR THEMSELVES
   * ==========================================================================
   *
   * The owner-link path marks `finalStatus` from the `projectId` in the Checkout metadata.
   * A customer paying their own balance has no project id to send — the session is built from
   * their session and carries a `userId`, deliberately, because a browser must never be able
   * to name the project a payment settles. This is the operation that resolves the one to the
   * other, and without it the portal would take the money and go on saying "Not paid yet".
   * ==========================================================================
   */
  it('marks the account own newest project settled', async () => {
    const harness = build();
    const project = await readyToLaunch(harness);

    const settled = await harness.service.settleFinalPayment({
      ownerUserId: 'user-1',
      paymentIntentId: 'pi_1',
    });

    expect(settled?.id).toBe(project.id);
    expect(settled?.finalStatus).toBe('paid');
    expect(settled?.finalPaymentIntentId).toBe('pi_1');
    /* Money moved; nothing about the build did. The owner-link path writes exactly this. */
    expect(settled?.milestone).toBe(project.milestone);
    expect(settled?.status).toBe(project.status);
  });

  /* Stripe delivers at least once, and the second delivery must change nothing. */
  it('is idempotent under a redelivered webhook', async () => {
    const harness = build();
    await readyToLaunch(harness);

    const first = await harness.service.settleFinalPayment({ ownerUserId: 'user-1' });
    const second = await harness.service.settleFinalPayment({ ownerUserId: 'user-1' });

    expect(first?.finalStatus).toBe('paid');
    expect(second?.updatedAt).toEqual(first?.updatedAt);
  });

  /*
   * A payment for somebody with no project. Real — it means the project was detached between
   * checkout and webhook — and worth a log rather than a throw, because throwing would fail
   * the webhook and Stripe would redeliver a payment there is still nothing to apply it to.
   */
  it('returns nothing rather than throwing when the account has no project', async () => {
    const { service } = build();
    await expect(service.settleFinalPayment({ ownerUserId: 'nobody' })).resolves.toBeNull();
  });
});

describe('editing project details', () => {
  it('changes only what it was given', async () => {
    const { service } = build();
    const project = await service.createForOwner(NEW_PROJECT);

    const updated = await service.updateDetails({
      project,
      changes: { notes: 'Wants the van photographed.' },
    });

    expect(updated.notes).toBe('Wants the van photographed.');
    expect(updated.businessName).toBe('Cascade Heating');
    expect(updated.milestone).toBe(project.milestone);
  });

  /*
   * The one rule that is not structural. `deposit-paid` is a claim about money, and money is
   * Stripe's to report: a console that could type it would be a place where a payment can be
   * invented.
   */
  it('refuses deposit-paid on a project with no deposit recorded', async () => {
    const { service } = build();
    const project = await service.createForOwner(NEW_PROJECT);

    await expect(
      service.updateDetails({ project, changes: { status: 'deposit-paid' } }),
    ).rejects.toBeInstanceOf(AppError);
  });

  /*
   * `launched` is deliberately not guarded: its own definition is "site live; final payment
   * received or due", so a launched site with an outstanding invoice is a real state rather
   * than a contradiction.
   */
  it('allows launched with the final payment still outstanding', async () => {
    const { service } = build();
    const project = await service.createForOwner(NEW_PROJECT);

    const updated = await service.updateDetails({ project, changes: { status: 'launched' } });

    expect(updated.status).toBe('launched');
    expect(updated.finalStatus).toBe('pending');
  });

  /*
   * Which field an operator corrected is an audit question. Printing "your contact name was
   * changed" into a customer's own timeline would be the system narrating our filing at them.
   */
  it('records the edit for staff only', async () => {
    const { service, activity } = build();
    const project = await service.createForOwner(NEW_PROJECT);

    await service.updateDetails({ project, changes: { contactName: 'Dana R.' } });

    const entry = activity.entries.find((candidate) => candidate.summary.includes('details'));
    expect(entry?.audience).toBe('internal');
  });
});
