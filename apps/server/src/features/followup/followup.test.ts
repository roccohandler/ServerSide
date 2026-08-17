import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  createPlatformHarness,
  TEST_ORIGIN,
  type PlatformHarness,
} from '../../testing/platformApp.js';
import { FOLLOWUP_CAP, FOLLOWUP_RULES, ruleFor, type FollowUpCandidate } from './followup.types.js';

/*
 * ============================================================================
 * FOLLOW-UP
 * ============================================================================
 *
 * Two halves, and they are tested differently on purpose.
 *
 * **The rules** are a pure function over a candidate and a set of keys, so they are tested as
 * one — no harness, no clock, no database. That is the whole reason `ruleFor` is separated
 * from every repository: an argument about *when we email people* should be settleable by
 * reading one function and the cases below, rather than by reasoning about a query.
 *
 * **Everything else** goes through the real pipeline, because the properties that matter are
 * about a scheduled job that runs unattended: it must not email the same person twice, must
 * not email somebody who said stop, and must not exist at all on a deployment that has not
 * switched it on.
 * ============================================================================
 */

const PASSCODE_ENV = {
  UNSUBSCRIBE_SECRET: 'a-long-enough-signing-secret',
  CRON_SECRET: 'cron-key',
};

const DAY = 86_400_000;
const NOW = new Date('2026-08-17T09:00:00.000Z');

function candidate(overrides: Partial<FollowUpCandidate> = {}): FollowUpCandidate {
  return {
    userId: 'user-1',
    email: 'dana@example.test',
    name: 'Dana Whitfield',
    createdAt: new Date(NOW.getTime() - 5 * DAY),
    hasRequested: false,
    hasPurchased: false,
    ...overrides,
  };
}

const pick = (c: FollowUpCandidate, sent: readonly string[] = []) =>
  ruleFor({ candidate: c, alreadySent: new Set(sent), now: NOW })?.key ?? null;

