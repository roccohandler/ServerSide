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
import type { ProjectMilestone } from './project.types.js';
import { createProjectService } from './project.service.js';
import { toCustomerProjectView } from './project.types.js';

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
    scopeReady: vi.fn(),
    approvalRequested: vi.fn(),
    tasksAssigned: vi.fn(),
    feedbackReplied: vi.fn(),
    projectLaunched: vi.fn(),
    paymentDue: vi.fn(),
    paymentFailed: vi.fn(),
    estimateChanged: vi.fn(),
    assessmentDelivered: vi.fn(),
    reportPublished: vi.fn(),
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

/*
 * ============================================================================
 * A PLAN BOUGHT FROM THE PORTAL HAS TO FIND ITS PROJECT
 * ============================================================================
 *
 * The same asymmetry `settleFinalPayment` exists for, one product along. An owner-minted
 * subscription link carries a `projectId` and the webhook writes the subscription onto the
 * named project; a customer subscribing from their own billing page can only name an
 * account, because a browser must never get to say which project a payment belongs to.
 *
 * Unattached, the money is taken and nothing shows it: `subscriptionStatus` stays `none`,
 * every later subscription and invoice event fails to find a project, and the billing page
 * goes on offering a plan they are already paying for — one click from buying it twice.
 * ============================================================================
 */
describe('attaching a self-serve Growth Partner subscription', () => {
  async function launched(harness: ReturnType<typeof build>) {
    const created = await harness.service.createForOwner(NEW_PROJECT);
    const attached = await harness.service.attachOwner({ project: created, owner: makeUser() });
    const staged = await harness.projects.update(attached.id, {
      milestone: 'live',
      depositStatus: 'paid',
      finalStatus: 'paid',
    });
    if (!staged) throw new Error('the fixture project vanished');
    return staged;
  }

  it('marks the account own newest project subscribed', async () => {
    const harness = build();
    const project = await launched(harness);

    const attached = await harness.service.attachSubscription({
      ownerUserId: 'user-1',
      subscriptionId: 'sub_1',
      stripeCustomerId: 'cus_1',
    });

    expect(attached?.id).toBe(project.id);
    expect(attached?.subscriptionId).toBe('sub_1');
    expect(attached?.subscriptionStatus).toBe('active');
    /* Money moved; nothing about the build did. */
    expect(attached?.milestone).toBe('live');
  });

  /* Stripe delivers at least once, and renewals carry the same subscription id. */
  it('is idempotent under a redelivered webhook', async () => {
    const harness = build();
    await launched(harness);

    const first = await harness.service.attachSubscription({
      ownerUserId: 'user-1',
      subscriptionId: 'sub_1',
    });
    const second = await harness.service.attachSubscription({
      ownerUserId: 'user-1',
      subscriptionId: 'sub_1',
    });

    expect(first?.subscriptionStatus).toBe('active');
    expect(second?.updatedAt).toEqual(first?.updatedAt);
  });

  /* Real: the project was detached between checkout and webhook. Logged, never thrown. */
  it('returns null rather than throwing when the account has no project', async () => {
    const harness = build();
    const attached = await harness.service.attachSubscription({
      ownerUserId: 'nobody',
      subscriptionId: 'sub_1',
    });
    expect(attached).toBeNull();
  });
});

/*
 * ============================================================================
 * CHANGING YOUR MIND, AND THE POINT PAST WHICH IT IS NOT A CHANGE OF MIND
 * ============================================================================
 *
 * `requestChanges` had no precondition at all, so it stayed live on a launched project and
 * pressing it withdrew an approval a payment had already been taken against.
 *
 * The line is deliberately not "after approval": approving and then thinking better of it
 * is a real thing, the portal offers it in those words, and `approve` moves the milestone
 * to `launching` immediately — so guarding on `launching` would remove the affordance the
 * product intends.
 * ============================================================================
 */
