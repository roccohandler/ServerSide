import { AppError } from '../../lib/appError.js';
import type { Logger } from '../../lib/logger.js';
import type { ActivityRecorder } from '../activity/index.js';
import { noopNotifier, type NotificationRecipient, type Notifier } from '../notifications/index.js';
import type { ReportRepository } from './report.repository.js';
import {
  monthLabel,
  monthOf,
  previousMonth,
  type NewReportRecord,
  type StoredReport,
} from './report.types.js';

/**
 * How many months of grace before a missing report counts as overdue.
 *
 * One. A report covering August cannot be written in August — the month has to finish first —
 * so the honest deadline is "some time in September", and flagging it on 1 September would
 * mean the warning is on screen for the whole month it is being written in. It turns amber
 * once October starts, which is the first moment the commitment has actually been missed.
 */
const OVERDUE_AFTER_MONTHS = 1;

export interface ReportService {
  listPublishedForUser(userId: string, limit: number): Promise<readonly StoredReport[]>;
  listForProject(projectId: string, limit: number): Promise<readonly StoredReport[]>;
  findById(id: string): Promise<StoredReport | null>;
  /** Saves a draft, or corrects a published one. Never changes whether it is out. */
  save(record: NewReportRecord): Promise<StoredReport>;
  /**
   * Publishes it: stamps the date, tells the customer, writes the activity entry.
   *
   * Publishing twice is a no-op rather than a second email, exactly as delivering an
   * assessment review twice is.
   */
  publish(params: {
    readonly report: StoredReport;
    readonly to: NotificationRecipient;
    readonly businessName: string;
  }): Promise<StoredReport>;
  /**
   * Which of these projects owe a report, and for which month.
   *
   * DECISION 015 calls the report a monthly operational commitment. This is the only thing in
   * the system that measures it — and a commitment nothing measures is one that quietly stops.
   */
  findOverdue(
    projectIds: readonly string[],
  ): Promise<readonly { readonly projectId: string; readonly month: string }[]>;
}

export interface ReportServiceDependencies {
  readonly repository: ReportRepository;
  readonly activity: ActivityRecorder;
  readonly logger: Logger;
  readonly notifier?: Notifier | undefined;
  readonly now?: () => Date;
}

export function createReportService(dependencies: ReportServiceDependencies): ReportService {
  const { repository, activity, logger } = dependencies;
  const notifier = dependencies.notifier ?? noopNotifier;
  const now = dependencies.now ?? (() => new Date());

  return {
    listPublishedForUser: (userId, limit) => repository.listPublishedForUser(userId, limit),
    listForProject: (projectId, limit) => repository.listForProject(projectId, limit),
    findById: (id) => repository.findById(id),

    async save(record) {
      /*
       * Refused rather than clamped. A report for a month that has not finished would be
       * counting enquiries that have not happened yet, and the number it published would be
       * wrong in a way the customer has no way to see.
       */
      if (record.month >= monthOf(now())) {
        throw new AppError(
          'VALIDATION_ERROR',
          'That month has not finished yet, so there is nothing to report on.',
        );
      }

      const saved = await repository.save(record);
      logger.info('report.saved', {
        reportId: saved.id,
        projectId: saved.projectId,
        month: saved.month,
      });
      return saved;
    },

    async publish({ report, to, businessName }) {
      if (report.publishedAt) return report;

      const published = await repository.publish(report.id, now());
      if (!published) throw new AppError('NOT_FOUND', 'No report with that id.');

      logger.info('report.published', {
        reportId: report.id,
        projectId: report.projectId,
        month: report.month,
      });

      /*
       * The summary names the month and nothing about the result. Same discipline as the
       * email's subject line: a timeline entry saying enquiries rose is a claim this side
       * does not get to make automatically, and the month it is wrong is the month it does
       * the most damage.
       */
      await activity.record({
        type: 'report.published',
        summary: `Your ${monthLabel(report.month)} website report is ready.`,
        audience: 'customer',
        projectId: report.projectId,
        userId: report.userId,
      });

      await notifier.reportPublished({
        to,
        businessName,
        monthLabel: monthLabel(report.month),
      });

      return published;
    },

    async findOverdue(projectIds) {
      if (projectIds.length === 0) return [];

      /*
       * The month being asked about is the one before last, not last month. See
       * `OVERDUE_AFTER_MONTHS`: a report covering August is written in September, so it is
       * only actually late once October has started.
       */
      let month = monthOf(now());
      for (let step = 0; step <= OVERDUE_AFTER_MONTHS; step += 1) month = previousMonth(month);

      const published = await repository.findProjectIdsPublishedFor(projectIds, month);

      return projectIds
        .filter((projectId) => !published.has(projectId))
        .map((projectId) => ({ projectId, month }));
    },
  };
}
