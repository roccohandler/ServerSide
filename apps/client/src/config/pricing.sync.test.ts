import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { currentPrice, growthPartner } from './pricing';

/*
 * ============================================================================
 * THE PUBLISHED PRICES AND THE PAYMENT AMOUNTS ARE THE SAME NUMBERS
 * ============================================================================
 *
 * Three places hold the price of anything: this config (what the site publishes),
 * `server/src/features/billing/billing.amounts.ts` (what the server will allow a Stripe
 * Price to charge), and the Stripe dashboard (what actually gets charged). The server
 * verifies the dashboard against its constants before creating any payment link; this
 * test verifies the server's constants against the published prices.
 *
 * Together they close the triangle: change a price here and this test fails until the
 * server file is updated; forget the dashboard afterwards and the server refuses to
 * create links until it matches. A client being asked to pay a number the website does
 * not publish is the failure all of it exists to prevent.
 *
 * Read as text rather than imported: the two workspaces compile separately, and the
 * repository already uses source-reading guards for exactly this kind of cross-boundary
 * fact (see the component sweep in `content.test.ts`).
 * ============================================================================
 */
describe('the server-side payment amounts', () => {
  const source = readFileSync(
    join(
      import.meta.dirname,
      '..',
      '..',
      '..',
      'server',
      'src',
      'features',
      'billing',
      'billing.amounts.ts',
    ),
    'utf8',
  );

  function cents(constant: string): number {
    const match = source.match(new RegExp(`${constant} = ([\\d_]+)`));
    expect(match, `${constant} is missing from billing.amounts.ts`).not.toBeNull();
    return Number((match?.[1] ?? '').replace(/_/g, ''));
  }

  it('mirror the published build price exactly', () => {
    expect(cents('BUILD_PRICE_CENTS')).toBe(currentPrice() * 100);
  });

  it('mirror the published Growth Partner prices exactly', () => {
    expect(cents('GROWTH_PARTNER_MONTHLY_CENTS')).toBe(growthPartner.monthly * 100);
    expect(cents('GROWTH_PARTNER_ANNUAL_CENTS')).toBe(growthPartner.annual * 100);
  });

  it('derive the deposit halves rather than typing them', () => {
    // The halves must be arithmetic on the build price, so a price change cannot
    // leave a stale deposit amount behind on the payment side.
    expect(source).toMatch(/'build-deposit': BUILD_PRICE_CENTS \/ 2/);
    expect(source).toMatch(/'build-final': BUILD_PRICE_CENTS \/ 2/);
  });
});