describe('when changes may still be requested', () => {
  async function approved(harness: ReturnType<typeof build>) {
    const created = await harness.service.createForOwner(NEW_PROJECT);
    const attached = await harness.service.attachOwner({ project: created, owner: makeUser() });
    const staged = await harness.projects.update(attached.id, {
      milestone: 'review',
      depositStatus: 'paid',
      previewUrl: 'https://preview.example/cascade',
    });
    if (!staged) throw new Error('the fixture project vanished');
    return harness.service.approve({ project: staged, approvedBy: makeUser() });
  }

  it('still allows a change of mind straight after approving', async () => {
    const harness = build();
    const project = await approved(harness);
    expect(project.milestone).toBe('launching');

    const reversed = await harness.service.requestChanges({
      project,
      requestedBy: makeUser(),
    });

    expect(reversed.approval).toBe('changes_requested');
    expect(reversed.milestone).toBe('revisions');
  });

  it('refuses once the site is live', async () => {
    const harness = build();
    const project = await approved(harness);
    const live = await harness.projects.update(project.id, { milestone: 'live' });
    if (!live) throw new Error('the fixture project vanished');

    await expect(
      harness.service.requestChanges({ project: live, requestedBy: makeUser() }),
    ).rejects.toThrow(AppError);
  });

  /* The approval the balance was owed on is not erasable by one click afterwards. */
  it('refuses once the balance has been paid against that approval', async () => {
    const harness = build();
    const project = await approved(harness);
    const paid = await harness.projects.update(project.id, { finalStatus: 'paid' });
    if (!paid) throw new Error('the fixture project vanished');

    await expect(
      harness.service.requestChanges({ project: paid, requestedBy: makeUser() }),
    ).rejects.toThrow(AppError);
  });
});

/*
 * ============================================================================
 * THE AGREED SCOPE — DECISION 040
 * ============================================================================
 *
 * The record that makes `docs/business-offer.md` rule #35 — "scope is agreed in writing
 * before any payment" — something the server enforces rather than something the business
 * intends. Before it, a customer could reach Checkout for $2,450 with nothing written down
 * by anybody.
 *
 * Four properties, and three of them are the kind that fail silently:
 *
 *   1. A send versions itself and emails the customer.
 *   2. **A send always withdraws any acceptance.** This is the one that matters. An owner
 *      correcting a typo and an owner adding two thousand dollars of work are
 *      indistinguishable from inside `sendScope`, and only one of them is safe to carry an
 *      old acceptance forward — so neither does.
 *   3. **Acceptance never moves.** A second click returns the first timestamp, because the
 *      date is the thing the whole record exists to hold.
 *   4. There is nothing to accept until something has been sent.
 * ============================================================================
 */
const SCOPE = {
  summary: 'A six-page website for Cascade Heating.',
  lines: ['Home, about and contact', 'Six service pages'],
  priceCents: 490_000,
  sentBy: 'Maxwell Cuenca',
};

