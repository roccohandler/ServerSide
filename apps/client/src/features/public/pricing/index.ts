/** The feature's public API. Anything not exported here is a private implementation
 * detail — see docs/CUSTOMER-PLATFORM.md and the composition rules in docs/design-system.md.
 *
 * Note that `app/routes/marketingRoutes.tsx` deliberately does **not** come through here: its
 * `lazy()` reaches `./PricingPage` directly, because routing a dynamic import through a
 * barrel merges chunks that `scripts/check-budget.ts` exists to keep apart. This index is for
 * anything else that needs the page.
 */

export { PricingPage } from './PricingPage';
