/*
 * The auth feature's public surface.
 *
 * Everything else in the application imports from here rather than reaching into the
 * feature's files. What is deliberately NOT exported is as much of the point as what
 * is: `password.ts`, `tokens.ts`, `user.model.ts` and the Google verifier are internal,
 * so no other feature can hash a password, mint a session token or decide for itself
 * what a valid Google credential looks like.
 */

export { createAuthService, type AuthService, type AuthSession } from './auth.service.js';
export { createMongoAuthRepository, type AuthRepository } from './auth.repository.js';
export { createAuthRouter } from './auth.routes.js';
export { createGoogleVerifier } from './providers/google.verifier.js';
export type { IdentityVerifier, VerifiedIdentity } from './providers/identity.provider.js';
export {
  authorizeOwnership,
  createAttachUser,
  requireAdmin,
  requireAuth,
  requireCapability,
  requireRequestAuth,
  type RequestAuth,
} from './auth.middleware.js';
export { type CookieOptions } from './auth.cookies.js';
export {
  CAPABILITIES,
  USER_ROLES,
  capabilitiesFor,
  roleHasCapability,
  toAdminAccountView,
  toPublicUser,
  type AdminAccountView,
  type Capability,
  type PublicUser,
  type StoredUser,
  type UserRole,
} from './auth.types.js';
