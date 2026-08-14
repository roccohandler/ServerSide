import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../app/app.js';
import { loadServerConfig, type ServerConfig } from '../../config/env.js';
import { AppError } from '../../lib/appError.js';
import { silentLogger } from '../../lib/logger.js';
import {
  buildValidLeadRequestBody,
  createInMemoryLeadRepository,
  createRecordingEmailService,
  type InMemoryLeadRepository,
  type RecordingEmailService,
} from '../../testing/fakes.js';
import { HONEYPOT_FIELD } from './lead.types.js';
import { createLeadService } from './lead.service.js';
import type { LeadRepository } from './lead.repository.js';

/*
 * End-to-end through the real HTTP pipeline — helmet, CORS, body limits, validation,
 * the service, and the central error handler — with only MongoDB and Resend replaced.
 */

const developmentConfig = loadServerConfig({ NODE_ENV: 'development', LOG_LEVEL: 'silent' });

const productionConfig = loadServerConfig({
  NODE_ENV: 'production',
  LOG_LEVEL: 'silent',
  MONGODB_URI: 'mongodb://127.0.0.1:27017/jobforge-test',
  RESEND_API_KEY: 're_test_key',
  RESEND_FROM_EMAIL: 'Leads <leads@example.com>',
  CONTACT_NOTIFICATION_EMAIL: 'owner@example.com',
});

function buildApp(
  options: {
    repository?: LeadRepository;
    emailService?: RecordingEmailService;
    config?: ServerConfig;
    rateLimitEnabled?: boolean;
  } = {},
) {
  const repository = options.repository ?? createInMemoryLeadRepository();
  const emailService = options.emailService ?? createRecordingEmailService();

  return createApp({
    config: options.config ?? developmentConfig,
    logger: silentLogger,
    rateLimitEnabled: options.rateLimitEnabled ?? false,
    leadService: createLeadService({
      repository,
      emailService,
      notificationRecipient: 'owner@example.com',
      logger: silentLogger,
    }),
  });
}

