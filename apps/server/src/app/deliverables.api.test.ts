import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  createPlatformHarness,
  makeAdmin,
  sessionCookieFrom,
  TEST_ORIGIN,
  type PlatformHarness,
} from '../testing/platformApp.js';
import { monthOf, previousMonth } from '../features/reports/index.js';

/*
 * ============================================================================
 * THE THREE THINGS THE PORTAL NOW DELIVERS
 * ============================================================================
 *
 * Until Phase 5 the customer portal *displayed*. It showed a milestone, a score somebody had
 * given themselves, and a payment history. Every actual deliverable — the review of their
 * website, the monthly report, the date it would be finished — happened in an email or a
 * phone call and left no trace in the system that sold it.
 *
 * These tests are about the seam that fixes: **draft and published are different states, and
 * only one of them is visible.** That property is the whole of it. Everything else here —
 * the notification, the activity entry, the idempotency of a second publish — follows from
 * getting that one boundary right, and every one of them fails loudly if it moves.
 *
 * The negative assertions are the valuable half. A half-written review reaching a customer is
 * the failure this phase must not have, and the only way to know it cannot is to write one,
 * not publish it, and read the customer's own endpoint.
 * ============================================================================
 */

interface Staff {
  readonly cookie: string;
  readonly name: string;
}

interface Customer {
  readonly cookie: string;
  readonly email: string;
  readonly userId: string;
  readonly projectId: string;
  readonly assessmentId: string;
}

