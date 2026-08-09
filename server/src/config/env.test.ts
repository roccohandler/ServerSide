import { describe, expect, it } from 'vitest';
import { EnvironmentConfigError, loadServerConfig } from './env.js';

const productionEnv = {
  NODE_ENV: 'production',
  MONGODB_URI: 'mongodb://127.0.0.1:27017/serviceside',
  RESEND_API_KEY: 're_test_key',
  RESEND_FROM_EMAIL: 'Leads <leads@example.com>',
  CONTACT_NOTIFICATION_EMAIL: 'owner@example.com',
} satisfies NodeJS.ProcessEnv;

describe('loadServerConfig', () => {
  it('applies safe defaults when nothing is configured', () => {
    const config = loadServerConfig({});

    expect(config.nodeEnv).toBe('development');
    expect(config.port).toBe(5000);
    expect(config.database.enabled).toBe(false);
    expect(config.email.enabled).toBe(false);
    expect(config.cors.allowedOrigins).toEqual([]);
    expect(config.trustProxyHops).toBe(0);
  });

  it('fails with every missing production variable listed at once', () => {
    expect(() => loadServerConfig({ NODE_ENV: 'production' })).toThrowError(EnvironmentConfigError);

    try {
      loadServerConfig({ NODE_ENV: 'production' });
      expect.unreachable('expected loadServerConfig to throw');
    } catch (error) {
      const problems = (error as EnvironmentConfigError).problems.join('\n');
      expect(problems).toContain('MONGODB_URI');
      expect(problems).toContain('RESEND_API_KEY');
      expect(problems).toContain('RESEND_FROM_EMAIL');
      expect(problems).toContain('CONTACT_NOTIFICATION_EMAIL');
    }
  });

  it('accepts a complete production configuration and trusts exactly one proxy hop', () => {
    const config = loadServerConfig(productionEnv);

    expect(config.isProduction).toBe(true);
    expect(config.database.enabled).toBe(true);
    expect(config.email.enabled).toBe(true);
    expect(config.trustProxyHops).toBe(1);
  });

  it('rejects a malformed port instead of silently falling back', () => {
    expect(() => loadServerConfig({ PORT: 'not-a-port' })).toThrowError(EnvironmentConfigError);
  });

  it('parses a comma separated CORS allow list and strips trailing slashes', () => {
    const config = loadServerConfig({
      CLIENT_ORIGIN: 'http://localhost:5173, https://www.example.com/ ,',
    });

    expect(config.cors.allowedOrigins).toEqual([
      'http://localhost:5173',
      'https://www.example.com',
    ]);
  });

  it('treats empty strings as unset so a blank Vercel variable does not look configured', () => {
    const config = loadServerConfig({ MONGODB_URI: '', RESEND_API_KEY: '' });

    expect(config.database.enabled).toBe(false);
    expect(config.email.enabled).toBe(false);
  });

  it('converts the rate limit window from minutes to milliseconds', () => {
    const config = loadServerConfig({
      LEAD_RATE_LIMIT_WINDOW_MINUTES: '10',
      LEAD_RATE_LIMIT_MAX: '3',
    });

    expect(config.rateLimit).toEqual({ windowMs: 600_000, max: 3 });
  });
});
