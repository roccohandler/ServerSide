/**
 * The conversation feature's public API.
 *
 * There is no repository here and no model, which is the feature's whole shape: a
 * conversation is a read model over leads and feedback, not a collection. See the header
 * of `conversation.types.ts`.
 */

export { createConversationService, type ConversationService } from './conversation.service.js';
export { createConversationRouter } from './conversation.routes.js';
export {
  CONVERSATION_KINDS,
  CONVERSATION_SOURCES,
  formatConversationId,
  parseConversationId,
  type ConversationId,
  type ConversationKind,
  type ConversationSource,
  type ConversationSummary,
} from './conversation.types.js';
