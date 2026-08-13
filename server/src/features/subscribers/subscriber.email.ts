import { escapeHtml } from '../../lib/html.js';
import type { EmailMessage } from '../../infrastructure/email/email.service.js';
import type { StoredSubscriber } from './subscriber.types.js';

/*
 * Two templates, because there are two real behaviours.
 *
 * `buildWorkbookDeliveryEmail` goes to the subscriber and contains the link. It is only
 * ever built when `PLAYBOOK_PDF_URL` is configured — there is no version of it that sends
 * somebody a "here it is" email with nothing in it.
 *
 * `buildSubscriberNotificationEmail` goes to the owner, and is what happens when the PDF
 * is not hosted yet: the request is stored, the owner is told, the owner sends it by
 * hand. A working flow rather than a broken one.
 */

function formatTimestamp(date: Date): string {
  // Explicit UTC rather than the host's locale, which differs between local and Vercel.
  return `${date.toISOString().replace('T', ' ').slice(0, 16)} UTC`;
}

/**
 * Builds the "PlayBook requested" notification.
 *
 * The email address originates from the visitor, so it is HTML-escaped like anything
 * else they typed. Nothing a submitter provides is ever treated as markup.
 */
export function buildSubscriberNotificationEmail(params: {
  readonly subscriber: StoredSubscriber;
  readonly recipient: string;
}): EmailMessage {
  const { subscriber, recipient } = params;

  const rows: readonly (readonly [string, string])[] = [
    ['Email', subscriber.email],
    ['Asked for', subscriber.asset],
    ['Requested', formatTimestamp(subscriber.createdAt)],
    ['Consented to', subscriber.consentText],
  ];

  const textBody = [
    'Somebody asked for the PlayBook workbook.',
    '',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    'Send it to them: print /playbook/workbook to PDF and reply to this address.',
  ].join('\n');

  const htmlRows = rows
    .map(
      ([label, value]) =>
        `<tr><th align="left" style="padding:6px 16px 6px 0;color:#5b6a7a;font-weight:600;white-space:nowrap;vertical-align:top">${escapeHtml(label)}</th><td style="padding:6px 0;color:#101a26">${escapeHtml(value)}</td></tr>`,
    )
    .join('');

  const htmlBody = [
    '<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;line-height:1.5">',
    '<h2 style="margin:0 0 16px;font-size:18px;color:#101a26">PlayBook workbook requested</h2>',
    `<table cellpadding="0" cellspacing="0" style="font-size:14px">${htmlRows}</table>`,
    '<p style="margin:20px 0 0;font-size:13px;color:#5b6a7a">Print <code>/playbook/workbook</code> to PDF and reply to this address.</p>',
    '</div>',
  ].join('');

  return {
    to: recipient,
    subject: `PlayBook requested — ${subscriber.email}`,
    text: textBody,
    html: htmlBody,
    ...(subscriber.email ? { replyTo: subscriber.email } : {}),
  };
}

/**
 * Builds the email the subscriber receives, containing the workbook link.
 *
 * Only ever called when `PLAYBOOK_PDF_URL` is configured, so there is no path through
 * this code that sends somebody a delivery email with nothing to deliver.
 *
 * The tone matters as much as the link: this is the first email from a business the
 * reader has not hired, and the last line is the only thing in it that mentions the paid
 * service. Anything more would make the free resource read as the advert it is not.
 */
export function buildWorkbookDeliveryEmail(params: {
  readonly subscriber: StoredSubscriber;
  readonly pdfUrl: string;
  readonly replyTo?: string | undefined;
}): EmailMessage {
  const { subscriber, pdfUrl, replyTo } = params;

  const textBody = [
    'Here is the Service Business Website PlayBook.',
    '',
    pdfUrl,
    '',
    'Twenty improvements that turn more of the visitors you already have into calls and',
    'quote requests, plus a 40-point scorecard and the audit sheets to work through.',
    '',
    'Everything in it is also published in full on the website — nothing was held back for',
    'this email. It is just easier to print.',
    '',
    /*
     * "assessment", matching the HTML body below and the whole client.
     *
     * These two paragraphs are the same sentence in the same email and they named the
     * offer differently — text said "review", HTML said "assessment". Which one a
     * subscriber sees depends on their mail client, and the two of them describe what
     * reads as two different free things.
     */
    'If you would rather somebody went through your actual website with you, the free',
    'assessment does exactly that, and you get the list whether or not you ever hire',
    'anybody.',
    '',
    'Just reply to this email if you have a question about any of it.',
  ].join('\n');

  const htmlBody = [
    '<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;line-height:1.6;color:#101a26">',
    '<h2 style="margin:0 0 16px;font-size:20px">Here is the PlayBook</h2>',
    `<p style="margin:0 0 20px"><a href="${escapeHtml(pdfUrl)}" style="display:inline-block;padding:12px 20px;background:#12546f;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600">Download the PlayBook</a></p>`,
    '<p style="margin:0 0 16px">Twenty improvements that turn more of the visitors you already have into calls and quote requests, plus a 40-point scorecard and the audit sheets to work through.</p>',
    '<p style="margin:0 0 16px;color:#5b6a7a">Everything in it is also published in full on the website — nothing was held back for this email. It is just easier to print.</p>',
    '<p style="margin:0 0 16px;color:#5b6a7a">If you would rather somebody went through your actual website with you, the free assessment does exactly that, and you get the list whether or not you ever hire anybody.</p>',
    '<p style="margin:0;color:#5b6a7a">Just reply to this email if you have a question about any of it.</p>',
    '</div>',
  ].join('');

  return {
    to: subscriber.email,
    subject: 'The Service Business Website PlayBook',
    text: textBody,
    html: htmlBody,
    ...(replyTo ? { replyTo } : {}),
  };
}
