/**
 * Demo Mode's public API.
 *
 * See the header of `demo.types.ts` for what this feature is and the one decision everything
 * follows from — DECISION 033, a demo customer is a customer.
 *
 * `demo.seed.ts` and `demo.repository.ts` are deliberately absent. The seeder is the only
 * writer of the `demo` flag and the repository is the only thing in the application that can
 * delete an account's records wholesale; neither is something another feature should be one
 * import away from.
 */
export { createDemoService, type DemoService } from './demo.service.js';
export { createMongoDemoRepository, type DemoRepository } from './demo.repository.js';
export { createDemoRouter } from './demo.routes.js';
export {
  DEMO_BUSINESS,
  DEMO_EMAIL,
  DEMO_FEEDBACK_CATEGORIES,
  DEMO_NAME,
  toDemoFeedbackView,
  type DemoFeedbackCategory,
  type DemoFeedbackView,
  type StoredDemoFeedback,
} from './demo.types.js';
