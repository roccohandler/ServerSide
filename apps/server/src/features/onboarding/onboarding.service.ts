import { describeError, redactEmail, type Logger } from '../../lib/logger.js';
import type { EmailService } from '../../infrastructure/email/email.service.js';
import { noopNotifier, type Notifier } from '../notifications/index.js';
import { buildOnboardingNotificationEmail } from './onboarding.email.js';
import type { OnboardingRepository } from './onboarding.repository.js';
import type {
  OnboardingOutcome,
  StoredOnboarding,
  ValidatedOnboardingInput,
} from './onboarding.types.js';

/** Where the submission came from. One value today; the field makes a second one cheap. */
export const ONBOARDING_SOURCE = 'welcome-page';

export interface OnboardingService {
  submit(input: ValidatedOnboardingInput): Promise<OnboardingOutcome>;
  /** Submissions that matched no project. The console's worklist. */
  listUnmatched(limit: number): Promise<readonly StoredOnboarding[]>;
  /** The material behind one project, for the panel that finally puts it on screen. */
  findForProject(projectId: string): Promise<StoredOnboarding | null>;
  /** The manual match, for when the addresses genuinely differ. */
  attachToProject(params: {
    readonly onboardingId: string;
    readonly projectId: string;
  }): Promise<StoredOnboarding | null>;
}

export interface OnboardingServiceDependencies {
  readonly repository: OnboardingRepository;
  readonly emailService: EmailService;
  /** Undefined when no notification address is configured; submissions are still stored. */
  readonly notificationRecipient: string | undefined;
  /**
   * Finds the project this submission belongs to, by address.
   *
   * A function rather than `ProjectService`, and the narrowness is the point: this feature has
   * no business reading, creating or moving a project. It needs one id, and the only thing it
   * can do with this dependency is ask for one.
   *
   * Optional, because the matching is an improvement on storing-and-emailing rather than a
   * replacement for it — without it every submission is simply unmatched, which is exactly
   * where this feature was before.
   */
  readonly findProjectIdByEmail?: ((email: string) => Promise<string | undefined>) | undefined;
  /** Tells the owner about a submission that matched nothing. Digest-tier — see the kinds. */
  readonly notifier?: Notifier | undefined;
  readonly logger: Logger;
}

/**
 * Business rules for an onboarding submission. Persist first, notify second — the same
 * trade as the lead service, for the same reason: the submission is the asset, and a
 * failed email must never lose a paying client's materials.
 */
export function createOnboardingService(
  dependencies: OnboardingServiceDependencies,
): OnboardingService {
  const { repository, emailService, notificationRecipient, findProjectIdByEmail, logger } =
    dependencies;
  const notifier = dependencies.notifier ?? noopNotifier;

  return {
    listUnmatched: (limit) => repository.listUnmatched(limit),
    findForProject: (projectId) => repository.findForProject(projectId),
    attachToProject: ({ onboardingId, projectId }) =>
      repository.attachProject(onboardingId, projectId),

    async submit(input) {
      if (input.isBotSubmission) {
        // Nothing stored, nothing sent; the caller still sees success so a bot cannot
        // learn the honeypot exists.
        logger.warn('onboarding.rejected_honeypot');
        return { kind: 'discarded', reason: 'honeypot' };
      }

      const { isBotSubmission: _ignored, ...record } = input;

      /*
       * ==========================================================================
       * MATCHED ON ARRIVAL, BY ADDRESS, AND NEVER FAILING THE SUBMISSION
       * ==========================================================================
       *
       * This is the whole of the linking. The address a client onboards with is almost always
       * the address they paid with, because both come from the same person filling in the same
       * kind of form on the same afternoon — so one indexed lookup connects a paying project to
       * the material it is built from.
       *
       * Wrapped, because a match is a convenience and the submission is the asset. The same
       * argument the notification below has always made, one step earlier: a database blip in
       * the *lookup* must not lose a paying client's services, service areas and photo notes.
       * An unmatched submission is a fully working outcome — it is stored, the owner is told,
       * and the console offers a manual match.
       */
      let projectId: string | undefined;

      if (findProjectIdByEmail) {
        try {
          projectId = await findProjectIdByEmail(record.email);
        } catch (error) {
          logger.error('onboarding.match_failed', {
            email: redactEmail(record.email),
            ...describeError(error),
          });
        }
      }

      const onboarding = await repository.create({
        ...record,
        source: ONBOARDING_SOURCE,
        ...(projectId ? { projectId } : {}),
      });

      logger.info('onboarding.created', {
        onboardingId: onboarding.id,
        email: redactEmail(onboarding.email),
        matched: Boolean(projectId),
      });

      /*
       * An unmatched submission is somebody's materials with nowhere to go, and it is the one
       * outcome here that needs a person. Digest-tier rather than immediate — see
       * `IMMEDIATE_KINDS` — because it is a filing problem rather than somebody waiting on a
       * reply, and it is already in a console list by the time the digest goes out.
       */
      if (!projectId) {
        await notifier.owner({
          kind: 'owner.onboarding_unmatched',
          subject: `Onboarding with no project — ${onboarding.businessName}`,
          heading: 'A submission matched no project',
          lines: [
            `${onboarding.contactName} at ${onboarding.businessName} filled in the welcome form.`,
            `No project has ${onboarding.email} against it, so nothing was linked. Match it in the console.`,
          ],
          replyTo: onboarding.email,
        });
      }

      if (notificationRecipient) {
        try {
          await emailService.send(
            buildOnboardingNotificationEmail({ onboarding, recipient: notificationRecipient }),
          );
          logger.info('onboarding.notification_sent', { onboardingId: onboarding.id });
        } catch (error) {
          // Loud in the logs, invisible to the visitor: the record is already stored.
          logger.error('onboarding.notification_failed', {
            onboardingId: onboarding.id,
            ...describeError(error),
          });
        }
      } else {
        logger.warn('onboarding.notification_skipped_no_recipient', {
          onboardingId: onboarding.id,
        });
      }

      return { kind: 'created', onboarding };
    },
  };
}
