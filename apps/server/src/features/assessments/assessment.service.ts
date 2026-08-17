import { AppError } from '../../lib/appError.js';
import { describeError, type Logger } from '../../lib/logger.js';
import type { EmailService } from '../../infrastructure/email/email.service.js';
import type { ActivityRecorder } from '../activity/index.js';
import type { StoredUser } from '../auth/index.js';
import { buildAssessmentNotificationEmail } from './assessment.email.js';
import type { AssessmentRepository } from './assessment.repository.js';
import {
  scoreAssessment,
  type AssessmentSubmission,
  type StoredAssessment,
} from './assessment.types.js';

/**
 * A resubmission inside this window is treated as the same assessment arriving twice.
 *
 * Five minutes covers the failure this exists for — a double-click, or a retry after a
 * flaky connection — and does not get in the way of somebody legitimately reassessing
 * their website after making changes to it.
 */
export const DUPLICATE_SUBMISSION_WINDOW_MS = 5 * 60 * 1000;

export interface AssessmentService {
  /**
   * Stores a completed assessment against the account that submitted it.
   *
   * The account is not a parameter a caller chooses — it comes from the session. There
   * is no route that accepts a `userId`, which is what makes "an assessment belongs to
   * whoever submitted it" a property of the system rather than a convention.
   */
  submit(params: {
    readonly user: StoredUser;
    readonly submission: AssessmentSubmission;
  }): Promise<{ readonly assessment: StoredAssessment; readonly duplicate: boolean }>;
  findById(id: string): Promise<StoredAssessment | null>;
  listForUser(userId: string, limit: number): Promise<readonly StoredAssessment[]>;
  findLatestForUser(userId: string): Promise<StoredAssessment | null>;
}

export interface AssessmentServiceDependencies {
  readonly repository: AssessmentRepository;
  readonly activity: ActivityRecorder;
  readonly emailService: EmailService;
  /** Undefined when no notification address is configured; the assessment still saves. */
  readonly notificationRecipient: string | undefined;
  readonly logger: Logger;
  readonly now?: () => Date;
}

export function createAssessmentService(
  dependencies: AssessmentServiceDependencies,
): AssessmentService {
  const { repository, activity, emailService, notificationRecipient, logger } = dependencies;
  const now = dependencies.now ?? (() => new Date());

  return {
    async submit({ user, submission }) {
      /*
       * A double-submit returns the assessment that already landed rather than storing
       * a second one. The alternative — a unique index — would also block the honest
       * case of reassessing later, and refusing outright would show an error to
       * somebody whose only mistake was clicking twice on a slow connection.
       */
      const recent = await repository.findRecentForUser(
        user.id,
        new Date(now().getTime() - DUPLICATE_SUBMISSION_WINDOW_MS),
      );

      if (recent) {
        logger.info('assessment.duplicate_ignored', { userId: user.id, assessmentId: recent.id });
        return { assessment: recent, duplicate: true };
      }

      if (submission.answers.length === 0) {
        throw new AppError(
          'VALIDATION_ERROR',
          'An assessment needs at least one answer before it can be sent.',
        );
      }

      // Scored here, from the answers, every time. A score in the request body would be
      // a number the browser chose, and this one ends up in a sales conversation.
      const result = scoreAssessment(submission.answers);
      const submittedAt = now();

      const assessment = await repository.create({
        ...submission,
        userId: user.id,
        status: 'submitted',
        score: result.score,
        band: result.band,
        weakestCategories: result.weakestCategories,
        recommendations: result.recommendations,
        submittedAt,
      });

      logger.info('assessment.submitted', {
        userId: user.id,
        assessmentId: assessment.id,
        score: result.score,
      });

      await activity.record({
        type: 'assessment.submitted',
        summary: `Your website assessment scored ${result.score} out of 100.`,
        audience: 'customer',
        userId: user.id,
      });

      /*
       * Notify-after-persist, the same trade the lead service makes. The assessment is
       * the asset; a lost notification is recoverable from the dashboard, and failing
       * the submission over an email failure would lose the thing worth keeping.
       */
      if (notificationRecipient) {
        try {
          await emailService.send(
            buildAssessmentNotificationEmail({
              assessment,
              user,
              recipient: notificationRecipient,
            }),
          );
        } catch (error) {
          logger.error('assessment.notification_failed', describeError(error));
        }
      }

      return { assessment, duplicate: false };
    },

    findById: (id) => repository.findById(id),
    listForUser: (userId, limit) => repository.listForUser(userId, limit),
    findLatestForUser: (userId) => repository.findLatestForUser(userId),
  };
}
