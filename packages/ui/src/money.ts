/*
 * ============================================================================
 * CENTS → A STRING A READER RECOGNISES
 * ============================================================================
 *
 * Every figure that crosses the API is an integer number of cents — `billing.amounts.ts` on
 * one side, `ScopeView.priceCents` on the other — and every one of them has to be rendered by
 * somebody. Two applications render them: the customer portal shows an agreed scope, and the
 * owner console composes one.
 *
 * Two consumers today, which is what justifies it being here rather than beside one of them.
 *
 * ## Not the same thing as `config/pricing.ts`
 *
 * That file publishes the *marketing* figures — whole dollars, chosen by the business, swept
 * by `content.test.ts` so nothing on the site can state a price it did not sanction. This is
 * the runtime formatter for a figure that arrives from the server and could be anything,
 * including a bespoke quote. They are deliberately separate: a shared one would let a
 * server-supplied number reach a marketing surface through the same door the published prices
 * use, which is exactly what the currency sweep exists to make impossible.
 *
 * ## The locale is the reader's; the currency is not
 *
 * `undefined` asks the browser what a decimal separator and a thousands separator look like
 * where the reader is. `USD` is pinned, because the amount genuinely is dollars — a formatter
 * that took the currency from a locale would print €4,900 for a reader in Berlin looking at a
 * bill in dollars.
 *
 * `packages/ui/src/intl.test.ts` fails the build on a hard-coded locale tag anywhere in
 * application source, and this file is written to pass it rather than to be excepted from it.
 * ============================================================================
 */

const usd = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
  /*
   * Whole dollars when the amount is whole, cents when it is not.
   *
   * Every published figure in this business is a round number, so pinning two decimals would
   * put "$4,900.00" on a scope — which reads as a system printing a database column rather
   * than as a price somebody quoted. A bespoke figure with cents in it still renders them.
   */
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** `490000` → `"$4,900"`. Takes cents, because everything crossing the API is cents. */
export function formatMoney(cents: number): string {
  return usd.format(cents / 100);
}
