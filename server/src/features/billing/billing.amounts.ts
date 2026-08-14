import type { BillingProduct } from './billing.types.js';

/*
 * ============================================================================
 * THE EXPECTED PAYMENT AMOUNTS, IN CENTS
 * ============================================================================
 *
 * The published prices live in `client/src/config/pricing.ts`; the amounts Stripe
 * actually charges live in Stripe Prices the owner creates by hand in the dashboard.
 * Those are two places the same number exists, which is exactly the failure mode this
 * repository is built around preventing — so this file is the server's mirror of the
 * published figures, and two guards hold the triangle together:
 *
 *   1. A client test (`client/src/config/pricing.sync.test.ts`) reads this file and
 *      fails the build if these constants disagree with the published prices.
 *   2. `billing.service.ts` retrieves the Stripe Price before creating any checkout
 *      session and refuses to send a payment link whose amount disagrees with these
 *      constants — so a mistyped dashboard Price produces a loud 503 for the owner,
 *      never a wrong charge for a client.
 *
 * Change a price in `config/pricing.ts` and guard 1 fails until this file is updated;
 * forget to update the Stripe dashboard afterwards and guard 2 refuses to create links
 * until it is. The client can never influence any of it: no amount is ever accepted
 * from a request.
 * ============================================================================
 */

/** The build at founding-client pricing: $4,900. */
export const BUILD_PRICE_CENTS = 490_000;

/** Growth Partner: $299/month. */
export const GROWTH_PARTNER_MONTHLY_CENTS = 29_900;

/** Growth Partner annual prepay: $2,990/year. */
export const GROWTH_PARTNER_ANNUAL_CENTS = 299_000;

export const BILLING_CURRENCY = 'usd';

/** What each Stripe Price must charge. Halves are derived, never typed. */
export const EXPECTED_AMOUNT_CENTS: Readonly<Record<BillingProduct, number>> = {
  'build-deposit': BUILD_PRICE_CENTS / 2,
  'build-final': BUILD_PRICE_CENTS / 2,
  'growth-partner-monthly': GROWTH_PARTNER_MONTHLY_CENTS,
  'growth-partner-annual': GROWTH_PARTNER_ANNUAL_CENTS,
};
