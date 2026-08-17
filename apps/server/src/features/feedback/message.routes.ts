import { Router } from 'express';
import { z } from 'zod';
import { success } from '../../lib/apiResponse.js';
import { parseBody } from '../../lib/requestSchema.js';
import { requireRequestAuth } from '../auth/index.js';
import type { FeedbackService } from './feedback.service.js';
import { COMMENT_FIELD_LIMITS, toThreadViews } from './feedback.types.js';

/*
 * ============================================================================
 * `/api/app/messages` — THE CONVERSATION WITH NO PROJECT IN IT
 * ============================================================================
 *
 * Two routes, no ids, no ownership check — and the absence of that last one is the point
 * rather than an omission. Every other private route in this application resolves a resource
 * and then asks whether the caller owns it. Here the scope *is* the caller: both handlers read
 * `auth.user.id` and neither takes an id from the request, so there is no id to substitute and
 * nothing to authorise. `createProjectAccess` exists because a project id arrives from the
 * browser; nothing arrives here.
 *
 * ## Why this is not `features/messages`
 *
 * Because a message and a change request are the same object with different scopes, and the
 * moment they are two collections they are two answers to "who is waiting on a reply" — which
 * `features/conversations` already spent real work having exactly one of. See the header of
 * `feedback.types.ts`.
 *
 * The whole console side of this feature is therefore already written. These threads reached
 * the inbox without a line changing in it.
 * ============================================================================
 */

const sendMessageSchema = z.strictObject({
  body: z
    .string()
    .trim()
    .min(1, { error: 'Write something before sending it.' })
    .max(COMMENT_FIELD_LIMITS.body),
  /** Present when continuing a thread, absent when starting one. Never two deep. */
  parentId: z.string().trim().min(1).max(64).optional(),
});

export interface MessageRoutesDependencies {
  readonly feedbackService: FeedbackService;
}

export function createMessageRouter(dependencies: MessageRoutesDependencies): Router {
  const { feedbackService } = dependencies;
  const router = Router();

  router.get('/', async (request, response) => {
    const auth = requireRequestAuth(request);
    const comments = await feedbackService.listForAccount(auth.user.id);
    response.json(success({ messages: toThreadViews(comments) }));
  });

  router.post('/', async (request, response) => {
    const auth = requireRequestAuth(request);
    const input = parseBody(sendMessageSchema, request.body);

    await feedbackService.addComment({
      scope: { kind: 'account', userId: auth.user.id },
      author: auth.user,
      body: input.body,
      parentId: input.parentId,
      /*
       * The sender is also the subject, which reads oddly until you notice the direction: a
       * `customer` comment notifies the *owner* and never the author — the rule is structural
       * in `addComment` and cannot be reached the wrong way round from here. What these three
       * fields supply is the `Reply-To` on the owner's copy, so hitting reply in a mail client
       * reaches the person who wrote it.
       *
       * There is no business name to give. That is the definition of this scope, not a missing
       * field, so the person's own name stands in — the same substitution the inbox makes for a
       * comment whose project has been deleted.
       */
      subject: {
        businessName: auth.user.name,
        email: auth.user.email,
        contactName: auth.user.name,
      },
    });

    /*
     * The whole thread back, so the client re-renders from one source of truth rather than
     * splicing a new message into a list it hopes is still current. Same contract as
     * `/projects/:id/feedback`, because it is the same object.
     */
    const comments = await feedbackService.listForAccount(auth.user.id);
    response.status(201).json(success({ messages: toThreadViews(comments) }));
  });

  return router;
}
