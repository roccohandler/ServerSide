/** The feature's public API. Anything not exported here is a private implementation
 * detail — see docs/CUSTOMER-PLATFORM.md and the composition rules in docs/design-system.md.
 *
 * `app/routes/marketingRoutes.tsx` deliberately does not come through here: its `lazy()`
 * reaches `./BlueprintPage` directly, because routing a dynamic import through a barrel merges
 * chunks that `scripts/check-budget.ts` exists to keep apart.
 */

export { BlueprintPage } from './BlueprintPage';