describe('sending and accepting a scope', () => {
  it('versions from one and tells the customer it is there', async () => {
    const { service, notifier } = build();
    const project = await service.createForOwner(NEW_PROJECT);

    const sent = await service.sendScope({ project, scope: SCOPE });

    expect(sent.scope?.version).toBe(1);
    expect(sent.scope?.sentBy).toBe('Maxwell Cuenca');
    expect(sent.scope?.acceptedAt).toBeUndefined();
    expect(notifier.scopeReady).toHaveBeenCalledWith(
      expect.objectContaining({ businessName: 'Cascade Heating', revised: false }),
    );
  });

  it('records who accepted it, and when', async () => {
    const { service, notifier } = build();
    const project = await service.createForOwner(NEW_PROJECT);
    const sent = await service.sendScope({ project, scope: SCOPE });

    const accepted = await service.acceptScope({ project: sent, acceptedBy: makeUser() });

    expect(accepted.scope?.acceptedAt).toBeInstanceOf(Date);
    expect(accepted.scope?.acceptedByUserId).toBe('user-1');
    expect(accepted.scope?.acceptedName).toBe('Dana Reyes');

    /* The owner, not the customer — the same asymmetry `approve` makes, for the same reason. */
    expect(notifier.owner).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'owner.scope_accepted' }),
    );
  });

  /*
   * Idempotent, exactly as `approve` is. A refreshed page or a double-tap must not move the
   * date, because "you agreed to this on the 12th" is the sentence the record exists to make
   * defensible — and a timestamp that creeps forward on every click is not evidence of
   * anything.
   */
  it('keeps the first acceptance when it is accepted twice', async () => {
    const { service } = build();
    const project = await service.createForOwner(NEW_PROJECT);
    const sent = await service.sendScope({ project, scope: SCOPE });

    const first = await service.acceptScope({ project: sent, acceptedBy: makeUser() });
    const second = await service.acceptScope({ project: first, acceptedBy: makeUser() });

    expect(second.scope?.acceptedAt).toEqual(first.scope?.acceptedAt);
  });

  /*
   * ==========================================================================
   * THE PROPERTY THE WHOLE RECORD DEPENDS ON
   * ==========================================================================
   *
   * If a replacement kept the acceptance, "you accepted this" would point at a document that
   * has since changed — which is the single sentence a scope record exists to make
   * defensible six months later, and the one thing that would quietly stop being true.
   * ==========================================================================
   */
  it('withdraws the acceptance when a new version is sent', async () => {
    const { service, notifier } = build();
    const project = await service.createForOwner(NEW_PROJECT);
    const sent = await service.sendScope({ project, scope: SCOPE });
    const accepted = await service.acceptScope({ project: sent, acceptedBy: makeUser() });

    const revised = await service.sendScope({
      project: accepted,
      scope: { ...SCOPE, priceCents: 590_000 },
    });

    expect(revised.scope?.version).toBe(2);
    expect(revised.scope?.acceptedAt).toBeUndefined();
    expect(revised.scope?.acceptedByUserId).toBeUndefined();
    expect(revised.scope?.acceptedName).toBeUndefined();
    expect(notifier.scopeReady).toHaveBeenLastCalledWith(
      expect.objectContaining({ revised: true }),
    );
  });

  /*
   * A real state rather than a defensive check: the console can be mid-conversation with
   * somebody whose project exists and whose agreement has not been written up yet.
   */
  it('refuses to accept a scope that was never sent', async () => {
    const { service } = build();
    const project = await service.createForOwner(NEW_PROJECT);

    await expect(service.acceptScope({ project, acceptedBy: makeUser() })).rejects.toThrow(
      AppError,
    );
  });

  /*
   * The customer's payload is built field by field, so an internal handle cannot leak by
   * somebody adding a column. `acceptedByUserId` is the one that would — it is the id we keep
   * precisely because acceptance has to be provable, and it is of no use to a browser.
   */
  it('never puts the accepting account id in the customer payload', async () => {
    const { service } = build();
    const project = await service.createForOwner(NEW_PROJECT);
    const sent = await service.sendScope({ project, scope: SCOPE });
    const accepted = await service.acceptScope({ project: sent, acceptedBy: makeUser() });

    const view = toCustomerProjectView(accepted);

    expect(view.scope?.acceptedName).toBe('Dana Reyes');
    expect(JSON.stringify(view)).not.toContain('user-1');
  });
});

/*
 * ============================================================================
 * WHICH MILESTONE MOVES ARE LEGAL
 * ============================================================================
 *
 * `ProjectDetailsUpdate`'s comment claimed since it was written that `setMilestone` decides
 * "whether the transition is legal at all". It decided what the change *meant* — which
 * activity it wrote, what the customer was told — and never whether it was allowed. So a
 * `<select>` on a page holding several customers' projects could take a launched website back
 * to `onboarding`, emailing the client and writing a real stage change into their history.
 *
 * The rules and their reasoning are in `isLegalMilestoneMove`; these pin the three that
 * matter and one that must stay permitted.
 * ============================================================================
 */
