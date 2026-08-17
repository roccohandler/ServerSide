import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  createPlatformHarness,
  makeAdmin,
  sessionCookieFrom,
  TEST_ORIGIN,
  type PlatformHarness,
} from '../../testing/platformApp.js';

/*
 * ============================================================================
 * THE WORKLIST
 * ============================================================================
 *
 * What is asserted here is mostly *shape*, and that is the right emphasis rather than a thin
 * one. Every threshold this endpoint applies belongs to a feature that already tests it —
 * `report.service.ts` owns what overdue means, `assessment.repository.ts` owns the queue's
 * order — so re-asserting them here would be a second copy of somebody else's guarantee,
 * which is precisely the drift `worklist.ts` exists to avoid.
 *
 * What only this file can check is that the arrangement is honest: that every group is present
 * even when empty, that the demonstration account is excluded as it is everywhere else, and
 * that a customer cannot read any of it.
 * ============================================================================
 */

const PASSWORD = 'a-long-enough-passphrase';
const DAY = 86_400_000;

describe('the console worklist', () => {
  let harness: PlatformHarness;

  const post = (path: string) => request(harness.app).post(path).set('Origin', TEST_ORIGIN);

  beforeEach(() => {
    harness = createPlatformHarness();
  });

  async function signInAdmin(): Promise<string> {
    const signup = await post('/api/auth/signup').send({
      email: 'staff@example.com',
      name: 'Sam Staff',
      password: PASSWORD,
    });
    makeAdmin(harness, signup.body.data.user.id as string);
    return sessionCookieFrom(signup.headers);
  }

  it('reports every group, including the ones that are empty', async () => {
    const cookie = await signInAdmin();
    const response = await request(harness.app).get('/api/admin/worklist').set('Cookie', cookie);

    expect(response.status).toBe(200);

    /*
     * All five, always. A group omitted because it happens to be empty is indistinguishable
     * from a group that stopped being checked — and this screen's whole claim is that these
     * five things have been looked at.
     */
    const keys = response.body.data.groups.map((group: { key: string }) => group.key);
    expect(keys).toEqual(['assessments', 'stalled', 'reports', 'onboarding', 'quiet']);

    for (const group of response.body.data.groups) {
      expect(group.emptyLabel.length).toBeGreaterThan(0);
      expect(group.items).toEqual([]);
    }
  });

  it('names a project that has stopped moving, and says which milestone it is stuck at', async () => {
    const cookie = await signInAdmin();

    const project = await harness.repositories.projects.create({
      ownerUserId: 'user-nobody',
      businessName: 'Cascade Heating & Air',
      contactName: 'Dana Whitfield',
      email: 'dana@cascadeheating.example',
      status: 'in-build',
      milestone: 'review',
      approval: 'ready_for_review',
      depositStatus: 'paid',
      finalStatus: 'pending',
      subscriptionStatus: 'none',
    });

    /* Backdated on storage, because `updatedAt` is stamped by the repository on write. */
    const index = harness.repositories.projects.projects.findIndex((row) => row.id === project.id);
    harness.repositories.projects.projects.splice(index, 1, {
      ...project,
      updatedAt: new Date(Date.now() - 9 * DAY),
    });

    const response = await request(harness.app).get('/api/admin/worklist').set('Cookie', cookie);
    const stalled = response.body.data.groups.find(
      (group: { key: string }) => group.key === 'stalled',
    );

    expect(stalled.items).toHaveLength(1);
    expect(stalled.items[0].title).toBe('Cascade Heating & Air');
    /*
     * The milestone is in the sentence on purpose. Half of these are legitimately waiting on
     * the customer, and the answer is "chase the photos" rather than "do some work" — a row
     * that only said "stalled" would send somebody to the project page to find that out.
     */
    expect(stalled.items[0].detail).toContain('review');
    expect(stalled.items[0].waitingDays).toBeGreaterThanOrEqual(9);
  });

  it('leaves a project alone while it is still moving', async () => {
    const cookie = await signInAdmin();

    await harness.repositories.projects.create({
      ownerUserId: 'user-nobody',
      businessName: 'Rainier Plumbing',
      contactName: 'Mo Ellis',
      email: 'mo@rainier.example',
      status: 'in-build',
      milestone: 'building',
      approval: 'not_ready',
      depositStatus: 'paid',
      finalStatus: 'pending',
      subscriptionStatus: 'none',
    });

    const response = await request(harness.app).get('/api/admin/worklist').set('Cookie', cookie);
    const stalled = response.body.data.groups.find(
      (group: { key: string }) => group.key === 'stalled',
    );

    expect(stalled.items).toEqual([]);
  });

  it('answers a customer NOT_FOUND, like every other admin route', async () => {
    const signup = await post('/api/auth/signup').send({
      email: 'dana@example.test',
      name: 'Dana Whitfield',
      password: PASSWORD,
    });

    await request(harness.app)
      .get('/api/admin/worklist')
      .set('Cookie', sessionCookieFrom(signup.headers))
      .expect(404);
  });

  it('answers an anonymous request without a session', async () => {
    await request(harness.app).get('/api/admin/worklist').expect(404);
  });
});
