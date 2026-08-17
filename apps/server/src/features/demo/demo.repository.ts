import mongoose, { Schema, type Model } from 'mongoose';
import { ActivityModel } from '../activity/activity.model.js';
import { AssessmentModel } from '../assessments/assessment.model.js';
import { DeploymentModel } from '../deployments/deployment.model.js';
import { CommentModel } from '../feedback/feedback.model.js';
import { FileModel } from '../files/file.model.js';
import { LeadModel } from '../leads/lead.model.js';
import { ProjectModel } from '../projects/project.model.js';
import { ReportModel } from '../reports/report.model.js';
import { TaskModel } from '../tasks/task.model.js';
import {
  DEMO_FEEDBACK_CATEGORIES,
  DEMO_FEEDBACK_LIMITS,
  type DemoFeedbackCategory,
  type NewDemoFeedbackRecord,
  type StoredDemoFeedback,
} from './demo.types.js';

/*
 * ============================================================================
 * THE ONE PLACE THAT DELETES A WHOLE ACCOUNT'S RECORDS
 * ============================================================================
 *
 * Reset is the operation that makes a shared demonstration usable: whoever comes next gets
 * the dataset the tour was written against, however thoroughly the last person rearranged it.
 *
 * ## Why this reaches models directly rather than adding `deleteByOwner` to nine repositories
 *
 * Because that is nine new destructive methods on nine interfaces that nothing else wants, and
 * every one of them would be callable from anywhere in the application. The capability to
 * delete every row belonging to an account is exactly the capability that should exist in one
 * file, be reachable from one service, and be scoped in one place somebody can read in full.
 *
 * That is a genuine departure from the layering, and it is the narrowest version of it: this
 * module cannot read anything, cannot update anything, and every query it makes is keyed on
 * an `ownerUserId`, a `userId`, or a project id already resolved from one of those.
 *
 * ## Scoped by ownership, which is the same scoping the security boundary uses
 *
 * Nothing here can reach a record it could not have read. The project ids are resolved *from*
 * the demo account, and everything project-scoped is deleted by those ids — so a reset cannot
 * touch a real customer even if the demo account somehow held a stranger's project id, because
 * the query that produced the list was `{ ownerUserId: demoUserId }`.
 *
 * ## What is deliberately not deleted
 *
 * The account, its sessions, and its demo feedback. Deleting the account would mean the next
 * person through `/promo` gets a different user id and any link somebody pasted stops
 * resolving; deleting sessions would sign out the person who pressed Reset. Feedback is the
 * point of the exercise and survives on purpose — a reset that threw away the bug report
 * somebody had just filed would be the worst possible behaviour.
 * ============================================================================
 */

export interface DemoRepository {
  /**
   * Deletes every record the demonstration account owns, across the collections the seed
   * writes. Returns how many rows went, which is what `demo.reset` logs.
   */
  purge(userId: string): Promise<number>;
  recordFeedback(record: NewDemoFeedbackRecord): Promise<StoredDemoFeedback>;
  listFeedback(limit: number): Promise<readonly StoredDemoFeedback[]>;
}

export interface DemoFeedbackDocument {
  body: string;
  category: DemoFeedbackCategory;
  route: string;
  createdAt: Date;
  updatedAt: Date;
}

/*
 * Its own collection, and the one place this feature stores anything of its own.
 *
 * It is not `features/feedback`, and the distinction is not pedantry: a comment there is a
 * customer talking about *their project* and lands in the console inbox as somebody waiting
 * for a reply. This is a tester saying a button was confusing. One definition of "awaiting
 * reply" is a rule `features/conversations` already fought for, and a demo note is not one.
 *
 * No author. The passcode is shared, there is no per-tester identity, and inventing one would
 * be a second authentication system bought to attribute a sentence nobody is replying to.
 */
const demoFeedbackSchema = new Schema<DemoFeedbackDocument>(
  {
    body: { type: String, required: true, trim: true, maxlength: DEMO_FEEDBACK_LIMITS.body },
    category: { type: String, required: true, enum: DEMO_FEEDBACK_CATEGORIES },
    route: { type: String, required: true, trim: true, maxlength: DEMO_FEEDBACK_LIMITS.route },
  },
  { timestamps: true },
);

demoFeedbackSchema.index({ createdAt: -1 });

export const DemoFeedbackModel: Model<DemoFeedbackDocument> =
  (mongoose.models['DemoFeedback'] as Model<DemoFeedbackDocument> | undefined) ??
  mongoose.model<DemoFeedbackDocument>('DemoFeedback', demoFeedbackSchema);

function toStoredDemoFeedback(
  document: DemoFeedbackDocument & { _id: unknown },
): StoredDemoFeedback {
  return {
    id: String(document._id),
    body: document.body,
    category: document.category,
    route: document.route,
    createdAt: document.createdAt,
  };
}

export interface MongoDemoRepositoryDependencies {
  readonly connect: () => Promise<void>;
}

export function createMongoDemoRepository(
  dependencies: MongoDemoRepositoryDependencies,
): DemoRepository {
  const { connect } = dependencies;

  return {
    async purge(userId) {
      await connect();

      /*
       * The project ids first, from the ownership filter. Everything project-scoped below is
       * deleted by this list rather than by a second guess at what belongs to whom.
       */
      const owned = await ProjectModel.find({ ownerUserId: userId })
        .select({ _id: 1 })
        .lean()
        .exec();
      const projectIds = owned.map((project) => String(project._id));

      const results = await Promise.all([
        ProjectModel.deleteMany({ ownerUserId: userId }).exec(),
        TaskModel.deleteMany({ userId }).exec(),
        ActivityModel.deleteMany({ userId }).exec(),
        AssessmentModel.deleteMany({ userId }).exec(),
        ReportModel.deleteMany({ userId }).exec(),
        LeadModel.deleteMany({ userId }).exec(),
        ...(projectIds.length > 0
          ? [
              CommentModel.deleteMany({ projectId: { $in: projectIds } }).exec(),
              DeploymentModel.deleteMany({ projectId: { $in: projectIds } }).exec(),
              /*
               * The rows, not the bytes. A demo file's blob is orphaned by this and that is
               * accepted: the seed uploads nothing, so the only files here are ones a tester
               * put there themselves, and reaching the store would give this module a
               * dependency on infrastructure it otherwise has no business holding.
               */
              FileModel.deleteMany({ projectId: { $in: projectIds } }).exec(),
            ]
          : []),
      ]);

      return results.reduce((total, result) => total + result.deletedCount, 0);
    },

    async recordFeedback(record) {
      await connect();
      const document = await DemoFeedbackModel.create({ ...record });
      return toStoredDemoFeedback(document.toObject());
    },

    async listFeedback(limit) {
      await connect();
      const documents = await DemoFeedbackModel.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean()
        .exec();
      return documents.map(toStoredDemoFeedback);
    },
  };
}
