import { describeError, redactEmail, type Logger } from '../../lib/logger.js';
import type { EmailService } from '../../infrastructure/email/email.service.js';
import { buildOnboardingNotificationEmail } from './onboarding.email.js';
import type { OnboardingRepository } from './onboarding.repository.js';
import type { OnboardingOutcome, ValidatedOnboardingInput } from './onboarding.types.js';

/** Where the submission came from. One value today; the field makes a second one cheap. */
export const ONBOARDING_SOURCE = 'welcome-page';

export interface OnboardingService {
  submit(input: ValidatedOnboardingInput): Promise<OnboardingOutcome>;
}

export interface OnboardingServiceDependencies {
  readonly repository: OnboardingRepository;
  readonly emailService: EmailService;
  /** Undefined when no notification address is configured; submissions are still stored. */
  readonly notificationRecipient: string | undefined;
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
  const { repository, emailService, notificationRecipient, logger } = dependencies;

  return {
    async submit(input) {
      if (input.isBotSubmission) {
        // Nothing stored, nothing sent; the caller still sees success so a bot cannot
        // learn the honeypot exists.
        logger.warn('onboarding.rejected_honeypot');
        return { kind: 'discarded', reason: 'honeypot' };
      }

      const { isBotSubmission: _ignored, ...record } = input;
      const onboarding = await repository.create({ ...record, source: ONBOARDING_SOURCE });

      logger.info('onboarding.created', {
        onboardingId: onboarding.id,
        email: redactEmail(onboarding.email),
      });

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