describe('moving a milestone', () => {
  async function at(milestone: ProjectMilestone) {
    const harness = build();
    const created = await harness.service.createForOwner(NEW_PROJECT);
    const project = await harness.projects.update(created.id, { milestone });
    if (!project) throw new Error('the fixture project vanished');
    return { harness, project };
  }

  /* The one that protects a record a payment was taken against. */
  it('refuses to take a live website back into the build', async () => {
    const { harness, project } = await at('live');

    await expect(
      harness.service.setMilestone({ project, milestone: 'onboarding' }),
    ).rejects.toThrow(AppError);
    await expect(harness.service.setMilestone({ project, milestone: 'review' })).rejects.toThrow(
      AppError,
    );
  });

  /*
   * The review loop is a cycle by design — asked for changes, made them, back for approval,
   * asked for more. Constraining it to forward-only would break the ordinary shape of the work,
   * so this is the test that stops the guard being tightened into something that does.
   */
  it('lets the review loop run in both directions', async () => {
    const { harness, project } = await at('approval');

    const back = await harness.service.setMilestone({ project, milestone: 'revisions' });
    expect(back.milestone).toBe('revisions');

    const forward = await harness.service.setMilestone({
      project: back,
      milestone: 'review',
    });
    expect(forward.milestone).toBe('review');
  });

  /* Forward skips are legitimate: a returning client with materials in hand needs no planning. */
  it('allows a forward skip', async () => {
    const { harness, project } = await at('onboarding');

    const skipped = await harness.service.setMilestone({ project, milestone: 'building' });
    expect(skipped.milestone).toBe('building');
  });

  /*
   * One step back is the ordinary correction; a jump backwards is the mis-click, and
   * `undoMilestone` is what that has instead — it writes an internal entry rather than telling
   * the customer their website moved backwards on purpose.
   */
  it('allows one step back and refuses a jump', async () => {
    const { harness, project } = await at('building');

    const stepped = await harness.service.setMilestone({ project, milestone: 'planning' });
    expect(stepped.milestone).toBe('planning');

    const far = await at('launching');
    await expect(
      far.harness.service.setMilestone({ project: far.project, milestone: 'planning' }),
    ).rejects.toThrow(AppError);
  });
});

describe('approving, and saying what was approved', () => {
  /*
   * `approvedDeploymentId` was declared on the project, documented as "which deployment the
   * approval was given against", cleared by `requestChanges` — and never written by anything.
   * The service's own comment calls an approval that cannot say what was approved "not worth
   * having", and that was the state every approval on record was in.
   *
   * It is resolved by the route (which has `DeploymentService`) and passed in, because this
   * service must not depend on deployments — the reverse edge would close a cycle.
   */
  it('records which deployment was approved when the caller knows', async () => {
    const { service, projects } = build();
    const created = await service.createForOwner(NEW_PROJECT);
    const ready = await projects.update(created.id, {
      previewUrl: 'https://preview.example',
      milestone: 'approval',
    });
    if (!ready) throw new Error('the fixture project vanished');

    const approved = await service.approve({
      project: ready,
      approvedBy: makeUser(),
      approvedDeploymentId: 'dpl_abc123',
    });

    expect(approved.approvedDeploymentId).toBe('dpl_abc123');
  });

  /*
   * Absent stays absent. A preview URL set by hand has no deployment behind it, and a guess
   * would be worse than nothing — the whole value of the field is that it names something that
   * existed.
   */
  it('leaves it unset when there is no deployment to name', async () => {
    const { service, projects } = build();
    const created = await service.createForOwner(NEW_PROJECT);
    const ready = await projects.update(created.id, { previewUrl: 'https://preview.example' });
    if (!ready) throw new Error('the fixture project vanished');

    const approved = await service.approve({ project: ready, approvedBy: makeUser() });

    expect(approved.approvedDeploymentId).toBeUndefined();
  });
});

