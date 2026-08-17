/**
 * The feature's public API. Everything not exported here is private to it — see the
 * boundary rule in docs/CUSTOMER-PLATFORM.md.
 */

export { createOnboardingRouter } from './onboarding.routes.js';
export type { OnboardingRoutesDependencies } from './onboarding.routes.js';
export { createOnboardingService } from './onboarding.service.js';
export type { OnboardingService, OnboardingServiceDependencies } from './onboarding.service.js';
export { createMongoOnboardingRepository } from './onboarding.repository.js';
export type { OnboardingRepository } from './onboarding.repository.js';
export { toOnboardingView } from './onboarding.types.js';
export type { OnboardingView, StoredOnboarding } from './onboarding.types.js';
