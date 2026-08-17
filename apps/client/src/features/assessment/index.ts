/** The feature's public API. Anything not exported here is a private implementation
 * detail — see docs/CUSTOMER-PLATFORM.md and the composition rules in docs/design-system.md.
 */

export {
  saveAssessmentDraft,
  readAssessmentDraft,
  clearAssessmentDraft,
  hasAssessmentDraft,
  toSubmission,
} from './draft';
export type { AssessmentDraft } from './draft';
export { assessmentFromAudit } from './fromAudit';
export { submitAssessment } from './services/assessmentApi';
