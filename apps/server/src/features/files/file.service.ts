import { AppError } from '../../lib/appError.js';
import { describeError, type Logger } from '../../lib/logger.js';
import type { ActivityRecorder } from '../activity/index.js';
import type { Notifier } from '../notifications/index.js';
import type { FileRepository } from './file.repository.js';
import type { BlobStore, IssuedUploadToken } from './file.storage.js';
import {
  MAX_FILE_BYTES,
  isAllowedFileType,
  projectPathPrefix,
  toSafePathSegment,
  type FileSource,
  type StoredFile,
} from './file.types.js';

/*
 * ============================================================================
 * A FILE ARRIVES IN THREE STEPS, AND THE SERVER DECIDES TWICE
 * ============================================================================
 *
 *   1. **prepareUpload** — the browser says what it is about to send. The server authorises
 *      it, chooses the path, and mints a token that permits exactly that and nothing else.
 *   2. The browser uploads **straight to the store**. Nothing passes through this process,
 *      which is what makes a 12 MB photo from a phone possible at all: a Vercel function
 *      takes a 4.5 MB request body, and this repository's JSON limit is 16 kB.
 *   3. **confirmUpload** — the browser says it is done. The server asks the *store* what is
 *      actually there and writes the row from that answer.
 *
 * ## Step 3 is not the browser being trusted
 *
 * It looks like it. It is not: the pathname is checked against the project's own prefix, the
 * blob is fetched from the store, and the size and content type on the record come from the
 * store rather than from the message. What the browser supplies is a *pointer* and a filename,
 * and the pointer is verified before anything is written.
 *
 * ## Why the confirmation and not Blob's completion callback
 *
 * Vercel Blob will POST to a `callbackUrl` when an upload finishes, and using it would remove
 * step 3. It was refused for one reason: **it cannot fire in local development.** The callback
 * comes from Vercel's network to a public URL, so the only way to exercise it is a tunnel —
 * which makes the single most important path in this feature the one nobody can run. A
 * confirmation from the browser runs everywhere, is verified against the store anyway, and is
 * made repeat-safe by a unique index rather than by a signature.
 *
 * The cost is named rather than hidden: a browser that uploads and then closes the tab leaves
 * a blob in the store with no row pointing at it. That is a storage bill, not a correctness
 * problem — the file is invisible to every surface — and the fix when it matters is a sweep
 * over the store, not a second write path.
 * ============================================================================
 */

/** A client token lives exactly long enough to start an upload, not to finish one. */
const TOKEN_VALID_FOR_MS = 60_000;

export interface FileService {
  /**
   * Authorises one upload and returns the token for it.
   *
   * The caller has already proved the project is theirs. What this decides is whether the
   * *file* is acceptable and where it goes.
   */
  prepareUpload(params: {
    readonly projectId: string;
    readonly filename: string;
    readonly contentType: string;
  }): Promise<IssuedUploadToken>;

  /**
   * Verifies an upload against the store and indexes it.
   *
   * Idempotent: a second confirmation of the same pathname returns the row that already
   * exists. See the unique index in `file.model.ts`.
   */
  confirmUpload(params: {
    readonly projectId: string;
    readonly userId: string | undefined;
    readonly pathname: string;
    readonly filename: string;
    readonly taskId?: string | undefined;
    readonly source: FileSource;
    readonly note?: string | undefined;
    /** Enough about the project to tell the customer, when the owner is the one sending. */
    readonly subject?:
      | {
          readonly businessName: string;
          readonly email: string;
          readonly contactName: string;
        }
      | undefined;
  }): Promise<StoredFile>;

  listForProject(projectId: string): Promise<readonly StoredFile[]>;
  findById(id: string): Promise<StoredFile | null>;

  /**
   * Removes the bytes and then the row.
   *
   * That order, and it is the opposite of the one the digest uses. Here the row is the thing
   * that makes a file visible and deletable at all: a store deletion that succeeded while the
   * row survived leaves a broken link somebody can see and try again on, whereas a row deleted
   * first and a failed store deletion leaves a paid-for blob nobody can ever reach or remove.
   */
  remove(file: StoredFile): Promise<void>;

  countForTask(taskId: string): Promise<number>;
}

