import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  createPlatformHarness,
  makeAdmin,
  sessionCookieFrom,
  TEST_ORIGIN,
  type PlatformHarness,
} from '../../testing/platformApp.js';
import type { StoredLead } from '../leads/index.js';

/*
 * ============================================================================
 * THE CONSOLE INBOX, END TO END
 * ============================================================================
 *
 * Two sources, one list, two entirely different ways of answering — and the interesting
 * assertions are all at the seam between them:
 *
 *   - A prospect and a customer arrive in the same list, ordered against each other.
 *   - A reply to a customer becomes a comment the *customer's own portal* can see, which
 *     is asserted from the customer's session rather than from the console's.
 *   - A reply to a prospect that fails to send leaves them in the inbox. That one is the
 *     reason the write order is what it is, and it is the failure nobody would notice.
 *
 * Everything about who may reach any of this lives in `admin.api.test.ts`, which sweeps
 * every admin path including this one. What is here is the two reply paths, because they
 * are the part that touches somebody outside the building.
 * ============================================================================
 */

const PASSWORD = 'a-long-enough-passphrase';
const OWNER = 'owner@example.com';

/** A day apart, so ordering assertions are about the sort and not about clock resolution. */
const TUESDAY = new Date('2026-08-11T09:00:00.000Z');
const WEDNESDAY = new Date('2026-08-12T09:00:00.000Z');
const THURSDAY = new Date('2026-08-13T09:00:00.000Z');

