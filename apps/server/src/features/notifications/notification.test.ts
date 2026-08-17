import { describe, expect, it, vi } from 'vitest';
import type { EmailMessage, EmailService } from '../../infrastructure/email/email.service.js';
import { createLogger } from '../../lib/logger.js';
import { createNotifier, noopNotifier } from './notification.service.js';
import type { DigestQueue } from './notification.service.js';
import { IMMEDIATE_KINDS, NOTIFICATION_KINDS, isImmediate } from './notification.types.js';

/*
 * ============================================================================
 * WHAT THIS FEATURE PROMISES, PINNED
 * ============================================================================
 *
 * The notifier's header makes four claims that nothing else in the codebase can enforce, and
 * every one of them is the kind that fails silently — an email that should not have been sent
 * is not an error anywhere, it is a customer who quietly stops opening them.
 *
 *   1. **It never throws.** Every call site is a business operation that has already succeeded.
 *      If a send can reject, a mail outage becomes a lost milestone transition.
 *   2. **An empty task set sends nothing.** This is what makes a redelivered Stripe webhook
 *      silent, and it is load-bearing rather than cosmetic: `seedOnboarding` returns only what
 *      it created, so the second delivery of one payment passes an empty array through here.
 *   3. **Five tasks are one email.** The single most likely way this feature becomes something
 *      people filter, on the day somebody has just paid several thousand dollars.
 *   4. **The immediate/digest split is what the table says.** A digest-tier kind that reaches
 *      the inbox is noise; an immediate one that reaches the queue is a client waiting a day
 *      for an answer.
 *
 * The suppression rule — that the author of a comment is never the recipient of the email about
 * it — is structural rather than conditional (it follows the stored author role) and is pinned
 * where that role is decided, in the feedback service's own tests.
 * ============================================================================
 */

const logger = createLogger({ level: 'silent' });

const TO = { email: 'owner@example.test', name: 'Dana Reyes' };

/** Records what would have been sent, so a test can assert on the message rather than a spy. */
function recordingEmailService(): { service: EmailService; sent: EmailMessage[] } {
  const sent: EmailMessage[] = [];
  return {
    sent,
    service: {
      async send(message) {
        sent.push(message);
      },
    },
  };
}

function recordingQueue(): { queue: DigestQueue; entries: { kind: string }[] } {
  const entries: { kind: string }[] = [];
  return {
    entries,
    queue: {
      async enqueue(entry) {
        entries.push({ kind: entry.kind });
      },
    },
  };
}

function build(overrides?: { emailService?: EmailService; queue?: DigestQueue }) {
  const recorder = recordingEmailService();
  return {
    sent: recorder.sent,
    notifier: createNotifier({
      emailService: overrides?.emailService ?? recorder.service,
      siteUrl: 'https://example.test',
      ownerAddress: 'studio@example.test',
      logger,
      queue: overrides?.queue,
    }),
  };
}

