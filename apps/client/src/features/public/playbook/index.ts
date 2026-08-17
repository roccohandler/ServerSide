/** The feature's public API. Anything not exported here is a private implementation
 * detail — see docs/CUSTOMER-PLATFORM.md and the composition rules in docs/design-system.md.
 */

export { PlayBookPage } from './PlayBookPage';
export { WorkbookPage } from './WorkbookPage';
/* The website-score model is the audit's and the assessment's shared vocabulary. */
export { useWebsiteScore, bandFor, WEAKEST_COUNT } from './useWebsiteScore';
export type {
  CategoryScore,
  ScoreMap,
  WeakCategory,
  UseWebsiteScoreResult,
} from './useWebsiteScore';
export { stageAnchor } from './stageAnchor';