describe('the console inbox', () => {
  let harness: PlatformHarness;

  const post = (path: string) => request(harness.app).post(path).set('Origin', TEST_ORIGIN);

  beforeEach(() => {
    harness = createPlatformHarness();
  });

  /** A staff session. Promotion goes through the repository — there is no HTTP route for it. */
  async function signInAdmin(): Promise<string> {
    const signup = await post('/api/auth/signup').send({
      email: 'staff@example.com',
      name: 'Sam Staff',
      password: PASSWORD,
    });

    makeAdmin(harness, signup.body.data.user.id as string);
    return sessionCookieFrom(signup.headers);
  }

  /**
   * A lead, pushed onto storage rather than submitted through the contact form.
   *
   * The form stamps `createdAt` from the clock, and every assertion below about who has
   * been waiting longest needs to choose that value.
   */
  function giveLead(overrides: Partial<StoredLead> & { readonly createdAt: Date }): StoredLead {
    const lead: StoredLead = {
      id: `lead-${harness.repositories.leads.leads.length + 1}`,
      name: 'Dana Reyes',
      businessName: 'Cascade Heating & Air',
      email: 'dana@cascadeheating.example',
      phone: '(206) 555-0134',
      inquiryType: 'manage-website',
      message: 'My site is three years old and the phone has stopped ringing.',
      status: 'new',
      source: 'website-contact-form',
      notificationStatus: 'sent',
      updatedAt: overrides.createdAt,
      ...overrides,
    };

    harness.repositories.leads.leads.push(lead);
    return lead;
  }

  /** A customer with a project and one unanswered change request on it. */
  async function giveCustomerRequest(createdAt: Date) {
    const signup = await post('/api/auth/signup').send({
      email: 'ray@rayplumbing.example',
      name: 'Ray Okonkwo',
      password: PASSWORD,
    });

    const cookie = sessionCookieFrom(signup.headers);
    const userId = signup.body.data.user.id as string;

    const project = await harness.repositories.projects.create({
      businessName: 'Ray Okonkwo Plumbing',
      contactName: 'Ray Okonkwo',
      email: 'ray@rayplumbing.example',
      ownerUserId: userId,
      status: 'deposit-paid',
      milestone: 'review',
      approval: 'ready_for_review',
      depositStatus: 'paid',
      finalStatus: 'pending',
      subscriptionStatus: 'none',
    });

    const comment = await harness.repositories.feedback.create({
      projectId: project.id,
      authorUserId: userId,
      authorName: 'Ray Okonkwo',
      authorRole: 'customer',
      body: 'Can the emergency callout number go at the top of every page?',
    });

    /* The fake stamps `now()`; the ordering assertions need a chosen time. */
    const index = harness.repositories.feedback.comments.findIndex((c) => c.id === comment.id);
    harness.repositories.feedback.comments[index] = { ...comment, createdAt, updatedAt: createdAt };

    return { cookie, userId, projectId: project.id, commentId: comment.id };
  }

  /* ==================================================================== the list */

  it('shows a prospect and a customer in one list, longest wait first', async () => {
    const cookie = await signInAdmin();
    giveLead({ createdAt: WEDNESDAY });
    await giveCustomerRequest(TUESDAY);

    const response = await request(harness.app)
      .get('/api/admin/conversations')
      .set('Cookie', cookie);

    expect(response.status).toBe(200);

    const conversations = response.body.data.conversations as readonly Record<string, unknown>[];
    expect(conversations).toHaveLength(2);

    /*
     * The customer wrote first, so the customer is first — even though a lead and a
     * comment came out of different queries. Sorting per source and concatenating would
     * pass a "both appear" test and fail this one, which is why this asserts the order
     * rather than the membership.
     */
    expect(conversations.map((c) => c['kind'])).toEqual(['customer', 'prospect']);
    expect(conversations[0]?.['businessName']).toBe('Ray Okonkwo Plumbing');
    expect(conversations[0]?.['personName']).toBe('Ray Okonkwo');
    expect(conversations[1]?.['businessName']).toBe('Cascade Heating & Air');
  });

  it('qualifies every id with the record it is a view of', async () => {
    const cookie = await signInAdmin();
    const lead = giveLead({ createdAt: TUESDAY });
    const { commentId } = await giveCustomerRequest(WEDNESDAY);

    const response = await request(harness.app)
      .get('/api/admin/conversations')
      .set('Cookie', cookie);

    expect(response.body.data.conversations.map((c: { id: string }) => c.id)).toEqual([
      `lead:${lead.id}`,
      `comment:${commentId}`,
    ]);
  });

  it('says why a prospect got in touch when they did not write a message', async () => {
    const cookie = await signInAdmin();
    giveLead({ createdAt: TUESDAY, message: undefined });

    const response = await request(harness.app)
      .get('/api/admin/conversations')
      .set('Cookie', cookie);

    /*
     * Not an empty row. A blank preview is the one the owner scrolls past, and the
     * inquiry type is enough to decide who to call first.
     */
    expect(response.body.data.conversations[0].lastMessage).toBe(
      'Wants their existing website managed',
    );
  });

  it('leaves out anything nobody is waiting on', async () => {
    const cookie = await signInAdmin();

    giveLead({ createdAt: TUESDAY, status: 'contacted' });
    const answered = await giveCustomerRequest(WEDNESDAY);

    /* A team reply on the thread means it has been answered. */
    await harness.repositories.feedback.create({
      projectId: answered.projectId,
      parentId: answered.commentId,
      authorUserId: 'staff',
      authorName: 'Sam Staff',
      authorRole: 'team',
      body: 'Yes — doing that today.',
    });

    /* And a note the team left on its own is not somebody waiting on the team. */
    await harness.repositories.feedback.create({
      projectId: answered.projectId,
      authorUserId: 'staff',
      authorName: 'Sam Staff',
      authorRole: 'team',
      body: 'Internal: chase the logo.',
    });

    const response = await request(harness.app)
      .get('/api/admin/conversations')
      .set('Cookie', cookie);

    expect(response.body.data.conversations).toEqual([]);
  });

  /* ============================================================ replying to a prospect */

  it('emails the prospect, copies the owner, and takes the row out of the inbox', async () => {
    const cookie = await signInAdmin();
    const lead = giveLead({ createdAt: TUESDAY });

    const reply = await post(`/api/admin/conversations/lead:${lead.id}/replies`)
      .set('Cookie', cookie)
      .send({ body: 'Happy to take a look — are you free Thursday morning?' });

    expect(reply.status).toBe(204);

    const sent = harness.email.sent.at(-1);
    expect(sent?.to).toBe('dana@cascadeheating.example');
    expect(sent?.text).toContain('are you free Thursday morning?');
    /* Both point at the owner: one so the prospect can answer, one so the owner has a copy. */
    expect(sent?.replyTo).toBe(OWNER);
    expect(sent?.bcc).toBe(OWNER);
    /* Their own words are quoted back, so the reply is readable on its own. */
    expect(sent?.text).toContain('the phone has stopped ringing');

    const after = await request(harness.app).get('/api/admin/conversations').set('Cookie', cookie);
    expect(after.body.data.conversations).toEqual([]);
    expect(harness.repositories.leads.leads[0]?.status).toBe('contacted');
  });

  it('leaves the prospect in the inbox when the reply could not be sent', async () => {
    const cookie = await signInAdmin();
    const lead = giveLead({ createdAt: TUESDAY });

    harness.email.failWith(new Error('Resend is down.'));

    const reply = await post(`/api/admin/conversations/lead:${lead.id}/replies`)
      .set('Cookie', cookie)
      .send({ body: 'Happy to take a look.' });

    expect(reply.status).toBe(500);

    /*
     * ======================================================================
     * THE ASSERTION THIS FILE EXISTS FOR
     * ======================================================================
     *
     * Marking the lead contacted before sending would have looked identical to the
     * owner — same error, same red banner — and quietly removed a real customer from the
     * only list that tracks them. Nobody would ever have found out. So the status is
     * still `new` and the row is still there to try again.
     * ======================================================================
     */
    expect(harness.repositories.leads.leads[0]?.status).toBe('new');

    const after = await request(harness.app).get('/api/admin/conversations').set('Cookie', cookie);
    expect(after.body.data.conversations).toHaveLength(1);
  });

  it('never treats what the owner typed as markup', async () => {
    const cookie = await signInAdmin();
    const lead = giveLead({ createdAt: TUESDAY });

    await post(`/api/admin/conversations/lead:${lead.id}/replies`)
      .set('Cookie', cookie)
      .send({ body: 'Costs <b>under</b> £500 <script>alert(1)</script>' });

    const sent = harness.email.sent.at(-1);
    expect(sent?.html).not.toContain('<script>');
    expect(sent?.html).toContain('&lt;script&gt;');
    expect(sent?.html).toContain('&lt;b&gt;under&lt;/b&gt;');
  });

  /* ============================================================ replying to a customer */

  it('puts a reply to a customer on their own thread, where their portal shows it', async () => {
    const cookie = await signInAdmin();
    const customer = await giveCustomerRequest(TUESDAY);

    const reply = await post(`/api/admin/conversations/comment:${customer.commentId}/replies`)
      .set('Cookie', cookie)
      .send({ body: 'Done — it is at the top of every page now.' });

    expect(reply.status).toBe(204);

    /*
     * Asserted from the *customer's* session. The console writing a row into a collection
     * proves nothing; the customer being able to read it is the actual requirement, and
     * it is the reason this path goes through `FeedbackService` rather than writing a
     * comment of its own.
     */
    const portal = await request(harness.app)
      .get(`/api/app/projects/${customer.projectId}/overview`)
      .set('Cookie', customer.cookie);

    expect(portal.status).toBe(200);
    const thread = portal.body.data.feedback[0];
    expect(thread.replies).toHaveLength(1);
    expect(thread.replies[0].body).toBe('Done — it is at the top of every page now.');
    expect(thread.replies[0].authorRole).toBe('team');
    expect(thread.replies[0].authorName).toBe('Sam Staff');
  });

  it('does not email a customer whose reply is already in their portal', async () => {
    const cookie = await signInAdmin();
    const customer = await giveCustomerRequest(TUESDAY);
    const before = harness.email.sent.length;

    await post(`/api/admin/conversations/comment:${customer.commentId}/replies`)
      .set('Cookie', cookie)
      .send({ body: 'Done.' });

    /* Two copies of the same sentence is how a portal teaches people to ignore it. */
    expect(harness.email.sent).toHaveLength(before);
  });

  it('takes an answered request out of the inbox', async () => {
    const cookie = await signInAdmin();
    const customer = await giveCustomerRequest(TUESDAY);

    await post(`/api/admin/conversations/comment:${customer.commentId}/replies`)
      .set('Cookie', cookie)
      .send({ body: 'Done.' });

    const after = await request(harness.app).get('/api/admin/conversations').set('Cookie', cookie);
    expect(after.body.data.conversations).toEqual([]);
  });

  /* =================================================================== bad ids */

  it('answers every unusable id with one sentence', async () => {
    const cookie = await signInAdmin();
    const customer = await giveCustomerRequest(TUESDAY);

    /* A reply to a reply: threading is one level, so this is not a conversation. */
    const nested = await harness.repositories.feedback.create({
      projectId: customer.projectId,
      parentId: customer.commentId,
      authorUserId: 'staff',
      authorName: 'Sam Staff',
      authorRole: 'team',
      body: 'On it.',
    });

    const unusable = [
      'lead:does-not-exist',
      'comment:does-not-exist',
      `comment:${nested.id}`,
      'project:anything',
      'no-separator',
      'lead:',
    ];

    const answers = await Promise.all(
      unusable.map((id) =>
        post(`/api/admin/conversations/${id}/replies`)
          .set('Cookie', cookie)
          .send({ body: 'Hello.' }),
      ),
    );

    /*
     * Identical, and that is the assertion: a malformed id answered differently from a
     * real-but-missing one tells somebody which id formats are worth guessing. The same
     * reasoning as `authorizeOwnership`.
     */
    for (const [index, answer] of answers.entries()) {
      expect(answer.status, unusable[index]).toBe(404);
      expect(answer.body.error.message, unusable[index]).toBe(
        'There is no conversation with that id.',
      );
    }
  });

  it('refuses an empty reply and a body pretending to be somebody else', async () => {
    const cookie = await signInAdmin();
    const lead = giveLead({ createdAt: TUESDAY });

    const empty = await post(`/api/admin/conversations/lead:${lead.id}/replies`)
      .set('Cookie', cookie)
      .send({ body: '   ' });
    expect(empty.status).toBe(400);

    /* A strict schema: an extra key is an unreadable request, never a silently dropped one. */
    const smuggled = await post(`/api/admin/conversations/lead:${lead.id}/replies`)
      .set('Cookie', cookie)
      .send({ body: 'Hello.', authorName: 'The Owner' });
    expect(smuggled.status).toBe(400);
    expect(smuggled.body.error.code).toBe('MALFORMED_REQUEST');
  });

  /* ================================================================= access */

  it('is invisible to a customer, including the reply route', async () => {
    const signup = await post('/api/auth/signup').send({
      email: 'nosy@example.com',
      name: 'Nosy',
      password: PASSWORD,
    });
    const cookie = sessionCookieFrom(signup.headers);

    const list = await request(harness.app).get('/api/admin/conversations').set('Cookie', cookie);
    expect(list.status).toBe(404);

    const reply = await post('/api/admin/conversations/lead:anything/replies')
      .set('Cookie', cookie)
      .send({ body: 'Hello.' });
    expect(reply.status).toBe(404);
    /* The same sentence `requireAdmin` gives a scanner with no session at all. */
    expect(reply.body.error.message).toBe('Not found.');
  });

  it('bounds the list', async () => {
    const cookie = await signInAdmin();
    for (let index = 0; index < 5; index += 1) {
      giveLead({ createdAt: new Date(THURSDAY.getTime() + index * 1000) });
    }

    const response = await request(harness.app)
      .get('/api/admin/conversations?limit=2')
      .set('Cookie', cookie);

    expect(response.body.data.conversations).toHaveLength(2);

    const silly = await request(harness.app)
      .get('/api/admin/conversations?limit=9999')
      .set('Cookie', cookie);
    expect(silly.status).toBe(400);
  });
});
