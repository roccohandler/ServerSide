/**
 * The feature's public API. Everything not exported here is private to it — see the
 * boundary rule in docs/CUSTOMER-PLATFORM.md.
 */

export { createSubscriberRouter } from './subscriber.routes.js';
export type { SubscriberRoutesDependencies } from './subscriber.routes.js';
export { createSubscriberService } from './subscriber.service.js';
export type { SubscriberService, SubscriberServiceDependencies } from './subscriber.service.js';
export { createMongoSubscriberRepository } from './subscriber.repository.js';
export type { SubscriberRepository } from './subscriber.repository.js';
export { SUBSCRIPTION_ASSETS } from './subscriber.types.js';
export type { SubscriptionAsset, StoredSubscriber } from './subscriber.types.js';
