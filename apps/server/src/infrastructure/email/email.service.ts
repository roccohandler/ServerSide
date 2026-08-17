import type { Logger } from '../../lib/logger.js';

export interface EmailMessage {
  readonly to: string;
  readonly subject: string;
  /** Pre-escaped HTML. Callers are responsible for encoding untrusted content. */
  readonly html: string;
  readonly text: string;
  readonly replyTo?: string;
  /**
   * A silent copy, for the one message this application sends *on the owner's behalf*
   * rather than *to* them.
   *
   * Every other email here is a notification: the owner is the recipient, so a copy in
   * their inbox is automatic. A console reply is the exception — it goes to a prospect,
   * and without this the owner would have no record of what they had said to somebody.
   * Blind rather than CC'd because the recipient learning the owner's own address from a
   * header is a different conversation from the one being had.
   */
  readonly bcc?: string;
}

/**
 * The only email capability the application depends on.
 *
 * Nothing above this interface knows that Resend exists, so swapping providers means
 * writing one new implementation of `send` and changing one line of wiring.
 */
export interface EmailService {
  send(message: EmailMessage): Promise<void>;
}

/** Signals that the provider rejected or failed to accept the message. */
export class EmailDeliveryError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'EmailDeliveryError';
  }
}

/**
 * Development stand-in used when Resend is not configured.
 *
 * It writes what *would* have been sent instead of throwing, so the whole lead flow can
 * be exercised locally. Production refuses to start without Resend credentials, so this
 * can never be silently active on a live site.
 */
export function createLogEmailService(logger: Logger): EmailService {
  return {
    async send(message) {
      logger.info('email.not_sent_provider_unconfigured', {
        to: message.to,
        subject: message.subject,
      });
      logger.debug('email.body_preview', { text: message.text });
    },
  };
}
