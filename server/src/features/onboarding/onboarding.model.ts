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
  },
  { timestamps: true },
);

onboardingSchema.index({ createdAt: -1 });

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
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}
