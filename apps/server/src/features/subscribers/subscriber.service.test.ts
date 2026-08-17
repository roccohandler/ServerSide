import { beforeEach, describe, expect, it } from 'vitest';
import { silentLogger } from '../../lib/logger.js';
import {
  buildValidSubscriberInput,
  createInMemorySubscriberRepository,
  createRecordingEmailService,
  type InMemorySubscriberRepository,
  type RecordingEmailService,
} from '../../testing/fakes.js';
import { createSubscriberService, type SubscriberService } from './subscriber.service.js';
import { PLAYBOOK_CONSENT_TEXT } from './subscriber.types.js';

describe('createSubscriberService', () => {
  let repository: InMemorySubscriberRepository;
  let emailService: RecordingEmailService;
  let service: SubscriberService;

  beforeEach(() => {
    repository = createInMemorySubscriberRepository();
    emailService = createRecordingEmailService();
    service = createSubscriberService({
      repository,
      emailService,
      notificationRecipient: 'owner@example.com',
      consentText: PLAYBOOK_CONSENT_TEXT,
      logger: silentLogger,
    });
  });

  it('stores the request and notifies the owner', async () => {
    const outcome = await service.subscribe(buildValidSubscriberInput());

    expect(outcome.kind).toBe('created');
    expect(repository.subscribers).toHaveLength(1);
    expect(repository.subscribers[0]).toMatchObject({
      email: 'dana@cascadeheating.example',
      asset: 'playbook-workbook',
      source: 'playbook-page',
      notificationStatus: 'sent',
    });

    expect(emailService.sent).toHaveLength(1);
    expect(emailService.sent[0]).toMatchObject({
      to: 'owner@example.com',
      // Replying to the notification reaches the person who asked for it.
      replyTo: 'dana@cascadeheating.example',
    });
  });

  /*
   * Consent is only worth storing alongside what was actually promised. A boolean saying
   * "they agreed" is close to worthless a year later when the wording has changed twice.
   */
  it('records what the subscriber was shown when they consented', async () => {
    await service.subscribe(buildValidSubscriberInput());

    const stored = repository.subscribers[0];
    expect(stored?.consentText).toBe(PLAYBOOK_CONSENT_TEXT);
    expect(stored?.consentedAt).toBeInstanceOf(Date);
  });

  it('discards a honeypot submission without storing or sending anything', async () => {
    const outcome = await service.subscribe(buildValidSubscriberInput({ isBotSubmission: true }));

    expect(outcome.kind).toBe('discarded');
    expect(repository.subscribers).toHaveLength(0);
    expect(emailService.sent).toHaveLength(0);
  });

  /*
   * Somebody who asks twice in a fortnight has lost the first email, not double-clicked.
   * Either way the right answer is one record and one notification.
   */
  it('treats a repeat request inside the window as the same request', async () => {
    await service.subscribe(buildValidSubscriberInput());
    const outcome = await service.subscribe(buildValidSubscriberInput());

    expect(outcome.kind).toBe('duplicate');
    expect(repository.subscribers).toHaveLength(1);
    expect(emailService.sent).toHaveLength(1);
  });

  it('accepts the same address again once the window has passed', async () => {
    // The repository shares the clock, or the stored `createdAt` would be the real time
    // and the window comparison would be meaningless.
    let clock = new Date('2026-01-01T09:00:00.000Z');
    const clocked = createInMemorySubscriberRepository({ now: () => clock });
    const windowed = createSubscriberService({
      repository: clocked,
      emailService,
      notificationRecipient: 'owner@example.com',
      consentText: PLAYBOOK_CONSENT_TEXT,
      logger: silentLogger,
      now: () => clock,
      subscriptionWindowMs: 60_000,
    });

    await windowed.subscribe(buildValidSubscriberInput());
    clock = new Date('2026-01-01T09:05:00.000Z');
    const outcome = await windowed.subscribe(buildValidSubscriberInput());

    expect(outcome.kind).toBe('created');
    expect(clocked.subscribers).toHaveLength(2);
  });

  /*
   * Persist first, notify second — the same tradeoff the lead service makes. The record
   * is the asset: a failed notification is recoverable from a query, a lost record is not.
   */
  it('keeps the record when the notification fails', async () => {
    emailService.failWith(new Error('Resend is down'));

    const outcome = await service.subscribe(buildValidSubscriberInput());

    expect(outcome.kind).toBe('created');
    expect(repository.subscribers).toHaveLength(1);
    expect(repository.subscribers[0]?.notificationStatus).toBe('failed');
  });

  it('still stores the request when no notification address is configured', async () => {
    const unnotified = createSubscriberService({
      repository,
      emailService,
      notificationRecipient: undefined,
      consentText: PLAYBOOK_CONSENT_TEXT,
      logger: silentLogger,
    });

    const outcome = await unnotified.subscribe(buildValidSubscriberInput());

    expect(outcome.kind).toBe('created');
    expect(repository.subscribers[0]?.notificationStatus).toBe('skipped');
    expect(emailService.sent).toHaveLength(0);
  });

  /* ---------------------------------------------------------------- delivery */

  /*
   * The switch. With a hosted workbook the subscriber is emailed directly; without one
   * the owner is told and sends it. There is deliberately no third path, because the
   * third path is emailing somebody a link to a file that does not exist.
   */
  describe('when the workbook is hosted', () => {
    const PDF_URL = 'https://example.com/playbook.pdf';

    function createDelivering() {
      return createSubscriberService({
        repository,
        emailService,
        notificationRecipient: 'owner@example.com',
        consentText: PLAYBOOK_CONSENT_TEXT,
        pdfUrl: PDF_URL,
        logger: silentLogger,
      });
    }

    it('emails the subscriber the workbook rather than notifying the owner', async () => {
      const outcome = await createDelivering().subscribe(buildValidSubscriberInput());

      expect(outcome.kind).toBe('created');
      expect(emailService.sent).toHaveLength(1);

      const sent = emailService.sent[0];
      expect(sent?.to).toBe('dana@cascadeheating.example');
      expect(sent?.text).toContain(PDF_URL);
      expect(sent?.html).toContain(PDF_URL);
    });

    it('lets the subscriber reply to a human', async () => {
      await createDelivering().subscribe(buildValidSubscriberInput());
      expect(emailService.sent[0]?.replyTo).toBe('owner@example.com');
    });

    it('records the send, and keeps the record when it fails', async () => {
      emailService.failWith(new Error('Resend is down'));

      const outcome = await createDelivering().subscribe(buildValidSubscriberInput());

      expect(outcome.kind).toBe('created');
      expect(repository.subscribers).toHaveLength(1);
      expect(repository.subscribers[0]?.notificationStatus).toBe('failed');
    });

    /*
     * The delivery email is the first thing a stranger receives from this business. One
     * mention of the paid service at the end is the whole allowance — anything more makes
     * the free resource read as the advert it is not.
     */
    it('does not turn the delivery email into a sales pitch', async () => {
      await createDelivering().subscribe(buildValidSubscriberInput());

      const body = emailService.sent[0]?.text ?? '';
      /*
       * Counted on the name the offer actually has.
       *
       * This counted "free review" — the old name — so once the client renamed the offer
       * to "assessment" the assertion was satisfied by the phrase being absent altogether.
       * A cap that passes because it is looking for the wrong words is not a cap.
       */
      expect(body.toLowerCase().split('free assessment').length - 1).toBeLessThanOrEqual(1);
      expect(body.toLowerCase()).not.toContain('free review');
      expect(body).not.toMatch(/\$\d/);
      expect(body).not.toMatch(/guaranteed/i);
    });

    /*
     * The two bodies of one email have to name the offer the same way.
     *
     * They did not: the text part said "the free review" and the HTML part said "the free
     * assessment", in what is otherwise the same sentence. Which one a subscriber reads
     * depends on their mail client, and nothing in either test suite compared them —
     * because each body was only ever asserted against on its own.
     */
    it('names the offer the same way in both bodies', async () => {
      await createDelivering().subscribe(buildValidSubscriberInput());

      const sent = emailService.sent[0];
      const text = (sent?.text ?? '').toLowerCase().replace(/\s+/g, ' ');
      const html = (sent?.html ?? '')
        .toLowerCase()
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ');

      expect(text).toContain('free assessment');
      expect(html).toContain('free assessment');
    });
  });

  it('propagates a storage failure rather than claiming success', async () => {
    repository.failNextCreate(new Error('mongo is unreachable'));

    await expect(service.subscribe(buildValidSubscriberInput())).rejects.toThrow(
      'mongo is unreachable',
    );
    expect(emailService.sent).toHaveLength(0);
  });

  it('does not let a bookkeeping failure fail the request', async () => {
    repository.failNextStatusUpdate(new Error('update failed'));

    const outcome = await service.subscribe(buildValidSubscriberInput());

    expect(outcome.kind).toBe('created');
    expect(emailService.sent).toHaveLength(1);
  });
});
