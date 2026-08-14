export { createProjectService, type ProjectService } from './project.service.js';
export { createMongoProjectRepository, type ProjectRepository } from './project.repository.js';
export { createProjectRouter } from './project.routes.js';
export { createProjectAccess, requireProject } from './project.access.js';
export {
  APPROVAL_STATES,
  MILESTONE_PRESENTATION,
  PROJECT_MILESTONES,
  PROJECT_STATUSES,
  milestoneIndex,
  toCustomerProjectView,
  type ApprovalState,
  type CustomerProjectView,
  type NewProjectInput,
  type ProjectMilestone,
  type ProjectStatus,
  type StoredProject,
} from './project.types.js';