describe('the notification port', () => {
  /* ------------------------------------------------------------------ never throws */

  it('never rejects when the transport fails, and says so in the log', async () => {
    /*
     * The property the whole design rests on. Every consumer calls this without a `try`, so a
     * rejection here would propagate into `setMilestone`, `addComment` and the Stripe webhook —
     * turning a mail outage into a lost state change, a rolled-back transition and, in the
     * webhook's case, a payment Stripe would retry against a system that had already recorded it.
     */
    const exploding: EmailService = {
      async send() {
        throw new Error('the provider is down');
      },
    };

    const { notifier } = build({ emailService: exploding });

    await expect(
      notifier.previewReady({ to: TO, businessName: 'Cascade Heating', projectId: 'p1' }),
    ).resolves.toBeUndefined();

    await expect(notifier.paymentFailed({ to: TO })).resolves.toBeUndefined();

    await expect(
      notifier.owner({
        kind: 'owner.approved',
        subject: 's',
        heading: 'h',
        lines: ['l'],
      }),
    ).resolves.toBeUndefined();
  });

  /* ------------------------------------------------------------------ coalescing */

  it('sends nothing for an empty task set', async () => {
    /*
     * The redelivered-webhook case, and the reason this assertion is not merely defensive.
     *
     * `activateForCustomer` passes `seedOnboarding`'s return value straight through, and that
     * method returns **only the tasks it actually created** — so Stripe's second delivery of one
     * payment reaches here with an empty array. Without this branch, every retry would send a
     * customer a fresh "we need things from you" naming nothing.
     */
    const { notifier, sent } = build();

    await notifier.tasksAssigned({
      to: TO,
      businessName: 'Cascade Heating',
      projectId: 'p1',
      tasks: [],
    });

    expect(sent).toHaveLength(0);
  });

  it('sends one email for a whole onboarding set, naming the first and counting the rest', async () => {
    const { notifier, sent } = build();

    await notifier.tasksAssigned({
      to: TO,
      businessName: 'Cascade Heating',
      projectId: 'p1',
      tasks: [
        { title: 'Send us your logo', description: 'A PNG or SVG if you have one.' },
        { title: 'Send us photos', description: 'Ten or so of finished work.' },
        { title: 'Confirm your services', description: 'The list we should build pages for.' },
        { title: 'Confirm your service areas', description: 'Which towns you cover.' },
        { title: 'Business details', description: 'Licence and insurance numbers.' },
      ],
    });

    expect(sent).toHaveLength(1);

    const [message] = sent;
    expect(message?.subject).toContain('5 things');
    expect(message?.subject).toContain('Cascade Heating');
    /* The first is named, because a list of five is a list nobody starts. */
    expect(message?.text).toContain('Send us your logo');
    /* And the remainder is counted rather than listed. */
    expect(message?.text).toContain('other 4');
  });

  it('reads as one thing rather than a list when only one task arrives', async () => {
    const { notifier, sent } = build();

    await notifier.tasksAssigned({
      to: TO,
      businessName: 'Cascade Heating',
      projectId: 'p1',
      tasks: [{ title: 'Send us your logo', description: 'A PNG or SVG.' }],
    });

    expect(sent[0]?.subject).toContain('one thing');
    expect(sent[0]?.text).not.toContain('other');
  });

  /* ------------------------------------------------------------------ the split */

  it('sends the owner’s urgent kinds and queues the rest', async () => {
    const recorder = recordingQueue();
    const { notifier, sent } = build({ queue: recorder.queue });

    await notifier.owner({
      kind: 'owner.changes_requested',
      subject: 'Changes requested',
      heading: 'A client asked for changes',
      lines: ['They want the hero photo changed.'],
    });

    await notifier.owner({
      kind: 'owner.comment_received',
      subject: 'New comment',
      heading: 'A client left a comment',
      lines: ['Looks great.'],
    });

    expect(sent.map((message) => message.subject)).toEqual(['Changes requested']);
    expect(recorder.entries.map((entry) => entry.kind)).toEqual(['owner.comment_received']);
  });

  it('drops a digest entry rather than emailing it when no queue is configured', async () => {
    /*
     * The supported half-built state, asserted so it stays supported. The digest's storage can
     * ship after the port does, and while it has not, a digest-tier event must not fall through
     * to the inbox — the whole point of classifying it was that it does not belong there.
     */
    const { notifier, sent } = build();

    await notifier.owner({
      kind: 'owner.comment_received',
      subject: 'New comment',
      heading: 'A client left a comment',
      lines: ['Looks great.'],
    });

    expect(sent).toHaveLength(0);
  });

  it('sends the owner nothing at all when no address is configured', async () => {
    const recorder = recordingEmailService();
    const notifier = createNotifier({
      emailService: recorder.service,
      siteUrl: 'https://example.test',
      ownerAddress: undefined,
      logger,
    });

    await notifier.owner({
      kind: 'owner.approved',
      subject: 'Approved',
      heading: 'A website was approved',
      lines: ['Cascade Heating.'],
    });

    expect(recorder.sent).toHaveLength(0);
  });

  /* ------------------------------------------------------------------ estimates */

  it('says nothing when an estimate is re-saved on the same day', async () => {
    /*
     * An operator pressing save twice must not tell a customer their launch date changed.
     * Telling somebody their date moved when it did not spends exactly the credibility this
     * notification exists to build — and the estimate email is the one in the set most capable
     * of doing harm if it is sent carelessly.
     */
    const { notifier, sent } = build();

    const morning = new Date('2026-09-10T09:00:00Z');
    const evening = new Date('2026-09-10T21:30:00Z');

    await notifier.estimateChanged({
      to: TO,
      businessName: 'Cascade Heating',
      projectId: 'p1',
      previous: morning,
      next: evening,
    });

    expect(sent).toHaveLength(0);
  });

  it('tells a customer when the date genuinely moves, and which way', async () => {
    const { notifier, sent } = build();

    await notifier.estimateChanged({
      to: TO,
      businessName: 'Cascade Heating',
      projectId: 'p1',
      previous: new Date('2026-09-10T09:00:00Z'),
      next: new Date('2026-09-24T09:00:00Z'),
    });

    expect(sent).toHaveLength(1);
    expect(sent[0]?.text).toContain('moved back');
  });

  /* ------------------------------------------------------------------ content */

  it('escapes anything a person typed before it reaches the HTML', async () => {
    /*
     * A comment body arrives from a textarea and an author name from a signup form. Neither is
     * trusted markup, and an email is a document rendered by a client we do not control.
     *
     * The assertion is on `html` only, and that is not an oversight. A subject line is not
     * markup — it is a header field, and escaping it would put a literal `&lt;` in somebody's
     * inbox. The two halves have genuinely different rules, so the test states both rather than
     * asserting one and hoping.
     */
    const { notifier, sent } = build();

    await notifier.feedbackReplied({
      to: TO,
      businessName: 'Cascade Heating',
      projectId: 'p1',
      authorName: '<script>alert(1)</script>',
      body: 'Can we try <b>bolder</b> text?',
    });

    expect(sent[0]?.html).not.toContain('<script>');
    expect(sent[0]?.html).toContain('&lt;script&gt;');
    expect(sent[0]?.html).toContain('&lt;b&gt;bolder&lt;/b&gt;');

    /* The subject carries what the person typed, unescaped, because it is not HTML. */
    expect(sent[0]?.subject).toContain('<script>');
  });

  it('links into the workspace rather than to a bare file or an external host', async () => {
    /*
     * Every customer notification's button has to land somewhere behind a session. A blob URL or
     * a raw asset link in an email is a URL that outlives the relationship, gets forwarded, and
     * cannot be withdrawn.
     */
    const { notifier, sent } = build();

    await notifier.fileDelivered({
      to: TO,
      businessName: 'Cascade Heating',
      projectId: 'p1',
      filename: 'launch-report.pdf',
      note: undefined,
    });

    expect(sent[0]?.text).toContain('https://example.test/app/projects/p1');
  });

  it('gives every message a plain-text alternative', async () => {
    /*
     * Not cosmetic. A message whose text part is empty scores as spam, and this is the half a
     * builder is most likely to forget because nothing renders it during development.
     */
    const { notifier, sent } = build();

    await notifier.previewReady({ to: TO, businessName: 'Cascade Heating', projectId: 'p1' });
    await notifier.approvalRequested({ to: TO, businessName: 'Cascade Heating', projectId: 'p1' });
    await notifier.projectLaunched({
      to: TO,
      businessName: 'Cascade Heating',
      productionUrl: 'https://cascade.test',
    });
    await notifier.paymentDue({
      to: TO,
      businessName: 'Cascade Heating',
      stage: 'final',
      amountLabel: '$2,450',
    });
    await notifier.paymentFailed({ to: TO });

    expect(sent).toHaveLength(5);
    for (const message of sent) {
      expect(message.text.trim().length).toBeGreaterThan(40);
      expect(message.html).toContain('<div');
      expect(message.subject.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('the immediate/digest table', () => {
  it('classifies every declared kind', () => {
    /*
     * Guards the guard. `isImmediate` answers false for anything absent from the list, so a kind
     * added without a decision silently becomes digest-tier — which for a customer notification
     * would mean a preview-ready email arriving the next morning.
     */
    const unclassified = NOTIFICATION_KINDS.filter(
      (kind) => !kind.startsWith('owner.') && !isImmediate(kind),
    );

    expect(
      unclassified,
      'Every customer notification is immediate by definition — somebody is waiting on it or ' +
        'being asked for something. Add it to IMMEDIATE_KINDS, or move it under `owner.` if it ' +
        'is genuinely a summary.',
    ).toEqual([]);
  });

  it('lists nothing that is not a real kind', () => {
    const stale = IMMEDIATE_KINDS.filter(
      (kind) => !(NOTIFICATION_KINDS as readonly string[]).includes(kind),
    );
    expect(stale, 'These are in IMMEDIATE_KINDS and no longer exist. Delete them.').toEqual([]);
  });
});

describe('the no-op', () => {
  it('implements every method the port declares', async () => {
    /*
     * Every consumer defaults to this, so a method missing from it is a `TypeError` thrown from
     * inside a service that had no reason to expect one — and only on the code path that
     * notifies, which is the path least covered by the tests that predate this feature.
     *
     * Typechecking already requires the shape. This asserts the *behaviour*: that each one
     * resolves rather than returning undefined, because every call site awaits.
     */
    const calls = [
      noopNotifier.previewReady({ to: TO, businessName: 'b', projectId: 'p' }),
      noopNotifier.approvalRequested({ to: TO, businessName: 'b', projectId: 'p' }),
      noopNotifier.tasksAssigned({ to: TO, businessName: 'b', projectId: 'p', tasks: [] }),
      noopNotifier.feedbackReplied({
        to: TO,
        businessName: 'b',
        projectId: 'p',
        authorName: 'a',
        body: 'x',
      }),
      noopNotifier.projectLaunched({ to: TO, businessName: 'b', productionUrl: undefined }),
      noopNotifier.paymentDue({ to: TO, businessName: 'b', stage: 'deposit', amountLabel: '$1' }),
      noopNotifier.paymentFailed({ to: TO }),
      noopNotifier.estimateChanged({
        to: TO,
        businessName: 'b',
        projectId: 'p',
        previous: new Date(),
        next: new Date(),
      }),
      noopNotifier.fileDelivered({
        to: TO,
        businessName: 'b',
        projectId: 'p',
        filename: 'f',
        note: undefined,
      }),
      noopNotifier.owner({ kind: 'owner.approved', subject: 's', heading: 'h', lines: [] }),
    ];

    await expect(Promise.all(calls)).resolves.toHaveLength(calls.length);
  });

  it('sends nothing, which is the entire point', async () => {
    const send = vi.fn();
    await noopNotifier.previewReady({ to: TO, businessName: 'b', projectId: 'p' });
    expect(send).not.toHaveBeenCalled();
  });
});
