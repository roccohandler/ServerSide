export { createFollowUpService, FOLLOWUP_BATCH, type FollowUpService } from './followup.service.js';
export { createMongoFollowUpRepository, type FollowUpRepository } from './followup.repository.js';
export { createFollowUpCronRouter, createUnsubscribeRouter } from './followup.routes.js';
export {
  FOLLOWUP_CAP,
  FOLLOWUP_RULES,
  ruleFor,
  type FollowUpCandidate,
  type FollowUpRule,
} from './followup.types.js';
