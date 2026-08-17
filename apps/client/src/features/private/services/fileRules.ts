/*
 * ============================================================================
 * WHAT THIS BROWSER MAY OFFER, AND HOW BIG
 * ============================================================================
 *
 * A copy of two server constants, and the copy is deliberate — the same trade
 * `packages/shared` explains where these are conspicuously absent. That module is eager:
 * marketing code imports `FIELD_LIMITS` from its barrel, so a runtime value declared there is
 * downloaded by somebody reading about roofing websites. These two are needed only by a
 * signed-in customer attaching a file, so they live in the lazy feature that needs them.
 *
 * ## Neither of these enforces anything
 *
 * The upload token carries both, and Vercel Blob applies them itself — see
 * `file.service.ts` on the server. What this copy buys is the two failures happening
 * *before* the upload rather than after it: a picker that only offers what will be accepted,
 * and a 40 MB video refused in a hundred milliseconds instead of after two minutes on 4G.
 *
 * `contract.sync.test.ts` pins both against the server's own source, because a client list
 * wider than the server's is an invitation the server then refuses.
 * ============================================================================
 */

export const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/heic',
  'image/heif',
  'application/pdf',
] as const;

export const MAX_FILE_BYTES = 20 * 1024 * 1024;

/** Megabytes, for a sentence a person reads. `MAX_FILE_BYTES` is the rule. */
export const MAX_FILE_MB = Math.round(MAX_FILE_BYTES / (1024 * 1024));

export function isAllowedFileType(contentType: string): boolean {
  return (ALLOWED_FILE_TYPES as readonly string[]).includes(contentType);
}
