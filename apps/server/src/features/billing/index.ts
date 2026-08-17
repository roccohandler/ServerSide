/**
 * The feature's public API. Everything not exported here is private to it — see the
 * boundary rule in docs/CUSTOMER-PLATFORM.md.
 */

export { createBillingRouter } from './billing.routes.js';
export type { BillingRoutesDependencies } from './billing.routes.js';
export { createCustomerBillingRouter } from './billing.customer.routes.js';
export type { CustomerBillingRoutesDependencies } from './billing.customer.routes.js';
export { createBillingService } from './billing.service.js';
export type { BillingService, BillingServiceDependencies } from './billing.service.js';
export { createMongoBillingRepository } from './billing.repository.js';
export type { BillingRepository } from './billing.repository.js';
export { createBillingFulfillment, noopBillingFulfillment } from './billing.fulfillment.js';
export type { BillingFulfillment, BillingFulfillmentDependencies } from './billing.fulfillment.js';
export { createStripeClient } from './stripe.client.js';
export type { StripeClient, RealStripeClientOptions } from './stripe.client.js';
export { createStripeWebhookHandler } from './billing.webhook.js';
export type { StripeWebhookDependencies } from './billing.webhook.js';
export { amountLabel, BILLING_CURRENCY, EXPECTED_AMOUNT_CENTS } from './billing.amounts.js';
/* The console's ask-this-client-for-money button. See the note on the schema. */
export { parseCreateCheckoutLink } from './billing.schema.js';
export { BILLING_PRODUCTS } from './billing.types.js';
export type { BillingProduct } from './billing.types.js';
export type { BillingPriceIds } from './billing.service.js';
/* The dashboard renders this; it is the one billing view a customer surface may read. */
export { buildCustomerBillingSummary } from './billing.summary.js';
export type { CustomerBillingSummary } from './billing.summary.js';
