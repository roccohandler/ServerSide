import { ReportModel, toStoredReport } from './report.model.js';
import type { NewReportRecord, StoredReport } from './report.types.js';

export interface ReportRepository {
  /**
   * Writes the month's report, creating it or replacing the draft that was there.
   *
   * An upsert rather than a create, because `{ projectId, month }` is unique and an operator
   * saving a draft eight times is the normal case. `publishedAt` is deliberately never
   * touched here — publication is its own operation, so a re-save cannot un-publish and
   * cannot publish either.
   */
  save(record: NewReportRecord): Promise<StoredReport>;
  findById(id: string): Promise<StoredReport | null>;
  findForProjectMonth(projectId: string, month: string): Promise<StoredReport | null>;
  /** Published only, newest first. What the customer's Reports screen reads. */
  listPublishedForUser(userId: string, limit: number): Promise<readonly StoredReport[]>;
  /** Everything for one project, drafts included, newest first. The console's list. */
  listForProject(projectId: string, limit: number): Promise<readonly StoredReport[]>;
  publish(id: string, publishedAt: Date): Promise<StoredReport | null>;
  /**
   * Which of these projects already have a published report for this month.
   *
   * A set rather than a per-project query, because the overdue check runs across every live
   * project at once and the alternative is one round trip per row — the shape
   * `findUserIdsWithRequests` already established on the accounts list.
   */
  findProjectIdsPublishedFor(
    projectIds: readonly string[],
    month: string,
  ): Promise<ReadonlySet<string>>;
}

export interface MongoReportRepositoryDependencies {
  readonly connect: () => Promise<void>;
}

const OBJECT_ID = /^[a-f\d]{24}$/i;

export function createMongoReportRepository(
  dependencies: MongoReportRepositoryDependencies,
): ReportRepository {
  const { connect } = dependencies;

  return {
    async save(record) {
      await connect();

      const document = await ReportModel.findOneAndUpdate(
        { projectId: record.projectId, month: record.month },
        {
          $set: {
            userId: record.userId,
            enquiries: record.enquiries,
            changeExplanation: record.changeExplanation,
            whatWeChanged: [...record.whatWeChanged],
            whatIsNext: [...record.whatIsNext],
            preparedBy: record.preparedBy,
            ...(record.baseline === undefined ? {} : { baseline: record.baseline }),
          },
          ...(record.baseline === undefined ? { $unset: { baseline: 1 } } : {}),
        },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
      )
        .lean()
        .exec();

      return toStoredReport(document);
    },

    async findById(id) {
      await connect();
      if (!OBJECT_ID.test(id)) return null;
      const document = await ReportModel.findById(id).lean().exec();
      return document ? toStoredReport(document) : null;
    },

    async findForProjectMonth(projectId, month) {
      await connect();
      const document = await ReportModel.findOne({ projectId, month }).lean().exec();
      return document ? toStoredReport(document) : null;
    },

    async listPublishedForUser(userId, limit) {
      await connect();
      const documents = await ReportModel.find({ userId, publishedAt: { $ne: null } })
        .sort({ month: -1 })
        .limit(limit)
        .lean()
        .exec();
      return documents.map(toStoredReport);
    },

    async listForProject(projectId, limit) {
      await connect();
      const documents = await ReportModel.find({ projectId })
        .sort({ month: -1 })
        .limit(limit)
        .lean()
        .exec();
      return documents.map(toStoredReport);
    },

    async publish(id, publishedAt) {
      await connect();
      if (!OBJECT_ID.test(id)) return null;

      const document = await ReportModel.findByIdAndUpdate(
        id,
        { $set: { publishedAt } },
        { new: true },
      )
        .lean()
        .exec();

      return document ? toStoredReport(document) : null;
    },

    async findProjectIdsPublishedFor(projectIds, month) {
      await connect();
      if (projectIds.length === 0) return new Set();

      const documents = await ReportModel.find({
        projectId: { $in: [...projectIds] },
        month,
        publishedAt: { $ne: null },
      })
        .select({ projectId: 1 })
        .lean()
        .exec();

      return new Set(documents.map((document) => document.projectId));
    },
  };
}
