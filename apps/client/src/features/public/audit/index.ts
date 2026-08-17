/** The feature's public API. Anything not exported here is a private implementation
 * detail — see docs/CUSTOMER-PLATFORM.md and the composition rules in docs/design-system.md.
 */

export { AuditPage } from './AuditPage';
/* The private assessment reuses the audit's scoring hook and its scorecard rendering. */
export { useAudit } from './useAudit';
export type { UseAuditResult, FunnelInputs, FunnelField, Scenario } from './useAudit';
export { AuditScorecard } from './components/AuditScorecard';
