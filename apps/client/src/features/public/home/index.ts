/** The feature's public API. Anything not exported here is a private implementation
 * detail — see docs/CUSTOMER-PLATFORM.md and the composition rules in docs/design-system.md.
 */

export { HomePage } from './HomePage';
/* Consumed by the teardown page and the report illustration — a marketing device, not a primitive. */
export { SiteMock } from './SiteMock';
export type { SiteMockProps } from './SiteMock';
export { ProductShot } from './ProductShot';
/*
 * The whole commercial block, rendered by three surfaces: the homepage, `/services` and
 * `/pricing`. It is part of this feature's public API rather than an internal, for the same
 * reason `SiteMock` is — and the third consumer is what settled it.
 *
 * `ServicesPage` had been reaching `../home/components/PricingBlock` directly. That passes
 * lint only because the restricted-import pattern needs three path segments after `features`
 * and a relative specifier of `../home/components/…` has one too few to hit it — so the
 * rule's letter allowed what its message forbids. Exporting it here is the answer the
 * message actually asks for: decide whether it belongs in the feature's public API. It does.
 * Three renderings of a price that cannot disagree with each other is the entire point of
 * the component.
 */
export { PricingBlock, type PricingBlockProps } from './components/PricingBlock';
