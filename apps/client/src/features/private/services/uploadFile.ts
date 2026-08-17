import { put } from '@vercel/blob/client';
import type { ApiFailure, ApiResult, FileView } from '@jobforge/shared';
import { confirmUpload, prepareUpload } from './appApi';
import { MAX_FILE_BYTES, MAX_FILE_MB, isAllowedFileType } from './fileRules';

/*
 * ============================================================================
 * A FILE GOES FROM THE PHONE TO THE STORE, NOT THROUGH US
 * ============================================================================
 *
 * Three steps, and the middle one does not touch our server:
 *
 *   1. `prepareUpload` — ask permission. Comes back with a token good for this one file.
 *   2. `put` — straight to Vercel Blob, with that token.
 *   3. `confirmUpload` — tell the server it landed, so it appears on the project.
 *
 * ## Why not just POST the file to our own API
 *
 * Because a Vercel function takes a 4.5 MB request body and this repository's JSON limit is
 * 16 kB. A photo from a modern phone is bigger than the first number and forty times the
 * second. Raising them would mean streaming multipart through a serverless function, paying
 * for the bytes twice, and holding a customer's upload hostage to a cold start.
 *
 * ## `@vercel/blob/client` is in the lazy chunk and nowhere else
 *
 * It is imported by this module, which is imported by `features/private`, every page of which
 * is behind a `lazy()` boundary. Nothing a marketing visitor downloads references it. That is
 * checked the same way everything else is — `scripts/check-budget.ts` measures the eager
 * bundle, and this must not move it.
 * ============================================================================
 */

export interface UploadProgress {
  /** 0–1. Vercel Blob reports this per chunk; a small file jumps straight to 1. */
  readonly fraction: number;
}

/**
 * Everything that can go wrong, as the same discriminated result the HTTP layer uses.
 *
 * A component then has one code path for failure — see `lib/http.ts`, which makes the same
 * argument at length. The two failures unique to this flow are a file the browser can reject
 * without asking anybody (too big, wrong type) and the upload itself failing, which is the
 * one that actually happens: a 12 MB photo on a rural 4G connection.
 */
function refuse(message: string): ApiFailure {
  return { success: false, error: { code: 'VALIDATION_ERROR', message } };
}

const UPLOAD_FAILED: ApiFailure = {
  success: false,
  error: {
    code: 'NETWORK_ERROR',
    message:
      'The file did not finish uploading. Check your connection and try again — nothing was lost.',
  },
};

export interface UploadFileParams {
  readonly projectId: string;
  readonly file: File;
  /** The task that asked for it, when one did. */
  readonly taskId?: string | undefined;
  readonly onProgress?: ((progress: UploadProgress) => void) | undefined;
}

export async function uploadFile(params: UploadFileParams): Promise<ApiResult<FileView>> {
  const { projectId, file, taskId, onProgress } = params;

  /*
   * Checked here as well as in the token and in the store. Not belt and braces for its own
   * sake: this is the only one of the three that can say no *before* somebody spends two
   * minutes uploading, and the message it gives names the file rather than a content type.
   */
  if (!isAllowedFileType(file.type)) {
    return refuse(
      `${file.name} is not a kind of file we can take. Photos, images and PDFs, please.`,
    );
  }

  if (file.size > MAX_FILE_BYTES) {
    return refuse(`${file.name} is too big — ${String(MAX_FILE_MB)} MB is the limit.`);
  }

  const ticket = await prepareUpload(projectId, { filename: file.name, contentType: file.type });
  if (!ticket.success) return ticket;

  try {
    await put(ticket.data.pathname, file, {
      access: 'public',
      token: ticket.data.token,
      /*
       * Stated rather than inferred from the path. The token permits exactly one content
       * type, and letting the extension decide would mean a `.jpeg` and a `.jpg` disagreeing
       * with the token that was minted for the type the browser reported.
       */
      contentType: file.type,
      /* Splits a large file and retries the parts that fail, which is the failure that happens. */
      multipart: true,
      ...(onProgress
        ? { onUploadProgress: ({ percentage }) => onProgress({ fraction: percentage / 100 }) }
        : {}),
    });
  } catch {
    /*
     * Deliberately not the provider's message. It is written for a developer reading a
     * console — "Vercel Blob: request failed" — and the person here is a plumber on a phone.
     */
    return UPLOAD_FAILED;
  }

  const confirmed = await confirmUpload(projectId, {
    pathname: ticket.data.pathname,
    filename: file.name,
    ...(taskId ? { taskId } : {}),
  });

  if (!confirmed.success) return confirmed;

  return { success: true, data: confirmed.data.file };
}
