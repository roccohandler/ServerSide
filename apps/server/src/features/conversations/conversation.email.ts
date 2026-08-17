import { escapeHtml, escapeHtmlWithLineBreaks } from '../../lib/html.js';
import { emailTheme as t } from '../../lib/emailTheme.js';
import type { EmailMessage } from '../../infrastructure/email/email.service.js';
import { describeInquiryType, type StoredLead } from '../leads/index.js';

/*
 * The one email this application sends *as* the owner rather than *to* them.
 *
 * Every other template here is a notification — an internal message about something that
 * happened, written in the third person and read by one person who already knows the
 * context. This one is read by a prospect who filled in a form and is waiting to hear
 * back, so it is a letter: their words quoted, the owner's answer, and a signature.
 *
 * ## What it deliberately does not do
 *
 * No tracking pixel, no "view in browser", no unsubscribe footer. This is a reply to a
 * message somebody sent us, not a mailing — CAN-SPAM's unsubscribe requirement attaches
 * to commercial bulk mail, and a footer offering to unsubscribe from a personal reply
 * reads as the automated response it is trying not to be.
 */

export interface ProspectReplyEmailParams {
  readonly lead: StoredLead;
  /** What the owner typed. Escaped here; never trusted as markup. */
  readonly body: string;
  /** The signature, and the account the console request was authenticated as. */
  readonly authorName: string;
  /**
   * Where the prospect's response should land, and where the owner's own copy goes.
   *
   * Both are the owner's address rather than the transactional `from`, because a reply
   * to a no-reply sender is a customer who tried to answer and was ignored.
   */
  readonly ownerAddress: string;
}

export function buildProspectReplyEmail(params: ProspectReplyEmailParams): EmailMessage {
  const { lead, body, authorName, ownerAddress } = params;

  const subject = `Re: your website enquiry — ${lead.businessName}`;

  const text = [
    `Hi ${lead.name},`,
    '',
    body,
    '',
    '—',
    authorName,
    'JobForge',
    '',
    'You wrote:',
    `> ${describeInquiryType(lead.inquiryType)}`,
    ...(lead.message ? lead.message.split('\n').map((line) => `> ${line}`) : []),
  ].join('\n');

  const quoted = [
    describeInquiryType(lead.inquiryType),
    ...(lead.message ? [lead.message] : []),
  ].join('\n\n');

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:24px;background:${t.page};font-family:${t.font};font-size:16px;line-height:1.5;color:${t.ink};">
    <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:${t.surface};border:1px solid ${t.border};border-top:4px solid ${t.accent};border-radius:12px;">
      <tr>
        <td style="padding:24px 24px 0 24px;">
          <p style="margin:0 0 16px 0;">Hi ${escapeHtml(lead.name)},</p>
          <div style="margin:0 0 20px 0;">${escapeHtmlWithLineBreaks(body)}</div>
          <p style="margin:0 0 4px 0;">${escapeHtml(authorName)}</p>
          <p style="margin:0 0 24px 0;color:${t.inkMuted};font-size:14px;">JobForge</p>
        </td>
      </tr>
      <tr>
        <td style="padding:0 24px 24px 24px;">
          <div style="border-left:3px solid ${t.border};padding:4px 0 4px 16px;color:${t.inkMuted};font-size:14px;">
            <p style="margin:0 0 8px 0;">You wrote:</p>
            <div style="margin:0;">${escapeHtmlWithLineBreaks(quoted)}</div>
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return {
    to: lead.email,
    subject,
    html,
    text,
    replyTo: ownerAddress,
    /* The owner's only record of what they said. See `EmailMessage.bcc`. */
    bcc: ownerAddress,
  };
}
