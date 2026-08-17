import { describe, expect, it } from 'vitest';
import { isAppError } from '../../lib/appError.js';
import { silentLogger } from '../../lib/logger.js';
import {
  createInMemoryFeedbackRepository,
  createInMemoryProjectRepository,
} from '../../testing/authFakes.js';
import { createInMemoryLeadRepository, createRecordingEmailService } from '../../testing/fakes.js';
import { createFeedbackService } from '../feedback/index.js';
import { createProjectService } from '../projects/index.js';
import { createTaskService } from '../tasks/index.js';
import { createInMemoryTaskRepository } from '../../testing/authFakes.js';
import { noopActivityRecorder } from '../activity/index.js';
import type { StoredUser } from '../auth/index.js';
import { createConversationService } from './conversation.service.js';
import { formatConversationId, parseConversationId, toPreview } from './conversation.types.js';

/*
 * The rules that are not about HTTP.
 *
 * `conversation.api.test.ts` covers the two reply paths through the real pipeline. This
 * covers the three cases that are awkward to reach from outside — an unconfigured reply
 * address, a bookkeeping write that fails after the mail is already gone, and a project
 * that has disappeared from under a comment — plus the id format, which is the one piece
 * of this feature that appears in a URL.
 */

const STAFF: StoredUser = {
  id: 'staff-1',
  email: 'sam@example.com',
  name: 'Sam Staff',
  role: 'admin',
  emailVerified: true,
  identities: [],
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

const RECEIVED = new Date('2026-08-11T09:00:00.000Z');

function build(options: { ownerAddress?: string | undefined } = {}) {
  const leads = createInMemoryLeadRepository();
  const feedbackRepository = createInMemoryFeedbackRepository();
  const projectRepository = createInMemoryProjectRepository();
  const email = createRecordingEmailService();

  const feedback = createFeedbackService({
    repository: feedbackRepository,
    activity: noopActivityRecorder,
    logger: silentLogger,
  });

  const projects = createProjectService({
    repository: projectRepository,
    tasks: createTaskService({
      repository: createInMemoryTaskRepository(),
      activity: noopActivityRecorder,
      logger: silentLogger,
    }),
    activity: noopActivityRecorder,
    logger: silentLogger,
  });

  /*
   * A real store rather than `async () => null`.
   *
   * The last port in this service that a test rig quietly did not wire was the notifier, and
   * the cost was a test named "does not email a customer whose reply is already in their
   * portal" that was asserting the harness gap rather than the behaviour — it passed for
   * months and had to be rewritten to say the opposite. A stub returning nothing here would
   * make every account-scoped assertion below agree with a missing lookup.
   */
  const accounts = new Map<string, { email: string; name: string }>();

  const service = createConversationService({
    leads,
    feedback,
    projects,
    findAccount: async (userId) => accounts.get(userId) ?? null,
    emailService: email,
    ownerAddress: 'ownerAddress' in options ? options.ownerAddress : 'owner@example.com',
    logger: silentLogger,
  });

  return { service, leads, feedback, feedbackRepository, projectRepository, email, accounts };
}

function giveLead(leads: ReturnType<typeof createInMemoryLeadRepository>) {
  leads.leads.push({
    id: 'lead-1',
    name: 'Dana Reyes',
    businessName: 'Cascade Heating & Air',
    email: 'dana@cascadeheating.example',
    phone: '(206) 555-0134',
    inquiryType: 'manage-website',
    message: 'The phone has stopped ringing.',
    status: 'new',
    source: 'website-contact-form',
    notificationStatus: 'sent',
    createdAt: RECEIVED,
    updatedAt: RECEIVED,
  });
}

describe('replying to a prospect', () => {
  it('refuses when there is no address for the prospect to answer to', async () => {
    const { service, leads, email } = build({ ownerAddress: undefined });
    giveLead(leads);

    const failure = await service
      .reply({
        id: { source: 'lead', recordId: 'lead-1' },
        author: STAFF,
        body: 'Happy to help.',
      })
      .catch((error: unknown) => error);

    expect(isAppError(failure) && failure.code).toBe('SERVICE_UNAVAILABLE');
    /* Nothing was sent, so nothing arrived from an address nobody reads. */
    expect(email.sent).toHaveLength(0);
    expect(leads.leads[0]?.status).toBe('new');
  });

  it('succeeds even when the lead cannot be marked contacted', async () => {
    const { service, leads, email } = build();
    giveLead(leads);

    /*
     * The mail is already in somebody's inbox and cannot be unsent. Failing the request
     * here would tell the owner it had not gone, and they would write it again — so the
     * bookkeeping failure is logged and swallowed. The cost is one row that reappears in
     * the inbox, which is the harmless direction to be wrong in.
     */
    leads.updateStatus = () => Promise.reject(new Error('Mongo went away.'));

    await expect(
      service.reply({
        id: { source: 'lead', recordId: 'lead-1' },
        author: STAFF,
        body: 'Happy to help.',
      }),
    ).resolves.toBeUndefined();

    expect(email.sent).toHaveLength(1);
  });
});

describe('the list', () => {
  it('still shows a change request whose project has been deleted', async () => {
    const { service, feedbackRepository } = build();

    await feedbackRepository.create({
      projectId: 'a-project-that-is-gone',
      authorUserId: 'user-1',
      authorName: 'Ray Okonkwo',
      authorRole: 'customer',
      body: 'Can the callout number go at the top?',
    });

    const { conversations } = await service.list(50);
    const [conversation] = conversations;

    /*
     * Dropping the row would be the tidy implementation and the wrong one: somebody is
     * still waiting, and the only thing missing is a label. It falls back to the name the
     * comment itself carries, which was denormalised at write time for exactly this.
     */
    expect(conversation?.personName).toBe('Ray Okonkwo');
    expect(conversation?.businessName).toBe('Ray Okonkwo');
  });

  it('bounds each source rather than the merged list', async () => {
    const { service, leads, feedbackRepository } = build();

    for (let index = 0; index < 3; index += 1) {
      leads.leads.push({
        id: `lead-${index}`,
        name: `Person ${index}`,
        businessName: `Business ${index}`,
        email: `person${index}@example.com`,
        phone: '(206) 555-0134',
        inquiryType: 'new-website',
        status: 'new',
        source: 'website-contact-form',
        notificationStatus: 'sent',
        createdAt: new Date(RECEIVED.getTime() + index * 1000),
        updatedAt: RECEIVED,
      });
    }

    await feedbackRepository.create({
      projectId: 'project-1',
      authorUserId: 'user-1',
      authorName: 'Ray Okonkwo',
      authorRole: 'customer',
      body: 'One change please.',
    });

    /*
     * Two leads and the one change request — not two rows total. A merged bound would let
     * a run of leads push every customer off the end of the console's first page, which
     * is the customer who is *already* paying.
     */
    const { conversations, hasMore } = await service.list(2);
    expect(conversations).toHaveLength(3);
    expect(conversations.filter((entry) => entry.kind === 'prospect')).toHaveLength(2);

    /*
     * And it says it cut something. Three leads were waiting and two were sent, which the
     * console could not have worked out from a merged list of three rows against a limit of
     * two — see the note on `list`.
     */
    expect(hasMore).toBe(true);
  });

  it('says nothing was cut when nothing was', async () => {
    const { service, feedbackRepository } = build();

    await feedbackRepository.create({
      projectId: 'project-1',
      authorUserId: 'user-1',
      authorName: 'Ray Okonkwo',
      authorRole: 'customer',
      body: 'One change please.',
    });

    const { conversations, hasMore } = await service.list(50);

    expect(conversations).toHaveLength(1);
    expect(hasMore).toBe(false);
  });

  /*
   * The boundary the old client-side inference got wrong: exactly as many as were asked for,
   * and nothing behind them. It rendered "there are more waiting" at a complete inbox.
   */
  it('says nothing was cut when the count lands exactly on the limit', async () => {
    const { service, leads } = build();

    for (let index = 0; index < 2; index += 1) {
      leads.leads.push({
        id: `lead-${index}`,
        name: `Person ${index}`,
        businessName: `Business ${index}`,
        email: `person${index}@example.com`,
        phone: '(206) 555-0134',
        inquiryType: 'new-website',
        status: 'new',
        source: 'website-contact-form',
        notificationStatus: 'sent',
        createdAt: new Date(RECEIVED.getTime() + index * 1000),
        updatedAt: RECEIVED,
      });
    }

    const { conversations, hasMore } = await service.list(2);

    expect(conversations).toHaveLength(2);
    expect(hasMore).toBe(false);
  });
});

describe('the conversation id', () => {
  it('round-trips both sources', () => {
    for (const source of ['lead', 'comment'] as const) {
      const id = { source, recordId: '68a1c0ffee0000000000dead' };
      expect(parseConversationId(formatConversationId(id))).toEqual(id);
    }
  });

  it('answers NOT_FOUND rather than a validation error for anything else', () => {
    for (const raw of ['', 'lead', 'project:1', 'lead:', ':1', 'lead:with space']) {
      let code: string | undefined;
      try {
        parseConversationId(raw);
      } catch (error) {
        code = isAppError(error) ? error.code : 'not-an-app-error';
      }

      /*
       * VALIDATION_ERROR would be the natural choice and it would leak: a caller who can
       * tell "that is not an id" from "there is no such conversation" has been told which
       * id formats are real.
       */
      expect(code, raw).toBe('NOT_FOUND');
    }
  });
});

describe('the message preview', () => {
  it('collapses whitespace so a list row is one line', () => {
    expect(toPreview('  Replace   the\n\nphoto  ')).toBe('Replace the photo');
  });

  it('only marks a preview as trimmed when something was actually removed', () => {
    const exact = 'x'.repeat(240);
    expect(toPreview(exact)).toBe(exact);
    expect(toPreview('x'.repeat(241)).endsWith('…')).toBe(true);
    expect(toPreview('x'.repeat(241))).toHaveLength(240);
  });
});
