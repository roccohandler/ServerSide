/*
 * ============================================================================
 * WHAT A CUSTOMER SENDS US, AND WHAT WE SEND BACK
 * ============================================================================
 *
 * Two seeded onboarding tasks — `upload-logo` and `upload-photos` — have asked customers for
 * files since the portal was built, and there was nowhere to put one. They emailed them, or
 * they did not, and either way the record of what had been supplied lived in an inbox.
 *
 * ## One collection for both directions
 *
 * A logo arriving and a signed proposal going out are the same record with `uploadedBy`
 * reversed. Two collections would need two views, two permission rules and two answers to
 * "what is attached to this project" — and the second one would drift.
 *
 * ## The bytes are not here and never will be
 *
 * A file's contents live in Vercel Blob; this is the index. The row carries the URL, the
 * size, and *who it belongs to* — which is the part Blob does not know and the part every
 * authorization check reads. A blob URL is unguessable but it is not a permission, so nothing
 * in this system treats holding one as proof of anything.
 * ============================================================================
 */

/**
 * Which side of the desk a file came from.
 *
 * The same two words `feedback.types.ts` uses for a comment's author, deliberately: a project
 * has one conversation and one pile of files, and giving them two vocabularies would make a
 * reader check which one they were looking at.
 */
export const FILE_SOURCES = ['customer', 'team'] as const;

export type FileSource = (typeof FILE_SOURCES)[number];

/**
 * What a browser may send, enforced in the *token* rather than in the form.
 *
 * Vercel Blob refuses an upload whose content type is not in the client token, so this list
 * is a rule the storage provider applies rather than a hint the browser could skip. The form
 * repeats it in `accept` for the file picker's benefit, which is a convenience and not a
 * check.
 *
 * ## Why there is no `image/svg+xml`
 *
 * An SVG is a document that can carry script, and these files are served from a public blob
 * URL. A tradesperson's logo arriving as an SVG is a real and common case, and the honest
 * answer is a PNG export — not a stored file that executes when somebody opens it.
 */
export const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  /* Phones. An iPhone photo is HEIC unless the owner changed a setting they have never seen. */
  'image/heic',
  'image/heif',
  'application/pdf',
] as const;

export type AllowedFileType = (typeof ALLOWED_FILE_TYPES)[number];

export function isAllowedFileType(value: string): value is AllowedFileType {
  return (ALLOWED_FILE_TYPES as readonly string[]).includes(value);
}

export const FILE_FIELD_LIMITS = {
  filename: 200,
  note: 300,
} as const;

/**
 * The largest file this system accepts, in bytes.
 *
 * Twenty megabytes. The constraint that set it is a photo from a modern phone — a 48-megapixel
 * HEIC is comfortably over ten — and the thing being protected is not our storage bill but the
 * customer's patience on a rural 4G connection. Anything larger is a video, and this product
 * does not take video.
 *
 * Enforced in the client token, so Blob rejects the upload itself. The browser checks it too,
 * to fail in a hundred milliseconds instead of after a two-minute upload.
 */
export const MAX_FILE_BYTES = 20 * 1024 * 1024;

export interface NewFileRecord {
  readonly projectId: string;
  /** Whose account this belongs to. Absent on a project with no account attached yet. */
  readonly userId?: string | undefined;
  /** The task that asked for it, when one did. */
  readonly taskId?: string | undefined;
  readonly filename: string;
  readonly contentType: string;
  readonly size: number;
  /** Blob's public URL. Unguessable, and deliberately not treated as an authorization. */
  readonly url: string;
  /** The key inside the store. What `del` takes, and what makes a record idempotent. */
  readonly pathname: string;
  readonly source: FileSource;
  /** A sentence from the owner when they send something. Never set on a customer upload. */
  readonly note?: string | undefined;
}

export interface StoredFile extends NewFileRecord {
  readonly id: string;
  readonly createdAt: Date;
}

/** What a browser is given. No `userId`, no store internals beyond the URL it must fetch. */
export interface FileView {
  readonly id: string;
  readonly projectId: string;
  readonly taskId?: string | undefined;
  readonly filename: string;
  readonly contentType: string;
  readonly size: number;
  readonly url: string;
  readonly source: FileSource;
  readonly note?: string | undefined;
  readonly at: string;
}

export function toFileView(file: StoredFile): FileView {
  return {
    id: file.id,
    projectId: file.projectId,
    taskId: file.taskId,
    filename: file.filename,
    contentType: file.contentType,
    size: file.size,
    url: file.url,
    source: file.source,
    note: file.note,
    at: file.createdAt.toISOString(),
  };
}

/**
 * Where a project's files live inside the store.
 *
 * The prefix is checked on the way back in, which is the point of it being a function rather
 * than a string built at the call site: the browser tells the server which blob it just
 * created, and a pathname outside this prefix means the claim is about somebody else's file.
 */
export function projectPathPrefix(projectId: string): string {
  return `projects/${projectId}/`;
}

/**
 * A filename safe to put in a URL path, keeping enough of the original to be recognisable.
 *
 * Not a security boundary — the prefix above is. This exists so `Screenshot 2026-08-16 at
 * 14.03.11.png` does not become a key with spaces and colons in it, and so the customer can
 * still tell which file is which. The stored `filename` keeps the original untouched, because
 * that is what the person recognises and what a download should be called.
 */
export function toSafePathSegment(filename: string): string {
  const cleaned = filename
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '');

  return cleaned.slice(0, 80) || 'file';
}
