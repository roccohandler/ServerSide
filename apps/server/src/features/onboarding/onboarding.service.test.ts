import { describe, expect, it } from 'vitest';
import { silentLogger } from '../../lib/logger.js';
import { createInMemoryOnboardingRepository } from '../../testing/authFakes.js';
import { createRecordingEmailService } from '../../testing/fakes.js';
import { parseOnboardingRequest } from './onboarding.schema.js';
import { createOnboardingService } from './onboarding.service.js';

const VALID_BODY = {
  businessName: 'Cascade Heating & Air',
  contactName: 'Dana Reyes',
  email: 'Dana@Cascadeheating.example',
  phone: '(206) 555-0134',
  services: 'Furnace repair, AC install, heat pumps',
  serviceAreas: 'Seattle, Bellevue, Renton',
  photosNote: 'Will email a dozen phone photos of finished installs.',
};

describe('the onboarding schema', () => {
  it('accepts a valid submission and normalises the email', () => {
    const input = parseOnboardingRequest(VALID_BODY);

    expect(input.email).toBe('dana@cascadeheating.example');
    expect(input.isBotSubmission).toBe(false);
  });

  it('rejects a submission missing the facts a build cannot start without', () => {
    expect(() => parseOnboardingRequest({ ...VALID_BODY, services: '' })).toThrowError(
      /highlighted fields/,
    );
  });

  it('rejects unrecognised keys as malformed rather than half-understood', () => {
    expect(() => parseOnboardingRequest({ ...VALID_BODY, admin: true })).toThrowError(
      /could not be read/,
    );
  });
});

describe('the onboarding service', () => {
  it('stores the submission and notifies the owner with a reply-to', async () => {
    const repository = createInMemoryOnboardingRepository();
    const emailService = createRecordingEmailService();
    const service = createOnboardingService({
      repository,
      emailService,
      notificationRecipient: 'owner@example.com',
      logger: silentLogger,
    });

    const outcome = await service.submit(parseOnboardingRequest(VALID_BODY));

    expect(outcome.kind).toBe('created');
    expect(repository.records).toHaveLength(1);
    expect(emailService.sent).toHaveLength(1);
    expect(emailService.sent[0]?.replyTo).toBe('dana@cascadeheating.example');
  });

  it('discards a honeypot submission without storing or sending anything', async () => {
    const repository = createInMemoryOnboardingRepository();
    const emailService = createRecordingEmailService();
    const service = createOnboardingService({
      repository,
      emailService,
      notificationRecipient: 'owner@example.com',
      logger: silentLogger,
    });

    const outcome = await service.submit(
      parseOnboardingRequest({ ...VALID_BODY, companyFax: 'bot' }),
    );

    expect(outcome.kind).toBe('discarded');
    expect(repository.records).toHaveLength(0);
    expect(emailService.sent).toHaveLength(0);
  });

  it('keeps the submission when the notification email fails', async () => {
    const repository = createInMemoryOnboardingRepository();
    const emailService = createRecordingEmailService();
    emailService.failWith(new Error('Resend is down'));
    const service = createOnboardingService({
      repository,
      emailService,
      notificationRecipient: 'owner@example.com',
      logger: silentLogger,
    });

    const outcome = await service.submit(parseOnboardingRequest(VALID_BODY));

    expect(outcome.kind).toBe('created');
    expect(repository.records).toHaveLength(1);
  });
});
