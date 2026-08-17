import mongoose, { Schema, type Model } from 'mongoose';
import { ONBOARDING_FIELD_LIMITS, type StoredOnboarding } from './onboarding.types.js';

export interface OnboardingDocument {
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  services: string;
  serviceAreas: string;
  website?: string;
  googleBusinessProfile?: string;
  domainAndHosting?: string;
  photosNote?: string;
  competitors?: string;
  callsToAction?: string;
  accessNotes?: string;
  anythingElse?: string;
  source: string;
  projectId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const short = { type: String, trim: true, maxlength: ONBOARDING_FIELD_LIMITS.short };
const long = { type: String, trim: true, maxlength: ONBOARDING_FIELD_LIMITS.long };

const onboardingSchema = new Schema<OnboardingDocument>(
  {
    businessName: {
      type: String,
      required: true,
      trim: true,
      maxlength: ONBOARDING_FIELD_LIMITS.businessName,
    },
    contactName: {
      type: String,
      required: true,
      trim: true,
      maxlength: ONBOARDING_FIELD_LIMITS.contactName,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: ONBOARDING_FIELD_LIMITS.email,
    },
    phone: { type: String, required: true, trim: true, maxlength: ONBOARDING_FIELD_LIMITS.phone },
    services: { ...long, required: true },
    serviceAreas: { ...short, required: true },
    website: short,
    googleBusinessProfile: short,
    domainAndHosting: long,
    photosNote: long,
    competitors: long,
    callsToAction: long,
    accessNotes: long,
    anythingElse: long,
    source: { type: String, required: true, trim: true, maxlength: 60 },
    /*
     * The project this submission is the material for, matched by email on arrival.
     *
     * Optional, and its absence is the interesting case rather than a defect: somebody filled
     * in `/welcome` with an address that matches no project. That is either a typo or a person
     * who paid under one address and onboarded under another, and both need a human — which is
     * why an unmatched submission notifies the owner and appears in its own console list.
     */
    projectId: { type: String, trim: true, maxlength: 64 },
  },
  { timestamps: true },
);

onboardingSchema.index({ createdAt: -1 });
/* The two queries the console makes: one project's submission, and the unmatched ones. */
onboardingSchema.index({ projectId: 1 }, { sparse: true });
onboardingSchema.index({ email: 1 });

/* Same re-registration guard as the lead model — warm serverless registries and tsx watch. */
export const OnboardingModel: Model<OnboardingDocument> =
  (mongoose.models['Onboarding'] as Model<OnboardingDocument> | undefined) ??
  mongoose.model<OnboardingDocument>('Onboarding', onboardingSchema);

export function toStoredOnboarding(
  document: OnboardingDocument & { _id: unknown },
): StoredOnboarding {
  return {
    id: String(document._id),
    businessName: document.businessName,
    contactName: document.contactName,
    email: document.email,
    phone: document.phone,
    services: document.services,
    serviceAreas: document.serviceAreas,
    website: document.website,
    googleBusinessProfile: document.googleBusinessProfile,
    domainAndHosting: document.domainAndHosting,
    photosNote: document.photosNote,
    competitors: document.competitors,
    callsToAction: document.callsToAction,
    accessNotes: document.accessNotes,
    anythingElse: document.anythingElse,
    source: document.source,
    projectId: document.projectId,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}
