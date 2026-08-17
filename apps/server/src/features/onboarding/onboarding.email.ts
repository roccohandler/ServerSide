import { escapeHtml, escapeHtmlWithLineBreaks } from '../../lib/html.js';
import { emailTheme as t } from '../../lib/emailTheme.js';
import type { EmailMessage } from '../../infrastructure/email/email.service.js';
import type { StoredOnboarding } from './onboarding.types.js';

/** The owner's copy of a new client's onboarding submission. */
export function buildOnboardingNotificationEmail(params: {
  readonly onboarding: StoredOnboarding;
  readonly recipient: string;
}): EmailMessage {
  const { onboarding, recipient } = params;

  const rows: readonly (readonly [string, string, boolean?])[] = [
    ['Business', onboarding.businessName],
    ['Contact', onboarding.contactName],
    ['Email', onboarding.email],
    ['Phone', onboarding.phone],
    ['Current website', onboarding.website ?? 'Not provided'],
    ['Google Business Profile', onboarding.googleBusinessProfile ?? 'Not provided'],
    ['Services', onboarding.services, true],
    ['Service areas', onboarding.serviceAreas, true],
    ['Domain and hosting', onboarding.domainAndHosting ?? 'Not provided', true],
    ['Photos', onboarding.photosNote ?? 'Not provided', true],
    ['Competitors', onboarding.competitors ?? 'Not provided', true],
    ['Calls to action wanted', onboarding.callsToAction ?? 'Not provided', true],
    ['Access notes', onboarding.accessNotes ?? 'Not provided', true],
    ['Anything else', onboarding.anythingElse ?? 'Not provided', true],
  ];

  const subject = `Onboarding received — ${onboarding.businessName}`;

  const text = [
    'A new client submitted their onboarding form.',
    '',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    `Reply directly to this email to reach ${onboarding.contactName}.`,
  ].join('\n');

  const tableRows = rows
    .map(
      ([label, value, multiline]) => `
        <tr>
          <th align="left" style="padding:8px 16px 8px 0;vertical-align:top;color:${t.inkMuted};font-weight:600;white-space:nowrap;">${escapeHtml(label)}</th>
          <td style="padding:8px 0;vertical-align:top;color:${t.ink};">${
            multiline ? escapeHtmlWithLineBreaks(value) : escapeHtml(value)
          }</td>
        </tr>`,
    )
    .join('');

  const html = `<div style="font-family:${t.font};line-height:1.5;color:${t.ink}">
    <h2 style="margin:0 0 16px;font-size:18px;letter-spacing:-0.02em">Onboarding received</h2>
    <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:14px">${tableRows}</table>
    <p style="margin:20px 0 0;font-size:13px;color:${t.inkMuted}">Reply directly to this email to reach ${escapeHtml(onboarding.contactName)}.</p>
  </div>`;

  return {
    to: recipient,
    subject,
    text,
    html,
    replyTo: onboarding.email,
  };
}
