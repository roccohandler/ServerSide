import { describe, expect, it, vi } from 'vitest';
import { AppError } from '../../lib/appError.js';
import type { Logger } from '../../lib/logger.js';
import { createFileService } from './file.service.js';
import type { FileRepository } from './file.repository.js';
import type { BlobStore } from './file.storage.js';
import { MAX_FILE_BYTES, toSafePathSegment } from './file.types.js';

/*
 * ============================================================================
 * THE CONFIRMATION STEP IS THE ONE WORTH TESTING
 * ============================================================================
 *
 * A browser tells the server "I uploaded this". Everything that stops that from being a way
 * to attach somebody else's file to your own project, or to record a 400 MB video as a 2 KB
 * photo, lives in `confirmUpload` — and none of it is visible from reading the route, which
 * is exactly why it is here.
 * ============================================================================
 */

const SILENT: Logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: () => SILENT,
};

const BLOB = {
  pathname: 'projects/p1/abc-logo.png',
  size: 2048,
  contentType: 'image/png',
  url: 'https://blob.example/projects/p1/abc-logo.png',
};

function build(
  overrides: { store?: Partial<BlobStore>; repository?: Partial<FileRepository> } = {},
) {
  const store: BlobStore = {
    issueUploadToken: vi
      .fn()
      .mockImplementation(({ pathname }: { pathname: string }) =>
        Promise.resolve({ token: 'client-token', pathname }),
      ),
    describe: vi.fn().mockResolvedValue(BLOB),
    remove: vi.fn().mockResolvedValue(undefined),
    ...overrides.store,
  };

  const repository: FileRepository = {
    record: vi
      .fn()
      .mockImplementation((record: unknown) =>
        Promise.resolve({ ...(record as object), id: 'file-1', createdAt: new Date() }),
      ),
    listForProject: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(null),
    remove: vi.fn().mockResolvedValue(undefined),
    countForTask: vi.fn().mockResolvedValue(0),
    ...overrides.repository,
  };

  const notifier = {
    previewReady: vi.fn(),
    approvalRequested: vi.fn(),
    tasksAssigned: vi.fn(),
    feedbackReplied: vi.fn(),
    projectLaunched: vi.fn(),
    paymentDue: vi.fn(),
    paymentFailed: vi.fn(),
    estimateChanged: vi.fn(),
    fileDelivered: vi.fn(),
    owner: vi.fn(),
  };

  const activity = { record: vi.fn().mockResolvedValue(undefined) };

  const service = createFileService({ repository, store, activity, notifier, logger: SILENT });

  return { service, store, repository, notifier, activity };
}

const SUBJECT = {
  businessName: 'Cascade Heating',
  email: 'dana@cascadeheating.example',
  contactName: 'Dana Reyes',
};

function confirm(overrides: Record<string, unknown> = {}) {
  return {
    projectId: 'p1',
    userId: 'user-1',
    pathname: BLOB.pathname,
    filename: 'logo.png',
    source: 'customer' as const,
    subject: SUBJECT,
    ...overrides,
  };
}

describe('asking to upload', () => {
  it('puts the file under the project it belongs to', async () => {
    const { service } = build();

    const issued = await service.prepareUpload({
      projectId: 'p1',
      filename: 'My Logo (final).PNG',
      contentType: 'image/png',
    });

    expect(issued.pathname.startsWith('projects/p1/')).toBe(true);
    /* Recognisable to the person who sent it, and safe in a URL. */
    expect(issued.pathname.endsWith('my-logo-final-.png')).toBe(true);
  });

  it('scopes the token to one type and the size ceiling', async () => {
    const { service, store } = build();

    await service.prepareUpload({ projectId: 'p1', filename: 'a.png', contentType: 'image/png' });

    expect(store.issueUploadToken).toHaveBeenCalledWith(
      expect.objectContaining({
        contentType: 'image/png',
        maximumSizeInBytes: MAX_FILE_BYTES,
      }),
    );
  });

  it('refuses a type the store would have to serve back', async () => {
    const { service, store } = build();

    await expect(
      service.prepareUpload({
        projectId: 'p1',
        filename: 'logo.svg',
        contentType: 'image/svg+xml',
      }),
    ).rejects.toBeInstanceOf(AppError);

    expect(store.issueUploadToken).not.toHaveBeenCalled();
  });
});

