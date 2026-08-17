/**
 * The reports feature's public API.
 *
 * Growth Partner's monthly deliverable. See the header of `report.types.ts` for what a report
 * is, what it deliberately is not, and the one sentence this feature must never write.
 */
export { createReportService, type ReportService } from './report.service.js';
export { createMongoReportRepository, type ReportRepository } from './report.repository.js';
export { createReportRouter } from './report.routes.js';
export { parseSaveReport } from './report.schema.js';
export {
  REPORT_FIELD_LIMITS,
  REPORT_MONTH,
  monthLabel,
  monthOf,
  previousMonth,
  toAdminReportView,
  toReportView,
  type AdminReportView,
  type NewReportRecord,
  type ReportView,
  type StoredReport,
} from './report.types.js';
