import { del, head } from '@vercel/blob';
import { generateClientTokenFromReadWriteToken } from '@vercel/blob/client';
import { describeError, type Logger } from '../../../lib/logger.js';
import type { BlobStore } from '../file.storage.js';

/*
 * ============================================================================
 * VERCEL BLOB
 * ============================================================================
 *
 * The one file in the feature that knows which vendor stores the bytes.
 *
 * ## Why a dependency rather than four `fetch` calls
 *
 * This repository counts its dependencies and says so, and `@vercel/blob` is the fourth
 * runtime one on the server. It earns the slot because what it replaces is not four fetches —
 * it is a client-token signing scheme, a multipart uploader with retry, and an upload protocol
 * whose wire format is Vercel's to change. Reimplementing a signing scheme to save a
 * dependency is how a credential ends up wrong in a way nothing tests.
 *
 * ## The token asymmetry is the security story
 *
 * `BLOB_READ_WRITE_TOKEN` can overwrite and delete every file in the store, and it never
 * leaves this process. What a browser is handed is minted from it and is useless for anything
 * else: one pathname, one content type, one size ceiling, one minute. A stolen client token
 * buys somebody the ability to upload the file they were already uploading.
 * ============================================================================
 */

export interface VercelBlobStoreDependencies {
  /** `BLOB_READ_WRITE_TOKEN`. Absent means no store, and the caller must not build this. */
  readonly token: string;
  readonly logger: Logger;
}

export function createVercelBlobStore(dependencies: VercelBlobStoreDependencies): BlobStore {
  const { token, logger } = dependencies;

  return {
    async issueUploadToken({ pathname, contentType, maximumSizeInBytes, validForMs }) {
      const clientToken = await generateClientTokenFromReadWriteToken({
        token,
        pathname,
        /*
         * Exactly one type, not the whole allow-list. The server has already decided what this
         * particular upload is, so a token that would also accept a PDF is a token that lets a
         * browser change its mind after the check.
         */
        allowedContentTypes: [contentType],
        maximumSizeInBytes,
        /*
         * The server picks the path, so a random suffix would put the blob somewhere the
         * confirmation step cannot predict — and the uniqueness this needs already comes from
         * the id in the path.
         */
        addRandomSuffix: false,
        validUntil: Date.now() + validForMs,
      });

      return { token: clientToken, pathname };
    },

    async describe(pathname) {
      try {
        const blob = await head(pathname, { token });
        return {
          pathname: blob.pathname,
          size: blob.size,
          contentType: blob.contentType,
          url: blob.url,
        };
      } catch (error) {
        /*
         * Null rather than a throw, because "there is nothing there" is the answer the caller
         * is asking for — a confirmation naming a blob that does not exist is a rejected
         * confirmation, not a server error. Logged at debug, since it is also what an honest
         * race looks like when a confirmation arrives before the store is consistent.
         */
        logger.debug('files.head_failed', { pathname, ...describeError(error) });
        return null;
      }
    },

    async remove(pathname) {
      await del(pathname, { token });
    },
  };
}
