import mongoose, { Schema, type Model } from 'mongoose';
import {
  TOKEN_PURPOSES,
  USER_FIELD_LIMITS,
  USER_ROLES,
  type ProviderIdentity,
  type StoredAuthToken,
  type StoredSession,
  type StoredUser,
  type TokenPurpose,
  type UserRole,
} from './auth.types.js';

export interface IdentityDocument {
  provider: 'google';
  subject: string;
  email: string;
  linkedAt: Date;
}

const identitySchema = new Schema<IdentityDocument>(
  {
    provider: { type: String, required: true, enum: ['google'] },
    subject: { type: String, required: true, trim: true, maxlength: 255 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    linkedAt: { type: Date, required: true },
  },
  { _id: false },
);

export interface UserDocument {
  email: string;
  name: string;
  businessName?: string;
  role: UserRole;
  emailVerified: boolean;
  passwordHash?: string;
  identities: IdentityDocument[];
  stripeCustomerId?: string;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/*
 * One account per person, keyed by a lowercased email address.
 *
 * `role` has no route that can set it. It defaults to `customer` and the only way to
 * become an admin is a deliberate write against the database by the owner — which is
 * why no request body anywhere is allowed to carry a role, and why the signup schema
 * does not have the field to strip.
 */
const userSchema = new Schema<UserDocument>(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: USER_FIELD_LIMITS.email,
    },
    name: { type: String, required: true, trim: true, maxlength: USER_FIELD_LIMITS.name },
    businessName: { type: String, trim: true, maxlength: USER_FIELD_LIMITS.businessName },
    role: { type: String, required: true, enum: USER_ROLES, default: 'customer' },
    emailVerified: { type: Boolean, required: true, default: false },
    /*
     * `select: false`: the hash is never loaded unless a query asks for it by name, so
     * a handler that serialises a user document cannot leak it by forgetting to.
     */
    passwordHash: { type: String, select: false },
    identities: { type: [identitySchema], required: true, default: [] },
    stripeCustomerId: { type: String, trim: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

/* The uniqueness that makes "one account per address" true under concurrent signups. */
userSchema.index({ email: 1 }, { unique: true });
/*
 * Sparse and unique together: two accounts may not claim the same Google subject, but
 * the many accounts with no Google identity at all do not collide on `null`.
 */
userSchema.index({ 'identities.subject': 1 }, { unique: true, sparse: true });
userSchema.index({ stripeCustomerId: 1 }, { sparse: true });

export const UserModel: Model<UserDocument> =
  (mongoose.models['User'] as Model<UserDocument> | undefined) ??
  mongoose.model<UserDocument>('User', userSchema);

export function toStoredUser(document: UserDocument & { _id: unknown }): StoredUser {
  return {
    id: String(document._id),
    email: document.email,
    name: document.name,
    businessName: document.businessName,
    role: document.role,
    emailVerified: document.emailVerified,
    passwordHash: document.passwordHash,
    identities: (document.identities ?? []).map((identity): ProviderIdentity => ({
      provider: identity.provider,
      subject: identity.subject,
      email: identity.email,
      linkedAt: identity.linkedAt,
    })),
    stripeCustomerId: document.stripeCustomerId,
    lastLoginAt: document.lastLoginAt,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

/* ------------------------------------------------------------------ sessions */

export interface SessionDocument {
  /** SHA-256 of the token the browser holds. The token itself is never stored. */
  tokenHash: string;
  userId: string;
  expiresAt: Date;
  lastUsedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const sessionSchema = new Schema<SessionDocument>(
  {
    tokenHash: { type: String, required: true, unique: true },
    userId: { type: String, required: true, maxlength: 64 },
    expiresAt: { type: Date, required: true },
    lastUsedAt: { type: Date, required: true },
  },
  { timestamps: true },
);

/*
 * A TTL index, so MongoDB deletes expired sessions without a cron job. Expiry is still
 * checked in application code on every read — the background sweep runs about once a
 * minute, and "usually deleted" is not an authentication guarantee.
 */
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
sessionSchema.index({ userId: 1 });

export const SessionModel: Model<SessionDocument> =
  (mongoose.models['Session'] as Model<SessionDocument> | undefined) ??
  mongoose.model<SessionDocument>('Session', sessionSchema);

export function toStoredSession(document: SessionDocument & { _id: unknown }): StoredSession {
  return {
    id: String(document._id),
    userId: document.userId,
    expiresAt: document.expiresAt,
    createdAt: document.createdAt,
    lastUsedAt: document.lastUsedAt,
  };
}

/* ------------------------------------------------------------------ one-time tokens */

export interface AuthTokenDocument {
  tokenHash: string;
  userId: string;
  purpose: TokenPurpose;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const authTokenSchema = new Schema<AuthTokenDocument>(
  {
    tokenHash: { type: String, required: true, unique: true },
    userId: { type: String, required: true, maxlength: 64 },
    purpose: { type: String, required: true, enum: TOKEN_PURPOSES },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

authTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
authTokenSchema.index({ userId: 1, purpose: 1 });

export const AuthTokenModel: Model<AuthTokenDocument> =
  (mongoose.models['AuthToken'] as Model<AuthTokenDocument> | undefined) ??
  mongoose.model<AuthTokenDocument>('AuthToken', authTokenSchema);

export function toStoredAuthToken(document: AuthTokenDocument): StoredAuthToken {
  return {
    userId: document.userId,
    purpose: document.purpose,
    expiresAt: document.expiresAt,
    createdAt: document.createdAt,
  };
}
