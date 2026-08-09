import { Resend } from 'resend';
import { EmailDeliveryError, type EmailMessage, type EmailService } from './email.service.js';

export interface ResendEmailServiceOptions {
  readonly apiKey: string;
  /** Must be an address on a domain verified in Resend, e.g. `Leads <leads@yourdomain.com>`. */
  readonly from: string;
}

/**
 * Resend-backed transport.
 *
 * The SDK reports failures on the returned object rather than by throwing, so the
 * result is checked explicitly — otherwise a rejected send would look like a success.
 * The provider's own message is wrapped in `EmailDeliveryError` and stays server-side;
 * the visitor never sees it.
 */
export function createResendEmailService(options: ResendEmailServiceOptions): EmailService {
  const client = new Resend(options.apiKey);

  return {
    async send(message: EmailMessage) {
      let result: Awaited<ReturnType<typeof client.emails.send>>;

      try {
        result = await client.emails.send({
          from: options.from,
          to: message.to,
          subject: message.subject,
          html: message.html,
          text: message.text,
          ...(message.replyTo ? { replyTo: message.replyTo } : {}),
        });
      } catch (error) {
        throw new EmailDeliveryError('Resend request failed.', { cause: error });
      }

      if (result.error) {
        throw new EmailDeliveryError(
          `Resend rejected the message: ${result.error.name} — ${result.error.message}`,
        );
      }
    },
  };
}