describe('what the portal delivers', () => {
  let harness: PlatformHarness;

  beforeEach(() => {
    harness = createPlatformHarness();
  });

  const post = (path: string) => request(harness.app).post(path).set('Origin', TEST_ORIGIN);
  const patch = (path: string) => request(harness.app).patch(path).set('Origin', TEST_ORIGIN);
  const put = (path: string) => request(harness.app).put(path).set('Origin', TEST_ORIGIN);

  async function signUp(email: string, name: string): Promise<{ cookie: string; userId: string }> {
    const response = await post('/api/auth/signup').send({
      email,
      name,
      password: 'a-long-enough-passphrase',
    });

    return {
      cookie: sessionCookieFrom(response.headers),
      userId: response.body.data.user.id as string,
    };
  }

  async function createStaff(): Promise<Staff> {
    const { cookie, userId } = await signUp('dana@jobforge.test', 'Dana Reyes');
    makeAdmin(harness, userId);
    return { cookie, name: 'Dana Reyes' };
  }

  async function createCustomer(): Promise<Customer> {
    const { cookie, userId } = await signUp('sam@cascade.test', 'Sam Okafor');

    const project = await harness.repositories.projects.create({
      businessName: 'Cascade Heating & Air',
      contactName: 'Sam Okafor',
      email: 'sam@cascade.test',
      ownerUserId: userId,
      status: 'deposit-paid',
      milestone: 'building',
      approval: 'not_ready',
      depositStatus: 'paid',
      finalStatus: 'pending',
      subscriptionStatus: 'active',
    });

    const submitted = await post('/api/app/assessments')
      .set('Cookie', cookie)
      .send({
        businessName: 'Cascade Heating & Air',
        websiteUrl: 'https://cascade.test',
        answers: [
          { questionId: 'q1', category: 'speed', value: 1 },
          { questionId: 'q2', category: 'mobile', value: 2 },
        ],
      });

    return {
      cookie,
      email: 'sam@cascade.test',
      userId,
      projectId: project.id,
      assessmentId: submitted.body.data.assessment.id as string,
    };
  }

  /* ------------------------------------------------------- the free review */

  describe('the review somebody was promised', () => {
    const REVIEW = {
      summary: 'Your site loads slowly on a phone and the number is hard to find.',
      findings: [
        {
          title: 'The homepage takes eight seconds on 4G',
          detail: 'Three uncompressed photographs account for most of it.',
          severity: 'critical' as const,
        },
      ],
      recommendations: ['Compress the three homepage photographs.'],
    };

    it('is invisible to the customer until somebody publishes it', async () => {
      const staff = await createStaff();
      const customer = await createCustomer();

      const saved = await patch(`/api/admin/assessments/${customer.assessmentId}/report`)
        .set('Cookie', staff.cookie)
        .send(REVIEW);

      expect(saved.status).toBe(200);
      /* The console can see its own draft — otherwise it would be editing blind. */
      expect(saved.body.data.assessment.draft.summary).toBe(REVIEW.summary);
      expect(saved.body.data.assessment.delivered).toBe(false);

      const asCustomer = await request(harness.app)
        .get('/api/app/assessments/latest')
        .set('Cookie', customer.cookie);

      /*
       * The whole property. Not "hidden behind a flag the client is asked to respect" —
       * absent from the payload, so no bug in a browser could reveal it.
       */
      expect(asCustomer.body.data.assessment.report).toBeUndefined();
    });

    it('reaches the customer, their timeline and their inbox when it is published', async () => {
      const staff = await createStaff();
      const customer = await createCustomer();

      await patch(`/api/admin/assessments/${customer.assessmentId}/report`)
        .set('Cookie', staff.cookie)
        .send(REVIEW);

      const before = harness.email.sent.length;

      const delivered = await post(`/api/admin/assessments/${customer.assessmentId}/deliver`).set(
        'Cookie',
        staff.cookie,
      );

      expect(delivered.status).toBe(200);
      expect(delivered.body.data.assessment.delivered).toBe(true);

      const asCustomer = await request(harness.app)
        .get('/api/app/assessments/latest')
        .set('Cookie', customer.cookie);

      const report = asCustomer.body.data.assessment.report;
      expect(report.summary).toBe(REVIEW.summary);
      expect(report.findings).toHaveLength(1);
      /* The byline is the staff member's name, taken from the session and never from a body. */
      expect(report.preparedBy).toBe(staff.name);
      expect(report.deliveredAt).toEqual(expect.any(String));

      const sent = harness.email.sent.slice(before);
      expect(sent.some((message) => message.to === customer.email)).toBe(true);

      const timeline = harness.repositories.activity.entries.filter(
        (entry) => entry.type === 'assessment.delivered',
      );
      expect(timeline).toHaveLength(1);
      expect(timeline[0]?.audience).toBe('customer');
      /*
       * No domain identifier in a sentence a customer reads. `MILESTONE_PRESENTATION` makes
       * the same promise about milestones and this is the same rule applied to a new event.
       */
      expect(timeline[0]?.summary).not.toMatch(/assessment\.|report|deliveredAt/);
    });

    it('does not send a second email when somebody presses deliver twice', async () => {
      const staff = await createStaff();
      const customer = await createCustomer();

      await patch(`/api/admin/assessments/${customer.assessmentId}/report`)
        .set('Cookie', staff.cookie)
        .send(REVIEW);
      await post(`/api/admin/assessments/${customer.assessmentId}/deliver`).set(
        'Cookie',
        staff.cookie,
      );

      const after = harness.email.sent.length;

      const again = await post(`/api/admin/assessments/${customer.assessmentId}/deliver`).set(
        'Cookie',
        staff.cookie,
      );

      expect(again.status).toBe(200);
      expect(harness.email.sent.length).toBe(after);
      expect(
        harness.repositories.activity.entries.filter(
          (entry) => entry.type === 'assessment.delivered',
        ),
      ).toHaveLength(1);
    });

    it('refuses to deliver a review nobody has written', async () => {
      const staff = await createStaff();
      const customer = await createCustomer();

      const response = await post(`/api/admin/assessments/${customer.assessmentId}/deliver`).set(
        'Cookie',
        staff.cookie,
      );

      expect(response.status).toBe(400);
      expect(response.body.error.message).toMatch(/no review saved/i);
    });

    it('keeps the delivery date when a published review is corrected', async () => {
      const staff = await createStaff();
      const customer = await createCustomer();

      await patch(`/api/admin/assessments/${customer.assessmentId}/report`)
        .set('Cookie', staff.cookie)
        .send(REVIEW);
      const delivered = await post(`/api/admin/assessments/${customer.assessmentId}/deliver`).set(
        'Cookie',
        staff.cookie,
      );

      const stamp = delivered.body.data.assessment.report.deliveredAt as string;

      /*
       * Fixing a typo in a review that has already gone out must not return it to the queue.
       * Losing this date would do exactly that, silently, and the customer's page would go
       * back to saying their review was being written.
       */
      const corrected = await patch(`/api/admin/assessments/${customer.assessmentId}/report`)
        .set('Cookie', staff.cookie)
        .send({ ...REVIEW, summary: 'Corrected.' });

      expect(corrected.body.data.assessment.delivered).toBe(true);
      expect(corrected.body.data.assessment.report.deliveredAt).toBe(stamp);
    });

    it('leaves the queue once a review is out, and holds everybody else', async () => {
      const staff = await createStaff();
      const customer = await createCustomer();

      const waiting = await request(harness.app)
        .get('/api/admin/assessments')
        .set('Cookie', staff.cookie);

      expect(waiting.body.data.assessments.map((row: { id: string }) => row.id)).toContain(
        customer.assessmentId,
      );

      await patch(`/api/admin/assessments/${customer.assessmentId}/report`)
        .set('Cookie', staff.cookie)
        .send(REVIEW);
      await post(`/api/admin/assessments/${customer.assessmentId}/deliver`).set(
        'Cookie',
        staff.cookie,
      );

      const after = await request(harness.app)
        .get('/api/admin/assessments')
        .set('Cookie', staff.cookie);

      expect(after.body.data.assessments.map((row: { id: string }) => row.id)).not.toContain(
        customer.assessmentId,
      );
    });

    it('is not reachable by a customer, in either direction', async () => {
      const customer = await createCustomer();

      /* `requireAdmin` answers NOT_FOUND, so a customer does not learn there is a console. */
      await patch(`/api/admin/assessments/${customer.assessmentId}/report`)
        .set('Cookie', customer.cookie)
        .send(REVIEW)
        .expect(404);

      await post(`/api/admin/assessments/${customer.assessmentId}/deliver`)
        .set('Cookie', customer.cookie)
        .expect(404);
    });
  });

  /* ------------------------------------------------------- monthly reports */

  describe('the monthly report', () => {
    const month = previousMonth(monthOf(new Date()));

    const REPORT = {
      month,
      enquiries: 14,
      baseline: 3,
      changeExplanation: 'Most of the increase came from the new service-area pages.',
      whatWeChanged: ['Added four service-area pages.'],
      whatIsNext: ['Photographs of three recent jobs.'],
    };

    it('is invisible to the customer until it is published', async () => {
      const staff = await createStaff();
      const customer = await createCustomer();

      const saved = await put(`/api/admin/projects/${customer.projectId}/reports`)
        .set('Cookie', staff.cookie)
        .send(REPORT);

      expect(saved.status).toBe(201);
      expect(saved.body.data.report.published).toBe(false);

      const asCustomer = await request(harness.app)
        .get('/api/app/reports')
        .set('Cookie', customer.cookie);

      expect(asCustomer.body.data.reports).toEqual([]);
    });

    it('reaches the customer once published, with both numbers and no verdict', async () => {
      const staff = await createStaff();
      const customer = await createCustomer();

      const saved = await put(`/api/admin/projects/${customer.projectId}/reports`)
        .set('Cookie', staff.cookie)
        .send(REPORT);

      const before = harness.email.sent.length;

      await post(
        `/api/admin/projects/${customer.projectId}/reports/${saved.body.data.report.id}/publish`,
      )
        .set('Cookie', staff.cookie)
        .expect(200);

      const asCustomer = await request(harness.app)
        .get('/api/app/reports')
        .set('Cookie', customer.cookie);

      const [report] = asCustomer.body.data.reports;
      expect(report.month).toBe(month);
      expect(report.enquiries).toBe(14);
      expect(report.baseline).toBe(3);
      expect(report.changeExplanation).toBe(REPORT.changeExplanation);
      /* A named month, built on the server, so two frontends cannot disagree about it. */
      expect(report.monthLabel).toMatch(/^[A-Z][a-z]+ \d{4}$/);

      expect(harness.email.sent.length).toBeGreaterThan(before);

      const timeline = harness.repositories.activity.entries.filter(
        (entry) => entry.type === 'report.published',
      );
      expect(timeline).toHaveLength(1);
      /*
       * The one sentence this feature must never write. Some months the number goes down,
       * and an automatic "your enquiries went up" is a claim nobody checked.
       */
      expect(timeline[0]?.summary).not.toMatch(/up|increase|better|grew/i);
    });

    it('records a missing baseline as absent rather than as zero', async () => {
      const staff = await createStaff();
      const customer = await createCustomer();

      const { baseline: _baseline, ...withoutBaseline } = REPORT;

      const saved = await put(`/api/admin/projects/${customer.projectId}/reports`)
        .set('Cookie', staff.cookie)
        .send(withoutBaseline);

      await post(
        `/api/admin/projects/${customer.projectId}/reports/${saved.body.data.report.id}/publish`,
      ).set('Cookie', staff.cookie);

      const asCustomer = await request(harness.app)
        .get('/api/app/reports')
        .set('Cookie', customer.cookie);

      /*
       * `undefined`, never `0`. "We do not know" and "you had none" are different claims and
       * only one of them is true, and the false one is much the better sounding.
       */
      expect(asCustomer.body.data.reports[0].baseline).toBeUndefined();
    });

    it('refuses a month that has not finished yet', async () => {
      const staff = await createStaff();
      const customer = await createCustomer();

      const response = await put(`/api/admin/projects/${customer.projectId}/reports`)
        .set('Cookie', staff.cookie)
        .send({ ...REPORT, month: monthOf(new Date()) });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toMatch(/not finished/i);
    });

    it('treats a second save of the same month as one report', async () => {
      const staff = await createStaff();
      const customer = await createCustomer();

      const first = await put(`/api/admin/projects/${customer.projectId}/reports`)
        .set('Cookie', staff.cookie)
        .send(REPORT);

      const second = await put(`/api/admin/projects/${customer.projectId}/reports`)
        .set('Cookie', staff.cookie)
        .send({ ...REPORT, enquiries: 15 });

      expect(second.body.data.report.id).toBe(first.body.data.report.id);
      expect(second.body.data.report.enquiries).toBe(15);
      expect(harness.repositories.reports.reports).toHaveLength(1);
    });

    it('cannot be read from another customer’s account', async () => {
      const staff = await createStaff();
      const customer = await createCustomer();
      const stranger = await signUp('other@elsewhere.test', 'Someone Else');

      const saved = await put(`/api/admin/projects/${customer.projectId}/reports`)
        .set('Cookie', staff.cookie)
        .send(REPORT);
      await post(
        `/api/admin/projects/${customer.projectId}/reports/${saved.body.data.report.id}/publish`,
      ).set('Cookie', staff.cookie);

      const asStranger = await request(harness.app)
        .get('/api/app/reports')
        .set('Cookie', stranger.cookie);

      expect(asStranger.body.data.reports).toEqual([]);
    });
  });

  /* ------------------------------------------------------ the launch date */

  describe('the estimated launch date', () => {
    it('is absent until somebody sets one', async () => {
      const customer = await createCustomer();

      const response = await request(harness.app)
        .get(`/api/app/projects/${customer.projectId}`)
        .set('Cookie', customer.cookie);

      /*
       * Absent, not null and not a placeholder date. Early in a build there genuinely is no
       * answer, and a default would be the system making a promise no person made.
       */
      expect(response.body.data.project.estimatedCompletionAt).toBeUndefined();
    });

    it('says nothing to the customer the first time it is set', async () => {
      const staff = await createStaff();
      const customer = await createCustomer();

      const before = harness.email.sent.length;

      await patch(`/api/admin/projects/${customer.projectId}/estimate`)
        .set('Cookie', staff.cookie)
        .send({ estimatedCompletionAt: '2026-09-04T12:00:00.000Z' })
        .expect(200);

      /* Good news arriving. They will see it the moment they open the portal. */
      expect(harness.email.sent.length).toBe(before);

      const asCustomer = await request(harness.app)
        .get(`/api/app/projects/${customer.projectId}`)
        .set('Cookie', customer.cookie);

      expect(asCustomer.body.data.project.estimatedCompletionAt).toContain('2026-09-04');
      expect(asCustomer.body.data.project.estimateUpdatedAt).toEqual(expect.any(String));
    });

    it('emails the customer when the date moves', async () => {
      const staff = await createStaff();
      const customer = await createCustomer();

      await patch(`/api/admin/projects/${customer.projectId}/estimate`)
        .set('Cookie', staff.cookie)
        .send({ estimatedCompletionAt: '2026-09-04T12:00:00.000Z' });

      const before = harness.email.sent.length;

      await patch(`/api/admin/projects/${customer.projectId}/estimate`)
        .set('Cookie', staff.cookie)
        .send({ estimatedCompletionAt: '2026-09-18T12:00:00.000Z' })
        .expect(200);

      const sent = harness.email.sent.slice(before);
      expect(sent.some((message) => message.to === customer.email)).toBe(true);
    });

    it('says nothing when the estimate is re-saved on the same day', async () => {
      const staff = await createStaff();
      const customer = await createCustomer();

      await patch(`/api/admin/projects/${customer.projectId}/estimate`)
        .set('Cookie', staff.cookie)
        .send({ estimatedCompletionAt: '2026-09-04T12:00:00.000Z' });

      const before = harness.email.sent.length;

      await patch(`/api/admin/projects/${customer.projectId}/estimate`)
        .set('Cookie', staff.cookie)
        .send({ estimatedCompletionAt: '2026-09-04T09:00:00.000Z' });

      /*
       * An operator pressing save twice. Telling somebody their launch date changed when it
       * did not spends the credibility the notification exists to build.
       */
      expect(harness.email.sent.length).toBe(before);
    });

    it('clears silently, and the customer sees no date at all', async () => {
      const staff = await createStaff();
      const customer = await createCustomer();

      await patch(`/api/admin/projects/${customer.projectId}/estimate`)
        .set('Cookie', staff.cookie)
        .send({ estimatedCompletionAt: '2026-09-04T12:00:00.000Z' });

      const before = harness.email.sent.length;

      await patch(`/api/admin/projects/${customer.projectId}/estimate`)
        .set('Cookie', staff.cookie)
        .send({ estimatedCompletionAt: null })
        .expect(200);

      /*
       * "We no longer know when this will be finished" is not a sentence to put in an
       * automated email. Whoever cleared it owes the client a phone call.
       */
      expect(harness.email.sent.length).toBe(before);

      const asCustomer = await request(harness.app)
        .get(`/api/app/projects/${customer.projectId}`)
        .set('Cookie', customer.cookie);

      expect(asCustomer.body.data.project.estimatedCompletionAt).toBeUndefined();
    });

    it('is not reachable by the customer whose project it is', async () => {
      const customer = await createCustomer();

      await patch(`/api/admin/projects/${customer.projectId}/estimate`)
        .set('Cookie', customer.cookie)
        .send({ estimatedCompletionAt: '2026-09-04T12:00:00.000Z' })
        .expect(404);
    });
  });
});
