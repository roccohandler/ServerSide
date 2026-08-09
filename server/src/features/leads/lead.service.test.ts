import { beforeEach, describe, expect, it } from 'vitest';
import { silentLogger } from '../../lib/logger.js';
import {
  buildValidLeadInput,
  createInMemoryLeadRepository,
  createRecordingEmailService,
  type InMemoryLeadRepository,
  type RecordingEmailService,
} from '../../testing/fakes.js';
import { createLeadService, type LeadService } from './lead.service.js';

describe('createLeadService', () => {
  let repository: InMemoryLeadRepository;
  let emailService: RecordingEmailService;
  let service: LeadService;

  beforeEach(() => {
    repository = createInMemoryLeadRepository();
    emailService = createRecordingEmailService();
    service = createLeadService({
      repository,
      emailService,
      notificationRecipient: 'owner@example.com',
      logger: silentLogger,
    });
  });

  it('stores the lead and notifies the owner', async () => {
    const outcome = await service.submit(buildValidLeadInput());

    expect(outcome.kind).toBe('created');
    expect(repository.leads).toHaveLength(1);
    expect(repository.leads[0]).toMatchObject({
      businessName: 'Cascade Heating & Air',
      status: 'new',
      source: 'website-contact-form',
      notificationStatus: 'sent',
    });

    expect(emailService.sent).toHaveLength(1);
    expect(emailService.sent[0]).toMatchObject({
      to: 'owner@example.com',
      // Replying to the notification reaches the person who submitted it.
      replyTo: 'dana@cascadeheating.example',
    });
    expect(emailService.sent[0]?.subject).toContain('Cascade Heating & Air');
  });

  it('keeps the lead when the notification fails', async () => {
    emailService.failWith(new Error('Resend is unavailable'));

    const outcome = await service.submit(buildValidLeadInput());

    // The visitor's submission is never sacrificed to a provider outage.
    expect(outcome).toMatchObject({ kind: 'created', notification: 'failed' });
    expect(repository.leads).toHaveLength(1);
    // Recorded so a failed delivery can be found and followed up by hand.
    expect(repository.leads[0]?.notificationStatus).toBe('failed');
  });

  it('still stores the lead when the status bookkeeping update also fails', async () => {
    emailService.failWith(new Error('Resend is unavailable'));
    repository.failNextStatusUpdate(new Error('write conflict'));

    const outcome = await service.submit(buildValidLeadInput());

    expect(outcome).toMatchObject({ kind: 'created', notification: 'failed' });
    expect(repository.leads).toHaveLength(1);
  });

  it('propagates a persistence failure instead of pretending the lead was received', async () => {
    repository.failNextCreate(new Error('connection refused'));

    await expect(service.submit(buildValidLeadInput())).rejects.toThrow('connection refused');
    expect(emailService.sent).toHaveLength(0);
  });

  it('discards a honeypot submission without storing or emailing anything', async () => {
    const outcome = await service.submit(buildValidLeadInput({ isBotSubmission: true }));

    expect(outcome).toEqual({ kind: 'discarded', reason: 'honeypot' });
    expect(repository.leads).toHaveLength(0);
    expect(emailService.sent).toHaveLength(0);
  });

  it('ignores an identical resubmission inside the duplicate window', async () => {
    await service.submit(buildValidLeadInput());
    const second = await service.submit(buildValidLeadInput());

    expect(second.kind).toBe('duplicate');
    expect(repository.leads).toHaveLength(1);
    // Only one notification: the owner is not emailed twice for one double-click.
    expect(emailService.sent).toHaveLength(1);
  });

  it('accepts the same person again once the duplicate window has passed', async () => {
    let clock = new Date('2026-01-01T10:00:00.000Z');
    const timeTravellingRepository = createInMemoryLeadRepository({ now: () => clock });
    const windowedService = createLeadService({
      repository: timeTravellingRepository,
      emailService,
      notificationRecipient: 'owner@example.com',
      logger: silentLogger,
      now: () => clock,
      duplicateWindowMs: 10 * 60 * 1000,
    });

    await windowedService.submit(buildValidLeadInput());
    clock = new Date('2026-01-01T10:11:00.000Z');
    const second = await windowedService.submit(buildValidLeadInput());

    expect(second.kind).toBe('created');
    expect(timeTravellingRepository.leads).toHaveLength(2);
  });

  it('treats a different message from the same person as a new lead', async () => {
    await service.submit(buildValidLeadInput());
    const second = await service.submit(
      buildValidLeadInput({ message: 'Actually, can you also set up a quote form?' }),
    );

    expect(second.kind).toBe('created');
    expect(repository.leads).toHaveLength(2);
  });

  it('stores the lead when no notification address is configured', async () => {
    const serviceWithoutRecipient = createLeadService({
      repository,
      emailService,
      notificationRecipient: undefined,
      logger: silentLogger,
    });

    const outcome = await serviceWithoutRecipient.submit(buildValidLeadInput());

    expect(outcome).toMatchObject({ kind: 'created', notification: 'skipped' });
    expect(repository.leads[0]?.notificationStatus).toBe('skipped');
    expect(emailService.sent).toHaveLength(0);
  });

  it('omits optional fields that were not supplied rather than storing empty strings', async () => {
    await service.submit(buildValidLeadInput({ website: undefined, message: undefined }));

    expect(repository.leads[0]).not.toHaveProperty('website');
    expect(repository.leads[0]).not.toHaveProperty('message');
  });
});
