import { httpGet, httpPatch, httpPost } from '../lib/http';
import type { ApiResult, AuthConfigData, CurrentUserData, SessionData } from '@jobforge/shared';

/*
 * The authentication endpoints, one function each.
 *
 * Every one of them returns a session-shaped result and nothing else. In particular
 * `continueWithGoogle` is indistinguishable from `login` to everything above it: the
 * provider is an implementation detail of *how* somebody proved who they are, and
 * nothing downstream is allowed to branch on it.
 */

export function fetchAuthConfig(signal?: AbortSignal): Promise<ApiResult<AuthConfigData>> {
  return httpGet<AuthConfigData>('/api/auth/config', signal);
}

export function fetchCurrentUser(signal?: AbortSignal): Promise<ApiResult<CurrentUserData>> {
  return httpGet<CurrentUserData>('/api/auth/me', signal);
}

export function signup(input: {
  readonly email: string;
  readonly name: string;
  readonly password: string;
  readonly businessName?: string;
}): Promise<ApiResult<SessionData>> {
  return httpPost<SessionData>('/api/auth/signup', input);
}

export function login(input: {
  readonly email: string;
  readonly password: string;
}): Promise<ApiResult<SessionData>> {
  return httpPost<SessionData>('/api/auth/login', input);
}

/**
 * Exchanges a Google credential for a JobForge session.
 *
 * The credential is opaque here and stays opaque: nothing in the browser reads it,
 * decodes it or trusts anything inside it. The server verifies Google's signature and
 * decides who this is — see `server/src/features/auth/providers/google.verifier.ts`.
 */
export function continueWithGoogle(credential: string): Promise<ApiResult<SessionData>> {
  return httpPost<SessionData>('/api/auth/google', { credential });
}

export function logout(): Promise<ApiResult<{ readonly signedOut: boolean }>> {
  return httpPost('/api/auth/logout');
}

export function requestPasswordReset(
  email: string,
): Promise<ApiResult<{ readonly message: string }>> {
  return httpPost('/api/auth/password-reset', { email });
}

export function confirmPasswordReset(input: {
  readonly token: string;
  readonly password: string;
}): Promise<ApiResult<{ readonly reset: boolean }>> {
  return httpPost('/api/auth/password-reset/confirm', input);
}

export function verifyEmail(token: string): Promise<ApiResult<SessionData>> {
  return httpPost<SessionData>('/api/auth/verify-email', { token });
}

export function resendVerification(): Promise<ApiResult<{ readonly sent: boolean }>> {
  return httpPost('/api/auth/verify-email/resend');
}

export function updateProfile(input: {
  readonly name?: string;
  readonly businessName?: string;
}): Promise<ApiResult<SessionData>> {
  return httpPatch<SessionData>('/api/auth/profile', input);
}

export function changePassword(input: {
  readonly currentPassword: string;
  readonly newPassword: string;
}): Promise<ApiResult<SessionData>> {
  return httpPost<SessionData>('/api/auth/password', input);
}