export interface FileServiceDependencies {
  readonly repository: FileRepository;
  readonly store: BlobStore;
  readonly activity: ActivityRecorder;
  readonly notifier?: Notifier | undefined;
  readonly logger: Logger;
}

export function createFileService(dependencies: FileServiceDependencies): FileService {
  const { repository, store, activity, notifier, logger } = dependencies;

  return {
    async prepareUpload({ projectId, filename, contentType }) {
      if (!isAllowedFileType(contentType)) {
        throw new AppError(
          'VALIDATION_ERROR',
          'That kind of file cannot be uploaded here. Photos, images and PDFs only.',
        );
      }

      /*
       * The id in the path is what makes two files called `logo.png` two files. Mongo's
       * ObjectId is not available before the row exists, so this is a timestamp and a random
       * suffix — unique enough for a path, and never used as an identifier anywhere else.
       */
      const unique = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
      const pathname = `${projectPathPrefix(projectId)}${unique}-${toSafePathSegment(filename)}`;

      return store.issueUploadToken({
        pathname,
        contentType,
        maximumSizeInBytes: MAX_FILE_BYTES,
        validForMs: TOKEN_VALID_FOR_MS,
      });
    },

    async confirmUpload({ projectId, userId, pathname, filename, taskId, source, note, subject }) {
      /*
       * The prefix check, and it is the whole authorization of this step. Without it a
       * customer could confirm somebody else's blob onto their own project — the store would
       * happily describe it, because a blob URL is not a permission.
       */
      if (!pathname.startsWith(projectPathPrefix(projectId))) {
        throw new AppError('NOT_FOUND', 'No upload with that path.');
      }

      const blob = await store.describe(pathname);

      if (!blob) {
        throw new AppError(
          'NOT_FOUND',
          'That upload did not finish. Please try sending the file again.',
        );
      }

      /*
       * Checked again here even though the token allowed exactly one type. Belt and braces is
       * warranted: the token is minted by this process and consumed by another, and this is
       * the last point before a content type is stored and later served.
       */
      if (!isAllowedFileType(blob.contentType)) {
        await store.remove(pathname);
        throw new AppError(
          'VALIDATION_ERROR',
          'That kind of file cannot be uploaded here. Photos, images and PDFs only.',
        );
      }

      const file = await repository.record({
        projectId,
        userId,
        taskId,
        filename,
        /* From the store, not from the request. The message is a pointer; this is the fact. */
        contentType: blob.contentType,
        size: blob.size,
        url: blob.url,
        pathname: blob.pathname,
        source,
        note,
      });

      await activity.record({
        type: source === 'customer' ? 'file.uploaded' : 'file.delivered',
        summary:
          source === 'customer' ? `${filename} was uploaded.` : `We sent you a file: ${filename}.`,
        audience: 'customer',
        projectId,
        userId,
      });

      /*
       * Only one direction sends mail. A customer uploading their own logo already knows they
       * did; the owner learns about it from the daily digest, which is where a thing that
       * needs no reply belongs.
       */
      if (source === 'team' && subject && notifier) {
        await notifier.fileDelivered({
          to: { email: subject.email, name: subject.contactName },
          businessName: subject.businessName,
          projectId,
          filename,
          note,
        });
      }

      if (source === 'customer' && subject && notifier) {
        await notifier.owner({
          kind: 'owner.file_received',
          subject: `File uploaded — ${subject.businessName}`,
          heading: 'A client sent a file',
          lines: [`${subject.businessName} uploaded ${filename}.`],
          replyTo: subject.email,
        });
      }

      return file;
    },

    listForProject: (projectId) => repository.listForProject(projectId),
    findById: (id) => repository.findById(id),

    async remove(file) {
      try {
        await store.remove(file.pathname);
      } catch (error) {
        /*
         * A store that will not delete must not stop the row going. The alternative is a file
         * the customer has asked twice to remove, still on their screen, with an error — and
         * the orphaned bytes are invisible to everybody either way.
         */
        logger.error('files.store_delete_failed', {
          pathname: file.pathname,
          ...describeError(error),
        });
      }

      await repository.remove(file.id);
    },

    countForTask: (taskId) => repository.countForTask(taskId),
  };
}
