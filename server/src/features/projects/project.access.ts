import type { Request, RequestHandler } from 'express';
import { AppError } from '../../lib/appError.js';
import { pathParam } from '../../lib/requestSchema.js';
import { authorizeOwnership, requireRequestAuth } from '../auth/index.js';
import type { ProjectService } from './project.service.js';
import type { StoredProject } from './project.types.js';

/*
 * ============================================================================
 * ONE PLACE THAT DECIDES WHETHER YOU MAY TOUCH A PROJECT
 * ============================================================================
 *
 * Tasks, comments, deployments and approvals are all reached through a project id in
 * the URL. Each of those could do its own ownership check, and the fourth one written
 * would be the one that forgot.
 *
 * So the check happens once, in middleware, and every nested router mounts underneath
 * it with `mergeParams`. A route that renders a task cannot be reached without the
 * project having been resolved and authorized first, because the middleware is the
 * thing that put it on the request.
 *
 * Staff pass through by holding `project:read:any` — never by an inline role check.
 * ============================================================================
 */

declare module 'express-serve-static-core' {
  interface Request {
    /** Set by `createProjectAccess`. Present only after a successful ownership check. */
    project?: StoredProject;
  }
}

const NOT_FOUND = 'No project with that id.';

/**
 * Resolves `:projectId` and authorizes it against the session.
 *
 * `write` picks which capability staff need to bypass ownership: reading somebody's
 * project and changing it are different privileges, and a read-only staff role becomes
 * possible later without revisiting every route.
 */
export function createProjectAccess(
  projectService: ProjectService,
  mode: 'read' | 'write' = 'read',
): RequestHandler {
  return (request, _response, next) => {
    void (async () => {
      try {
        const auth = requireRequestAuth(request);
        const projectId = pathParam(request.params, 'projectId');

        request.project = authorizeOwnership({
          record: await projectService.findById(projectId),
          ownerId: (project) => project.ownerUserId,
          auth,
          overrideCapability: mode === 'write' ? 'project:write:any' : 'project:read:any',
          missingMessage: NOT_FOUND,
        });

        next();
      } catch (error) {
        next(error);
      }
    })();
  };
}

/** The project on a resolved request, or a throw. Keeps handlers free of assertions. */
export function requireProject(request: Request): StoredProject {
  if (!request.project) {
    throw new AppError('NOT_FOUND', NOT_FOUND);
  }
  return request.project;
}
