import { escapeHtml, escapeHtmlWithLineBreaks } from '../../lib/html.js';
import { emailTheme as t } from '../../lib/emailTheme.js';
import type { EmailMessage } from '../../infrastructure/email/email.service.js';
import type { InquiryType, StoredLead } from './lead.types.js';

/*
 * The notification template lives with the lead feature, not in infrastructure/email.
 * Infrastructure stays a dumb transport that knows nothing about leads, which keeps the
 * dependency arrow pointing one way: feature -> infrastructure.
 */

/** Human-readable versions of the inquiry slugs, for the owner's inbox. */
const INQUIRY_LABELS: Record<InquiryType, string> = {
  'new-website': 'Needs a new website',
  'improve-website': 'Has a website that is outdated or not bringing in work',
  'manage-website': 'Wants their existing website managed',
  'no-website': "Doesn't have a website yet",
  'not-sure': 'Not sure what needs fixing',
};

export function describeInquiryType(inquiryType: InquiryType): string {
  return INQUIRY_LABELS[inquiryType];
}

function formatTimestamp(date: Date): string {
  // Explicit UTC rather than the host's locale, which differs between local and Vercel.
  return `${date.toISOString().replace('T', ' ').slice(0, 16)} UTC`;
}

interface Row {
  readonly label: string;
  readonly value: string;
  readonly multiline?: boolean;
}

function buildRows(lead: StoredLead): readonly Row[] {
  return [
    { label: 'Name', value: lead.name },
    { label: 'Business', value: lead.businessName },
    { label: 'Phone', value: lead.phone },
    { label: 'Email', value: lead.email },
    { label: 'Website', value: lead.website ?? 'Not provided' },
    { label: 'Needs help with', value: describeInquiryType(lead.inquiryType) },
    { label: 'Message', value: lead.message ?? 'Not provided', multiline: true },
    { label: 'Submitted', value: formatTimestamp(lead.createdAt) },
  ];
}

/**
 * Builds the "New website inquiry" notification.
 *
 * Every interpolated value originates from the visitor, so all of it is HTML-escaped.
 * Nothing the submitter types is ever treated as markup.
 */
export function buildNewLeadEmail(params: {
  readonly lead: StoredLead;
  readonly recipient: string;
}): EmailMessage {
  const { lead, recipient } = params;
  const rows = buildRows(lead);

  const subject = `New website inquiry — ${lead.businessName} (${lead.name})`;

  const text = [
    'New website inquiry',
    '',
    ...rows.map((row) => `${row.label}: ${row.value}`),
    '',
    `Reply directly to this email to reach ${lead.name}.`,
  ].join('\n');

  const tableRows = rows
    .map(
      (row) => `
        <tr>
          <th align="left" style="padding:10px 16px 10px 0;vertical-align:top;color:${t.inkMuted};font-weight:600;white-space:nowrap;">${escapeHtml(
            row.label,
          )}</th>
          <td style="padding:10px 0;vertical-align:top;color:${t.ink};">${
            row.multiline ? escapeHtmlWithLineBreaks(row.value) : escapeHtml(row.value)
          }</td>
        </tr>`,
    )
    .join('');

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
        <td style="padding:24px 24px 8px 24px;">
          <h1 style="margin:0 0 4px 0;font-size:20px;line-height:1.3;letter-spacing:-0.02em;">New website inquiry</h1>
          <p style="margin:0;color:${t.inkMuted};font-size:14px;">Submitted through the contact form.</p>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 24px 24px 24px;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:15px;">
            ${tableRows}
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:0 24px 24px 24px;color:${t.inkMuted};font-size:13px;">
          Reply directly to this email to reach ${escapeHtml(lead.name)}.
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return {
    to: recipient,
    subject,
    html,
    text,
    // Lets the owner hit Reply and land in the visitor's inbox.
    replyTo: lead.email,
  };
}
