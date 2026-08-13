import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../app/app.js';
import { loadServerConfig } from '../../config/env.js';
import { silentLogger } from '../../lib/logger.js';
import {
  createInMemorySubscriberRepository,
  createRecordingEmailService,
  type InMemorySubscriberRepository,
  type RecordingEmailService,
} from '../../testing/fakes.js';
import { HONEYPOT_FIELD } from '../leads/lead.types.js';
import { createSubscriberService } from './subscriber.service.js';
import { PLAYBOOK_CONSENT_TEXT } from './subscriber.types.js';

/*
 * End-to-end through the real HTTP pipeline, with only MongoDB and Resend replaced.
 */

const developmentConfig = loadServerConfig({ NODE_ENV: 'development', LOG_LEVEL: 'silent' });

/**
 * With `PLAYBOOK_PDF_URL` set, the workbook is emailed automatically and the response
 * says `delivery: "sent"`. Without it, the owner is notified and the response says
 * `"queued"` — which is what the page's confirmation copy is chosen from.
 */
const deliveringConfig = loadServerConfig({
  NODE_ENV: 'development',
  LOG_LEVEL: 'silent',
  PLAYBOOK_PDF_URL: 'https://example.com/playbook.pdf',
});

function buildApp(options: {
  repository: InMemorySubscriberRepository;
  emailService: RecordingEmailService;
  rateLimitEnabled?: boolean;
  autoSend?: boolean;
}) {
  const config = options.autoSend ? deliveringConfig : developmentConfig;

  return createApp({
    config,
    logger: silentLogger,
    rateLimitEnabled: options.rateLimitEnabled ?? false,
    subscriberService: createSubscriberService({
      repository: options.repository,
      emailService: options.emailService,
      notificationRecipient: 'owner@example.com',
      consentText: PLAYBOOK_CONSENT_TEXT,
      pdfUrl: config.playbook.pdfUrl,
      logger: silentLogger,
    }),
  });
}

describe('POST /api/subscribers', () => {
  let repository: InMemorySubscriberRepository;
  let emailService: RecordingEmailService;

  beforeEach(() => {
    repository = createInMemorySubscriberRepository();
    emailService = createRecordingEmailService();
  });

  it('accepts a request, stores it, and notifies the owner', async () => {
    const app = buildApp({ repository, emailService });

    const response = await request(app)
      .post('/api/subscribers')
      .send({ email: 'dana@example.com' });

    expect(response.status).toBe(202);
    expect(response.body.success).toBe(true);
    expect(typeof response.body.data.requestedAt).toBe('string');

    expect(repository.subscribers).toHaveLength(1);
    expect(emailService.sent).toHaveLength(1);
  });

  /*
   * The client picks its confirmation from this field. If it were wrong, the page would
   * tell somebody to check an inbox nothing was filling — the one failure this whole
   * flow exists to prevent.
   */
  it('reports that the request is queued when no workbook is hosted', async () => {
    const app = buildApp({ repository, emailService });

    const response = await request(app)
      .post('/api/subscribers')
      .send({ email: 'dana@example.com' });

    expect(response.body.data.delivery).toBe('queued');
    // The owner is notified, not the subscriber.
    expect(emailService.sent[0]?.to).toBe('owner@example.com');
  });

  it('reports an automatic send once a workbook is hosted', async () => {
    const app = buildApp({ repository, emailService, autoSend: true });

    const response = await request(app)
      .post('/api/subscribers')
      .send({ email: 'dana@example.com' });

    expect(response.body.data.delivery).toBe('sent');
    expect(emailService.sent[0]?.to).toBe('dana@example.com');
    expect(emailService.sent[0]?.text).toContain('https://example.com/playbook.pdf');
  });

  it('rejects an invalid address with per-field messages', async () => {
    const app = buildApp({ repository, emailService });

    const response = await request(app).post('/api/subscribers').send({ email: 'not-an-email' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.fields.email).toBeTruthy();
    expect(repository.subscribers).toHaveLength(0);
  });

  it('rejects unknown keys', async () => {
    const app = buildApp({ repository, emailService });

    const response = await request(app)
      .post('/api/subscribers')
      .send({ email: 'dana@example.com', addToNewsletter: true });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('MALFORMED_REQUEST');
  });

  /*
   * The three accepted outcomes must be indistinguishable from outside. Otherwise the
   * response tells a script which trick worked — and tells anybody with a list of
   * addresses which of them already subscribed.
   */
  it('answers a caught bot exactly as it answers a real request', async () => {
    const app = buildApp({ repository, emailService });

    const real = await request(app).post('/api/subscribers').send({ email: 'dana@example.com' });
    const bot = await request(app)
      .post('/api/subscribers')
      .send({ email: 'bot@example.com', [HONEYPOT_FIELD]: 'Acme Corp' });

    expect(bot.status).toBe(real.status);
    expect(Object.keys(bot.body.data)).toEqual(Object.keys(real.body.data));

    // One stored, one silently discarded.
    expect(repository.subscribers).toHaveLength(1);
    expect(repository.subscribers[0]?.email).toBe('dana@example.com');
  });

  it('answers a repeat request exactly as it answers the first one', async () => {
    const app = buildApp({ repository, emailService });

    const first = await request(app).post('/api/subscribers').send({ email: 'dana@example.com' });
    const second = await request(app).post('/api/subscribers').send({ email: 'dana@example.com' });

    expect(second.status).toBe(first.status);
    expect(repository.subscribers).toHaveLength(1);
    expect(emailService.sent).toHaveLength(1);
  });

  it('rate limits repeated requests from one connection', async () => {
    const app = buildApp({ repository, emailService, rateLimitEnabled: true });

    let lastStatus = 0;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const response = await request(app)
        .post('/api/subscribers')
        .send({ email: `person${attempt}@example.com` });
      lastStatus = response.status;
      if (lastStatus === 429) break;
    }

    expect(lastStatus).toBe(429);
  });
});
