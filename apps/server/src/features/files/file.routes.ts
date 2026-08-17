import { Router } from 'express';
import { AppError } from '../../lib/appError.js';
import { success } from '../../lib/apiResponse.js';
import { pathParam } from '../../lib/requestSchema.js';
import { requireRequestAuth } from '../auth/index.js';
import { requireProject } from '../projects/index.js';
import { parseConfirmUpload, parsePrepareUpload } from './file.schema.js';
import type { FileService } from './file.service.js';
import { toFileView, type FileSource } from './file.types.js';

/*
 * ============================================================================
 * THE FILES ON ONE PROJECT
 * ============================================================================
 *
 * One router, mounted twice: under the customer's project routes as `customer`, and under the
 * console's as `team`. The only differences between the two are which way a file is travelling
 * and who gets told about it, and both are the `source` argument — so there is one set of
 * handlers rather than two that have to be kept in step.
 *
 * `mergeParams`, and mounted **underneath** `createProjectAccess` in both places. Nothing here
 * resolves a project or checks ownership, because by the time any of it runs the project on
 * the request has already been authorised against the session. That is the same arrangement
 * tasks, feedback and deployments use, and the reason is stated at length in
 * `project.access.ts`: the fourth router to do its own check is the one that forgets.
 * ============================================================================
 */

export interface ProjectFileRoutesDependencies {
  /** Undefined when no blob store is configured. Every route then answers 503. */
  readonly fileService: FileService | undefined;
  /** Which direction files on this mount travel. */
  readonly source: FileSource;
}

const NOT_CONFIGURED =
  'File uploads are not switched on yet. Set BLOB_READ_WRITE_TOKEN, or email the file across in the meantime.';

export function createProjectFileRoutes(dependencies: ProjectFileRoutesDependencies): Router {
  const { fileService, source } = dependencies;
  const router = Router({ mergeParams: true });

  /**
   * The service, or a 503 that says what to do about it.
   *
   * The same posture Stripe and the deployment webhook take: an unconfigured provider makes
   * one feature answer with an instruction rather than making the application refuse to start
   * or — far worse — accept a file it has nowhere to put.
   */
  function requireStore(): FileService {
    if (!fileService) throw new AppError('SERVICE_UNAVAILABLE', NOT_CONFIGURED);
    return fileService;
  }

  router.get('/', async (request, response) => {
    const project = requireProject(request);
    const files = await requireStore().listForProject(project.id);
    response.json(success({ files: files.map(toFileView) }));
  });

  /*
   * Step one: authorise the upload and mint a token for exactly it.
   *
   * `taskId` is accepted here and ignored, deliberately — the schema takes it so one body
   * shape covers both steps and the browser can send what it has, and the attachment is
   * recorded at confirmation, where the row is actually written. Accepting it in two places
   * and acting on it in one is less surprising than two body shapes that differ by a field.
   */
  router.post('/token', async (request, response) => {
    const project = requireProject(request);
    const input = parsePrepareUpload(request.body);

    const issued = await requireStore().prepareUpload({
      projectId: project.id,
      filename: input.filename,
      contentType: input.contentType,
    });

    response.json(success({ token: issued.token, pathname: issued.pathname }));
  });

  /* Step two: verify it against the store and index it. */
  router.post('/', async (request, response) => {
    const project = requireProject(request);
    const input = parseConfirmUpload(request.body);

    const file = await requireStore().confirmUpload({
      projectId: project.id,
      /*
       * The project's account, not the person who pressed the button. It decides whose
       * activity stream the entry lands in — and when the owner sends a file, the customer
       * is the one who needs to see it.
       */
      userId: project.ownerUserId,
      pathname: input.pathname,
      filename: input.filename,
      taskId: input.taskId,
      source,
      /* A note is something the owner attaches when sending. A customer upload has none. */
      ...(source === 'team' && input.note ? { note: input.note } : {}),
      subject: {
        businessName: project.businessName,
        email: project.email,
        contactName: project.contactName,
      },
    });

    response.status(201).json(success({ file: toFileView(file) }));
  });

  router.delete('/:fileId', async (request, response) => {
    const project = requireProject(request);
    const auth = requireRequestAuth(request);
    const service = requireStore();

    const file = await service.findById(pathParam(request.params, 'fileId'));

    /*
     * On *this* project, checked explicitly. The project above is authorised; the file id is
     * not, and without this comparison a valid id from another project would be deleted here
     * on the strength of the caller owning a different one.
     */
    if (!file || file.projectId !== project.id) {
      throw new AppError('NOT_FOUND', 'No file with that id.');
    }

    /*
     * A customer may take back what they sent; they may not delete what we sent them. The
     * record of a delivered document is part of the project's history, and staff hold
     * `project:write:any` when something genuinely has to go.
     */
    if (file.source === 'team' && auth.user.role !== 'admin') {
      throw new AppError('NOT_FOUND', 'No file with that id.');
    }

    await service.remove(file);
    response.json(success({ deleted: true }));
  });

  return router;
}
