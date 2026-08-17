/**
 * The notifications feature's public API.
 *
 * Everything a consumer needs is here: the port, the no-op, and the vocabulary. The email
 * builders are deliberately absent — a service that reaches past this index to construct its
 * own message is a service that has just become the seventh opinion on tone, which is the thing
 * this feature exists to prevent.
 */
export { createNotifier, noopNotifier } from './notification.service.js';
export { createDigestService, type DigestService } from './notification.digest.js';
export { createDigestRouter } from './notification.routes.js';
export type {
  DigestQueue,
  Notifier,
  NotifierDependencies,
  NotificationRecipient,
} from './notification.service.js';
export {
  IMMEDIATE_KINDS,
  NOTIFICATION_AUDIENCES,
  NOTIFICATION_KINDS,
  isImmediate,
} from './notification.types.js';
export type { NotificationAudience, NotificationKind } from './notification.types.js';
