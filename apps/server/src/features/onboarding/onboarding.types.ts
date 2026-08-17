/*
 * ============================================================================
 * PROJECT ONBOARDING
 * ============================================================================
 *
 * A new client, immediately after their deposit, tells the business the things only
 * they know: services, service area, existing accounts, photos, competitors. That is
 * the whole feature — it exists so a paid project never stalls waiting for a "can you
 * send me..." email thread, because the timeline is measured from when these arrive.
 *
 * Same persist-then-notify design as leads: the submission is the asset, the email to
 * the owner is a convenience. Nothing here is a mailing list and nothing is shared.
 * ============================================================================
 */

/** Shared by the zod schema and the Mongoose model. */
export const ONBOARDING_FIELD_LIMITS = {
  businessName: 200,
  contactName: 100,
  email: 254,
  phone: 30,
  short: 300,
  long: 2000,
} as const;

/** A submission that has passed schema validation and normalisation. */
export interface ValidatedOnboardingInput {
  readonly businessName: string;
  readonly contactName: string;
  readonly email: string;
  readonly phone: string;
  readonly services: string;
  readonly serviceAreas: string;
  readonly website?: string | undefined;
  readonly googleBusinessProfile?: string | undefined;
  readonly domainAndHosting?: string | undefined;
  readonly photosNote?: string | undefined;
  readonly competitors?: string | undefined;
  readonly callsToAction?: string | undefined;
  readonly accessNotes?: string | undefined;
  readonly anythingElse?: string | undefined;
  /** True when the honeypot input arrived filled in. */
  readonly isBotSubmission: boolean;
}

export type NewOnboardingRecord = Omit<ValidatedOnboardingInput, 'isBotSubmission'> & {
  readonly source: string;
  /** The project this is the material for, when the address matched one on arrival. */
  readonly projectId?: string | undefined;
};

export interface StoredOnboarding extends NewOnboardingRecord {
  readonly id: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * What the console is shown. Every field, because every field is the answer to a question
 * the build needs — this is the one record in the system that is *material* rather than state.
 *
 * Built explicitly rather than by spreading `StoredOnboarding`, the same rule `ProjectView`
 * follows: a field added to storage is invisible here until somebody decides it should be
 * visible. Dates become ISO strings at the boundary like everywhere else.
 */
export interface OnboardingView {
  readonly id: string;
  readonly businessName: string;
  readonly contactName: string;
  readonly email: string;
  readonly phone: string;
  readonly services: string;
  readonly serviceAreas: string;
  readonly website?: string | undefined;
  readonly googleBusinessProfile?: string | undefined;
  readonly domainAndHosting?: string | undefined;
  readonly photosNote?: string | undefined;
  readonly competitors?: string | undefined;
  readonly callsToAction?: string | undefined;
  readonly accessNotes?: string | undefined;
  readonly anythingElse?: string | undefined;
  readonly projectId?: string | undefined;
  readonly at: string;
}

export function toOnboardingView(onboarding: StoredOnboarding): OnboardingView {
  return {
    id: onboarding.id,
    businessName: onboarding.businessName,
    contactName: onboarding.contactName,
    email: onboarding.email,
    phone: onboarding.phone,
    services: onboarding.services,
    serviceAreas: onboarding.serviceAreas,
    website: onboarding.website,
    googleBusinessProfile: onboarding.googleBusinessProfile,
    domainAndHosting: onboarding.domainAndHosting,
    photosNote: onboarding.photosNote,
    competitors: onboarding.competitors,
    callsToAction: onboarding.callsToAction,
    accessNotes: onboarding.accessNotes,
    anythingElse: onboarding.anythingElse,
    projectId: onboarding.projectId,
    at: onboarding.createdAt.toISOString(),
  };
}

export type OnboardingOutcome =
  | { readonly kind: 'created'; readonly onboarding: StoredOnboarding }
  | { readonly kind: 'discarded'; readonly reason: 'honeypot' };
