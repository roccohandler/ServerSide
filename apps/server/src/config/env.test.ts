import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DOTENV_PATHS, EnvironmentConfigError, loadServerConfig } from './env.js';

const productionEnv = {
  NODE_ENV: 'production',
  MONGODB_URI: 'mongodb://127.0.0.1:27017/jobforge',
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
    expect(config.trustProxyHops).toBe(0);

    /*
     * Both dev servers, with nothing configured. This used to be `[]`, and that empty list
     * was why the owner console could not sign in on a developer's machine: cookies ignore
     * the port, so a session set by the customer app on :5173 is sent to the console on
     * :5174, the CSRF guard engages on the very first sign-in, and the origin was in no
     * list. Nothing was misconfigured and there was nothing to configure.
     */
    expect(config.cors.allowedOrigins).toEqual(['http://localhost:5173', 'http://localhost:5174']);
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

  describe('the CORS and CSRF allow list', () => {
    it('parses a comma separated list and strips trailing slashes', () => {
      const config = loadServerConfig({
        ...productionEnv,
        CLIENT_ORIGIN: 'https://www.example.com/, https://admin.example.com ,',
      });

      expect(config.cors.allowedOrigins).toEqual([
        'https://www.example.com',
        'https://admin.example.com',
      ]);
    });

    it('is exactly what CLIENT_ORIGIN says in production — nothing is merged in', () => {
      const config = loadServerConfig({
        ...productionEnv,
        VITE_SITE_URL: 'https://www.example.com',
        CLIENT_ORIGIN: 'https://console.example.com',
      });

      /*
       * The site's own origin is *not* added. A deployment that serves the API and the site
       * from one host needs no CORS entry for itself, and an allowlist that quietly contains
       * more than the environment states is one nobody thinks to audit.
       */
      expect(config.cors.allowedOrigins).toEqual(['https://console.example.com']);
    });

    it('falls back to the conventional admin subdomain when CLIENT_ORIGIN is unset', () => {
      const config = loadServerConfig({
        ...productionEnv,
        VITE_SITE_URL: 'https://www.example.com',
      });

      /*
       * Not a guess about an unrelated domain: DECISION 027.4 requires the console to be a
       * subdomain of the API's registrable domain regardless, because the session cookie is
       * `SameSite=Lax`. This names the conventional one so a first deployment works.
       */
      expect(config.cors.allowedOrigins).toEqual([
        'https://www.example.com',
        'https://admin.example.com',
      ]);
    });

    it('lands on the same console host whether or not the site uses www', () => {
      const withWww = loadServerConfig({
        ...productionEnv,
        VITE_SITE_URL: 'https://www.example.com',
      });
      const bare = loadServerConfig({ ...productionEnv, VITE_SITE_URL: 'https://example.com' });

      /* Two spellings of one site must not imply two different consoles. */
      expect(withWww.cors.allowedOrigins).toContain('https://admin.example.com');
      expect(bare.cors.allowedOrigins).toContain('https://admin.example.com');
    });

    it('refuses a wildcard at boot rather than failing closed in silence', () => {
      /*
       * Passing `*` through would have been safe — it matches no `Origin` header — and that
       * is exactly the problem: the deployment breaks with an allowlist that reads as though
       * it permits everything. This says so while somebody is still looking.
       */
      expect(() => loadServerConfig({ ...productionEnv, CLIENT_ORIGIN: '*' })).toThrowError(
        EnvironmentConfigError,
      );

      expect(() =>
        loadServerConfig({ ...productionEnv, CLIENT_ORIGIN: 'https://www.example.com, *' }),
      ).toThrowError(EnvironmentConfigError);
    });

    it('never produces anything that is not an origin', () => {
      for (const env of [{}, productionEnv, { ...productionEnv, CLIENT_ORIGIN: '  ,  ,' }]) {
        const origins = loadServerConfig(env as NodeJS.ProcessEnv).cors.allowedOrigins;

        expect(origins).not.toContain('*');
        for (const origin of origins) expect(origin.startsWith('http')).toBe(true);
      }
    });

    it('adds nothing beyond the site itself when the site URL cannot be parsed', () => {
      const config = loadServerConfig({ ...productionEnv, VITE_SITE_URL: 'not-a-url' });

      /* Better to allow nothing extra than to allow something wrong. */
      expect(config.cors.allowedOrigins).toEqual(['not-a-url']);
    });
  });

  it('treats empty strings as unset so a blank Vercel variable does not look configured', () => {
    const config = loadServerConfig({ MONGODB_URI: '', RESEND_API_KEY: '' });

    expect(config.database.enabled).toBe(false);
    expect(config.email.enabled).toBe(false);
  });

  /*
   * NODE_ENV cannot be set as a build-time variable on Vercel — npm would omit the
   * devDependencies the build needs. These cover the fallback that keeps a deployment
   * in production mode anyway.
   */
  describe('when NODE_ENV is absent but Vercel is', () => {
    it('runs in production mode on a production deployment', () => {
      const config = loadServerConfig({
        ...productionEnv,
        NODE_ENV: undefined,
        VERCEL_ENV: 'production',
      });

      expect(config.nodeEnv).toBe('production');
      expect(config.isProduction).toBe(true);
    });

    it('runs in production mode on a preview deployment, which is also public', () => {
      const config = loadServerConfig({
        ...productionEnv,
        NODE_ENV: undefined,
        VERCEL_ENV: 'preview',
      });

      expect(config.isProduction).toBe(true);
    });

    it('still demands the production variables, rather than degrading quietly', () => {
      expect(() => loadServerConfig({ VERCEL_ENV: 'production' })).toThrowError(
        EnvironmentConfigError,
      );
    });

    it('leaves `vercel dev` in development mode', () => {
      expect(loadServerConfig({ VERCEL_ENV: 'development' }).isProduction).toBe(false);
    });

    it('lets an explicit NODE_ENV win over the Vercel fallback', () => {
      expect(loadServerConfig({ NODE_ENV: 'test', VERCEL_ENV: 'production' }).nodeEnv).toBe('test');
    });
  });

  it('treats a blank NODE_ENV as unset instead of failing to parse', () => {
    expect(loadServerConfig({ NODE_ENV: '' }).nodeEnv).toBe('development');
  });

  it('rejects a misspelled NODE_ENV rather than silently defaulting', () => {
    expect(() => loadServerConfig({ NODE_ENV: 'prod' })).toThrowError(EnvironmentConfigError);
  });

  it('converts the rate limit window from minutes to milliseconds', () => {
    const config = loadServerConfig({
      LEAD_RATE_LIMIT_WINDOW_MINUTES: '10',
      LEAD_RATE_LIMIT_MAX: '3',
    });

    expect(config.rateLimit).toEqual({ windowMs: 600_000, max: 3 });
  });
});

