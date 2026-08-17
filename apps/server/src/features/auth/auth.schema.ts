import { z } from 'zod';
import { parseBody } from '../../lib/requestSchema.js';
import { MIN_PASSWORD_LENGTH, USER_FIELD_LIMITS } from './auth.types.js';

/*
 * The validation boundary for authentication.
 *
 * Every schema here is `strictObject`, which is doing real work: a signup body carrying
 * `role: "admin"` is rejected as unreadable rather than silently ignored. Ignoring it is
 * safe today and becomes a privilege escalation the first time somebody spreads the
 * parsed body into a create call. There is no `role` field to strip, on purpose.
 */

const email = z
  .string()
  .transform((value) => value.trim().toLowerCase())
  .pipe(z.email({ error: 'Please enter a valid email address.' }))
  .pipe(z.string().max(USER_FIELD_LIMITS.email));

/**
 * Length is the only rule, and it is a long one.
 *
 * Composition rules ("one capital, one symbol") measurably push people towards
 * `Password1!` and towards reuse. NIST 800-63B says to require length and to check
 * against known-breached lists instead; the breach check is not built here, and saying
 * so is more useful than pretending a symbol requirement is security.
 */
const password = z
  .string()
  .min(MIN_PASSWORD_LENGTH, {
    error: `Use at least ${MIN_PASSWORD_LENGTH} characters. A short phrase is easier to remember and harder to guess than a short password.`,
  })
  .max(USER_FIELD_LIMITS.password, { error: 'That password is too long.' });

const name = z
  .string()
  .trim()
  .min(1, { error: 'Please enter your name.' })
  .max(USER_FIELD_LIMITS.name);

const businessName = z.string().trim().min(1).max(USER_FIELD_LIMITS.businessName).optional();

export const signupSchema = z.strictObject({
  email,
  name,
  password,
  businessName,
});

export const loginSchema = z.strictObject({
  email,
  /* Not the signup rule: an existing password predates whatever the rule is today. */
  password: z
    .string()
    .min(1, { error: 'Please enter your password.' })
    .max(USER_FIELD_LIMITS.password),
});

/**
 * The provider credential.
 *
 * One field, and it is opaque. Notice what is *not* here: no email, no name, no subject
 * id, no `emailVerified`. Everything the application learns about a Google account is
 * read out of the token after we have verified Google's signature on it — a body that
 * offered those fields would be offering to tell us who it is.
 */
export const providerCredentialSchema = z.strictObject({
  credential: z.string().min(1).max(8192),
});

export const requestPasswordResetSchema = z.strictObject({ email });

export const resetPasswordSchema = z.strictObject({
  token: z.string().min(1).max(512),
  password,
});

export const verifyEmailSchema = z.strictObject({
  token: z.string().min(1).max(512),
});

export const updateProfileSchema = z
  .strictObject({
    name: name.optional(),
    businessName,
  })
  .refine((value) => value.name !== undefined || value.businessName !== undefined, {
    error: 'Nothing to change.',
  });

export const changePasswordSchema = z.strictObject({
  currentPassword: z.string().min(1).max(USER_FIELD_LIMITS.password),
  newPassword: password,
});

export const parseSignup = (body: unknown) => parseBody(signupSchema, body);
export const parseLogin = (body: unknown) => parseBody(loginSchema, body);
export const parseProviderCredential = (body: unknown) => parseBody(providerCredentialSchema, body);
export const parseRequestPasswordReset = (body: unknown) =>
  parseBody(requestPasswordResetSchema, body);
export const parseResetPassword = (body: unknown) => parseBody(resetPasswordSchema, body);
export const parseVerifyEmail = (body: unknown) => parseBody(verifyEmailSchema, body);
export const parseUpdateProfile = (body: unknown) => parseBody(updateProfileSchema, body);
export const parseChangePassword = (body: unknown) => parseBody(changePasswordSchema, body);