describe('POST /api/leads', () => {
  let repository: InMemoryLeadRepository;
  let emailService: RecordingEmailService;

  beforeEach(() => {
    repository = createInMemoryLeadRepository();
    emailService = createRecordingEmailService();
  });

  it('accepts a valid submission, stores it, and notifies the owner', async () => {
    const app = buildApp({ repository, emailService });

    const response = await request(app).post('/api/leads').send(buildValidLeadRequestBody());

    expect(response.status).toBe(202);
    expect(response.body).toEqual({
      success: true,
      data: { submittedAt: expect.any(String) },
    });
    expect(repository.leads).toHaveLength(1);
    expect(emailService.sent).toHaveLength(1);
  });

  it('returns per-field messages for a submission that is missing required values', async () => {
    const response = await request(buildApp()).post('/api/leads').send({ name: 'Dana' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(Object.keys(response.body.error.fields)).toEqual(
      expect.arrayContaining(['businessName', 'email', 'phone', 'inquiryType']),
    );
  });

  it('rejects a body that is not valid JSON', async () => {
    const response = await request(buildApp())
      .post('/api/leads')
      .set('Content-Type', 'application/json')
      .send('{"name": ');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('MALFORMED_REQUEST');
  });

  it('rejects a body larger than the configured limit', async () => {
    const response = await request(buildApp())
      .post('/api/leads')
      .send(buildValidLeadRequestBody({ message: 'x'.repeat(20_000) }));

    expect(response.status).toBe(413);
    expect(response.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('answers a honeypot submission exactly like a real one, but stores nothing', async () => {
    const app = buildApp({ repository, emailService });

    const real = await request(app).post('/api/leads').send(buildValidLeadRequestBody());
    const bot = await request(app)
      .post('/api/leads')
      .send(
        buildValidLeadRequestBody({
          email: 'bot@spam.example',
          [HONEYPOT_FIELD]: 'http://spam.example',
        }),
      );

    expect(bot.status).toBe(real.status);
    expect(Object.keys(bot.body)).toEqual(Object.keys(real.body));
    expect(repository.leads).toHaveLength(1);
    expect(repository.leads[0]?.email).not.toBe('bot@spam.example');
  });

  it('tells the visitor to call when persistence is unavailable', async () => {
    const unavailable: LeadRepository = {
      create: () => Promise.reject(new AppError('SERVICE_UNAVAILABLE', 'We could not save that.')),
      findRecentDuplicate: () =>
        Promise.reject(new AppError('SERVICE_UNAVAILABLE', 'We could not save that.')),
      updateNotificationStatus: () => Promise.resolve(),
    };

    const response = await request(buildApp({ repository: unavailable }))
      .post('/api/leads')
      .send(buildValidLeadRequestBody());

    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe('SERVICE_UNAVAILABLE');
  });

  it('never leaks internal failure detail in production', async () => {
    const exploding: LeadRepository = {
      create: () => Promise.reject(new Error('mongodb://user:hunter2@cluster0/jobforge failed')),
      findRecentDuplicate: () => Promise.resolve(null),
      updateNotificationStatus: () => Promise.resolve(),
    };

    const response = await request(buildApp({ repository: exploding, config: productionConfig }))
      .post('/api/leads')
      .send(buildValidLeadRequestBody());

    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe('INTERNAL_ERROR');
    expect(response.body.error).not.toHaveProperty('debug');

    const serialised = JSON.stringify(response.body);
    expect(serialised).not.toContain('hunter2');
    expect(serialised).not.toContain('mongodb://');
    expect(serialised).not.toContain('at ');
  });

  it('includes debug detail for unexpected errors in development only', async () => {
    const exploding: LeadRepository = {
      create: () => Promise.reject(new Error('boom')),
      findRecentDuplicate: () => Promise.resolve(null),
      updateNotificationStatus: () => Promise.resolve(),
    };

    const response = await request(buildApp({ repository: exploding }))
      .post('/api/leads')
      .send(buildValidLeadRequestBody());

    expect(response.status).toBe(500);
    expect(response.body.error.debug?.message).toBe('boom');
  });

  it('rate limits repeated submissions from the same connection', async () => {
    const config = loadServerConfig({
      NODE_ENV: 'development',
      LOG_LEVEL: 'silent',
      LEAD_RATE_LIMIT_MAX: '2',
      LEAD_RATE_LIMIT_WINDOW_MINUTES: '15',
    });
    const app = buildApp({ repository, emailService, config, rateLimitEnabled: true });

    const statuses: number[] = [];
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await request(app)
        .post('/api/leads')
        .send(buildValidLeadRequestBody({ email: `owner${attempt}@example.com` }));
      statuses.push(response.status);
    }

    expect(statuses).toEqual([202, 202, 429]);
    expect(repository.leads).toHaveLength(2);
  });

  it('sets a correlation id the visitor can quote when reporting a problem', async () => {
    const response = await request(buildApp()).post('/api/leads').send(buildValidLeadRequestBody());

    expect(response.headers['x-request-id']).toBeTruthy();
  });
});

describe('the API surface', () => {
  it('reports health', async () => {
    const response = await request(buildApp()).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ success: true, data: { status: 'ok' } });
  });

  it('withholds configuration detail from the production health check', async () => {
    const response = await request(buildApp({ config: productionConfig })).get('/api/health');

    expect(response.body.data).toEqual({ status: 'ok' });
  });

  it('returns the standard envelope for unknown routes', async () => {
    const response = await request(buildApp()).get('/api/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ success: false, error: { code: 'NOT_FOUND' } });
  });

  it('sets hardening headers and hides the server technology', async () => {
    const response = await request(buildApp()).get('/api/health');

    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['content-security-policy']).toContain("default-src 'none'");
  });

  it('does not grant CORS access to an origin that is not on the allow list', async () => {
    const response = await request(buildApp())
      .get('/api/health')
      .set('Origin', 'https://attacker.example');

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('grants CORS access to a configured origin', async () => {
    const config = loadServerConfig({
      NODE_ENV: 'development',
      LOG_LEVEL: 'silent',
      CLIENT_ORIGIN: 'https://www.example.com',
    });

    const response = await request(buildApp({ config }))
      .get('/api/health')
      .set('Origin', 'https://www.example.com');

    expect(response.headers['access-control-allow-origin']).toBe('https://www.example.com');
  });
});
