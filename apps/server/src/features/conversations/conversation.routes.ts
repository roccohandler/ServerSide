import { Router } from 'express';
import { z } from 'zod';
import { success } from '../../lib/apiResponse.js';
import { parseBody, parseQuery, pathParam } from '../../lib/requestSchema.js';
import { requireCapability, requireRequestAuth } from '../auth/index.js';
import { COMMENT_FIELD_LIMITS } from '../feedback/index.js';
import { parseConversationId } from './conversation.types.js';
import type { ConversationService } from './conversation.service.js';

export interface ConversationRoutesDependencies {
  readonly conversationService: ConversationService;
}

const listQuerySchema = z.object({
  /* 500 rather than 200, matching `admin.routes.ts` — the console raises its own limit fifty
     at a time and a ceiling it can reach in three presses is another dead end. */
  limit: z.coerce.number().int().min(1).max(500).default(50),
});

/*
 * The same bound as a comment body, taken from the feedback feature rather than typed
 * again — a reply to a customer *becomes* a comment, so two numbers here would mean a
 * message the console accepts and the collection then refuses.
 */
const replySchema = z.strictObject({
  body: z.string().trim().min(1).max(COMMENT_FIELD_LIMITS.body),
});

/**
 * `/api/admin/conversations`.
 *
 * Mounted inside the admin router, so `requireAdmin` has already run and a customer
 * probing this path was answered NOT_FOUND before reaching any of it. The capability
 * check below is the second layer, and it is the one that will still be right the day a
 * staff role narrower than "admin" exists — see the note on the accounts route.
 *
 * Both endpoints are staff-only by construction: neither takes an owner id, because
 * neither is scoped to one. Crossing customer boundaries is what the console is for, and
 * the mount is what makes that legible rather than a flag somebody has to remember.
 */
export function createConversationRouter(dependencies: ConversationRoutesDependencies): Router {
  const { conversationService } = dependencies;
  const router = Router();

  router.get('/', requireCapability('customer:read:any'), async (request, response) => {
    const { limit } = parseQuery(listQuerySchema, request.query);
    const { conversations, hasMore } = await conversationService.list(limit);

    /*
     * `hasMore` rather than a total. The console's only question is "is this everybody?", and
     * it used to answer it by comparing the row count against the limit it asked for — which
     * is wrong when exactly fifty people are waiting, and wrong the other way when one source
     * was cut and the other was not.
     */
    response.json(success({ conversations, hasMore }));
  });

  /*
   * `feedback:write:any` rather than the read capability: sending a reply writes a
   * comment onto somebody's project, and a role that may read the inbox is not
   * automatically a role that may answer it in the business's name.
   */
  router.post(
    '/:id/replies',
    requireCapability('feedback:write:any'),
    async (request, response) => {
      const auth = requireRequestAuth(request);
      const id = parseConversationId(pathParam(request.params, 'id'));
      const { body } = parseBody(replySchema, request.body);

      await conversationService.reply({ id, author: auth.user, body });

      /*
       * 204, and deliberately not the updated list. The console reloads after a successful
       * send, which is one more request and one fewer way for this endpoint to be the place
       * two people's inboxes are assembled.
       */
      response.status(204).end();
    },
  );

  return router;
}
