/**
 * The project feature's public API — and the lifecycle vocabulary the rest of the server
 * speaks. Billing, deployments, the dashboard and admin all read the milestone model from
 * here rather than from `project.types.js`, so there is one place to look for what a
 * project *is*.
 */

export { createProjectService, type ProjectService } from './project.service.js';
export { createMongoProjectRepository, type ProjectRepository } from './project.repository.js';
export { createProjectRouter } from './project.routes.js';
export { createProjectAccess, requireProject } from './project.access.js';

/* The stored shape. Billing writes to it, so it needs the model and its mapper. */
export { ProjectModel, toStoredProject } from './project.model.js';

/* Request parsing, used by the admin routes for the owner-side operations. */
export {
  parseAddTask,
  parseCreateProject,
  parseListQuery,
  parseSetDeploymentUrl,
  parseSendScope,
  parseSetEstimate,
  parseSetMilestone,
  parseSetProjectOwner,
  parseUndoMilestone,
  parseUpdateProjectDetails,
} from './project.schema.js';

export {
  APPROVAL_STATES,
  MILESTONE_PRESENTATION,
  PAYMENT_STATUSES,
  PROJECT_FIELD_LIMITS,
  PROJECT_MILESTONES,
  PROJECT_STATUSES,
  SUBSCRIPTION_STATUSES,
  SCOPE_FIELD_LIMITS,
  isLegalMilestoneMove,
  INCLUDED_REVISION_ROUNDS,
  milestoneIndex,
  scopeAccepted,
  scopeAllowsSelfServeDeposit,
  toCustomerScopeView,
  toCustomerProjectView,
  type ApprovalState,
  type CustomerProjectView,
  type CustomerScopeView,
  type NewProjectInput,
  type NewProjectRecord,
  type PaymentStatus,
  type ProjectMilestone,
  type ProjectScope,
  type ProjectStatus,
  type ProjectUpdate,
  type ScopeInput,
  type StoredProject,
  type SubscriptionStatus,
  type VerifiedStripeEvent,
} from './project.types.js';
