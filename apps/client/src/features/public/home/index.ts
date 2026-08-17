/** The feature's public API. Anything not exported here is a private implementation
 * detail — see docs/CUSTOMER-PLATFORM.md and the composition rules in docs/design-system.md.
 */

export { HomePage } from './HomePage';
/* Consumed by the teardown page and the report illustration — a marketing device, not a primitive. */
export { SiteMock } from './SiteMock';
export type { SiteMockProps } from './SiteMock';
export { ProductShot } from './ProductShot';
