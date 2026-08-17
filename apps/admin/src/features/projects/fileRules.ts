/*
 * The console's copy of the two upload constants.
 *
 * The customer application keeps its own for a payload reason it explains at length; this one
 * is a copy for a different and simpler one — **the two frontends never import each other**,
 * and `packages/shared` deliberately no longer carries runtime values that only a signed-in
 * surface needs. Both copies are pinned against the server's source by
 * `contract.sync.test.ts`, which is what makes duplicating them safe.
 *
 * Neither enforces anything. The upload token carries both and the storage provider applies
 * them; these exist so the picker offers only what will be accepted and an oversized file is
 * refused before it is sent.
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

export const MAX_FILE_MB = Math.round(MAX_FILE_BYTES / (1024 * 1024));

export function isAllowedFileType(contentType: string): boolean {
  return (ALLOWED_FILE_TYPES as readonly string[]).includes(contentType);
}