describe('which rule applies', () => {
  it('says nothing on the day somebody signs up', () => {
    expect(pick(candidate({ createdAt: NOW }))).toBeNull();
  });

  it('nudges an account that has asked for nothing, oldest rule first', () => {
    const fresh = candidate({ createdAt: new Date(NOW.getTime() - 2 * DAY) });
    expect(pick(fresh)).toBe('no-request-day-1');

    /*
     * Still the day-1 message for somebody a fortnight quiet who has never been written to.
     * The earliest applicable rule rather than the latest, so the sequence reads as a
     * sequence rather than as a system that has just noticed them.
     */
    const stale = candidate({ createdAt: new Date(NOW.getTime() - 12 * DAY) });
    expect(pick(stale)).toBe('no-request-day-1');
    expect(pick(stale, ['no-request-day-1'])).toBe('no-request-day-4');
  });

  it('moves to the other track the moment they ask for something', () => {
    const asked = candidate({
      createdAt: new Date(NOW.getTime() - 5 * DAY),
      hasRequested: true,
    });
    expect(pick(asked)).toBe('no-purchase-day-3');
  });

  it('stops completely once somebody has bought', () => {
    expect(
      pick(candidate({ createdAt: new Date(NOW.getTime() - 12 * DAY), hasPurchased: true })),
    ).toBeNull();
  });

  it('never sends a third, whichever two they were', () => {
    /*
     * The mixed case, and the reason the cap is enforced outside the table: nudged on day 1
     * while they had asked for nothing, they then request, which puts them in a track with two
     * more rules in it. Four rules exist; two is the most anybody can receive.
     */
    const crossed = candidate({
      createdAt: new Date(NOW.getTime() - 12 * DAY),
      hasRequested: true,
    });

    expect(pick(crossed, ['no-request-day-1'])).toBe('no-purchase-day-3');
    expect(pick(crossed, ['no-request-day-1', 'no-purchase-day-3'])).toBeNull();
    expect(FOLLOWUP_CAP).toBe(2);
  });

  it('has a unique key on every rule', () => {
    /*
     * The keys are the idempotency. Two rules sharing one would mean the second never sends,
     * silently, to everybody who received the first — which is invisible in every other test
     * here because each of them looks at one rule at a time.
     */
    const keys = FOLLOWUP_RULES.map((rule) => rule.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('a scheduled run', () => {
  let harness: PlatformHarness;

  const post = (path: string) => request(harness.app).post(path).set('Origin', TEST_ORIGIN);

  beforeEach(() => {
    harness = createPlatformHarness({ env: PASSCODE_ENV });
  });

  /** An account created `daysAgo`, straight onto storage so its signup date is choosable. */
  async function giveAccount(daysAgo: number, email = 'dana@example.test') {
    const user = await harness.auth.createUser({
      email,
      name: 'Dana Whitfield',
      role: 'customer',
      emailVerified: true,
      identities: [],
    });
    const index = harness.auth.users.findIndex((candidate) => candidate.id === user.id);
    const backdated = { ...user, createdAt: new Date(Date.now() - daysAgo * DAY) };
    harness.auth.users.splice(index, 1, backdated);
    return backdated;
  }

  const run = () =>
    post('/api/cron/followup').set('Authorization', `Bearer ${PASSCODE_ENV.CRON_SECRET}`);

  it('emails a quiet account exactly once, however many times it runs', async () => {
    await giveAccount(3);

    const first = await run();
    expect(first.status).toBe(200);
    expect(first.body.data.emails).toBe(1);
    expect(harness.email.sent).toHaveLength(1);
    expect(harness.email.sent[0]?.subject).toBe(FOLLOWUP_RULES[0]?.subject);

    /*
     * The property the unique index exists for. A scheduler that fires twice — or a run that
     * overlaps the previous one — must not produce a second copy of the same sentence.
     */
    const second = await run();
    expect(second.body.data.emails).toBe(0);
    expect(harness.email.sent).toHaveLength(1);
  });

  it('puts a working unsubscribe link in every message', async () => {
    await giveAccount(3);
    await run();

    const link = /href="([^"]*\/api\/unsubscribe[^"]*)"/.exec(harness.email.sent[0]?.html ?? '');
    expect(link).not.toBeNull();

    /* The `&` is HTML-escaped in the attribute; a browser un-escapes it before requesting. */
    const url = (link?.[1] ?? '').replace(/&amp;/g, '&');
    const followed = await request(harness.app).get(url.replace(TEST_ORIGIN, ''));

    expect(followed.status).toBe(200);
    expect(followed.headers['content-type']).toMatch(/html/);
    expect(followed.text).toContain('You will not hear from us again');
  });

  it('sends nothing else to an address that has unsubscribed', async () => {
    await giveAccount(6);
    await run();
    expect(harness.email.sent).toHaveLength(1);

    const link = /href="([^"]*\/api\/unsubscribe[^"]*)"/.exec(harness.email.sent[0]?.html ?? '');
    const url = (link?.[1] ?? '').replace(/&amp;/g, '&');
    await request(harness.app).get(url.replace(TEST_ORIGIN, ''));

    const after = await run();
    expect(after.body.data.emails).toBe(0);
    expect(harness.email.sent).toHaveLength(1);
    expect(harness.repositories.followUp.suppressions.has('dana@example.test')).toBe(true);
  });

  it('refuses an unsubscribe link that was not signed for that address', async () => {
    await giveAccount(3);
    await run();

    const link = /href="([^"]*\/api\/unsubscribe[^"]*)"/.exec(harness.email.sent[0]?.html ?? '');
    const url = (link?.[1] ?? '').replace(/&amp;/g, '&').replace(TEST_ORIGIN, '');

    /*
     * The attack the signature exists to stop: swapping in somebody else's address. It would
     * otherwise let anybody unsubscribe anybody, and the victim's only symptom would be a
     * supplier who stopped writing.
     */
    const forged = url.replace('dana%40example.test', 'someone.else%40example.test');
    const response = await request(harness.app).get(forged);

    expect(response.status).toBe(200);
    expect(response.text).toContain('That link did not work');
    expect(harness.repositories.followUp.suppressions.has('someone.else@example.test')).toBe(false);
  });

  it('stops when somebody buys, even mid-sequence', async () => {
    const user = await giveAccount(12);
    await run();
    expect(harness.email.sent).toHaveLength(1);

    await harness.repositories.projects.create({
      ownerUserId: user.id,
      businessName: 'Cascade Heating & Air',
      contactName: 'Dana Whitfield',
      email: user.email,
      status: 'agreed',
      milestone: 'onboarding',
      approval: 'not_ready',
      depositStatus: 'pending',
      finalStatus: 'pending',
      subscriptionStatus: 'none',
    });

    const after = await run();
    expect(after.body.data.emails).toBe(0);
    expect(harness.email.sent).toHaveLength(1);
  });

  it('never nudges the demonstration account or a staff account', async () => {
    const demo = await giveAccount(6, 'demo@example.test');
    await harness.auth.markDemo(demo.id);

    const staff = await giveAccount(6, 'staff@example.test');
    await harness.auth.setRole(staff.id, 'admin');

    const response = await run();
    expect(response.body.data.emails).toBe(0);
    expect(harness.email.sent).toHaveLength(0);
  });

  it('answers 404 to a run with the wrong secret', async () => {
    await giveAccount(3);
    await post('/api/cron/followup').set('Authorization', 'Bearer wrong').expect(404);
    expect(harness.email.sent).toHaveLength(0);
  });
});

describe('a deployment that has not switched it on', () => {
  it('has no follow-up routes at all, and emails nobody', async () => {
    /*
     * The `/api/cron` and `/api/demo` shape: unset means unmounted, so an unconfigured
     * deployment answers a genuine 404 rather than "not configured". The feature cannot be
     * half-on, and this one matters more than the others — half-on here means emailing
     * somebody who never asked to hear from us.
     */
    const harness = createPlatformHarness({ env: { CRON_SECRET: 'cron-key' } });

    await request(harness.app)
      .post('/api/cron/followup')
      .set('Origin', TEST_ORIGIN)
      .set('Authorization', 'Bearer cron-key')
      .expect(404);

    await request(harness.app).get('/api/unsubscribe?email=a@b.test&token=x').expect(404);
  });
});

describe('the signing secret', () => {
  /**
   * Every file under a directory, recursively. Used to sweep the client sources.
   */
  function filesUnder(directory: string): string[] {
    return readdirSync(directory).flatMap((entry) => {
      const path = join(directory, entry);
      if (statSync(path).isDirectory()) return entry === 'node_modules' ? [] : filesUnder(path);
      return /\.(ts|tsx|js|jsx|html)$/.test(entry) ? [path] : [];
    });
  }

  it('is never read from a browser bundle', () => {
    /*
     * The same sweep `demo.api.test.ts` runs for `DEMO_PASSCODE`, for the same reason and
     * with the same narrowness: it looks for an actual *read*, not for the name, so a comment
     * explaining why the variable must stay server-side does not fail the build that the
     * comment exists to protect.
     */
    const reads = [
      /VITE_UNSUBSCRIBE_SECRET/,
      /import\.meta\.env[^\n]*UNSUBSCRIBE_SECRET/,
      /process\.env[^\n]*UNSUBSCRIBE_SECRET/,
    ];

    const roots = [
      join(import.meta.dirname, '..', '..', '..', '..', 'client', 'src'),
      join(import.meta.dirname, '..', '..', '..', '..', 'admin', 'src'),
    ];

    for (const root of roots) {
      for (const file of filesUnder(root)) {
        const source = readFileSync(file, 'utf8');
        for (const pattern of reads) {
          expect(pattern.test(source), `${file} reads UNSUBSCRIBE_SECRET`).toBe(false);
        }
      }
    }
  });
});
