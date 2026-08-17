import mongoose, { Schema, type Model } from 'mongoose';
import { FILE_FIELD_LIMITS, FILE_SOURCES, type FileSource, type StoredFile } from './file.types.js';

export interface FileDocument {
  projectId: string;
  userId?: string;
  taskId?: string;
  filename: string;
  contentType: string;
  size: number;
  url: string;
  pathname: string;
  source: FileSource;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const fileSchema = new Schema<FileDocument>(
  {
    projectId: { type: String, required: true, trim: true, maxlength: 64 },
    userId: { type: String, trim: true, maxlength: 64 },
    taskId: { type: String, trim: true, maxlength: 64 },
    filename: { type: String, required: true, trim: true, maxlength: FILE_FIELD_LIMITS.filename },
    contentType: { type: String, required: true, trim: true, maxlength: 100 },
    size: { type: Number, required: true, min: 0 },
    url: { type: String, required: true, trim: true, maxlength: 1000 },
    pathname: { type: String, required: true, trim: true, maxlength: 500 },
    source: { type: String, required: true, enum: FILE_SOURCES },
    note: { type: String, trim: true, maxlength: FILE_FIELD_LIMITS.note },
  },
  { timestamps: true },
);

/*
 * ============================================================================
 * THE UNIQUE INDEX IS WHAT MAKES RECORDING A FILE IDEMPOTENT
 * ============================================================================
 *
 * The browser tells the server about a blob it has just created. That message can arrive
 * twice — a retried request, a double-tapped button on a slow phone, a page reloaded while
 * the confirmation was in flight — and the second one must not produce a second row for one
 * file. The pathname is unique within the store, so it is unique here.
 *
 * Same shape as the partial unique index on tasks that makes Stripe's at-least-once webhook
 * delivery safe, and for the same reason: the write is made unrepeatable by the database
 * rather than by a check the caller has to remember.
 * ============================================================================
 */
fileSchema.index({ pathname: 1 }, { unique: true });
fileSchema.index({ projectId: 1, createdAt: -1 });
/* Sparse: most files are not attached to a task, and they must not collide on `null`. */
fileSchema.index({ taskId: 1 }, { sparse: true });

export const FileModel: Model<FileDocument> =
  (mongoose.models['File'] as Model<FileDocument> | undefined) ??
  mongoose.model<FileDocument>('File', fileSchema);

export function toStoredFile(document: FileDocument & { _id: unknown }): StoredFile {
  return {
    id: String(document._id),
    projectId: document.projectId,
    userId: document.userId,
    taskId: document.taskId,
    filename: document.filename,
    contentType: document.contentType,
    size: document.size,
    url: document.url,
    pathname: document.pathname,
    source: document.source,
    note: document.note,
    createdAt: document.createdAt,
  };
}