/*
 * ============================================================================
 * THE `.env` SEARCH PATH REACHES THE REPOSITORY ROOT
 * ============================================================================
 *
 * A regression test for a failure that produced no error anywhere.
 *
 * The list was `['.env', '../.env']`, written when the server lived at `server/`. DECISION
 * 026 moved it to `apps/server/`, so `../.env` became `apps/.env` — a path that has never
 * existed — and from that commit the server ran in development with no `MONGODB_URI`, no
 * Resend key and no notification address, while the two Vite apps read the root `.env`
 * correctly through their `envDir`. Signing in to the owner console answered "We cannot
 * reach our records right now" with a correct password and a healthy database.
 *
 * So the assertion is not about the *contents* of the list. It is the property that broke:
 * resolved from the server workspace, one of these paths has to land on the directory
 * holding the repository's own `package.json`. That stays true if the workspace moves again
 * only if somebody updates the list, which is the point.
 * ============================================================================
 */
describe('the dotenv search path', () => {
  const workspace = resolve(import.meta.dirname, '../..');

  it('includes the repository root, resolved from the server workspace', () => {
    const roots = DOTENV_PATHS.map((path) => dirname(resolve(workspace, path)));
    const repositoryRoot = roots.find((candidate) =>
      existsSync(join(candidate, 'package-lock.json')),
    );

    expect(repositoryRoot, `none of ${roots.join(', ')} is the repository root`).toBeDefined();
  });

  it('looks in the workspace before the directories above it', () => {
    /* dotenv never overrides a variable that is already set, so first match wins. A
     * workspace-local `.env` has to keep beating the shared one at the root. */
    expect(DOTENV_PATHS[0]).toBe('.env');
  });
});