/*
 * ============================================================================
 * A PRODUCTION URL SET BY HAND *IS* THE LAUNCH
 * ============================================================================
 *
 * `setUrls` already treated it as one — customer activity, and the "your website is live"
 * email — on the correct argument that a deployment on a host the webhook cannot see would
 * otherwise launch a website and tell nobody.
 *
 * It left the milestone alone. So for every site hosted outside Vercel the client was emailed
 * that their website was live while their dashboard went on saying "We are putting your
 * website live", indefinitely, until somebody remembered a second action.
 * ============================================================================
 */
describe('launching by hand', () => {
  it('moves the milestone to live when a production URL first appears', async () => {
    const { service, projects, notifier } = build();
    const created = await service.createForOwner(NEW_PROJECT);
    const launching = await projects.update(created.id, { milestone: 'launching' });
    if (!launching) throw new Error('the fixture project vanished');

    const live = await service.setUrls({
      project: launching,
      productionUrl: 'https://cascadeheating.example',
    });

    expect(live.milestone).toBe('live');
    expect(notifier.projectLaunched).toHaveBeenCalledTimes(1);
  });

  /*
   * Correcting the URL on a site that is already up must not re-announce the launch. The
   * customer has had that email; a second one says their website went live twice.
   */
  it('does not re-announce a launch when the URL is corrected', async () => {
    const { service, projects, notifier } = build();
    const created = await service.createForOwner(NEW_PROJECT);
    const live = await projects.update(created.id, {
      milestone: 'live',
      productionUrl: 'https://typo.example',
    });
    if (!live) throw new Error('the fixture project vanished');

    const corrected = await service.setUrls({
      project: live,
      productionUrl: 'https://cascadeheating.example',
    });

    expect(corrected.milestone).toBe('live');
    expect(notifier.projectLaunched).not.toHaveBeenCalled();
  });
});

/*
 * ============================================================================
 * TWO TABS, TWO CHARGES
 * ============================================================================
 *
 * `available.deposit` is checked when a Checkout session is *created*, so two tabs opened
 * before either is paid both get a valid session and both can complete. The state converges
 * and Stripe has taken the money twice, with nothing anywhere noticing.
 *
 * Detection rather than prevention, and the PaymentIntent is the whole test: Stripe redelivers
 * routinely and a redelivery carries the *same* one. Reporting those would make this an alert
 * nobody reads, which is the same as not having it.
 * ============================================================================
 */
describe('a deposit paid twice', () => {
  const owner = { id: 'user-1', email: 'dana@cascadeheating.example', name: 'Dana Reyes' };

  it('reports a second, distinct charge', async () => {
    const { service } = build();

    await service.activateForCustomer({
      owner,
      businessName: 'Cascade Heating',
      paymentIntentId: 'pi_first',
    });

    const second = await service.activateForCustomer({
      owner,
      businessName: 'Cascade Heating',
      paymentIntentId: 'pi_second',
    });

    expect(second.created).toBe(false);
    expect(second.duplicate).toBe(true);
  });

  it('stays silent on an ordinary redelivery of the same payment', async () => {
    const { service } = build();

    await service.activateForCustomer({
      owner,
      businessName: 'Cascade Heating',
      paymentIntentId: 'pi_first',
    });

    const again = await service.activateForCustomer({
      owner,
      businessName: 'Cascade Heating',
      paymentIntentId: 'pi_first',
    });

    expect(again.duplicate).toBe(false);
  });

  /*
   * The other half of the same change, and the defect it was found by. DECISION 040 makes
   * "the project already exists when the deposit is paid" the *ordinary* path, and this branch
   * used only to re-seed tasks — so the money would clear at Stripe while the project sat at
   * `pending` forever.
   */
  it('settles the deposit on a project the owner created first', async () => {
    const { service, projects } = build();
    const created = await service.createForOwner(NEW_PROJECT);
    await service.attachOwner({ project: created, owner: makeUser() });

    await service.activateForCustomer({
      owner,
      businessName: 'Cascade Heating',
      paymentIntentId: 'pi_first',
    });

    const settled = await projects.findById(created.id);
    expect(settled?.depositStatus).toBe('paid');
    expect(settled?.status).toBe('deposit-paid');
  });
});
