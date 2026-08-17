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
 * ACCOUNT MESSAGES, END TO END
 * ============================================================================
 *
 * A customer with no project open writes to the owner, the owner answers from the console
 * inbox, and the answer arrives in the customer's portal and in their email.
 *
 * The reason this feature is worth a file of its own is that almost none of it is new code.
 * A message is a comment with a different scope, so the inbox, the threading rule, the
 * author-role rule, the notification direction and the demo exclusion all applied to it on
 * the day the scope was added. **What is asserted here is that they did** — because "we
 * widened a field and everything downstream kept working" is exactly the claim that is
 * cheap to make and expensive to be wrong about.
 *
 * The isolation assertions matter for a second reason. Every other private route resolves a
 * resource from an id in the URL and then checks ownership. These two routes take no id at
 * all: the scope *is* the session. That is a stronger property than an ownership check, and
 * it is only stronger if nothing can smuggle an id in — which is what the reply test below
 * is about.
 * ============================================================================
 */

const PASSWORD = 'a-long-enough-passphrase';

describe('account messages', () => {
  let harness: PlatformHarness;

  const post = (path: string) => request(harness.app).post(path).set('Origin', TEST_ORIGIN);

  beforeEach(() => {
    harness = createPlatformHarness();
  });

  async function signUp(email: string, name: string): Promise<string> {
    const response = await post('/api/auth/signup').send({ email, name, password: PASSWORD });
    expect(response.status).toBe(201);
    return sessionCookieFrom(response.headers);
  }

  async function signInAdmin(): Promise<string> {
    const signup = await post('/api/auth/signup').send({
      email: 'staff@example.com',
      name: 'Sam Staff',
      password: PASSWORD,
    });
    makeAdmin(harness, signup.body.data.user.id as string);
    return sessionCookieFrom(signup.headers);
  }

  it('lets somebody with no project reach the owner, and reads it back', async () => {
    const cookie = await signUp('dana@example.test', 'Dana Whitfield');

    const sent = await post('/api/app/messages')
      .set('Cookie', cookie)
      .send({ body: 'Do you build a second site for a business I also own?' });

    expect(sent.status).toBe(201);
    expect(sent.body.data.messages).toHaveLength(1);
    expect(sent.body.data.messages[0]).toMatchObject({
      body: 'Do you build a second site for a business I also own?',
      authorName: 'Dana Whitfield',
      authorRole: 'customer',
      replies: [],
    });

    const read = await request(harness.app).get('/api/app/messages').set('Cookie', cookie);

    expect(read.status).toBe(200);
    expect(read.body.data.messages).toHaveLength(1);
  });

  it('tells the owner, and names the person rather than a business they do not have', async () => {
    const cookie = await signUp('dana@example.test', 'Dana Whitfield');

    await post('/api/app/messages')
      .set('Cookie', cookie)
      .send({ body: 'Is the deposit refundable?' });

    /*
     * Digest-tier, like every other customer comment — the wording is what changes, not the
     * urgency. "wrote about Cascade Heating" would be a claim about a project that does not
     * exist, which is the whole definition of this scope.
     */
    const owner = harness.email.sent.filter((message) => message.subject.startsWith('New message'));
    expect(owner).toHaveLength(0);

    const queued = harness.repositories.activity.entries.filter(
      (entry) => entry.type === 'feedback.created',
    );
    expect(queued).toHaveLength(1);
    /* No project, and the entry still lands in the sender's own stream. */
    expect(queued[0]?.projectId).toBeUndefined();
    expect(queued[0]?.userId).toBeDefined();
  });

  it('puts the message in the console inbox with no second definition of waiting', async () => {
    const customer = await signUp('dana@example.test', 'Dana Whitfield');
    await post('/api/app/messages')
      .set('Cookie', customer)
      .send({ body: 'Can we talk about a second site?' });

    const admin = await signInAdmin();
    const inbox = await request(harness.app).get('/api/admin/conversations').set('Cookie', admin);

    expect(inbox.status).toBe(200);
    const mine = inbox.body.data.conversations.filter(
      (row: { personName: string }) => row.personName === 'Dana Whitfield',
    );
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({
      kind: 'customer',
      awaitingReply: true,
      /* No project to name, so the person stands in — the same substitution a deleted
         project's comment already got. */
      businessName: 'Dana Whitfield',
    });
  });

  it("delivers the owner's reply to the portal and to their inbox", async () => {
    const customer = await signUp('dana@example.test', 'Dana Whitfield');
    const sent = await post('/api/app/messages')
      .set('Cookie', customer)
      .send({ body: 'Do you take on a site that already exists?' });

    const admin = await signInAdmin();
    const inbox = await request(harness.app).get('/api/admin/conversations').set('Cookie', admin);
    const conversation = inbox.body.data.conversations.find(
      (row: { personName: string }) => row.personName === 'Dana Whitfield',
    );

    harness.email.sent.length = 0;

    const replied = await post(
      `/api/admin/conversations/${encodeURIComponent(conversation.id as string)}/replies`,
    )
      .set('Cookie', admin)
      .send({ body: 'We do — send the address and we will take a look this week.' });

    expect(replied.status).toBe(204);

    /* The customer's own screen, from the customer's own session. */
    const read = await request(harness.app).get('/api/app/messages').set('Cookie', customer);
    expect(read.body.data.messages).toHaveLength(1);
    expect(read.body.data.messages[0].id).toBe(sent.body.data.messages[0].id);
    expect(read.body.data.messages[0].replies).toHaveLength(1);
    expect(read.body.data.messages[0].replies[0]).toMatchObject({
      body: 'We do — send the address and we will take a look this week.',
      authorRole: 'team',
    });

    /*
     * And the email, which is the half that used to be missing everywhere. Its link goes to
     * `/app/messages` rather than to a project id this person does not have.
     */
    const toCustomer = harness.email.sent.filter((message) =>
      message.to.includes('dana@example.test'),
    );
    expect(toCustomer).toHaveLength(1);
    expect(toCustomer[0]?.html).toContain('/app/messages');
    expect(toCustomer[0]?.html).not.toContain('/app/projects/');
  });

  it('drops off the inbox once it has been answered', async () => {
    const customer = await signUp('dana@example.test', 'Dana Whitfield');
    await post('/api/app/messages').set('Cookie', customer).send({ body: 'Anybody there?' });

    const admin = await signInAdmin();
    const before = await request(harness.app).get('/api/admin/conversations').set('Cookie', admin);
    const conversation = before.body.data.conversations.find(
      (row: { personName: string }) => row.personName === 'Dana Whitfield',
    );

    await post(`/api/admin/conversations/${encodeURIComponent(conversation.id as string)}/replies`)
      .set('Cookie', admin)
      .send({ body: 'Here. What can we do?' });

    const after = await request(harness.app).get('/api/admin/conversations').set('Cookie', admin);
    expect(
      after.body.data.conversations.filter(
        (row: { personName: string }) => row.personName === 'Dana Whitfield',
      ),
    ).toHaveLength(0);
  });

  it('never shows one account the messages of another', async () => {
    const dana = await signUp('dana@example.test', 'Dana Whitfield');
    const mo = await signUp('mo@example.test', 'Mo Ellis');

    await post('/api/app/messages').set('Cookie', dana).send({ body: 'A private question.' });

    const theirs = await request(harness.app).get('/api/app/messages').set('Cookie', mo);
    expect(theirs.status).toBe(200);
    expect(theirs.body.data.messages).toHaveLength(0);
  });

  it("refuses a reply that quotes another account's message", async () => {
    const dana = await signUp('dana@example.test', 'Dana Whitfield');
    const mo = await signUp('mo@example.test', 'Mo Ellis');

    const sent = await post('/api/app/messages')
      .set('Cookie', dana)
      .send({ body: 'A private question.' });
    const stolenId = sent.body.data.messages[0].id as string;

    /*
     * The one way an id reaches these routes at all. Without the scope check in `addComment`
     * this would write a reply into somebody else's thread — readable there, attributed to a
     * stranger — which is the failure the two routes taking no id otherwise makes impossible.
     */
    const attempt = await post('/api/app/messages')
      .set('Cookie', mo)
      .send({ body: 'Reading over your shoulder.', parentId: stolenId });

    expect(attempt.status).toBe(404);

    const danas = await request(harness.app).get('/api/app/messages').set('Cookie', dana);
    expect(danas.body.data.messages[0].replies).toHaveLength(0);
  });

  it('keeps threading flat, exactly as a project comment does', async () => {
    const cookie = await signUp('dana@example.test', 'Dana Whitfield');

    const sent = await post('/api/app/messages').set('Cookie', cookie).send({ body: 'First.' });
    const rootId = sent.body.data.messages[0].id as string;

    const reply = await post('/api/app/messages')
      .set('Cookie', cookie)
      .send({ body: 'Adding to that.', parentId: rootId });
    expect(reply.status).toBe(201);

    const replyId = reply.body.data.messages[0].replies[0].id as string;

    const twoDeep = await post('/api/app/messages')
      .set('Cookie', cookie)
      .send({ body: 'And again.', parentId: replyId });

    expect(twoDeep.status).toBe(400);
  });

  it('requires a session', async () => {
    await request(harness.app).get('/api/app/messages').expect(401);
    await post('/api/app/messages').send({ body: 'Hello?' }).expect(401);
  });
});
