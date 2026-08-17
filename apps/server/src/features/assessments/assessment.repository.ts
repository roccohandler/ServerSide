import { AssessmentModel, toStoredAssessment } from './assessment.model.js';
import type {
  AssessmentReport,
  NewAssessmentRecord,
  StoredAssessment,
} from './assessment.types.js';

export interface AssessmentRepository {
  create(record: NewAssessmentRecord): Promise<StoredAssessment>;
  findById(id: string): Promise<StoredAssessment | null>;
  /** Most recent first. The dashboard shows the newest; the list is the history. */
  listForUser(userId: string, limit: number): Promise<readonly StoredAssessment[]>;
  findLatestForUser(userId: string): Promise<StoredAssessment | null>;
  /**
   * The most recent submission from this account within the window, used to collapse a
   * double-submit. Deliberately time-boxed rather than "one assessment ever": a business
   * re-assessing after six months of changes is a legitimate and useful thing to do.
   */
  findRecentForUser(userId: string, since: Date): Promise<StoredAssessment | null>;
  /**
   * Writes the whole report in one go, draft or delivered.
   *
   * One method rather than `saveDraft` and `markDelivered`, because the second would be a
   * partial update of an embedded document and those are where "the summary reverted to
   * what it said an hour ago" comes from. The service decides which shape it is handing
   * over; storage just puts it down.
   */
  saveReport(id: string, report: AssessmentReport): Promise<StoredAssessment | null>;
  /**
   * The queue. Everything with no *delivered* review, oldest first.
   *
   * Oldest first rather than newest, unlike every other list in this repository, and the
   * difference is the point: this is work waiting to be done, and the person who has been
   * waiting longest is the one being let down.
   */
  listAwaitingReport(limit: number): Promise<readonly StoredAssessment[]>;
  /** How many are waiting. The console badge, and the worklist's number. */
  countAwaitingReport(): Promise<number>;
}

export interface MongoAssessmentRepositoryDependencies {
  readonly connect: () => Promise<void>;
}

const OBJECT_ID = /^[a-f\d]{24}$/i;

export function createMongoAssessmentRepository(
  dependencies: MongoAssessmentRepositoryDependencies,
): AssessmentRepository {
  const { connect } = dependencies;

  return {
    async create(record) {
      await connect();
      /* Mongoose types `create` against a mutable document; the domain record keeps its
       * arrays readonly. One shallow copy at the boundary rather than weakening the type. */
      const document = await AssessmentModel.create({
        ...record,
        answers: [...record.answers],
        weakestCategories: [...record.weakestCategories],
        recommendations: [...record.recommendations],
      });
      return toStoredAssessment(document.toObject());
    },

    async findById(id) {
      await connect();
      if (!OBJECT_ID.test(id)) return null;
      const document = await AssessmentModel.findById(id).lean().exec();
      return document ? toStoredAssessment(document) : null;
    },

    async listForUser(userId, limit) {
      await connect();
      const documents = await AssessmentModel.find({ userId })
        .sort({ submittedAt: -1 })
        .limit(limit)
        .lean()
        .exec();
      return documents.map(toStoredAssessment);
    },

    async findLatestForUser(userId) {
      await connect();
      const document = await AssessmentModel.findOne({ userId })
        .sort({ submittedAt: -1 })
        .lean()
        .exec();
      return document ? toStoredAssessment(document) : null;
    },

    async findRecentForUser(userId, since) {
      await connect();
      const document = await AssessmentModel.findOne({ userId, submittedAt: { $gte: since } })
        .sort({ submittedAt: -1 })
        .lean()
        .exec();
      return document ? toStoredAssessment(document) : null;
    },

    async saveReport(id, report) {
      await connect();
      if (!OBJECT_ID.test(id)) return null;

      const document = await AssessmentModel.findByIdAndUpdate(
        id,
        {
          $set: {
            report: {
              summary: report.summary,
              findings: report.findings.map((finding) => ({ ...finding })),
              recommendations: [...report.recommendations],
              preparedBy: report.preparedBy,
              ...(report.deliveredAt ? { deliveredAt: report.deliveredAt } : {}),
            },
          },
        },
        { new: true },
      )
        .lean()
        .exec();

      return document ? toStoredAssessment(document) : null;
    },

    async listAwaitingReport(limit) {
      await connect();
      const documents = await AssessmentModel.find({
        'report.deliveredAt': { $in: [null, undefined] },
      })
        .sort({ submittedAt: 1 })
        .limit(limit)
        .lean()
        .exec();
      return documents.map(toStoredAssessment);
    },

    async countAwaitingReport() {
      await connect();
      return AssessmentModel.countDocuments({
        'report.deliveredAt': { $in: [null, undefined] },
      }).exec();
    },
  };
}