describe('confirming an upload', () => {
  /*
   * The check that matters. A blob URL is unguessable and it is not a permission, so without
   * the prefix test a customer could confirm any pathname they learned onto their own project
   * — and the store would describe it perfectly happily.
   */
  it('refuses a path outside the project', async () => {
    const { service, repository } = build();

    await expect(
      service.confirmUpload(confirm({ pathname: 'projects/someone-else/logo.png' })),
    ).rejects.toBeInstanceOf(AppError);

    expect(repository.record).not.toHaveBeenCalled();
  });

  it('refuses a path that is not in the store', async () => {
    const { service, repository } = build({ store: { describe: vi.fn().mockResolvedValue(null) } });

    await expect(service.confirmUpload(confirm())).rejects.toBeInstanceOf(AppError);
    expect(repository.record).not.toHaveBeenCalled();
  });

  /*
   * The size and type on the row come from the store rather than from the message, so a
   * browser cannot record a 400 MB file as a small one — or a PDF as a photo.
   */
  it('takes the size and type from the store, not from the caller', async () => {
    const { service, repository } = build({
      store: {
        describe: vi.fn().mockResolvedValue({ ...BLOB, size: 999_999, contentType: 'image/webp' }),
      },
    });

    await service.confirmUpload(confirm());

    expect(repository.record).toHaveBeenCalledWith(
      expect.objectContaining({ size: 999_999, contentType: 'image/webp' }),
    );
  });

  it('deletes and refuses a blob whose stored type is not allowed', async () => {
    const { service, store, repository } = build({
      store: {
        describe: vi.fn().mockResolvedValue({ ...BLOB, contentType: 'text/html' }),
      },
    });

    await expect(service.confirmUpload(confirm())).rejects.toBeInstanceOf(AppError);

    expect(store.remove).toHaveBeenCalledWith(BLOB.pathname);
    expect(repository.record).not.toHaveBeenCalled();
  });

  /*
   * The direction decides who hears about it, and it is decided structurally rather than by a
   * flag anybody passes — the mount the request came through is the whole of it.
   */
  it('emails the client when we are the ones sending', async () => {
    const { service, notifier } = build();

    await service.confirmUpload(confirm({ source: 'team', note: 'Page three is the change.' }));

    expect(notifier.fileDelivered).toHaveBeenCalledWith(
      expect.objectContaining({ businessName: 'Cascade Heating', filename: 'logo.png' }),
    );
    expect(notifier.owner).not.toHaveBeenCalled();
  });

  it('queues a line for the owner when the client is', async () => {
    const { service, notifier } = build();

    await service.confirmUpload(confirm());

    expect(notifier.owner).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'owner.file_received' }),
    );
    expect(notifier.fileDelivered).not.toHaveBeenCalled();
  });

  /*
   * Two names for one collection. "We sent you a file" in a customer's own history, when they
   * were the one who sent it, is the timeline telling them something untrue about themselves.
   */
  it('records the two directions as different events', async () => {
    const customer = build();
    await customer.service.confirmUpload(confirm());
    expect(customer.activity.record).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'file.uploaded' }),
    );

    const team = build();
    await team.service.confirmUpload(confirm({ source: 'team' }));
    expect(team.activity.record).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'file.delivered' }),
    );
  });
});

describe('removing a file', () => {
  /*
   * The row goes even when the store will not. A record the customer has asked twice to
   * delete, still on their screen with an error beside it, is worse than bytes nobody can
   * reach — and nobody can reach them either way.
   */
  it('deletes the row even when the store refuses', async () => {
    const { service, repository } = build({
      store: { remove: vi.fn().mockRejectedValue(new Error('store is down')) },
    });

    await service.remove({
      id: 'file-1',
      projectId: 'p1',
      filename: 'logo.png',
      contentType: 'image/png',
      size: 10,
      url: BLOB.url,
      pathname: BLOB.pathname,
      source: 'customer',
      createdAt: new Date(),
    });

    expect(repository.remove).toHaveBeenCalledWith('file-1');
    expect(SILENT.error).toHaveBeenCalledWith('files.store_delete_failed', expect.anything());
  });
});

describe('turning a filename into a path segment', () => {
  it('keeps it recognisable and safe', () => {
    expect(toSafePathSegment('Screenshot 2026-08-16 at 14.03.11.png')).toBe(
      'screenshot-2026-08-16-at-14.03.11.png',
    );
  });

  it('never produces an empty segment', () => {
    expect(toSafePathSegment('***')).toBe('file');
  });
});
