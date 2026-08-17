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

/**
 * The same figure, written for a person.
 *
 * ============================================================================
 * THE SECOND PLACE A DOLLAR SIGN IS ALLOWED, AND WHY IT IS HERE
 * ============================================================================
 *
 * `client/src/config/pricing.ts` says every figure the *site* publishes comes from one file,
 * and it still does. This is not a second published price: it is the constant directly above,
 * rendered. An email saying "the launch instalment — $2,450 — is what settles it" needs the
 * number as words, and the alternative is a figure typed into a template, which is exactly the
 * $4,900-here-$4,500-there failure the pricing file exists to prevent.
 *
 * The locale is fixed for the reason `intl.test.ts` allows `pricing.ts` to fix it, stated in
 * that file at length: `$2,450` is what this business charges, not a rendering of it that
 * should follow the reader's settings. It is also the only sound answer on a server, where
 * there is no reader to ask — the notifier's `formatDate` makes the same argument in reverse
 * and reaches the opposite conclusion, because a date has no currency to anchor it.
 * ============================================================================
 */
const dollars = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export function amountLabel(product: BillingProduct): string {
  return dollars.format(EXPECTED_AMOUNT_CENTS[product] / 100);
}
