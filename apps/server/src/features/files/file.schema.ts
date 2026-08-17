import { z } from 'zod';
import { parseBody } from '../../lib/requestSchema.js';
import { ALLOWED_FILE_TYPES, FILE_FIELD_LIMITS } from './file.types.js';

/*
 * The two bodies this feature accepts, and neither carries a project id — the project comes
 * from the URL and has been authorized before a handler parses anything, so a field for it
 * would be a second, unchecked source of the same fact. The same rule `project.schema.ts`
 * states, applied to the one feature where getting it wrong attaches somebody's file to
 * somebody else's project.
 */

export const prepareUploadSchema = z.strictObject({
  filename: z.string().trim().min(1).max(FILE_FIELD_LIMITS.filename),
  /*
   * An enum rather than a string, so an unsupported type is refused by the schema with a
   * field name attached rather than by the service with a sentence. Both refuse it; this one
   * refuses it earlier and more usefully.
   */
  contentType: z.enum(ALLOWED_FILE_TYPES),
  /** The task that asked for the file, when one did. */
  taskId: z.string().trim().min(1).max(64).optional(),
});

/**
 * "I have finished uploading."
 *
 * `pathname` is checked against the project's own prefix and then looked up in the store, so
 * what arrives here is a pointer to be verified rather than a fact to be believed. The size
 * and content type are deliberately **not** fields: they come from the store.
 */
export const confirmUploadSchema = z.strictObject({
  pathname: z.string().trim().min(1).max(500),
  filename: z.string().trim().min(1).max(FILE_FIELD_LIMITS.filename),
  taskId: z.string().trim().min(1).max(64).optional(),
  /** Owner-side only. The customer routes ignore it; the console routes pass it through. */
  note: z.string().trim().min(1).max(FILE_FIELD_LIMITS.note).optional(),
});

export const parsePrepareUpload = (body: unknown) => parseBody(prepareUploadSchema, body);
export const parseConfirmUpload = (body: unknown) => parseBody(confirmUploadSchema, body);
